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
    // Scope this carrier configuration to a specific division
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'A division reference is required']
    },
    carrierType: {
      type: String,
      required: [true, 'Carrier type is required'],
      enum: ['FedEx', 'USPS', 'UPS', 'LTL'],
      // Note: Removed global `unique: true` here. It is now handled by the compound index below.
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// NEW COMPOUND INDEX: 
// Ensures that any single Division can only have ONE configuration per Carrier Type (e.g., 1 FedEx, 1 UPS)
// while allowing other Divisions to have their own distinct FedEx/UPS accounts.
carrierSchema.index({ division: 1, carrierType: 1 }, { unique: true });

const Carrier = mongoose.model('Carrier', carrierSchema);

// ==========================================
// CRITICAL FIX FOR E11000 DUPLICATE KEY ERROR
// ==========================================
// This tells MongoDB to look at the current schema indexes defined above, 
// and automatically drop any legacy indexes (like the old `carrierType_1`) 
// that are causing the "dup key" crash shown in your console.
Carrier.syncIndexes()
  .then(() => console.log('✅ Carrier indexes synced successfully! Old global unique constraints removed.'))
  .catch((err) => console.error('❌ Carrier index sync error:', err));

export default Carrier;