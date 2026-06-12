import mongoose from 'mongoose';

// Sub-schema for the services allowed for THIS specific customer
const allowedServiceSchema = new mongoose.Schema({
  serviceCode: { type: String, required: true },
  serviceName: { type: String, required: true },
  isActive: { type: Boolean, default: true } // Allows toggling specific services off for a customer
}, { _id: false });

// Sub-schema linking the customer to the global Carrier
const customerCarrierSchema = new mongoose.Schema({
  carrier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrier',
    required: true
  },
  // Allows the admin to turn off a whole carrier for a customer temporarily
  isActive: { 
    type: Boolean, 
    default: true 
  },
  // The specific services this customer is allowed to use from this carrier
  allowedServices: [allowedServiceSchema] 
});

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
    carrierConfigurations: [customerCarrierSchema],
    
    // Future-proofing: We can add arrays of ObjectIds later to link Orders or Inventory
    // orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
    // inventory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' }]
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('Customer', customerSchema);