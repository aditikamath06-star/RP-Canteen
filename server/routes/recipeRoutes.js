const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const Inventory = require('../models/Inventory');
const StockMovement = require('../models/StockMovement');
const { authenticate, requireHead, createAudit } = require('../middleware/auth');

// @route   GET /api/recipes
// @desc    List all recipes with populated inventory status (Head & Workers)
// @access  Protected
router.get('/', authenticate, async (req, res) => {
  try {
    const recipes = await Recipe.find({})
      .populate('ingredients.inventoryItem', 'name currentQuantity unit minThreshold isArchived brand')
      .sort({ dishName: 1 });

    res.json({
      success: true,
      count: recipes.length,
      recipes,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/recipes/:id
// @desc    Get single recipe by ID (Head & Workers)
// @access  Protected
router.get('/:id', authenticate, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('ingredients.inventoryItem', 'name currentQuantity unit minThreshold isArchived brand');

    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    res.json({ success: true, recipe });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/recipes
// @desc    Create a new recipe formula (Head only)
// @access  Protected (Head only)
router.post('/', authenticate, requireHead, async (req, res) => {
  try {
    const { dishName, dishNameKn, category, basePortion, description, ingredients } = req.body;

    if (!dishName || !dishName.trim()) {
      return res.status(400).json({ success: false, message: 'Dish name is required' });
    }

    const portion = Number(basePortion);
    if (!portion || portion < 1) {
      return res.status(400).json({ success: false, message: 'Base portion must be at least 1 person' });
    }

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one ingredient to the recipe' });
    }

    // Validate each ingredient and ensure inventory item exists
    const resolvedIngredients = [];
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      if (!ing.inventoryItem) {
        return res.status(400).json({ success: false, message: `Ingredient #${i + 1} is missing an inventory item selection` });
      }

      const invItem = await Inventory.findById(ing.inventoryItem);
      if (!invItem) {
        return res.status(400).json({ success: false, message: `Inventory item for ingredient #${i + 1} not found in database` });
      }

      const qty = Number(ing.quantity);
      if (!qty || qty <= 0) {
        return res.status(400).json({ success: false, message: `Quantity for "${invItem.name}" must be greater than zero` });
      }

      resolvedIngredients.push({
        inventoryItem: invItem._id,
        itemNameSnapshot: invItem.name,
        quantity: qty,
        unit: ing.unit || invItem.unit,
      });
    }

    const recipe = new Recipe({
      dishName: dishName.trim(),
      dishNameKn: (dishNameKn || '').trim(),
      category: category || 'Breakfast',
      basePortion: portion,
      description: (description || '').trim(),
      ingredients: resolvedIngredients,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await recipe.save();

    await createAudit(
      req,
      'CREATE_RECIPE',
      'Recipe',
      recipe._id,
      null,
      recipe.toObject(),
      `Created recipe formula for "${recipe.dishName}" (${portion} people, ${resolvedIngredients.length} ingredients)`
    );

    const populated = await Recipe.findById(recipe._id)
      .populate('ingredients.inventoryItem', 'name currentQuantity unit minThreshold brand');

    res.status(201).json({
      success: true,
      message: `Recipe for "${recipe.dishName}" created successfully!`,
      recipe: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/recipes/:id
// @desc    Update an existing recipe formula (Head only)
// @access  Protected (Head only)
router.put('/:id', authenticate, requireHead, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const { dishName, dishNameKn, category, basePortion, description, ingredients } = req.body;

    if (dishName) recipe.dishName = dishName.trim();
    if (dishNameKn !== undefined) recipe.dishNameKn = dishNameKn.trim();
    if (category) recipe.category = category;
    if (basePortion) {
      const portion = Number(basePortion);
      if (portion < 1) return res.status(400).json({ success: false, message: 'Base portion must be at least 1' });
      recipe.basePortion = portion;
    }
    if (description !== undefined) recipe.description = description.trim();

    if (ingredients && Array.isArray(ingredients)) {
      if (ingredients.length === 0) {
        return res.status(400).json({ success: false, message: 'A recipe must contain at least one ingredient' });
      }

      const resolved = [];
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        const invItem = await Inventory.findById(ing.inventoryItem);
        if (!invItem) {
          return res.status(400).json({ success: false, message: `Inventory item not found for ingredient #${i + 1}` });
        }
        const qty = Number(ing.quantity);
        if (!qty || qty <= 0) {
          return res.status(400).json({ success: false, message: `Quantity for "${invItem.name}" must be greater than zero` });
        }
        resolved.push({
          inventoryItem: invItem._id,
          itemNameSnapshot: invItem.name,
          quantity: qty,
          unit: ing.unit || invItem.unit,
        });
      }
      recipe.ingredients = resolved;
    }

    recipe.updatedBy = req.user._id;
    await recipe.save();

    await createAudit(
      req,
      'UPDATE_RECIPE',
      'Recipe',
      recipe._id,
      null,
      recipe.toObject(),
      `Updated recipe formula for "${recipe.dishName}"`
    );

    const populated = await Recipe.findById(recipe._id)
      .populate('ingredients.inventoryItem', 'name currentQuantity unit minThreshold brand');

    res.json({
      success: true,
      message: `Recipe for "${recipe.dishName}" updated successfully!`,
      recipe: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/recipes/:id
// @desc    Delete a recipe (Head only)
// @access  Protected (Head only)
router.delete('/:id', authenticate, requireHead, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const dishName = recipe.dishName;
    await Recipe.findByIdAndDelete(req.params.id);

    await createAudit(
      req,
      'DELETE_RECIPE',
      'Recipe',
      req.params.id,
      recipe.toObject(),
      null,
      `Deleted recipe formula for "${dishName}"`
    );

    res.json({
      success: true,
      message: `Recipe for "${dishName}" has been deleted.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/recipes/:id/prepare
// @desc    Execute food preparation & automatically deduct proportional inventory stock (Head only)
// @access  Protected (Head only)
router.post('/:id/prepare', authenticate, requireHead, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }

    const targetPeople = Number(req.body.targetPeople);
    if (!targetPeople || targetPeople < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid number of people (at least 1) for preparation',
      });
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Recipe "${recipe.dishName}" has no ingredients configured. Please add ingredients first.`,
      });
    }

    // Step 1: Pre-flight stock check to ensure all items exist and have enough quantity
    const preparedDeductions = [];
    const insufficientAlerts = [];

    for (const ing of recipe.ingredients) {
      const invItem = await Inventory.findById(ing.inventoryItem);
      if (!invItem || invItem.isArchived) {
        return res.status(400).json({
          success: false,
          message: `Inventory item "${ing.itemNameSnapshot}" is no longer active or was removed from inventory.`,
        });
      }

      // Calculate proportional required quantity: (formulaQty / basePortion) * targetPeople
      const requiredQty = Number(((ing.quantity / recipe.basePortion) * targetPeople).toFixed(3));

      if (invItem.currentQuantity < requiredQty) {
        insufficientAlerts.push({
          itemName: invItem.name,
          unit: invItem.unit,
          available: invItem.currentQuantity,
          required: requiredQty,
          shortage: Number((requiredQty - invItem.currentQuantity).toFixed(3)),
        });
      }

      preparedDeductions.push({
        invItem,
        requiredQty,
        unit: ing.unit || invItem.unit,
      });
    }

    // If any item is insufficient, halt immediately and return clear details
    if (insufficientAlerts.length > 0) {
      const shortageDetails = insufficientAlerts
        .map((a) => `${a.itemName} (Needs ${a.required} ${a.unit}, Available: ${a.available} ${a.unit})`)
        .join('; ');

      return res.status(400).json({
        success: false,
        message: `Cannot prepare food due to insufficient stock: ${shortageDetails}`,
        insufficientItems: insufficientAlerts,
      });
    }

    // Step 2: Perform atomic deductions and record stock movements
    const deductionResults = [];
    for (const d of preparedDeductions) {
      const item = d.invItem;
      const prevQty = item.currentQuantity;
      const newQty = Math.max(0, Number((prevQty - d.requiredQty).toFixed(3)));

      item.currentQuantity = newQty;
      await item.save();

      // Log formal StockMovement
      const movement = new StockMovement({
        inventoryItem: item._id,
        itemNameSnapshot: item.name,
        movementType: 'consumed',
        previousQuantity: prevQty,
        changeQuantity: -d.requiredQty,
        resultingQuantity: newQty,
        unit: item.unit,
        reason: `Auto-Deduction: Prepared "${recipe.dishName}" for ${targetPeople} people (Formula: ${d.requiredQty} ${d.unit})${req.body.notes ? ` - ${req.body.notes}` : ''}`,
        performedBy: req.user._id,
        performedByName: req.user.fullName,
        performedByRole: req.user.role,
      });
      await movement.save();

      deductionResults.push({
        itemId: item._id,
        itemName: item.name,
        deducted: d.requiredQty,
        unit: item.unit,
        previousQuantity: prevQty,
        currentQuantity: newQty,
      });
    }

    // Step 3: Record audit log
    await createAudit(
      req,
      'PREPARE_FOOD',
      'Recipe',
      recipe._id,
      null,
      { targetPeople, dishName: recipe.dishName, deductions: deductionResults },
      `Prepared "${recipe.dishName}" for ${targetPeople} people. Automatically deducted ${deductionResults.length} inventory items.`
    );

    res.json({
      success: true,
      message: `Successfully prepared "${recipe.dishName}" for ${targetPeople} people! All ${deductionResults.length} ingredient stocks have been automatically deducted.`,
      dishName: recipe.dishName,
      targetPeople,
      deductions: deductionResults,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

