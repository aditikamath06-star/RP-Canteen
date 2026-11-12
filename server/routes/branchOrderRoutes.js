const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate, requireRole } = require('../middleware/auth');
const BranchOrder = require('../models/BranchOrder');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const Recipe = require('../models/Recipe');
const Menu = require('../models/Menu');
const AuditLog = require('../models/AuditLog');

const BRANCH_INFO = {
  head_office: { nameEn: 'Head Office', nameKn: 'ಪ್ರಧಾನ ಕಚೇರಿ' },
  mudranalaya: { nameEn: 'Rashtrotthana Mudranalaya (Press)', nameKn: 'ರಾಷ್ಟ್ರೋತ್ಥಾನ ಮುದ್ರಣಾಲಯ' },
  blood_bank: { nameEn: 'Rashtrotthana Blood Centre', nameKn: 'ರಾಷ್ಟ್ರೋತ್ಥಾನ ರಕ್ತನಿಧಿ' },
  samraksha: { nameEn: 'Samraksha Blood Disorder Centre', nameKn: 'ಸಂರಕ್ಷಾ' },
  ashtanga_yoga: { nameEn: 'Rashtrotthana Ashtanga Yoga', nameKn: 'ರಾಷ್ಟ್ರೋತ್ಥಾನ ಅಷ್ಟಾಂಗ ಯೋಗ' },
};

