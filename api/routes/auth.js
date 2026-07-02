const express = require('express');
const rateLimit = require('express-rate-limit');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwtUtils = require('../utils/jwt');
const { authenticated, adminOnly, adminOrEditor, sensitiveOperation } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Multer storage for avatars
const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + req.user.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Initialize Google OAuth2 Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const generalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * @route   POST /api/auth/register
 * @desc    Register a new customer
 * @access  Public
 */
router.post('/register', generalAuthLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new customer user
    const user = await User.create({
      name,
      email,
      password,
      role: 'customer'
    });

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = jwtUtils.generateTokenPair(user);

    // Store refresh token
    const refreshTokenData = {
      token: refreshToken,
      expiresAt: new Date(Date.now() + jwtUtils.getExpiryTime('7d')),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    };
    user.refreshTokens.push(refreshTokenData);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        },
        accessToken,
        refreshToken,
        expiresIn
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return tokens, optionally with 2FA
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user with password and 2FA secret
    const user = await User.findOne({ email, isActive: true }).select('+password +twoFactorSecret');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to failed login attempts'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // If 2FA is enabled, verify the code
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication code is required',
          requireTwoFactor: true
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          message: 'Invalid two-factor authentication code'
        });
      }
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = jwtUtils.generateTokenPair(user);

    // Store refresh token
    const refreshTokenData = {
      token: refreshToken,
      expiresAt: new Date(Date.now() + jwtUtils.getExpiryTime('7d')),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    };

    user.refreshTokens.push(refreshTokenData);
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          twoFactorEnabled: user.twoFactorEnabled
        },
        accessToken,
        refreshToken,
        expiresIn
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate or register user via Google OAuth
 * @access  Public
 */
router.post('/google', generalAuthLimiter, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Google credential is required'
      });
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'] || payload['given_name'] + ' ' + payload['family_name'];
    const picture = payload['picture'] || null;

    // Check if user already exists
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });

      if (user) {
        // User exists, link Google account
        user.googleId = googleId;
        user.googleProfile = payload;
        if (picture && !user.avatar) user.avatar = picture;
      } else {
        // Create new user
        user = await User.create({
          name,
          email,
          googleId,
          googleProfile: payload,
          avatar: picture,
          role: 'customer'
        });
      }
    } else {
      // Update profile if needed
      if (picture && !user.avatar) user.avatar = picture;
      user.googleProfile = payload;
    }

    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken, expiresIn } = jwtUtils.generateTokenPair(user);

    // Store refresh token
    const refreshTokenData = {
      token: refreshToken,
      expiresAt: new Date(Date.now() + jwtUtils.getExpiryTime('7d')),
      userAgent: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || req.connection.remoteAddress
    };

    user.refreshTokens.push(refreshTokenData);
    await user.save();

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          twoFactorEnabled: user.twoFactorEnabled
        },
        accessToken,
        refreshToken,
        expiresIn
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', generalAuthLimiter, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwtUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Find user and validate refresh token
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Check if refresh token exists and is valid
    const tokenIndex = user.refreshTokens.findIndex(
      rt => rt.token === refreshToken && rt.expiresAt > new Date()
    );

    if (tokenIndex === -1) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new access token
    const { accessToken, expiresIn } = jwtUtils.generateTokenPair(user);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        expiresIn
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
router.post('/logout', authenticated(), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user && refreshToken) {
      // Remove the specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        rt => rt.token !== refreshToken
      );
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ...
/**
 * @route   GET /api/auth/verify
 * @desc    Verify if the token is valid
 * @access  Private
 */
