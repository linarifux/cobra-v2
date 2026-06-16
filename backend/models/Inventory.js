import mongoose from 'mongoose';

// Sub-schema for the Stock Movement Audit Ledger
const auditLedgerSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  event: { type: String, required: true }, // e.g., "Baseline Audit Intake", "Order Fulfillment"
  referenceId: { type: String, required: true }, // e.g., "SYS-REC-61943"
  quantityDelta: { type: Number, required: true } // Can be positive or negative
});

const inventorySchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['Stable Inventory Pool', 'Low Stock', 'Out of Stock', 'Discontinued'],
      default: 'Stable Inventory Pool'
    },
    lastAuditedBy: {
      type: String, // Tracks the staff member name
      trim: true,
      default: 'System User'
    },
    lastAuditedAt: {
      type: Date,
      default: Date.now
    },
    
    // Quantitative Data
    unitsOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Units on hand cannot be negative outside of ledger calculations']
    },
    pipelineSupply: {
      type: Number,
      default: 0
    },
    unitCost: {
      type: Number,
      required: [true, 'Base unit cost is required'],
      min: 0
    },
    safetyBuffer: {
      type: Number,
      default: 100
    },

    // Relational Mapping
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Inventory must belong to a Customer (Product Depositor)']
    },
    divisions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division'
    }],
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],

    // Embedded Ledger
    auditLedger: [auditLedgerSchema]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field to calculate Total Asset Pool Valuation on the fly
inventorySchema.virtual('totalValuation').get(function() {
  return (this.unitsOnHand * this.unitCost).toFixed(2);
});

// CRITICAL UPDATE: Two-Way Binding Virtual for Locations
// This dynamically queries the Location collection to find all physical 
// storage units (racks/bins/pallets) holding this specific inventory item.
inventorySchema.virtual('storageLocations', {
  ref: 'Location',
  localField: '_id',
  foreignField: 'assignedMaterials.inventory'
});

// Indexes for fast lookup by customer
inventorySchema.index({ customer: 1 });

export default mongoose.model('Inventory', inventorySchema);