import mongoose from 'mongoose';

// Sub-schema for the "Assigned Material Records" (Mixed Items)
const materialRecordSchema = new mongoose.Schema({
  itemReference: { 
    type: String, 
    required: [true, 'Item/SKU reference is required'],
    trim: true
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
      // e.g., "Tier 3" or "Row A"
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