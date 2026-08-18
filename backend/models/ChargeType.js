import mongoose from 'mongoose';

const chargeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Charge type name is required'],
      trim: true,
      unique: true
    },
    defaultCharge: {
      type: Number,
      required: [true, 'Default charge amount is required'],
      min: [0, 'Charge cannot be negative'],
      default: 0
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    notes: { 
      type: String, 
      trim: true,
      default: '' 
    }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('ChargeType', chargeTypeSchema);