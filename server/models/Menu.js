const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Meal category is required'],
      enum: [
        'Breakfast',
        'Lunch',
        'Evening Snacks',
        'Dinner',
        'Beverages',
        'Sweets & Desserts',
      ],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isVegetarian: {
      type: Boolean,
      default: true,
      validate: {
        validator: function (v) {
          // Strictly reject any non-vegetarian item
          return v === true;
        },
        message: 'RP Canteen serves exclusively 100% vegetarian food. Non-vegetarian items are strictly prohibited.',
      },
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

// Note: Strict institutional requirement - NO food price fields are included in the schema.

const menuSchema = new mongoose.Schema(
  {
    date: {
      type: String, // 'YYYY-MM-DD'
      required: [true, 'Menu date (YYYY-MM-DD) is required'],
      unique: true,
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Menu date must be in YYYY-MM-DD format'],
    },
    title: {
      type: String,
      default: 'Daily Vegetarian Canteen Menu',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    items: [menuItemSchema],
    specialNote: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

menuSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Menu', menuSchema);
