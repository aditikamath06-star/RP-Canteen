const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ingredient / item name is required'],
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Grains & Pulses',
        'Vegetables',
        'Dairy',
        'Spices & Condiments',
        'Flours',
        'Oils & Ghee',
        'Beverages & Tea',
        'Bakery & Snacks',
        'General Groceries',
      ],
      default: 'General Groceries',
    },
    currentQuantity: {
      type: Number,
      required: [true, 'Current stock quantity is required'],
      min: [0, 'Stock quantity cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, 'Measurement unit is required'],
      enum: ['kg', 'g', 'l', 'ml', 'packets', 'pieces', 'tins', 'bags', 'boxes'],
      default: 'kg',
    },
    minThreshold: {
      type: Number,
      required: [true, 'Minimum stock threshold is required'],
      min: [0, 'Threshold cannot be negative'],
      default: 5,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    unitPrice: {
      type: Number,
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    totalCost: {
      type: Number,
      min: [0, 'Total cost cannot be negative'],
      default: 0,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    expiryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for real-time stock status based on threshold
inventorySchema.virtual('stockStatus').get(function () {
  if (this.currentQuantity <= 0) {
    return 'out_of_stock';
  }
  if (this.currentQuantity <= this.minThreshold) {
    return 'low_stock';
  }
  return 'in_stock';
});

// Virtual for total monetary valuation of current stock
inventorySchema.virtual('totalValue').get(function () {
  return Number(((this.currentQuantity || 0) * (this.unitPrice || 0)).toFixed(2));
});

// Indexes for fast searching and filtering
inventorySchema.index({ name: 'text', notes: 'text' });
inventorySchema.index({ category: 1, isArchived: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
