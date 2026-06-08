import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zip: { type: String, trim: true },
    },
    // Future-proofing: We can add arrays of ObjectIds later to link Orders or Inventory
    // orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    // inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }]
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('Customer', customerSchema);