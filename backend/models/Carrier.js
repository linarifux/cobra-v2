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
}, { _id: false }); 

const carrierSchema = new mongoose.Schema(
  {
    // Scope this carrier configuration to a specific division
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'A division reference is required']
    },
    // The ShipStation internal ID (e.g., "se-4069268")
    shipStationId: {
      type: String,
      required: [true, 'ShipStation ID is required'],
      trim: true
    },
    // The ShipStation carrier code (e.g., "stamps_com", "ups")
    carrierType: {
      type: String,
      required: [true, 'Carrier code is required'],
      trim: true
    },
    // Your local display name for the UI
    accountName: {
      type: String,
      required: [true, 'Account display name is required'],
      trim: true
    },
    // Read-only account number mapped from ShipStation
    accountNumber: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // The validated array of active/inactive services
    enabledServices: [carrierServiceSchema]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// NEW COMPOUND INDEX: 
// Ensures that any single Division can only have ONE configuration per Carrier Type
// while allowing other Divisions to have their own distinct accounts.
carrierSchema.index({ division: 1, carrierType: 1 }, { unique: true });

const Carrier = mongoose.model('Carrier', carrierSchema);

// ==========================================
// CRITICAL FIX FOR E11000 DUPLICATE KEY ERROR
// ==========================================
Carrier.syncIndexes()
  .then(() => console.log('✅ Carrier indexes synced successfully! Old global unique constraints removed.'))
  .catch((err) => console.error('❌ Carrier index sync error:', err));

export default Carrier;