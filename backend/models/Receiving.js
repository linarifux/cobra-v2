import mongoose from 'mongoose';

const cartonBreakdownSchema = new mongoose.Schema({
  cartons: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unitsPerCarton: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, { _id: false }); // Disable separate _ids for these subdocuments to keep it clean

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
    
    // Vendor and Carrier
    vendor: {
      type: String,
      trim: true,
      required: [true, 'Vendor name is required']
    },
    carrier: {
      type: String,
      trim: true,
      default: 'Unknown Carrier'
    },
    
    // Vendor Contact Fields
    vendorAddress: {
      type: String,
      trim: true,
      default: ''
    },
    vendorCityStateZip: {
      type: String,
      trim: true,
      default: ''
    },
    vendorPhone: {
      type: String,
      trim: true,
      default: ''
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
    numberOfCartons: {
      type: Number,
      default: 0,
      min: 0
    },

    // NEW: Array for multiple carton configurations
    cartonBreakdown: [cartonBreakdownSchema],

    // Legacy Fallbacks (Kept for backwards compatibility if old data exists)
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

receivingSchema.pre('save', function () {
  if (!this.receivingId) {
    this.receivingId = `RCV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
});

// Indexes
receivingSchema.index({ customer: 1 });
receivingSchema.index({ inventoryItem: 1 });
receivingSchema.index({ receivingId: 1 });

export default mongoose.model('Receiving', receivingSchema);