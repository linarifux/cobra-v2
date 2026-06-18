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
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add an index to make querying by customer faster, 
// since the UI lists them alongside the customer name.
typePieceSchema.index({ customer: 1 });

export default mongoose.model('TypePiece', typePieceSchema);