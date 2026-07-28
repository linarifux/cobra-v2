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
    // The 3PL Client/Brand
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Order must belong to a customer']
    },
    // The End-Consumer / Shopper
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Kept false to allow guest checkouts and preserve existing DB data safely
    },
    // Scope this order to a specific division for strict routing and access control
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Order must be assigned to a division']
    },
    status: {
      type: String,
      // UPDATED ENUM LIST
      enum: ['New', 'Pending', 'Processing', 'Picked', 'Shipped', 'Hold', 'Cancelled', 'Delivered', 'Billed'],
      default: 'New'
    },
    chargeCode: {
      type: String,
      required: false
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
      carrierType: { type: String }, 
      serviceCode: { type: String }, 
      trackingNumber: { type: String, default: '' },
      shippingCost: { type: Number, default: 0 }
    },
    notes: {
      type: String,
      default: ''
    },
    // ShipStation Integration Data
    shipstationDetails: {
      orderId: { type: String },
      labelId: { type: String },
      orderKey: { type: String },
      orderStatus: { type: String },
      externalShipmentId: { type: String }
    }
  },
  { 
    timestamps: true 
  }
);

orderSchema.pre('save', function() {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }
});

// INDEXING FOR PERFORMANCE
// 1. Core 3PL Dashboard Index
orderSchema.index({ customer: 1, division: 1, status: 1 });
// 2. Core End-User Index (allows rapid fetching of a specific shopper's order history)
orderSchema.index({ user: 1 });

export default mongoose.model('Order', orderSchema);