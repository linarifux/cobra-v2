import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false }); 

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to an end-user']
      // REMOVED: unique: true (Moved to compound index below)
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Cart must be associated with a 3PL customer catalog']
    },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Cart must belong to a specific division']
    },
    items: [cartItemSchema],
    cartTotal: {
      type: Number,
      required: true,
      default: 0
    }
  },
  { 
    timestamps: true 
  }
);

cartSchema.pre('save', function() {
  if (this.items && this.items.length > 0) {
    this.cartTotal = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  } else {
    this.cartTotal = 0;
  }
});

// CRITICAL FIX: Compound Index ensures a user can only have ONE cart per DIVISION.
cartSchema.index({ user: 1, division: 1 }, { unique: true });

export default mongoose.model('Cart', cartSchema);