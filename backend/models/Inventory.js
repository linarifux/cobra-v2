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
    // --- Core Identification ---
    productCode: {
      type: String,
      required: [true, 'Product Code is required'],
      unique: true,
      trim: true,
    },
    itemName: { 
      type: String, 
      required: [true, 'Item name is required'],
      trim: true 
    },
    sku: { 
      type: String, 
      trim: true, 
      uppercase: true 
    },
    status: {
      type: String,
      default: 'Active'
    },

    // --- Media (Cloudinary/S3 Hosting) ---
    productImage: { 
      type: String, 
      trim: true,
      default: ''
    },

    // --- Descriptions & Classifications ---
    description: { type: String, trim: true },
    description2: { type: String, trim: true },
    hssCode: { type: String, trim: true },
    typePiece: { type: String, trim: true },
    
    // --- Physical Attributes ---
    weight: { 
      type: Number, 
      default: 0, 
      min: 0 
    }, // Stored in ounces for ShipStation compatibility

    //--------Relational Multiple Locations ---
    locations: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location'
    }],

    // --- Relational Hierarchy ---
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Inventory must belong to a Customer (Product Depositor)']
    },
    division: { type: mongoose.Schema.Types.ObjectId, ref: 'Division' },
    category1: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    category2: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    category3: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    // --- Toggles ---
    admin: { type: Boolean, default: false },
    offWeb: { type: Boolean, default: false },

    // --- Pricing ---
    price: { type: Number, default: 0, min: 0 },
    price2: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 }, 

    // --- Inventory Thresholds ---
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    lowPoint: { type: Number, default: 0 },
    lowPoint2: { type: Number, default: 0 },

    // --- Live Quantitative Data ---
    available: { 
      type: Number, 
      required: true, 
      default: 0,
      min: [0, 'Available units cannot be negative outside of ledger calculations']
    },
    unitsOnHand: { type: Number, default: 0 }, 
    openOrders: { type: Number, default: 0 },
    qtyLastReceived: { type: Number, default: 0 },
    dateLastReceived: { type: Date },
    pipelineSupply: { type: Number, default: 0 },

    // --- Auditing Metadata ---
    lastAuditedBy: {
      type: String,
      trim: true,
      default: 'System User'
    },
    lastAuditedAt: {
      type: Date,
      default: Date.now
    },

    // --- Embedded Ledger ---
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
  const currentQty = this.available || this.unitsOnHand || 0;
  const currentCost = this.price || this.unitCost || 0;
  return (currentQty * currentCost).toFixed(2);
});

// Two-Way Binding Virtual for Locations (Reverse lookup from Location model)
inventorySchema.virtual('storageLocations', {
  ref: 'Location',
  localField: '_id',
  foreignField: 'assignedMaterials.inventory'
});

// Indexes for fast lookup
inventorySchema.index({ customer: 1 });
// inventorySchema.index({ productCode: 1 });

export default mongoose.model('Inventory', inventorySchema);