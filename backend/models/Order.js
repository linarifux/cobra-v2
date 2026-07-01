import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Order must belong to a customer']
    },
    // Scope this order to a specific division for strict routing and access control
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Order must be assigned to a division']
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled', 'On Hold'],
      default: 'Pending'
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    shippingAddress: {
      recipientName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, default: 'US' }
    },
    // Integration with the Carrier module
    shippingDetails: {
      carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier' },
      carrierType: { type: String }, // e.g., 'FedEx'
      serviceCode: { type: String }, // e.g., 'FEDEX_GROUND'
      trackingNumber: { type: String, default: '' },
      shippingCost: { type: Number, default: 0 }
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { 
    timestamps: true 
  }
);

// FIX: Removed the `next` callback parameter entirely. 
// Modern Mongoose natively supports synchronous hooks without requiring a callback,
// preventing the "next is not a function" crash during creation.
orderSchema.pre('save', function() {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }
});

// INDEXING FOR PERFORMANCE
// Creates a compound index so queries filtering by Customer -> Division -> Status are highly optimized
orderSchema.index({ customer: 1, division: 1, status: 1 });

export default mongoose.model('Order', orderSchema);