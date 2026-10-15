const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireHead, createAudit } = require('../middleware/auth');

// @route   GET /api/staff
// @desc    List all staff accounts (Head only)
// @access  Protected (Head only)
router.get('/', authenticate, requireHead, async (req, res) => {
  try {
    const staff = await User.find().select('-password').sort({ role: 1, fullName: 1 });
    res.json({ success: true, count: staff.length, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/staff
// @desc    Provision a new worker or staff account (Head only)
// @access  Protected (Head only)
router.post('/', authenticate, requireHead, async (req, res) => {
  try {
    const { username, email, fullName, password, role = 'worker' } = req.body;

    if (!username || !email || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, full name, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with that username or email already exists.',
      });
    }

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      fullName: fullName.trim(),
      password,
      role: role === 'head' ? 'head' : 'worker',
      isActive: true,
    });

    await newUser.save();

    await createAudit({
      req,
      action: 'STAFF_ACCOUNT_CREATED',
      targetType: 'User',
      targetId: newUser._id,
      details: {
        username: newUser.username,
        role: newUser.role,
        fullName: newUser.fullName,
      },
    });

    res.status(201).json({
      success: true,
      message: `Staff account "${newUser.username}" (${newUser.role}) created successfully.`,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/staff/:id/status
// @desc    Toggle staff active status (Head only)
// @access  Protected (Head only)
router.patch('/:id/status', authenticate, requireHead, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent head from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own active head-of-canteen account.',
      });
    }

    user.isActive = Boolean(isActive);
    await user.save();

    await createAudit({
      req,
      action: user.isActive ? 'STAFF_ACCOUNT_ACTIVATED' : 'STAFF_ACCOUNT_DEACTIVATED',
      targetType: 'User',
      targetId: user._id,
      details: { username: user.username, isActive: user.isActive },
    });

    res.json({
      success: true,
      message: `User "${user.username}" status updated to ${user.isActive ? 'Active' : 'Deactivated'}.`,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
