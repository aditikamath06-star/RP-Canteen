const express = require('express');
const router = express.Router();
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const { authenticate, requireHead, createAudit } = require('../middleware/auth');

// @route   GET /api/inventory/summary
// @desc    Get dashboard summary counters (Staff & Head)
// @access  Protected
router.get('/summary', authenticate, async (req, res) => {
  try {
    const items = await Inventory.find({ isArchived: false });

    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      if (item.currentQuantity <= 0) {
        outOfStockCount++;
      } else if (item.currentQuantity <= item.minThreshold) {
        lowStockCount++;
      }
    });

    const recentMovementsCount = await StockMovement.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    res.json({
      success: true,
      summary: {
        totalItems: items.length,
        lowStockCount,
        outOfStockCount,
        healthyStockCount: items.length - lowStockCount - outOfStockCount,
        recentMovements24h: recentMovementsCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/inventory
// @desc    List inventory items with search, filter, and sort (Staff & Head)
// @access  Protected
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      search,
      category,
      status, // 'low_stock', 'out_of_stock', 'in_stock'
      includeArchived,
      sortBy = 'name',
      sortOrder = 'asc',
    } = req.query;

    const query = {};

    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim() !== '') {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    let items = await Inventory.find(query);

    // Apply stock status filter if specified
    if (status && status !== 'all') {
      items = items.filter((item) => item.stockStatus === status);
    }

    // Sort items
    items.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'desc'
          ? valB.localeCompare(valA)
          : valA.localeCompare(valB);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    res.json({
      success: true,
      count: items.length,
      inventory: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/inventory/:id
// @desc    Get single inventory item details (Staff & Head)
// @access  Protected
router.get('/:id', authenticate, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/inventory
// @desc    Create new inventory item (Head of Canteen only)
// @access  Protected (Head only)
router.post('/', authenticate, requireHead, async (req, res) => {
  try {
    const {
      name,
      category,
      initialQuantity = 0,
      unit,
      minThreshold = 5,
      notes,
      expiryDate,
    } = req.body;

    if (!name || !unit || !category) {
      return res.status(400).json({
        success: false,
        message: 'Item name, category, and measurement unit are required.',
      });
    }

    const trimmedName = name.trim();
    const existing = await Inventory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An inventory item named "${trimmedName}" already exists.`,
      });
    }

    const numInitial = Math.max(0, Number(initialQuantity) || 0);
    const numThreshold = Math.max(0, Number(minThreshold) || 0);

    const newItem = new Inventory({
      name: trimmedName,
      category,
      currentQuantity: numInitial,
      unit,
      minThreshold: numThreshold,
      notes: notes || '',
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    });

    await newItem.save();

    // Create initial stock movement if initialQuantity > 0
    if (numInitial > 0) {
      await StockMovement.create({
        inventoryItem: newItem._id,
        itemNameSnapshot: newItem.name,
        movementType: 'received',
        previousQuantity: 0,
        changeQuantity: numInitial,
        resultingQuantity: numInitial,
        unit: newItem.unit,
        reason: 'Initial inventory setup / opening balance',
        performedBy: req.user._id,
        performedByName: req.user.fullName || req.user.username,
        performedByRole: req.user.role,
      });
    }

    await createAudit({
      req,
      action: 'INVENTORY_CREATE',
      targetType: 'Inventory',
      targetId: newItem._id,
      details: {
        name: newItem.name,
        category: newItem.category,
        quantity: numInitial,
        unit: newItem.unit,
      },
    });

    res.status(201).json({
      success: true,
      message: `Inventory item "${newItem.name}" created successfully.`,
      item: newItem,
    });
  } catch (error) {
    console.error('[Create Inventory Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/inventory/:id
// @desc    Edit inventory item metadata (Head of Canteen only)
// @access  Protected (Head only)
router.put('/:id', authenticate, requireHead, async (req, res) => {
  try {
    const { name, category, unit, minThreshold, notes, expiryDate } = req.body;

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (name && name.trim() !== item.name) {
      const existing = await Inventory.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: item._id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Another item named "${name.trim()}" already exists.`,
        });
      }
      item.name = name.trim();
    }

    if (category) item.category = category;
    if (unit) item.unit = unit;
    if (minThreshold !== undefined) {
      item.minThreshold = Math.max(0, Number(minThreshold));
    }
    if (notes !== undefined) item.notes = notes;
    if (expiryDate !== undefined) {
      item.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
    }

    await item.save();

    await createAudit({
      req,
      action: 'INVENTORY_EDIT',
      targetType: 'Inventory',
      targetId: item._id,
      details: { name: item.name, category: item.category, unit: item.unit },
    });

    res.json({
      success: true,
      message: `Item "${item.name}" updated successfully.`,
      item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/inventory/:id/stock
// @desc    Modify stock quantity with strict movement logging (Head of Canteen only)
// @access  Protected (Head only)
router.patch('/:id/stock', authenticate, requireHead, async (req, res) => {
  try {
    const { movementType, quantity, exactResultingQuantity, reason } = req.body;

    if (!movementType || !['received', 'consumed', 'discarded', 'correction'].includes(movementType)) {
      return res.status(400).json({
        success: false,
        message: 'Valid movementType is required (received, consumed, discarded, correction).',
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'A specific reason is mandatory for every stock adjustment.',
      });
    }

    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Inventory item not found.' });
    }

    const previousQuantity = item.currentQuantity;
    let resultingQuantity = previousQuantity;
    let changeQuantity = 0;

    if (movementType === 'correction' && exactResultingQuantity !== undefined) {
      const targetQty = Number(exactResultingQuantity);
      if (isNaN(targetQty) || targetQty < 0) {
        return res.status(400).json({
          success: false,
          message: 'Resulting quantity for correction cannot be negative.',
        });
      }
      resultingQuantity = targetQty;
      changeQuantity = resultingQuantity - previousQuantity;
    } else {
      const qtyNumber = Number(quantity);
      if (isNaN(qtyNumber) || qtyNumber <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Adjustment quantity must be a positive number greater than zero.',
        });
      }

      if (movementType === 'received') {
        changeQuantity = qtyNumber;
        resultingQuantity = previousQuantity + qtyNumber;
      } else if (movementType === 'consumed') {
        if (qtyNumber > previousQuantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot consume ${qtyNumber} ${item.unit}. Only ${previousQuantity} ${item.unit} available in stock. Negative stock is prevented.`,
          });
        }
        changeQuantity = -qtyNumber;
        resultingQuantity = previousQuantity - qtyNumber;
      } else if (movementType === 'discarded') {
        if (qtyNumber > previousQuantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot discard ${qtyNumber} ${item.unit}. Only ${previousQuantity} ${item.unit} available in stock.`,
          });
        }
        changeQuantity = -qtyNumber;
        resultingQuantity = previousQuantity - qtyNumber;
      } else if (movementType === 'correction') {
        // Offset correction
        resultingQuantity = previousQuantity + qtyNumber;
        changeQuantity = qtyNumber;
        if (resultingQuantity < 0) {
          return res.status(400).json({
            success: false,
            message: 'Stock correction would result in negative quantity. Operation rejected.',
          });
        }
      }
    }

    // Update inventory quantity
    item.currentQuantity = resultingQuantity;
    await item.save();

    // Create persistent, immutable stock movement history record
    const movement = await StockMovement.create({
      inventoryItem: item._id,
      itemNameSnapshot: item.name,
      movementType,
      previousQuantity,
      changeQuantity,
      resultingQuantity,
      unit: item.unit,
      reason: reason.trim(),
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username,
      performedByRole: req.user.role,
    });

    // Create administrative audit record
    await createAudit({
      req,
      action: `STOCK_${movementType.toUpperCase()}`,
      targetType: 'StockMovement',
      targetId: movement._id,
      details: {
        itemName: item.name,
        movementType,
        previousQuantity,
        changeQuantity,
        resultingQuantity,
        unit: item.unit,
        reason: reason.trim(),
      },
    });

    res.json({
      success: true,
      message: `Stock updated successfully for "${item.name}". New quantity: ${resultingQuantity} ${item.unit}.`,
      item,
      movement,
    });
  } catch (error) {
    console.error('[Stock Update Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/inventory/:id/archive
// @desc    Archive or restore obsolete inventory item (Head only)
// @access  Protected (Head only)
router.patch('/:id/archive', authenticate, requireHead, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const { archive = true } = req.body;
    item.isArchived = Boolean(archive);
    await item.save();

    await createAudit({
      req,
      action: item.isArchived ? 'INVENTORY_ARCHIVE' : 'INVENTORY_RESTORE',
      targetType: 'Inventory',
      targetId: item._id,
      details: { name: item.name, isArchived: item.isArchived },
    });

    res.json({
      success: true,
      message: `Item "${item.name}" ${item.isArchived ? 'archived' : 'restored'} successfully. Historical movements preserved.`,
      item,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
