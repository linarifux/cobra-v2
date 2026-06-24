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
  },
  // NEW: Track weight for this specific carton configuration
  weightPerCarton: {
    type: Number,
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

    // Array for multiple carton configurations
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
    // NEW: The grand total weight of all cartons combined
    totalWeight: {
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

// Pre-save hook: Auto-generate ID and guarantee mathematical accuracy
receivingSchema.pre('save', function () {
  // 1. Generate unique Receiving ID if one doesn't exist
  if (!this.receivingId) {
    this.receivingId = `RCV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // 2. Auto-calculate totals based on the breakdown array (Guarantees DB integrity)
  if (this.cartonBreakdown && this.cartonBreakdown.length > 0) {
    this.numberOfCartons = this.cartonBreakdown.reduce((sum, item) => sum + (item.cartons || 0), 0);
    
    this.quantity = this.cartonBreakdown.reduce((sum, item) => 
      sum + ((item.cartons || 0) * (item.unitsPerCarton || 0)), 0
    );
    
    this.totalWeight = this.cartonBreakdown.reduce((sum, item) => 
      sum + ((item.cartons || 0) * (item.weightPerCarton || 0)), 0
    );
  }

});

// Indexes
receivingSchema.index({ customer: 1 });
receivingSchema.index({ inventoryItem: 1 });
receivingSchema.index({ receivingId: 1 });

export default mongoose.model('Receiving', receivingSchema);