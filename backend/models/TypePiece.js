import mongoose from 'mongoose';

const typePieceSchema = new mongoose.Schema(
  {
    typePieceName: {
      type: String,
      required: [true, 'Type Piece name is required'],
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'A customer reference is required']
    },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: false 
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound Index: Optimizes queries filtering by just customer, 
// AND queries filtering by both customer + division simultaneously.
typePieceSchema.index({ customer: 1, division: 1 });

export default mongoose.model('TypePiece', typePieceSchema);