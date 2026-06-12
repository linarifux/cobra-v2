import mongoose from 'mongoose';

// Sub-schema for strict validation of the shipping services array
const carrierServiceSchema = new mongoose.Schema({
  serviceCode: { 
    type: String, 
    required: [true, 'Service code is required'], 
    trim: true 
  },
  serviceName: { 
    type: String, 
    required: [true, 'Service name is required'], 
    trim: true 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  }
}, { _id: false }); // Disable _id for sub-documents to keep the array clean

const carrierSchema = new mongoose.Schema(
  {
    carrierType: {
      type: String,
      required: [true, 'Carrier type is required'],
      enum: ['FedEx', 'USPS', 'UPS', 'LTL'],
      unique: true // Ensure only one profile per carrier type
    },
    accountName: {
      type: String,
      required: [true, 'Account display name is required'],
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    activeEnvironment: {
      type: String,
      enum: ['test', 'live'],
      default: 'test'
    },
    
    // Modern REST OAuth structure
    credentials: {
      test: {
        accountNumber: { type: String, trim: true, default: '' },
        clientId: { type: String, trim: true, default: '' },
        clientSecret: { type: String, trim: true, default: '' }
      },
      live: {
        accountNumber: { type: String, trim: true, default: '' },
        clientId: { type: String, trim: true, default: '' },
        clientSecret: { type: String, trim: true, default: '' }
      }
    },
    
    // The validated array of active/inactive services
    enabledServices: [carrierServiceSchema]
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('Carrier', carrierSchema);