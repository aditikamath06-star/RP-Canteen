const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const { authenticate, requireHead, createAudit } = require('../middleware/auth');

// Helper to sanitize items and enforce strictly vegetarian policy
const sanitizeMenuItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item, idx) => {
    // If any item attempts to set vegetarian to false, reject or force true
    if (item.isVegetarian === false) {
      throw new Error(
        `Item "${item.name || 'unnamed'}" cannot be non-vegetarian. RP Canteen is strictly 100% vegetarian.`
      );
    }

    return {
      name: item.name ? item.name.trim() : 'Unnamed Item',
      category: item.category || 'Lunch',
      description: item.description ? item.description.trim() : '',
      imageUrl: item.imageUrl ? item.imageUrl.trim() : '',
      isVegetarian: true,
      isAvailable: item.isAvailable !== false, // default true
      displayOrder: typeof item.displayOrder === 'number' ? item.displayOrder : idx,
    };
  });
};

// @route   GET /api/menus/published
// @desc    Get published menu for a specific date (PUBLIC)
// @access  Public
router.get('/published', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const requestedDate = req.query.date || todayStr;

    // Strict security & privacy: only menus with status 'published' are retrieved!
    const menu = await Menu.findOne({
      date: requestedDate,
      status: 'published',
    });

    if (!menu) {
      return res.status(200).json({
        success: false,
        menu: null,
        date: requestedDate,
        message: "The menu hasn't been published yet. Please check back later!",
      });
    }

    // Sort items by category order or displayOrder
    const sortedItems = [...menu.items].sort((a, b) => a.displayOrder - b.displayOrder);

    res.json({
      success: true,
      menu: {
        _id: menu._id,
        date: menu.date,
        title: menu.title,
        status: menu.status,
        publishedAt: menu.publishedAt,
        specialNote: menu.specialNote,
        items: sortedItems,
      },
    });
  } catch (error) {
    console.error('[Menu Public Fetch Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve menu. Please try again later.',
    });
  }
});

