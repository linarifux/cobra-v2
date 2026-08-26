import mongoose from 'mongoose';

// Sub-schema for the "Assigned Material Records"
const materialRecordSchema = new mongoose.Schema({
  // 1. CRITICAL UPDATE: Link directly to the Inventory Document
  inventory: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Inventory',
    required: [true, 'Inventory reference is required']
  },
  lotBatchId: { 
    type: String, 
    trim: true,
    default: 'N/A'
  },
  allocatedQty: { 
    type: Number, 
    required: [true, 'Allocated quantity is required'],
    min: [0, 'Quantity cannot be negative']
  }
});

const locationSchema = new mongoose.Schema(
  {
    locationUnit: {
      type: String,
      required: [true, 'Location unit is required']
    },
    designation: {
      type: String,
      required: [true, 'Location designation is required'],
      unique: true,
      trim: true,
    },
    maxStorageUnits: {
      type: Number,
      required: [true, 'Max storage units capacity is required'],
      min: 0
    },
    storageCategory: {
      type: String,
      enum: ['Rack', 'Bin', 'Pallet', 'Floor', 'Shelf', 'Vault'],
      default: 'Rack'
    },
    level: {
      type: String,
      trim: true,
    },
    assignedMaterials: [materialRecordSchema],
    status: {
      type: String,
      enum: ['Active', 'At Capacity', 'Maintenance', 'Inactive'],
      default: 'Active'
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual to calculate currently used capacity
locationSchema.virtual('currentUsage').get(function() {
  if (!this.assignedMaterials || this.assignedMaterials.length === 0) return 0;
  return this.assignedMaterials.reduce((total, item) => total + item.allocatedQty, 0);
});

export default mongoose.model('Location', locationSchema);