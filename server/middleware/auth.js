const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Authenticate token middleware
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No authorization token provided.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'rp_canteen_super_secure_jwt_secret_token_2026_dev'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account belonging to this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated. Please contact canteen administration.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.',
    });
  }
};

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Only [${roles.join(
          ', '
        )}] have permission.`,
      });
    }

    next();
  };
};

// Helper function to create audit log safely
const createAudit = async ({
  req,
  action,
  targetType,
  targetId,
  details = {},
}) => {
  try {
    // Sanitize details: strip any password, token, or auth fields
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.jwt;

    await AuditLog.create({
      action,
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username,
      performedByRole: req.user.role,
      targetType,
      targetId: targetId ? targetId.toString() : undefined,
      details: sanitizedDetails,
      ipAddress: req.ip || req.connection?.remoteAddress,
    });
  } catch (err) {
    console.error('[Audit Log Error]: Failed to write audit record:', err.message);
  }
};

module.exports = {
  authenticate,
  requireRole,
  requireHead: requireRole('head'),
  createAudit,
};
