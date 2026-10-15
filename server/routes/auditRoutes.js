const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate, requireHead } = require('../middleware/auth');

// @route   GET /api/audit-logs
// @desc    View administrative audit trail (Head only)
// @access  Protected (Head only)
router.get('/', authenticate, requireHead, async (req, res) => {
  try {
    const { action, targetType, limit = 100 } = req.query;

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('performedBy', 'fullName username role');

    res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
