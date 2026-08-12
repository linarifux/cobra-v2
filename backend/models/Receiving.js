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
  // Track weight for this specific carton configuration
  weightPerCarton: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false }); 

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
    
    // Relational Fields: Vendor and Carrier
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor'
    },
    fallbackVendor: {
      type: String,
      trim: true
    },
    
    carrier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorCarrier'
    },
    fallbackCarrier: {
      type: String,
      trim: true
    },
    
    // Vendor Contact Fields (Cached at time of receipt)
    vendorAddress: { type: String, trim: true, default: '' },
    vendorCityStateZip: { type: String, trim: true, default: '' },
    vendorPhone: { type: String, trim: true, default: '' },
    
    // Core Relational Fields
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
    
    locations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }],

    // Item Details
    description: { type: String, trim: true },
    description2: { type: String, trim: true },
    lot: { type: String, trim: true, default: 'N/A' },

    // Quantitative Data
    quantity: {
      type: Number,
      required: [true, 'Received quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    pallets: { type: Number, default: 0, min: 0 },
    numberOfCartons: { type: Number, default: 0, min: 0 },

    cartonBreakdown: [cartonBreakdownSchema],

    // Legacy Fallbacks
    cartonsPerSkid: { type: Number, default: 0, min: 0 },
    unitsPerCarton: { type: Number, default: 0, min: 0 },
    
    totalWeight: { type: Number, default: 0, min: 0 },
    palletProcessingFee: { type: Number, default: 0, min: 0 },
    charge: { type: Number, default: 0, min: 0 }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Pre-save hook: Auto-generate ID and guarantee mathematical accuracy
receivingSchema.pre('save', function () {
  if (!this.receivingId) {
    this.receivingId = `RCV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  if (this.cartonBreakdown && this.cartonBreakdown.length > 0) {
    this.numberOfCartons = this.cartonBreakdown.reduce((sum, item) => sum + (item.cartons || 0), 0);
    this.quantity = this.cartonBreakdown.reduce((sum, item) => sum + ((item.cartons || 0) * (item.unitsPerCarton || 0)), 0);
    this.totalWeight = this.cartonBreakdown.reduce((sum, item) => sum + ((item.cartons || 0) * (item.weightPerCarton || 0)), 0);
  }
});

// Indexes
receivingSchema.index({ customer: 1 });
receivingSchema.index({ inventoryItem: 1 });
receivingSchema.index({ vendor: 1 });
receivingSchema.index({ carrier: 1 });

export default mongoose.model('Receiving', receivingSchema);