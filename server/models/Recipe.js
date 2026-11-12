const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: [true, 'Inventory item reference is required'],
    },
    itemNameSnapshot: {
      type: String,
      required: [true, 'Item name snapshot is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.0001, 'Quantity must be greater than zero'],
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
      trim: true,
    },
  },
  { _id: true }
);

const recipeSchema = new mongoose.Schema(
  {
    dishName: {
      type: String,
      required: [true, 'Dish name is required'],
      trim: true,
    },
    dishNameKn: {
      type: String,
      trim: true,
      default: '',
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
      default: 'Breakfast',
    },
    basePortion: {
      type: Number,
      required: [true, 'Base number of people/servings is required'],
      min: [1, 'Base portion must be at least 1 person'],
      default: 50,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    ingredients: [recipeIngredientSchema],
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

recipeSchema.index({ dishName: 1 });
recipeSchema.index({ category: 1 });

module.exports = mongoose.model('Recipe', recipeSchema);

