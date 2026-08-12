import mongoose from 'mongoose';

const vendorCarrierSchema = new mongoose.Schema(
  {
    carrierName: {
      type: String,
      required: [true, 'Carrier name is required'],
      trim: true,
      unique: true
    },
    isActive: { type: Boolean, default: true }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('VendorCarrier', vendorCarrierSchema);