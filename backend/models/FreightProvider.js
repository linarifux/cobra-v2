import mongoose from 'mongoose';

const freightProviderSchema = new mongoose.Schema(
  {
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Freight provider configuration must be assigned to a division']
    },
    providerCode: {
      type: String,
      required: [true, 'Provider code is required (e.g., SPEEDSHIP)'],
      trim: true
    },
    shipStationAccountId: {
      type: String,
      required: [true, 'ShipStation Account ID is required (e.g., se-241)'],
      trim: true
    },
    accountName: {
      type: String,
      required: [true, 'Account display name is required'],
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure a division doesn't duplicate the exact same freight provider account
freightProviderSchema.index({ division: 1, shipStationAccountId: 1 }, { unique: true });

export default mongoose.model('FreightProvider', freightProviderSchema);