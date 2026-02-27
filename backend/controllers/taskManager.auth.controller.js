const jwt = require('jsonwebtoken');
const TaskManagerUser = require('../models/TaskManagerUser');
const TaskManagerTeam = require('../models/taskManager.Team');
const TaskManagerPendingInvitation = require('../models/taskManager.PendingInvitation');
const TaskManagerNotification = require('../models/taskManager.Notification');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { sendEmail } = require('../utils/taskManager.emailService');
const { getIO } = require('../utils/taskManager.socketManager');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// Helper function to accept pending invitations
const acceptPendingInvitations = async (userId, email) => {
  try {
    const pendingInvitations = await TaskManagerPendingInvitation.find({
      email: email.toLowerCase(),
      accepted: false,
      expiresAt: { $gt: Date.now() },
    }).populate('team');

    for (const invitation of pendingInvitations) {
      const team = invitation.team;

      // Check if user is already a member
      const isMember = team.members.some(
        (m) => m.user.toString() === userId.toString()
      );

      if (!isMember) {
        // Add user to team
        team.members.push({
          user: userId,
          role: invitation.role,
        });

        await team.save();

        // Mark invitation as accepted
        invitation.accepted = true;
        invitation.acceptedAt = new Date();
        await invitation.save();

        // Create notification for team owner
        const ownerNotification = await TaskManagerNotification.create({
          user: team.owner,
          type: 'team_joined',
          title: 'New Team Member',
          message: `A new member joined ${team.name}`,
          relatedTeam: team._id,
        });

        getIO().to(team.owner.toString()).emit('notification', ownerNotification);
      } else {
        // Mark as accepted even if already a member
        invitation.accepted = true;
        invitation.acceptedAt = new Date();
        await invitation.save();
      }
    }

    return pendingInvitations.length;
  } catch (error) {
    console.error('Error accepting pending invitations:', error);
    return 0;
  }
};

// @desc    Register user (DISABLED - Admin only can create users)
// @route   POST /api/auth/register
// @access  Public (DISABLED)
exports.register = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. Please contact your administrator to create an account.',
  });
};

