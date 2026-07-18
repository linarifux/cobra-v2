import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false }); 

const cartSchema = new mongoose.Schema(
  {
    // The Shopper/End-Consumer (Who owns the cart)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Cart must belong to an end-user'],
      unique: true // Strictly enforces one persistent cart per shopper
    },
    // The 3PL Client/Brand (Whose products are in the cart)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Cart must be associated with a 3PL customer catalog']
    },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division'
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

// Auto-calculate the cart total right before saving
cartSchema.pre('save', function() {
  if (this.items && this.items.length > 0) {
    this.cartTotal = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  } else {
    this.cartTotal = 0;
  }
});

cartSchema.index({ user: 1 });

export default mongoose.model('Cart', cartSchema);