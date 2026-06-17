import mongoose from 'mongoose';

const receivingSchema = new mongoose.Schema(
  {
    receivingId: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true
    },
    dateReceived: {
      type: Date,
      default: Date.now,
      required: [true, 'Date received is required']
    },
    vendor: {
      type: String,
      trim: true,
      required: [true, 'Vendor name is required']
    },
    
    // Relational Fields
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'A customer reference is required']
    },
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: [true, 'An inventory item reference is required']
    },
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      // Optional: You might receive items into a temporary staging area first
    },

    // Item Details
    description: {
      type: String,
      trim: true
    },
    description2: {
      type: String,
      trim: true
    },
    lot: {
      type: String,
      trim: true,
      default: 'N/A'
    },

    // Quantitative Data
    quantity: {
      type: Number,
      required: [true, 'Received quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    skids: {
      type: Number,
      default: 0,
      min: 0
    },
    cartonsPerSkid: {
      type: Number,
      default: 0,
      min: 0
    },
    unitsPerCarton: {
      type: Number,
      default: 0,
      min: 0
    },
    numberOfCartons: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Financial & Weight
    unitWeight: {
      type: Number,
      default: 0,
      min: 0
    },
    charge: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook to automatically generate a unique Receiving ID if one isn't provided
receivingSchema.pre('save', function (next) {
  if (!this.receivingId) {
    // Generates a random 6-character alphanumeric string appended to RCV-
    this.receivingId = `RCV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Indexes to speed up common queries (e.g., finding all receipts for a customer or item)
receivingSchema.index({ customer: 1 });
receivingSchema.index({ inventoryItem: 1 });
receivingSchema.index({ receivingId: 1 });

export default mongoose.model('Receiving', receivingSchema);