// @route   GET /api/menus/published-dates
// @desc    Get list of dates that have published menus
// @access  Public
router.get('/published-dates', async (req, res) => {
  try {
    const publishedMenus = await Menu.find(
      { status: 'published' },
      'date title publishedAt'
    ).sort({ date: -1 });

    res.json({
      success: true,
      dates: publishedMenus.map((m) => ({
        date: m.date,
        title: m.title,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/menus/all
// @desc    Get all menus (including drafts) for staff management
// @access  Protected (Head & Workers)
router.get('/all', authenticate, async (req, res) => {
  try {
    const menus = await Menu.find()
      .populate('createdBy', 'fullName username')
      .populate('updatedBy', 'fullName username')
      .sort({ date: -1 });

    res.json({
      success: true,
      menus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/menus/:id
// @desc    Get single menu by ID (staff)
// @access  Protected
router.get('/:id', authenticate, async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }
    res.json({ success: true, menu });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/menus
// @desc    Create a new daily menu (Head only)
// @access  Protected (Head of Canteen only)
router.post('/', authenticate, requireHead, async (req, res) => {
  try {
    const { date, title, items, specialNote, status } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Valid date in YYYY-MM-DD format is required.',
      });
    }

    const existingMenu = await Menu.findOne({ date });
    if (existingMenu) {
      return res.status(409).json({
        success: false,
        message: `A menu for date ${date} already exists. You can edit the existing menu instead.`,
      });
    }

    let sanitizedItems = [];
    try {
      sanitizedItems = sanitizeMenuItems(items);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const newMenu = new Menu({
      date,
      title: title || 'Daily Vegetarian Canteen Menu',
      status: status === 'published' ? 'published' : 'draft',
      publishedAt: status === 'published' ? new Date() : null,
      items: sanitizedItems,
      specialNote: specialNote || '',
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await newMenu.save();

    await createAudit({
      req,
      action: status === 'published' ? 'MENU_PUBLISH' : 'MENU_CREATE_DRAFT',
      targetType: 'Menu',
      targetId: newMenu._id,
      details: {
        date,
        itemCount: sanitizedItems.length,
        status: newMenu.status,
      },
    });

    res.status(201).json({
      success: true,
      message: `Menu for ${date} created successfully as ${newMenu.status}.`,
      menu: newMenu,
    });
  } catch (error) {
    console.error('[Menu Creation Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/menus/:id
// @desc    Update menu details & food items (Head only)
// @access  Protected (Head of Canteen only)
router.put('/:id', authenticate, requireHead, async (req, res) => {
  try {
    const { title, items, specialNote, status } = req.body;
    const menu = await Menu.findById(req.params.id);

    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }

    if (items) {
      try {
        menu.items = sanitizeMenuItems(items);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
    }

    if (title !== undefined) menu.title = title;
    if (specialNote !== undefined) menu.specialNote = specialNote;

    if (status && ['draft', 'published'].includes(status)) {
      if (status === 'published' && menu.status !== 'published') {
        menu.publishedAt = new Date();
      }
      menu.status = status;
    }

    menu.updatedBy = req.user._id;
    await menu.save();

    await createAudit({
      req,
      action: 'MENU_UPDATE',
      targetType: 'Menu',
      targetId: menu._id,
      details: {
        date: menu.date,
        itemCount: menu.items.length,
        status: menu.status,
      },
    });

    res.json({
      success: true,
      message: 'Menu updated successfully.',
      menu,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/menus/:id/publish
// @desc    Publish or unpublish (save as draft) a menu (Head only)
// @access  Protected (Head of Canteen only)
router.patch('/:id/publish', authenticate, requireHead, async (req, res) => {
  try {
    const { status } = req.body; // 'published' or 'draft'
    if (!['published', 'draft'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "published" or "draft".',
      });
    }

    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }

    menu.status = status;
    if (status === 'published') {
      menu.publishedAt = new Date();
    }
    menu.updatedBy = req.user._id;
    await menu.save();

    await createAudit({
      req,
      action: status === 'published' ? 'MENU_PUBLISHED' : 'MENU_UNPUBLISHED',
      targetType: 'Menu',
      targetId: menu._id,
      details: { date: menu.date, status },
    });

    res.json({
      success: true,
      message: `Menu for ${menu.date} is now ${status}.`,
      menu,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PATCH /api/menus/:id/item-availability
// @desc    Quick toggle food item availability (Head only)
// @access  Protected (Head of Canteen only)
router.patch(
  '/:id/item-availability',
  authenticate,
  requireHead,
  async (req, res) => {
    try {
      const { itemId, isAvailable } = req.body;
      const menu = await Menu.findById(req.params.id);

      if (!menu) {
        return res.status(404).json({ success: false, message: 'Menu not found.' });
      }

      const item = menu.items.id(itemId);
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: 'Menu item not found in this menu.' });
      }

      item.isAvailable = Boolean(isAvailable);
      menu.updatedBy = req.user._id;
      await menu.save();

      await createAudit({
        req,
        action: 'MENU_ITEM_AVAILABILITY',
        targetType: 'Menu',
        targetId: menu._id,
        details: {
          date: menu.date,
          itemName: item.name,
          isAvailable: item.isAvailable,
        },
      });

      res.json({
        success: true,
        message: `Availability for "${item.name}" updated to ${
          item.isAvailable ? 'Available' : 'Unavailable'
        }.`,
        menu,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   DELETE /api/menus/:id
// @desc    Delete a menu draft or obsolete menu (Head only)
// @access  Protected (Head of Canteen only)
router.delete('/:id', authenticate, requireHead, async (req, res) => {
  try {
    const menu = await Menu.findById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found.' });
    }

    const menuDate = menu.date;
    await Menu.findByIdAndDelete(req.params.id);

    await createAudit({
      req,
      action: 'MENU_DELETED',
      targetType: 'Menu',
      targetId: req.params.id,
      details: { date: menuDate },
    });

    res.json({
      success: true,
      message: `Menu for ${menuDate} has been removed.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
