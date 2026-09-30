import mongoose from 'mongoose';

const receivingChargeSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'A receiving charge configuration must belong to a customer'],
      unique: true // Typically one active configuration per customer
    },
    // Base Rates
    baseRatePerLineItem: {
      type: Number,
      required: true,
      default: 15.00 
    },
    // Weight Overages
    baseWeightAllowance: {
      type: Number,
      required: true,
      default: 100 // Pounds included before overage triggers
    },
    overageRatePerPound: {
      type: Number,
      required: true,
      default: 0.15 
    },
    // Pallet Configuration
    weightOfPallet: {
      type: Number,
      required: true,
      default: 40 // Default weight of a single pallet in pounds
    },
    palletProcessingFeeRate: {
      type: Number,
      required: true,
      default: 8.40 // Fee for processing pallets arriving from the client
    },
    suppliedPalletFeeRate: {
      type: Number,
      required: true,
      default: 12.00 // Fee for pallets MI-KRO provides to the client
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('ReceivingCharge', receivingChargeSchema);