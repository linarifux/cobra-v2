import mongoose from 'mongoose';

// Map NetSuite's item.items array to COBRA's order item format
const netSuiteOrderItemSchema = new mongoose.Schema({
  sku: { type: String, required: true }, // Maps to: item.item.refName
  name: { type: String, required: true }, // Maps to: item.description
  quantity: { type: Number, required: true, min: 1 }, // Maps to: item.quantity
  quantityFulfilled: { type: Number, default: 0 }, // Maps to: item.quantityFulfilled
  quantityBackOrdered: { type: Number, default: 0 }, // Maps to: item.quantityBackOrdered
  unitPrice: { type: Number, required: true, min: 0 }, // Maps to: item.rate (Sales Order only)
  totalPrice: { type: Number, required: true } // Maps to: item.amount (Sales Order only)
}, { _id: false });

const netSuiteOrderSchema = new mongoose.Schema(
  {
    // Maps to: tranId (e.g. SO16305425 or TO115071)
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true
    },
    // Maps to: otherRefNum (e.g. #6821)
    legacyNumber: {
      type: String,
      required: false,
      unique: false,
      trim: true
    },
    // Maps to: id (The core NetSuite internal ID)
    netSuiteId: {
      type: String,
      required: [true, 'NetSuite internal ID is required'],
      unique: true,
      index: true
    },
    // NEW: Distinguish between NetSuite's 'salesOrder' and 'transferOrder'
    netSuiteRecordType: {
      type: String,
      enum: ['salesOrder', 'transferOrder'],
      required: true
    },
    // Maps to: location.id (e.g., 586)
    locationId: {
      type: Number,
      required: false
    },
    // The 3PL Client/Brand (Maps to: entity.id)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false // Kept false because TransferOrders DO NOT have customers
    },
    // The End-Consumer / Shopper
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false 
    },
    // Scope this order to a specific division
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: false // May be populated later based on locationId logic
    },
    // COBRA Status Pipeline
    status: {
      type: String,
      enum: ['New', 'Pending', 'Picked', 'Shipped', 'Hold', 'Cancelled', 'Delivered', 'Billed'],
      default: 'New'
    },
    // Maps to: status.refName (The raw NetSuite status for debugging, e.g. "Pending Fulfillment")
    netSuiteRawStatus: {
      type: String,
      required: false
    },
    orderType: {
      type: String,
      // Added 'TRANSFER' to support Transfer Orders
      enum: ['WEBORD', 'PRODUCTION', 'SCRAP', 'TRADESHOW', 'TRANSFER'],
      default: 'WEBORD'
    },
    // Maps to: externalId
    chargeCode: {
      type: String,
      required: false
    },
    items: [netSuiteOrderItemSchema],
    
    // Maps to: subtotal
    subtotal: {
      type: Number,
      required: true,
      default: 0
    },
    
    // Maps to: total (Grand Total)
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

    // --- Order Lifecycle Timestamps ---
    // Maps to: createdDate
    orderDate: { type: Date },
    shipmentCreatedAt: { type: Date }, 
    // Maps to: actualShipDate
    shippedAt: { type: Date }, 
    deliveredAt: { type: Date }, 
    cancelledAt: { type: Date }, 

    // Maps to: shippingAddress payload
    shippingAddress: {
      companyName: { type: String, default: '' },
      recipientName: { type: String, required: false }, // Maps to: addressee
      email: { type: String, required: false }, // Maps to: email
      phone: { type: String, required: false }, // Maps to: shippingAddress.addrPhone
      line1: { type: String, required: false }, // Maps to: addr1
      line2: { type: String, default: '' }, // Maps to: addr2
      city: { type: String, required: false }, // Maps to: city
      state: { type: String, required: false }, // Maps to: state
      zip: { type: String, required: false }, // Maps to: zip
      country: { type: String, default: 'US' } // Maps to: country.refName
    },

    // Comprehensive Order Processing Fees Breakdown (COBRA Logic)
    processingFees: {
      baseFee: { type: Number, default: 0 },
      weightSurcharge: { type: Number, default: 0 },
      lineItemSurcharge: { type: Number, default: 0 },
      packageSurcharge: { type: Number, default: 0 },
      pieceSurcharge: { type: Number, default: 0 },
      cartonSurcharge: { type: Number, default: 0 },
      rushFee: { type: Number, default: 0 },
      internationalFee: { type: Number, default: 0 },
      palletFee: { type: Number, default: 0 },
      totalProcessingFee: { type: Number, default: 0 }
    },

    // Integration with the Carrier module
    shippingDetails: {
      carrierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Carrier' },
      carrierType: { type: String }, 
      serviceCode: { type: String }, // Maps to: shipMethod.refName
      trackingNumber: { type: String, default: '' }, // Maps to: linkedTrackingNumbers
      shippingCost: { type: Number, default: 0 }, // Maps to: shippingCost
      cartoons: { type: Number, default: 0 },
      pallets: { type: Number, default: 0 }, 
      totalBoxes: { type: Number, default: 0 },
      manuallyAdjustedWeightOunces: { type: Number, default: 0 },
      totalWeightOunces: { type: Number, default: 0 },
      packages: [{
        packageCode: { type: String },
        weightInOunces: { type: Number },
        length: { type: Number },
        width: { type: Number },
        height: { type: Number }
      }]
    },
    // Maps to: memo
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

netSuiteOrderSchema.pre('save', function() {
  // 1. Calculate Product Subtotal
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
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

  // 3. Auto-populate Lifecycle Timestamps based on Status Changes
  if (this.isModified('status')) {
    if (this.status === 'Picked' && !this.shipmentCreatedAt) {
      this.shipmentCreatedAt = new Date();
    }
    if (this.status === 'Shipped' && !this.shippedAt) {
      this.shippedAt = new Date();
    }
    if (this.status === 'Delivered' && !this.deliveredAt) {
      this.deliveredAt = new Date();
    }
    if (this.status === 'Cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
});

// INDEXING FOR PERFORMANCE
netSuiteOrderSchema.index({ netSuiteId: 1 });
netSuiteOrderSchema.index({ customer: 1, division: 1, status: 1 });
netSuiteOrderSchema.index({ user: 1 });

export default mongoose.model('NetSuiteOrder', netSuiteOrderSchema);