const TaskPredefinedTitle = require('../models/taskManager.PredefinedTitle');
const TaskManagerTeam = require('../models/taskManager.Team');

// Helper to normalize subtitles array ensuring each item is { name: string, amount: number }
const normalizeSubtitles = (subtitles) => {
  if (!Array.isArray(subtitles)) return [];
  const seen = new Set();
  const result = [];

  for (const s of subtitles) {
    let name = '';
    let amount = 0;

    if (typeof s === 'string') {
      name = s.trim();
    } else if (s && typeof s === 'object') {
      name = (s.name || '').trim();
      amount = Math.max(0, parseFloat(s.amount) || 0);
    }

    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      result.push({ name, amount });
    }
  }

  return result;
};

const formatTitleDoc = (doc) => ({
  ...doc,
  subtitles: normalizeSubtitles(doc.subtitles),
});

// @desc    Get all predefined titles (with active subtitles)
// @route   GET /api/taskflow/tasks/predefined-titles
// @access  Private (all authenticated users)
exports.getPredefinedTitles = async (req, res, next) => {
  try {
    const rawTitles = await TaskPredefinedTitle.find({ isActive: true })
      .sort({ title: 1 })
      .lean();
    const titles = rawTitles.map(formatTitleDoc);
    res.json({
      success: true,
      data: titles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all predefined titles for admin (including inactive)
// @route   GET /api/taskflow/admin/predefined-titles
// @access  Private/Admin
exports.getAdminPredefinedTitles = async (req, res, next) => {
  try {
    const rawTitles = await TaskPredefinedTitle.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    const titles = rawTitles.map(formatTitleDoc);
    res.json({
      success: true,
      data: titles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create predefined title
// @route   POST /api/taskflow/admin/predefined-titles
// @access  Private/Admin
exports.createPredefinedTitle = async (req, res, next) => {
  try {
    const { title, subtitles } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a title',
      });
    }

    const trimmedTitle = title.trim();

    // Check duplicate
    const existing = await TaskPredefinedTitle.findOne({
      title: { $regex: new RegExp(`^${trimmedTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A predefined title with this name already exists',
      });
    }

    const cleanSubtitles = normalizeSubtitles(subtitles);

    const newTitle = await TaskPredefinedTitle.create({
      title: trimmedTitle,
      subtitles: cleanSubtitles,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: formatTitleDoc(newTitle.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update predefined title
// @route   PUT /api/taskflow/admin/predefined-titles/:id
// @access  Private/Admin
exports.updatePredefinedTitle = async (req, res, next) => {
  try {
    const { title, subtitles, isActive } = req.body;
    const doc = await TaskPredefinedTitle.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Predefined title not found',
      });
    }

    if (title && title.trim()) {
      const trimmedTitle = title.trim();
      const existing = await TaskPredefinedTitle.findOne({
        _id: { $ne: doc._id },
        title: { $regex: new RegExp(`^${trimmedTitle.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another predefined title with this name already exists',
        });
      }
      doc.title = trimmedTitle;
    }

    if (Array.isArray(subtitles)) {
      doc.subtitles = normalizeSubtitles(subtitles);
    }

    if (typeof isActive === 'boolean') {
      doc.isActive = isActive;
    }

    await doc.save();

    res.json({
      success: true,
      data: formatTitleDoc(doc.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete predefined title
// @route   DELETE /api/taskflow/admin/predefined-titles/:id
// @access  Private/Admin
exports.deletePredefinedTitle = async (req, res, next) => {
  try {
    const doc = await TaskPredefinedTitle.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Predefined title not found',
      });
    }

    res.json({
      success: true,
      message: 'Predefined title deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all teams with their predefined titles status
// @route   GET /api/taskflow/admin/predefined-titles/teams
// @access  Private/Admin
exports.getPredefinedTitleTeams = async (req, res, next) => {
  try {
    const teams = await TaskManagerTeam.find({ isActive: true })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort('name')
      .lean();

    res.json({
      success: true,
      teams,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle predefined titles enablement for a team
// @route   PATCH /api/taskflow/admin/predefined-titles/team/:teamId
// @access  Private/Admin
exports.updateTeamPredefinedTitlesSetting = async (req, res, next) => {
  try {
    const { predefinedTitlesEnabled } = req.body;
    if (typeof predefinedTitlesEnabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'predefinedTitlesEnabled must be a boolean',
      });
    }

    const team = await TaskManagerTeam.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found',
      });
    }

    team.predefinedTitlesEnabled = predefinedTitlesEnabled;
    await team.save();

    const populatedTeam = await TaskManagerTeam.findById(team._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .lean();

    res.json({
      success: true,
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};
