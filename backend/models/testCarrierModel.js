import mongoose from 'mongoose';

const testCarrierSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true
    },
    countryCode: {
      type: String,
      default: 'US',
      uppercase: true,
      trim: true
    },
    // Used to map the local DB record to the ShipStation connection
    shipstationProviderId: {
      type: String,
      default: null
    }
  },
  { 
    timestamps: true 
  }
);

export default mongoose.model('TestCarrier', testCarrierSchema);