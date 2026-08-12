import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
      unique: true
    },
    contactName: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, default: 'US' }
    },
    // If you want vendors to be global, leave customer out. 
    // If vendors belong to specific 3PL brands, uncomment this:
    // customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('Vendor', vendorSchema);