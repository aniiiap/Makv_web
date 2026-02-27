const TaskManagerTeam = require('../models/taskManager.Team');
const TaskManagerUser = require('../models/TaskManagerUser');
const TaskManagerNotification = require('../models/taskManager.Notification');
const TaskManagerPendingInvitation = require('../models/taskManager.PendingInvitation');
const { sendEmail } = require('../utils/taskManager.emailService');
const crypto = require('crypto');
const { getIO } = require('../utils/taskManager.socketManager');

// @desc    Get all teams for a user
// @route   GET /api/teams
// @access  Private
exports.getTeams = async (req, res, next) => {
  try {
    const teams = await TaskManagerTeam.find({
      'members.user': req.user.id,
      isActive: true,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort('-createdAt');

    res.json({
      success: true,
      count: teams.length,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Private
exports.getTeam = async (req, res, next) => {
  try {
    const team = await TaskManagerTeam.findOne({
      _id: req.params.id,
      'members.user': req.user.id,
      isActive: true,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Private
exports.createTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const team = await TaskManagerTeam.create({
      name,
      description,
      owner: req.user.id,
    });

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
exports.updateTeam = async (req, res, next) => {
  try {
    let team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is owner or admin
    const member = team.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this team',
      });
    }

    team = await TaskManagerTeam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
exports.deleteTeam = async (req, res, next) => {
  try {
    const team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Only owner can delete
    if (team.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this team',
      });
    }

    team.isActive = false;
    await team.save();

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate invite token
// @route   POST /api/teams/:id/invite
// @access  Private
exports.generateInvite = async (req, res, next) => {
  try {
    const team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is owner or admin
    const member = team.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to invite members',
      });
    }

    const inviteToken = crypto.randomBytes(20).toString('hex');
    team.inviteToken = crypto.createHash('sha256').update(inviteToken).digest('hex');
    team.inviteTokenExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    await team.save();

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/taskflow/teams/join/${inviteToken}`;

    res.json({
      success: true,
      inviteToken,
      inviteUrl,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join team by token
// @route   POST /api/teams/join/:token
// @access  Private
exports.joinTeam = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const team = await TaskManagerTeam.findOne({
      inviteToken: hashedToken,
      inviteTokenExpire: { $gt: Date.now() },
      isActive: true,
    });

    if (!team) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invite token',
      });
    }

    // Check if user is already a member
    const isMember = team.members.some(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this team',
      });
    }

    // Add user to team
    team.members.push({
      user: req.user.id,
      role: 'member',
    });

    await team.save();

    // Create notification for team owner
    const notification = await TaskManagerNotification.create({
      user: team.owner,
      type: 'team_joined',
      title: 'New Team Member',
      message: `${req.user.name} joined ${team.name}`,
      relatedTeam: team._id,
    });

    getIO().to(team.owner.toString()).emit('notification', notification);

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to team (by email)
// @route   POST /api/teams/:id/members
// @access  Private
exports.addMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;

    const team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is owner or admin
    const member = team.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add members',
      });
    }

    // Find user by email
    const userToAdd = await TaskManagerUser.findOne({ email: email.toLowerCase() });

    // Check if user is already a member (if user exists)
    if (userToAdd) {
      const isMember = team.members.some(
        (m) => m.user.toString() === userToAdd._id.toString()
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: 'User is already a member of this team',
        });
      }

      // Add existing user to team
      team.members.push({
        user: userToAdd._id,
        role,
      });

      await team.save();

      // Create notification for added user
      const notification = await TaskManagerNotification.create({
        user: userToAdd._id,
        type: 'team_invite',
        title: 'You were added to a team',
        message: `You were added to ${team.name}`,
        relatedTeam: team._id,
      });

      getIO().to(userToAdd._id.toString()).emit('notification', notification);

      // Send email to existing user
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/taskflow/teams`;
        await sendEmail({
          email: userToAdd.email,
          subject: `You were added to ${team.name}`,
          message: `You were added to the team "${team.name}" by ${req.user.name}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">You've been added to a team!</h2>
              <p>Hello ${userToAdd.name},</p>
              <p><strong>${req.user.name}</strong> has added you to the team <strong>"${team.name}"</strong>.</p>
              ${team.description ? `<p>${team.description}</p>` : ''}
              <div style="margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Team</a>
              </div>
              <p style="color: #6B7280; font-size: 14px;">Visit your dashboard to see the team and start collaborating.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Log error but don't fail the request - user was already added to team
        // The error will be visible in backend logs for debugging
      }
    } else {
      // User doesn't exist - create pending invitation
      // Check if there's already a pending invitation for this email and team
      const existingInvitation = await TaskManagerPendingInvitation.findOne({
        email: email.toLowerCase(),
        team: team._id,
        accepted: false,
        expiresAt: { $gt: Date.now() },
      });

      if (existingInvitation) {
        return res.status(400).json({
          success: false,
          message: 'An invitation has already been sent to this email',
        });
      }

      // Generate invitation token
      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Create pending invitation
      const pendingInvitation = await TaskManagerPendingInvitation.create({
        email: email.toLowerCase(),
        team: team._id,
        role,
        invitedBy: req.user.id,
        inviteToken,
        expiresAt,
      });

      // Send invitation email with login/register link
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/taskflow/invite/${inviteToken}`;
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/taskflow/login?invite=${inviteToken}`;
        await sendEmail({
          email: email.toLowerCase(),
          subject: `You've been invited to join ${team.name}`,
          message: `You've been invited to join the team "${team.name}" by ${req.user.name}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4F46E5; margin-bottom: 20px;">You've been invited to join a team!</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hello,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">
                <strong>${req.user.name}</strong> has invited you to join the team <strong>"${team.name}"</strong>.
              </p>
              ${team.description ? `<p style="font-size: 16px; line-height: 1.6; color: #374151;">${team.description}</p>` : ''}
              <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <p style="margin: 0; font-size: 14px; color: #6B7280;">
                  To accept this invitation, please create an account or login if you already have one.
                </p>
              </div>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${loginUrl}" style="background-color: white; color: #4F46E5; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; border: 2px solid #4F46E5;">Login & Join</a>
              </div>
              <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #4F46E5; word-break: break-all;">${inviteUrl}</a>
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin-top: 30px;">
                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Delete the pending invitation if email fails
        await TaskManagerPendingInvitation.findByIdAndDelete(pendingInvitation._id);

        // Provide helpful error message
        let errorMessage = 'Failed to send invitation email.';
        if (emailError.message && emailError.message.includes('only send testing emails')) {
          errorMessage = 'Please configure EMAIL_FROM in .env file with your verified domain email (e.g., noreply@makv.in). The default email only works for testing.';
        } else if (emailError.message) {
          errorMessage = `Failed to send email: ${emailError.message}`;
        }

        return res.status(500).json({
          success: false,
          message: errorMessage,
        });
      }

      return res.json({
        success: true,
        message: 'Invitation sent successfully. User will be added to the team when they register.',
        data: {
          invitation: pendingInvitation,
        },
      });
    }

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:memberId
// @access  Private
exports.removeMember = async (req, res, next) => {
  try {
    const team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Check if user is owner or admin
    const member = team.members.find(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members',
      });
    }

    // Can't remove owner
    if (req.params.memberId === team.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove team owner',
      });
    }

    team.members = team.members.filter(
      (m) => m.user.toString() !== req.params.memberId
    );

    await team.save();

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Accept invitation by token
// @route   POST /api/teams/invitations/accept/:token
// @access  Private
exports.acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    // Find pending invitation
    const invitation = await TaskManagerPendingInvitation.findOne({
      inviteToken: token,
      accepted: false,
      expiresAt: { $gt: Date.now() },
    }).populate('team');

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token',
      });
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'This invitation was sent to a different email address',
      });
    }

    const team = invitation.team;

    // Check if user is already a member
    const isMember = team.members.some(
      (m) => m.user.toString() === req.user.id.toString()
    );

    if (isMember) {
      // Mark invitation as accepted anyway
      invitation.accepted = true;
      invitation.acceptedAt = new Date();
      await invitation.save();

      return res.json({
        success: true,
        message: 'You are already a member of this team',
        data: team,
      });
    }

    // Add user to team
    team.members.push({
      user: req.user.id,
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
      message: `${req.user.name} joined ${team.name}`,
      relatedTeam: team._id,
    });

    getIO().to(team.owner.toString()).emit('notification', ownerNotification);

    // Create notification for new member
    const memberNotification = await TaskManagerNotification.create({
      user: req.user.id,
      type: 'team_invite',
      title: 'Welcome to the team!',
      message: `You joined ${team.name}`,
      relatedTeam: team._id,
    });

    getIO().to(req.user.id.toString()).emit('notification', memberNotification);

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get invitation by token (public)
// @route   GET /api/teams/invitations/:token
// @access  Public
exports.getInvitation = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invitation = await TaskManagerPendingInvitation.findOne({
      inviteToken: token,
      accepted: false,
      expiresAt: { $gt: Date.now() },
    })
      .populate('team', 'name description')
      .populate('invitedBy', 'name email');

    if (!invitation) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation token',
      });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        team: invitation.team,
        invitedBy: invitation.invitedBy,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update member role
// @route   PUT /api/teams/:id/members/:memberId
// @access  Private
exports.updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const team = await TaskManagerTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    // Only owner can update roles
    if (team.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only team owner can update member roles',
      });
    }

    // Can't change owner role
    if (req.params.memberId === team.owner.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change owner role',
      });
    }

    const member = team.members.find(
      (m) => m.user.toString() === req.params.memberId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    member.role = role;
    await team.save();

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      success: true,
      data: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

