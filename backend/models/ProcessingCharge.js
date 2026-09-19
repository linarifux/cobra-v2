import mongoose from 'mongoose';

const processingChargeSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'A customer reference is required for processing charges.'],
    unique: true // Ensures only one configuration exists per customer
  },
  baseProcessingFee: {
    type: Number,
    required: [true, 'Base processing fee is required'],
    default: 5.68
  },
  weightSurcharge: {
    type: Number,
    required: [true, 'Weight surcharge is required'],
    default: 0.15
  },
  lineItemSurcharge: {
    type: Number,
    required: [true, 'Line item surcharge is required'],
    default: 0.81
  },
  packageSurcharge: {
    type: Number,
    required: [true, 'Package surcharge is required'],
    default: 0.71
  },
  pieceSurcharge: {
    type: Number,
    required: [true, 'Piece surcharge is required'],
    default: 0.03
  },
  cartonSurcharge: {
    type: Number,
    required: [true, 'Carton surcharge is required'],
    default: 2.05
  },
  palletProcessingFee: {
    type: Number,
    required: [true, 'Pallet processing fee is required'],
    default: 8.40
  },
  rushSurcharge: {
    type: Number,
    required: [true, 'Rush surcharge is required'],
    default: 20.00
  },
  internationalSurcharge: {
    type: Number,
    required: [true, 'International surcharge is required'],
    default: 0.00
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const ProcessingCharge = mongoose.model('ProcessingCharge', processingChargeSchema);

export default ProcessingCharge;