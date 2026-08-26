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
      enum: ['New', 'Pending', 'Picked', 'Shipped', 'Hold', 'Cancelled', 'Delivered', 'Billed'],
      default: 'New'
    },
    orderType: {
      type: String,
      enum: ['WEBORD', 'PRODUCTION', 'SCRAP'],
      default: 'WEBORD'
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
    qtyLimitExceeds: {
      type: Boolean,
      default: false
    },
    isRushOrder: {
      type: Boolean,
      default: false
    },
    isInternational: {
      type: Boolean,
      default: false
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
    
    // NEW: Comprehensive Order Processing Fees Breakdown
    processingFees: {
      baseFee: { type: Number, default: 0 },            // Base fee for 1st 3 line items
      weightSurcharge: { type: Number, default: 0 },    // Surcharge for weight > 20 lbs
      lineItemSurcharge: { type: Number, default: 0 },  // Surcharge for line items > 3
      packageSurcharge: { type: Number, default: 0 },   // Surcharge for packages > 1
      pieceSurcharge: { type: Number, default: 0 },     // Per piece fee
      cartonSurcharge: { type: Number, default: 0 },    // Per carton fee
      rushFee: { type: Number, default: 0 },            // Flat fee if isRushOrder is true
      internationalFee: { type: Number, default: 0 },   // Flat fee if isInternational is true
      palletFee: { type: Number, default: 0 },          // Fee for pallet processing
      totalProcessingFee: { type: Number, default: 0 }  // Grand total of all processing fees
    },

    // Integration with the Carrier module
    shippingDetails: {
      carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier' },
      carrierType: { type: String }, 
      serviceCode: { type: String }, 
      trackingNumber: { type: String, default: '' },
      shippingCost: { type: Number, default: 0 },
      // Package configuration tracking
      cartoons: { type: Number, default: 0 },
      pallets: { type: Number, default: 0 }, // NEW: Added to track pallet processing fee trigger
      totalBoxes: { type: Number, default: 0 },
      totalWeightOunces: { type: Number, default: 0 },
      packages: [{
        packageCode: { type: String },
        weightInOunces: { type: Number },
        length: { type: Number },
        width: { type: Number },
        height: { type: Number }
      }]
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
  // 1. Calculate Product Total Amount
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }

  // 2. Auto-calculate Grand Total for Processing Fees
  if (this.processingFees) {
    this.processingFees.totalProcessingFee = 
      (this.processingFees.baseFee || 0) +
      (this.processingFees.weightSurcharge || 0) +
      (this.processingFees.lineItemSurcharge || 0) +
      (this.processingFees.packageSurcharge || 0) +
      (this.processingFees.pieceSurcharge || 0) +
      (this.processingFees.cartonSurcharge || 0) +
      (this.processingFees.rushFee || 0) +
      (this.processingFees.internationalFee || 0) +
      (this.processingFees.palletFee || 0);
  }
});

// INDEXING FOR PERFORMANCE
// 1. Core 3PL Dashboard Index
orderSchema.index({ customer: 1, division: 1, status: 1 });
// 2. Core End-User Index (allows rapid fetching of a specific shopper's order history)
orderSchema.index({ user: 1 });

export default mongoose.model('Order', orderSchema);