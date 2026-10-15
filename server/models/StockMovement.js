const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true,
      index: true,
    },
    itemNameSnapshot: {
      type: String,
      required: true,
      trim: true,
    },
    movementType: {
      type: String,
      required: [true, 'Movement type is required'],
      enum: {
        values: ['received', 'consumed', 'discarded', 'correction'],
        message: '{VALUE} is not a valid movement type',
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
    },
    changeQuantity: {
      type: Number,
      required: true,
    },
    resultingQuantity: {
      type: Number,
      required: true,
      min: [0, 'Resulting stock cannot be negative'],
    },
    unit: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'A reason for stock movement is required'],
      trim: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ inventoryItem: 1, createdAt: -1 });
stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