router.get('/verify', authenticated(), async (req, res) => { // Change router.post to router.get
  try {
    res.json({
      success: true,
      message: 'Token is valid'
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// ...

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticated(), sensitiveOperation, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticated(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/me/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/me/avatar', authenticated(), avatarUpload.single('avatar'), auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar if it exists
    if (user.avatar && user.avatar.startsWith('/uploads/')) {
      const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    // Update user with new avatar
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/auth/me/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/me/avatar', authenticated(), auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar if it exists
    if (user.avatar && user.avatar.startsWith('/uploads/')) {
      const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
      try {
        await fs.unlink(oldAvatarPath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
    }

    // Update user to remove avatar
    user.avatar = null;
    await user.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticated(), auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, avatar, currentPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic info
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email;
    }
    if (avatar) user.avatar = avatar;

    // Update password if provided
    if (currentPassword && newPassword) {
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters'
        });
      }
      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/users', adminOnly(), async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshTokens');
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/users
 * @desc    Create a new user (admin only)
 * @access  Private (Admin)
 */
router.post('/users', adminOnly(), auditLog('CREATE', 'USER'), async (req, res) => {
  try {
    const { name, email, password, role = 'editor' } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check allowed admin emails if setting admin role
    if (role === 'admin') {
      const allowedAdminEmails = (process.env.ALLOWED_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);
      
      if (!allowedAdminEmails.includes(email.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'This email is not authorized to be an admin'
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/auth/users/:id
 * @desc    Update a user (admin only)
 * @access  Private (Admin)
 */
router.put('/users/:id', adminOnly(), auditLog('UPDATE', 'USER'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, role, isActive, password } = req.body;

    // Prevent admin from updating themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot update your own account using this endpoint. Use /api/auth/me instead.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check allowed admin emails if setting admin role
    if (role === 'admin') {
      const allowedAdminEmails = (process.env.ALLOWED_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(e => e);
      
      const targetEmail = email ? email.toLowerCase() : user.email.toLowerCase();
      if (!allowedAdminEmails.includes(targetEmail)) {
        return res.status(400).json({
          success: false,
          message: 'This email is not authorized to be an admin'
        });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      user.email = email;
    }
    if (role && ['admin', 'editor', 'viewer', 'customer'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password) user.password = password;

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/auth/users/:id
 * @desc    Delete a user (admin only)
 * @access  Private (Admin)
 */
router.delete('/users/:id', adminOnly(), auditLog('DELETE', 'USER'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/audit-logs
 * @desc    Get audit logs (admin only)
 * @access  Private (Admin)
 */
router.get('/audit-logs', adminOnly(), async (req, res) => {
  try {
    const { limit = 50, page = 1, resource, action } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (resource) query.resource = resource;
    if (action) query.action = action;

    const logs = await AuditLog.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==============================================
// TWO-FACTOR AUTHENTICATION ROUTES
// ==============================================

/**
 * @route   POST /api/auth/2fa/setup
 * @desc    Setup 2FA for a user
 * @access  Private
 */
router.post('/2fa/setup', authenticated(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+twoFactorSecret');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate 2FA secret
    const secret = speakeasy.generateSecret({
      name: `A-KIME (${user.email})`
    });

    // Save temporary secret
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      data: {
        secret: secret.base32,
        qrCode
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/verify
 * @desc    Verify 2FA setup and enable it
 * @access  Private
 */
router.post('/2fa/verify', authenticated(), async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA not set up'
      });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/2fa/disable
 * @desc    Disable 2FA for a user
 * @access  Private
 */
router.post('/2fa/disable', authenticated(), sensitiveOperation, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==============================================
// GDPR COMPLIANCE ROUTES
// ==============================================

/**
 * @route   GET /api/auth/gdpr/export
 * @desc    Request data export for GDPR compliance
 * @access  Private
 */
router.get('/gdpr/export', authenticated(), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update export request timestamp
    user.dataExportRequestedAt = new Date();
    await user.save();

    // Compile user data
    const userData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        dataConsent: user.dataConsent
      },
      requestDate: new Date()
    };

    // In a real app, you'd generate a file and send it via email
    // For this example, we'll return the data directly
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/gdpr/delete
 * @desc    Request account deletion for GDPR compliance
 * @access  Private
 */
router.post('/gdpr/delete', authenticated(), sensitiveOperation, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Update deletion request timestamp
    user.dataDeletionRequestedAt = new Date();
    // You could also mark the account for deletion or delete it immediately
    // user.isActive = false; // Uncomment to disable account
    await user.save();

    // In a real app, you'd send a confirmation email
    res.json({
      success: true,
      message: 'Account deletion request received. Your account will be deleted within 30 days.'
    });
  } catch (error) {
    console.error('GDPR delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