/* ORIGINAL REGISTER FUNCTION - DISABLED FOR SECURITY
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, inviteToken } = req.body;

    // Check if user exists
    const userExists = await TaskManagerUser.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await TaskManagerUser.create({
      name,
      email,
      password,
      provider: 'local',
      emailVerified: false,
    });

    // Accept pending invitations if any
    const acceptedInvitations = await acceptPendingInvitations(user._id, email);

    // If specific invite token provided, accept it
    if (inviteToken) {
      const invitation = await TaskManagerPendingInvitation.findOne({
        inviteToken,
        email: email.toLowerCase(),
        accepted: false,
        expiresAt: { $gt: Date.now() },
      }).populate('team');

      if (invitation) {
        const team = invitation.team;
        const isMember = team.members.some(
          (m) => m.user.toString() === user._id.toString()
        );

        if (!isMember) {
          team.members.push({
            user: user._id,
            role: invitation.role,
          });
          await team.save();

          invitation.accepted = true;
          invitation.acceptedAt = new Date();
          await invitation.save();

          // Notify team owner
          const ownerNotification = await TaskManagerNotification.create({
            user: team.owner,
            type: 'team_joined',
            title: 'New Team Member',
            message: `${user.name} joined ${team.name}`,
            relatedTeam: team._id,
          });

          getIO().to(team.owner.toString()).emit('notification', ownerNotification);
        }
      }
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
      acceptedInvitations: acceptedInvitations,
    });
  } catch (error) {
    next(error);
  }
};
*/

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await TaskManagerUser.findOne({ email }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your administrator.',
      });
    }

    // Accept pending invitations if any
    const { inviteToken } = req.body;
    let acceptedInvitations = 0;

    if (inviteToken) {
      // If specific invite token provided, accept it
      const invitation = await TaskManagerPendingInvitation.findOne({
        inviteToken,
        email: email.toLowerCase(),
        accepted: false,
        expiresAt: { $gt: Date.now() },
      }).populate('team');

      if (invitation) {
        const team = invitation.team;
        const isMember = team.members.some(
          (m) => m.user.toString() === user._id.toString()
        );

        if (!isMember) {
          team.members.push({
            user: user._id,
            role: invitation.role,
          });
          await team.save();

          invitation.accepted = true;
          invitation.acceptedAt = new Date();
          await invitation.save();

          // Notify team owner
          const ownerNotification = await TaskManagerNotification.create({
            user: team.owner,
            type: 'team_joined',
            title: 'New Team Member',
            message: `${user.name} joined ${team.name}`,
            relatedTeam: team._id,
          });

          getIO().to(team.owner.toString()).emit('notification', ownerNotification);
          acceptedInvitations = 1;
        }
      }
    } else {
      // Accept all pending invitations for this email
      acceptedInvitations = await acceptPendingInvitations(user._id, email);
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isFirstLogin: user.isFirstLogin, // Include first login flag
      },
      acceptedInvitations: acceptedInvitations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    const { tokenId, inviteToken } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture, sub: googleId } = ticket.getPayload();

    // Check if user exists
    let user = await TaskManagerUser.findOne({ email });

    if (!user) {
      // User doesn't exist - do NOT create new user automatically
      return res.status(403).json({
        success: false,
        message: 'No account found with this email. Please contact your administrator to create an account.',
      });
    }

    // User exists - update Google info if needed
    if (!user.googleId) {
      user.googleId = googleId;
      user.avatar = picture;
      if (user.provider === 'local') {
        user.provider = 'google';
      }
      await user.save();
    }

    // Check if user account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your administrator.',
      });
    }

    // Accept pending invitations
    let acceptedInvitations = 0;

    if (inviteToken) {
      // If specific invite token provided, accept it
      const invitation = await TaskManagerPendingInvitation.findOne({
        inviteToken,
        email: email.toLowerCase(),
        accepted: false,
        expiresAt: { $gt: Date.now() },
      }).populate('team');

      if (invitation) {
        const team = invitation.team;
        const isMember = team.members.some(
          (m) => m.user.toString() === user._id.toString()
        );

        if (!isMember) {
          team.members.push({
            user: user._id,
            role: invitation.role,
          });
          await team.save();

          invitation.accepted = true;
          invitation.acceptedAt = new Date();
          await invitation.save();

          // Notify team owner
          const ownerNotification = await TaskManagerNotification.create({
            user: team.owner,
            type: 'team_joined',
            title: 'New Team Member',
            message: `${user.name} joined ${team.name}`,
            relatedTeam: team._id,
          });

          getIO().to(team.owner.toString()).emit('notification', ownerNotification);
          acceptedInvitations = 1;
        }
      }
    } else {
      // Accept all pending invitations for this email
      acceptedInvitations = await acceptPendingInvitations(user._id, email);
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
      },
      acceptedInvitations: acceptedInvitations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await TaskManagerUser.findById(req.user.id);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await TaskManagerUser.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email',
      });
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message: `You are receiving this email because you requested a password reset. Please make a PUT request to: \n\n ${resetUrl}`,
      });

      res.json({
        success: true,
        message: 'Email sent',
      });
    } catch (error) {
      console.error(error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await TaskManagerUser.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password on first login
// @route   POST /api/taskflow/auth/change-password-first-login
// @access  Private
exports.changePasswordFirstLogin = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const user = await TaskManagerUser.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if this is actually a first login
    if (!user.isFirstLogin) {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for first-time password setup',
      });
    }

    // Set new password and mark as not first login
    user.password = newPassword;
    user.isFirstLogin = false;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password changed successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isFirstLogin: false,
      },
    });
  } catch (error) {
    console.error('Change password first login error:', error);
    next(error);
  }
};


