const mongoose = require('mongoose');

const requestedDishSchema = new mongoose.Schema(
  {
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
    },
    dishName: {
      type: String,
      required: true,
      trim: true,
    },
    dishNameKn: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: true }
);

const branchOrderSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: [true, 'Branch ID is required'],
      enum: ['head_office', 'mudranalaya', 'blood_bank', 'samraksha', 'ashtanga_yoga'],
      index: true,
    },
    branchNameEn: {
      type: String,
      required: true,
    },
    branchNameKn: {
      type: String,
      required: true,
    },
    orderType: {
      type: String,
      required: true,
      enum: ['daily_recurring', 'special_event'],
      index: true,
    },

    // --- FOR DAILY RECURRING INDENTS ---
    dailyRecurring: {
      isActive: {
        type: Boolean,
        default: true,
      },
      breakfastCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      lunchCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      snacksCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      dinnerCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      notes: {
        type: String,
        default: '',
        trim: true,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      // Track dates on which stock was auto-deducted for this recurring order
      deductionsHistory: [
        {
          date: { type: String, required: true }, // 'YYYY-MM-DD'
          mealSession: { type: String, required: true },
          peopleCount: { type: Number, required: true },
          deductedAt: { type: Date, default: Date.now },
          deductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          movements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' }],
        },
      ],
    },

    // --- FOR SPECIAL EVENT / FUNCTION ORDERS ---
    specialEvent: {
      eventName: {
        type: String,
        trim: true,
        default: '',
      },
      eventDate: {
        type: String, // 'YYYY-MM-DD'
        trim: true,
        default: '',
      },
      mealSession: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Evening Snacks', 'Dinner'],
        default: 'Lunch',
      },
      peopleCount: {
        type: Number,
        min: 1,
        default: 1,
      },
      requestedDishes: [requestedDishSchema],
      specialInstructions: {
        type: String,
        default: '',
        trim: true,
      },
    },

    // --- STATUS & APPROVAL ---
    status: {
      type: String,
      enum: ['pending', 'approved', 'stock_deducted', 'rejected', 'active', 'paused'],
      default: 'pending',
      index: true,
    },
    approvalDetails: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvedAt: {
        type: Date,
      },
      deductedAt: {
        type: Date,
      },
      rejectionReason: {
        type: String,
        default: '',
      },
      stockDeductions: [
        {
          inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
          itemName: String,
          quantityDeducted: Number,
          unit: String,
          movementId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockMovement' },
        },
      ],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

branchOrderSchema.index({ branchId: 1, orderType: 1 });

module.exports = mongoose.model('BranchOrder', branchOrderSchema);

