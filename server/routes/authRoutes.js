const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate, createAudit } = require('../middleware/auth');

// @route   POST /api/auth/login
// @desc    Authenticate staff credentials and issue JWT
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/email and password.',
      });
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query for user by either username or email
    const user = await User.findOne({
      $or: [{ username: cleanIdentifier }, { email: cleanIdentifier }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This staff account has been deactivated. Contact the head of canteen.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please verify your username and password.',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Sign JWT
    const payload = {
      id: user._id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'rp_canteen_super_secure_jwt_secret_token_2026_dev',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Audit log
    await createAudit({
      req: { user, ip: req.ip, connection: req.connection },
      action: 'STAFF_LOGIN',
      targetType: 'User',
      targetId: user._id,
      details: { role: user.role, username: user.username },
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred during authentication.',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get authenticated user session details
// @access  Protected (All authenticated staff)
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      lastLogin: req.user.lastLogin,
    },
  });
});

// @route   POST /api/auth/logout
// @desc    Record staff logout
// @access  Protected
router.post('/logout', authenticate, async (req, res) => {
  await createAudit({
    req,
    action: 'STAFF_LOGOUT',
    targetType: 'User',
    targetId: req.user._id,
    details: { role: req.user.role, username: req.user.username },
  });

  res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

module.exports = router;
