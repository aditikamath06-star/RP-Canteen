const express = require('express');
const router = express.Router();
const StockMovement = require('../models/StockMovement');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/movements
// @desc    View persistent stock movement history (Workers & Head can view; cannot edit/delete)
// @access  Protected (All authenticated staff)
router.get('/', authenticate, async (req, res) => {
  try {
    const { itemId, movementType, limit = 100 } = req.query;

    const query = {};
    if (itemId) {
      query.inventoryItem = itemId;
    }
    if (movementType && movementType !== 'all') {
      query.movementType = movementType;
    }

    const movements = await StockMovement.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('performedBy', 'fullName username role');

    res.json({
      success: true,
      count: movements.length,
      movements,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