// =========================================================================
// 1. GET /api/branch-orders/my-branch
// Logged in branch gets its recurring order and special event history
// =========================================================================
router.get('/my-branch', authenticate, requireRole('branch'), async (req, res) => {
  try {
    const branchId = req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: 'User is not linked to any recognized branch.' });
    }

    // Find or create daily recurring order
    let recurring = await BranchOrder.findOne({ branchId, orderType: 'daily_recurring' });
    if (!recurring) {
      recurring = await BranchOrder.create({
        branchId,
        branchNameEn: BRANCH_INFO[branchId]?.nameEn || branchId,
        branchNameKn: BRANCH_INFO[branchId]?.nameKn || branchId,
        orderType: 'daily_recurring',
        status: 'active',
        dailyRecurring: {
          isActive: true,
          breakfastCount: 0,
          lunchCount: 0,
          snacksCount: 0,
          dinnerCount: 0,
          notes: '',
        },
        createdBy: req.user._id,
      });
    }

    // Get all special event orders
    const specialEvents = await BranchOrder.find({
      branchId,
      orderType: 'special_event',
    })
      .sort({ createdAt: -1 })
      .populate('approvalDetails.approvedBy', 'fullName username');

    res.json({
      success: true,
      branchId,
      branchInfo: BRANCH_INFO[branchId] || { nameEn: branchId, nameKn: branchId },
      recurringOrder: recurring,
      specialEvents,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 2. POST /api/branch-orders/recurring
// Branch updates their daily recurring meal headcount
// =========================================================================
router.post('/recurring', authenticate, async (req, res) => {
  try {
    const branchId = req.user.role === 'head' ? (req.body.branchId || 'head_office') : req.user.branchId;
    if (!branchId || !BRANCH_INFO[branchId]) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID.' });
    }

    const {
      isActive = true,
      breakfastCount = 0,
      lunchCount = 0,
      snacksCount = 0,
      dinnerCount = 0,
      notes = '',
    } = req.body;

    let recurring = await BranchOrder.findOne({ branchId, orderType: 'daily_recurring' });
    if (!recurring) {
      recurring = new BranchOrder({
        branchId,
        branchNameEn: BRANCH_INFO[branchId].nameEn,
        branchNameKn: BRANCH_INFO[branchId].nameKn,
        orderType: 'daily_recurring',
        createdBy: req.user._id,
      });
    }

    recurring.dailyRecurring.isActive = Boolean(isActive);
    recurring.dailyRecurring.breakfastCount = Math.max(0, Number(breakfastCount) || 0);
    recurring.dailyRecurring.lunchCount = Math.max(0, Number(lunchCount) || 0);
    recurring.dailyRecurring.snacksCount = Math.max(0, Number(snacksCount) || 0);
    recurring.dailyRecurring.dinnerCount = Math.max(0, Number(dinnerCount) || 0);
    recurring.dailyRecurring.notes = String(notes || '').trim();
    recurring.dailyRecurring.lastUpdated = new Date();
    recurring.status = recurring.dailyRecurring.isActive ? 'active' : 'paused';

    await recurring.save();

    res.json({
      success: true,
      message: `Daily recurring food details for ${BRANCH_INFO[branchId].nameEn} saved successfully!`,
      recurringOrder: recurring,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 3. POST /api/branch-orders/special-event
// Branch submits a new special function / event order
// =========================================================================
router.post('/special-event', authenticate, requireRole('branch', 'head'), async (req, res) => {
  try {
    const branchId = req.user.role === 'head' ? req.body.branchId : req.user.branchId;
    if (!branchId || !BRANCH_INFO[branchId]) {
      return res.status(400).json({ success: false, message: 'Invalid branch ID.' });
    }

    const {
      eventName,
      eventDate,
      mealSession = 'Lunch',
      peopleCount,
      requestedDishes = [],
      specialInstructions = '',
    } = req.body;

    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ success: false, message: 'Event or Occasion Name is required.' });
    }
    if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return res.status(400).json({ success: false, message: 'Valid Event Date (YYYY-MM-DD) is required.' });
    }
    const count = Number(peopleCount);
    if (!count || count < 1) {
      return res.status(400).json({ success: false, message: 'Number of people must be at least 1.' });
    }
    if (!Array.isArray(requestedDishes) || requestedDishes.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one dish for the event.' });
    }

    const newOrder = await BranchOrder.create({
      branchId,
      branchNameEn: BRANCH_INFO[branchId].nameEn,
      branchNameKn: BRANCH_INFO[branchId].nameKn,
      orderType: 'special_event',
      status: 'pending',
      specialEvent: {
        eventName: eventName.trim(),
        eventDate,
        mealSession,
        peopleCount: count,
        requestedDishes: requestedDishes.map((d) => ({
          recipe: d.recipeId || d.recipe || null,
          dishName: d.dishName || 'Dish',
          dishNameKn: d.dishNameKn || '',
          notes: d.notes || '',
        })),
        specialInstructions: specialInstructions.trim(),
      },
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Special event order "${eventName}" submitted to Canteen Head for approval!`,
      order: newOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 4. GET /api/branch-orders/all
// Head view: all branches' standing recurring orders and special event orders
// =========================================================================
router.get('/all', authenticate, requireRole('head'), async (req, res) => {
  try {
    // 1. Fetch or initialize recurring orders for all 4 branches
    const branchIds = Object.keys(BRANCH_INFO);
    const recurringList = [];

    for (const bId of branchIds) {
      let rec = await BranchOrder.findOne({ branchId: bId, orderType: 'daily_recurring' });
      if (!rec) {
        rec = await BranchOrder.create({
          branchId: bId,
          branchNameEn: BRANCH_INFO[bId].nameEn,
          branchNameKn: BRANCH_INFO[bId].nameKn,
          orderType: 'daily_recurring',
          status: 'active',
          dailyRecurring: {
            isActive: true,
            breakfastCount: 0,
            lunchCount: 0,
            snacksCount: 0,
            dinnerCount: 0,
          },
          createdBy: req.user._id,
        });
      }
      recurringList.push(rec);
    }

    // 2. Fetch special event orders
    const specialOrders = await BranchOrder.find({ orderType: 'special_event' })
      .sort({ 'specialEvent.eventDate': 1, createdAt: -1 })
      .populate('createdBy', 'fullName username')
      .populate('approvalDetails.approvedBy', 'fullName username');

    // 3. Consolidated totals for today's active branches
    const todaySummary = {
      breakfastTotal: 0,
      lunchTotal: 0,
      snacksTotal: 0,
      dinnerTotal: 0,
      activeBranchesCount: 0,
    };

    recurringList.forEach((r) => {
      if (r.dailyRecurring?.isActive) {
        todaySummary.activeBranchesCount += 1;
        todaySummary.breakfastTotal += r.dailyRecurring.breakfastCount || 0;
        todaySummary.lunchTotal += r.dailyRecurring.lunchCount || 0;
        todaySummary.snacksTotal += r.dailyRecurring.snacksCount || 0;
        todaySummary.dinnerTotal += r.dailyRecurring.dinnerCount || 0;
      }
    });

    res.json({
      success: true,
      branchesInfo: BRANCH_INFO,
      recurringOrders: recurringList,
      specialOrders,
      todaySummary,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 5. POST /api/branch-orders/special-event/:id/approve-and-deduct
// Head approves special event order and automatically deducts stock
// =========================================================================
router.post('/special-event/:id/approve-and-deduct', authenticate, requireRole('head'), async (req, res) => {
  try {
    const order = await BranchOrder.findById(req.params.id);
    if (!order || order.orderType !== 'special_event') {
      return res.status(404).json({ success: false, message: 'Special event order not found.' });
    }
    if (order.status === 'stock_deducted') {
      return res.status(400).json({ success: false, message: 'Stock has already been deducted for this event order.' });
    }

    const { eventName, peopleCount, requestedDishes } = order.specialEvent;
    const targetPeople = Number(peopleCount);

    // Aggregate required ingredients from recipe formulas
    const ingredientRequirements = new Map(); // itemId -> { inventoryItem, itemName, neededQty, unit }

    for (const reqDish of requestedDishes) {
      let recipe = null;
      if (reqDish.recipe) {
        recipe = await Recipe.findById(reqDish.recipe);
      }
      if (!recipe) {
        // Fallback search by dish name
        recipe = await Recipe.findOne({
          $or: [
            { dishName: new RegExp(`^${reqDish.dishName}$`, 'i') },
            { dishNameKn: reqDish.dishNameKn || '__NONE__' },
          ],
        });
      }

      if (recipe && Array.isArray(recipe.ingredients)) {
        const basePortion = recipe.basePortion || 50;
        for (const ing of recipe.ingredients) {
          const rawId = ing.inventoryItem?._id || ing.inventoryItem;
          const invId = rawId ? rawId.toString() : null;
          if (!invId) continue;

          const factor = (ing.quantity / basePortion) * targetPeople;
          const roundedQty = Number(factor.toFixed(3));

          if (ingredientRequirements.has(invId)) {
            const existing = ingredientRequirements.get(invId);
            existing.neededQty = Number((existing.neededQty + roundedQty).toFixed(3));
          } else {
            ingredientRequirements.set(invId, {
              itemId: invId,
              itemName: ing.itemNameSnapshot || 'Store Item',
              neededQty: roundedQty,
              unit: ing.unit || 'kg',
            });
          }
        }
      }
    }

    if (ingredientRequirements.size === 0) {
      // If none of the requested dishes have recipe formulas configured, allow approval with note
      order.status = 'approved';
      order.approvalDetails.approvedBy = req.user._id;
      order.approvalDetails.approvedAt = new Date();
      await order.save();

      return res.json({
        success: true,
        message: `Special event order "${eventName}" approved! (Note: No recipe formulas configured for the selected dishes, so no stock auto-deducted.)`,
        order,
      });
    }

    // Pre-flight check: Verify all required ingredients are in stock
    const shortages = [];
    const stockItemsToUpdate = [];

    for (const reqItem of ingredientRequirements.values()) {
      const inv = await Inventory.findById(reqItem.itemId);
      if (!inv) {
        shortages.push({
          itemName: reqItem.itemName,
          required: reqItem.neededQty,
          available: 0,
          shortage: reqItem.neededQty,
          unit: reqItem.unit,
        });
        continue;
      }

      if (inv.currentQuantity < reqItem.neededQty) {
        shortages.push({
          itemName: inv.name,
          brand: inv.brand,
          required: reqItem.neededQty,
          available: inv.currentQuantity,
          shortage: Number((reqItem.neededQty - inv.currentQuantity).toFixed(3)),
          unit: inv.unit,
        });
      } else {
        stockItemsToUpdate.push({
          inventoryDoc: inv,
          neededQty: reqItem.neededQty,
          unit: reqItem.unit,
        });
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve & deduct: Insufficient inventory stock for this special event.',
        shortages,
      });
    }

    // Atomic stock reduction & stock movement creation
    const recordedDeductions = [];

    for (const itemPlan of stockItemsToUpdate) {
      const inv = itemPlan.inventoryDoc;
      const prevStock = inv.currentQuantity;
      const newStock = Number((prevStock - itemPlan.neededQty).toFixed(3));

      inv.currentQuantity = newStock;
      await inv.save();

      // Create StockMovement
      const movement = await StockMovement.create({
        inventoryItem: inv._id,
        itemNameSnapshot: inv.name,
        movementType: 'consumed',
        previousQuantity: prevStock,
        changeQuantity: -itemPlan.neededQty,
        resultingQuantity: newStock,
        unit: inv.unit,
        reason: `Branch Special Event: "${eventName}" for ${order.branchNameEn} (${targetPeople} people)`,
        performedBy: req.user._id,
        performedByName: req.user.fullName || req.user.username,
        performedByRole: req.user.role,
      });

      recordedDeductions.push({
        inventoryItem: inv._id,
        itemName: inv.name,
        quantityDeducted: itemPlan.neededQty,
        unit: inv.unit,
        movementId: movement._id,
      });
    }

    // Update order
    order.status = 'stock_deducted';
    order.approvalDetails.approvedBy = req.user._id;
    order.approvalDetails.approvedAt = new Date();
    order.approvalDetails.deductedAt = new Date();
    order.approvalDetails.stockDeductions = recordedDeductions;
    await order.save();

    // Log to AuditLog
    await AuditLog.create({
      action: 'APPROVE_BRANCH_SPECIAL_ORDER',
      entity: 'BranchOrder',
      entityId: order._id,
      user: req.user._id,
      username: req.user.username,
      details: {
        branch: order.branchNameEn,
        eventName,
        peopleCount: targetPeople,
        deductedItemsCount: recordedDeductions.length,
      },
    }).catch((err) => console.error('[Audit Log Error]:', err.message));

    res.json({
      success: true,
      message: `Special event "${eventName}" approved and stock successfully auto-deducted for ${targetPeople} people!`,
      order,
      deductions: recordedDeductions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 6. POST /api/branch-orders/special-event/:id/reject
// Head rejects a special event order
// =========================================================================
router.post('/special-event/:id/reject', authenticate, requireRole('head'), async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const order = await BranchOrder.findById(req.params.id);
    if (!order || order.orderType !== 'special_event') {
      return res.status(404).json({ success: false, message: 'Special event order not found.' });
    }

    order.status = 'rejected';
    order.approvalDetails.approvedBy = req.user._id;
    order.approvalDetails.rejectionReason = String(reason).trim();
    await order.save();

    res.json({
      success: true,
      message: `Order for "${order.specialEvent.eventName}" has been rejected.`,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// 7. POST /api/branch-orders/daily-deduct
// Head executes 1-click daily stock deduction for active branch food requirements
// based on today's published menu and recipe formulas
// =========================================================================
router.post('/daily-deduct', authenticate, requireRole('head'), async (req, res) => {
  try {
    const {
      date = new Date().toISOString().split('T')[0],
      mealSession = 'Lunch',
      branchIds = Object.keys(BRANCH_INFO),
    } = req.body;

    // 1. Get published menu for the date
    const menu = await Menu.findOne({ date, status: 'published' });
    if (!menu) {
      return res.status(400).json({
        success: false,
        message: `No published menu found for date ${date}. Please publish today's menu first before auto-deducting branch stock.`,
      });
    }

    // Filter menu items for requested meal session
    const sessionDishes = (menu.items || []).filter(
      (it) => it.category?.toLowerCase() === mealSession.toLowerCase() && it.isAvailable
    );
    if (sessionDishes.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No available dishes found in today's menu for meal session "${mealSession}".`,
      });
    }

    // 2. Fetch active recurring orders for selected branches
    const countField = mealSession.toLowerCase() === 'breakfast'
      ? 'breakfastCount'
      : mealSession.toLowerCase() === 'lunch'
      ? 'lunchCount'
      : mealSession.toLowerCase().includes('snack')
      ? 'snacksCount'
      : 'dinnerCount';

    const recurringOrders = await BranchOrder.find({
      branchId: { $in: branchIds },
      orderType: 'daily_recurring',
      'dailyRecurring.isActive': true,
    });

    // Check already deducted today for this session
    const eligibleBranches = [];
    let totalBranchPeople = 0;

    for (const rec of recurringOrders) {
      const alreadyDeducted = (rec.dailyRecurring.deductionsHistory || []).some(
        (h) => h.date === date && h.mealSession.toLowerCase() === mealSession.toLowerCase()
      );
      if (alreadyDeducted) continue;

      const count = rec.dailyRecurring[countField] || 0;
      if (count > 0) {
        eligibleBranches.push({ orderDoc: rec, branchId: rec.branchId, count });
        totalBranchPeople += count;
      }
    }

    if (totalBranchPeople === 0) {
      return res.status(400).json({
        success: false,
        message: `No pending branch food counts found for ${mealSession} on ${date} (either already deducted or count is 0).`,
      });
    }

    // 3. Find recipes for the session dishes and aggregate ingredients
    const ingredientRequirements = new Map();

    for (const dish of sessionDishes) {
      const recipe = await Recipe.findOne({
        $or: [
          { dishName: new RegExp(`^${dish.name}$`, 'i') },
          { dishNameKn: dish.nameKn || '__NONE__' },
        ],
      });

      if (recipe && Array.isArray(recipe.ingredients)) {
        const basePortion = recipe.basePortion || 50;
        for (const ing of recipe.ingredients) {
          const rawId = ing.inventoryItem?._id || ing.inventoryItem;
          const invId = rawId ? rawId.toString() : null;
          if (!invId) continue;

          const factor = (ing.quantity / basePortion) * totalBranchPeople;
          const roundedQty = Number(factor.toFixed(3));

          if (ingredientRequirements.has(invId)) {
            const existing = ingredientRequirements.get(invId);
            existing.neededQty = Number((existing.neededQty + roundedQty).toFixed(3));
          } else {
            ingredientRequirements.set(invId, {
              itemId: invId,
              itemName: ing.itemNameSnapshot || 'Store Item',
              neededQty: roundedQty,
              unit: ing.unit || 'kg',
            });
          }
        }
      }
    }

    if (ingredientRequirements.size === 0) {
      return res.status(400).json({
        success: false,
        message: `None of today's ${mealSession} dishes have recipe formulas configured. Please create recipes in the "Food Prep & Recipes" tab first.`,
      });
    }

    // 4. Pre-flight inventory check
    const shortages = [];
    const stockItemsToUpdate = [];

    for (const reqItem of ingredientRequirements.values()) {
      const inv = await Inventory.findById(reqItem.itemId);
      if (!inv || inv.currentQuantity < reqItem.neededQty) {
        shortages.push({
          itemName: inv ? inv.name : reqItem.itemName,
          brand: inv?.brand,
          required: reqItem.neededQty,
          available: inv ? inv.currentQuantity : 0,
          shortage: inv ? Number((reqItem.neededQty - inv.currentQuantity).toFixed(3)) : reqItem.neededQty,
          unit: reqItem.unit,
        });
      } else {
        stockItemsToUpdate.push({
          inventoryDoc: inv,
          neededQty: reqItem.neededQty,
          unit: reqItem.unit,
        });
      }
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot auto-deduct: Insufficient inventory stock for ${mealSession} branch requirements.`,
        shortages,
      });
    }

    // 5. Execute deduction
    const movementsCreated = [];

    for (const itemPlan of stockItemsToUpdate) {
      const inv = itemPlan.inventoryDoc;
      const prevStock = inv.currentQuantity;
      const newStock = Number((prevStock - itemPlan.neededQty).toFixed(3));

      inv.currentQuantity = newStock;
      await inv.save();

      const branchNamesList = eligibleBranches.map((b) => `${BRANCH_INFO[b.branchId]?.nameEn || b.branchId} (${b.count}p)`).join(', ');
      const movement = await StockMovement.create({
        inventoryItem: inv._id,
        itemNameSnapshot: inv.name,
        movementType: 'consumed',
        previousQuantity: prevStock,
        changeQuantity: -itemPlan.neededQty,
        resultingQuantity: newStock,
        unit: inv.unit,
        reason: `Branch Daily Food Auto-Deduction [${mealSession}] for Total ${totalBranchPeople} people: ${branchNamesList}`,
        performedBy: req.user._id,
        performedByName: req.user.fullName || req.user.username,
        performedByRole: req.user.role,
      });
      movementsCreated.push(movement._id);
    }

    // 6. Record in each eligible branch's deduction history
    for (const eb of eligibleBranches) {
      eb.orderDoc.dailyRecurring.deductionsHistory.push({
        date,
        mealSession,
        peopleCount: eb.count,
        deductedAt: new Date(),
        deductedBy: req.user._id,
        movements: movementsCreated,
      });
      await eb.orderDoc.save();
    }

    // Log to AuditLog
    await AuditLog.create({
      action: 'APPROVE_BRANCH_DAILY_STOCK_DEDUCTION',
      entity: 'BranchOrder',
      user: req.user._id,
      username: req.user.username,
      details: {
        date,
        mealSession,
        totalBranchPeople,
        branches: eligibleBranches.map((b) => ({ branchId: b.branchId, count: b.count })),
        movementsCount: movementsCreated.length,
      },
    }).catch((err) => console.error('[Audit Log Error]:', err.message));

    res.json({
      success: true,
      message: `Stock successfully auto-deducted for ${mealSession} across ${eligibleBranches.length} branches (${totalBranchPeople} total people)!`,
      totalBranchPeople,
      mealSession,
      date,
      eligibleBranches: eligibleBranches.map((b) => ({
        branchId: b.branchId,
        branchName: BRANCH_INFO[b.branchId]?.nameEn,
        count: b.count,
      })),
      deductionsCount: movementsCreated.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
