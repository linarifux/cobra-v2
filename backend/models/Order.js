import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true },
    weight: { type: Number, default: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
    },

    legacyNumber: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },

    // The 3PL Client/Brand
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Order must belong to a customer'],
    },
    // The End-Consumer / Shopper
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Kept false to allow guest checkouts & NetSuite imports safely
    },
    // Scope this order to a specific division for strict routing and access control
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'Order must be assigned to a division'],
    },
    status: {
      type: String,
      enum: [
        'New',
        'Pending',
        'Picked',
        'Shipped',
        'Hold',
        'Cancelled',
        'Delivered',
        'Billed',
      ],
      default: 'New',
    },
    orderType: {
      type: String,
      enum: ['WEBORD', 'TRANSFER', 'PRODUCTION', 'SCRAP', 'TRADESHOW'],
      default: 'WEBORD',
    },
    chargeCode: {
      type: String,
      required: false,
    },
    items: [orderItemSchema],

    // Subtotal of just the items
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },

    // Grand Total (Subtotal + Shipping + Processing)
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    qtyLimitExceeds: {
      type: Boolean,
      default: false,
    },
    isRushOrder: {
      type: Boolean,
      default: false,
    },
    isInternational: {
      type: Boolean,
      default: false,
    },

    // Order Source Tracking for Multi-Channel Integration
    orderSource: {
      type: String,
      enum: ['NETSUITE', 'WOOCOMMERCE', 'COBRA'],
      default: 'COBRA',
      required: false,
    },

    // --- Order Lifecycle Timestamps ---
    shipmentCreatedAt: { type: Date, default: null }, // Packed / Picked At (Picked / ShipStation Shipment Created)
    shippedAt: { type: Date, default: null },         // Shipped At (Label Generated / Shipped)
    deliveredAt: { type: Date, default: null },       // Delivered At (Carrier / Manual Delivery)
    cancelledAt: { type: Date, default: null },       // Cancelled At (Order Cancelled)

    shippingAddress: {
      companyName: { type: String, default: '' },
      recipientName: { type: String, required: true },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      country: { type: String, default: 'US' },
    },

    // Comprehensive Order Processing Fees Breakdown
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
      totalProcessingFee: { type: Number, default: 0 },
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
      pallets: { type: Number, default: 0 },
      totalBoxes: { type: Number, default: 0 },
      manuallyAdjustedWeightOunces: { type: Number, default: 0 },
      totalWeightOunces: { type: Number, default: 0 },
      packages: [
        {
          packageCode: { type: String },
          weightInOunces: { type: Number },
          length: { type: Number },
          width: { type: Number },
          height: { type: Number },
        },
      ],
    },
    notes: {
      type: String,
      default: '',
    },
    // ShipStation Integration Data
    shipstationDetails: {
      orderId: { type: String },
      labelId: { type: String },
      orderKey: { type: String },
      orderStatus: { type: String },
      externalShipmentId: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

const round2 = (num) => Math.round((Number(num) || 0) * 100) / 100;

// Applies on .save() (createOrder, ShipStation label/shipment saves)
orderSchema.pre('save', function () {
  // 1. Calculate Product Subtotal
  if (this.items && this.items.length > 0) {
    this.subtotal = round2(
      this.items.reduce(
        (acc, item) => acc + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0,
      ),
    );
  }

  // 2. Auto-calculate Grand Total for Processing Fees
  if (this.processingFees) {
    this.processingFees.totalProcessingFee = round2(
      (this.processingFees.baseFee || 0) +
        (this.processingFees.weightSurcharge || 0) +
        (this.processingFees.lineItemSurcharge || 0) +
        (this.processingFees.packageSurcharge || 0) +
        (this.processingFees.pieceSurcharge || 0) +
        (this.processingFees.cartonSurcharge || 0) +
        (this.processingFees.rushFee || 0) +
        (this.processingFees.internationalFee || 0) +
        (this.processingFees.palletFee || 0),
    );
  }

  // 3. Keep Grand Total synced with Subtotal + Shipping + Processing
  this.totalAmount = round2(
    (this.subtotal || 0) +
      (this.shippingDetails?.shippingCost || 0) +
      (this.processingFees?.totalProcessingFee || 0),
  );

  // 4. Auto-populate Lifecycle Timestamps on creation or status changes
  if (this.isNew || this.isModified('status')) {
    const now = new Date();

    if (this.status === 'Picked' && !this.shipmentCreatedAt) {
      this.shipmentCreatedAt = now;
    }
    if (this.status === 'Shipped') {
      if (!this.shipmentCreatedAt) this.shipmentCreatedAt = now;
      if (!this.shippedAt) this.shippedAt = now;
    }
    if (this.status === 'Delivered') {
      if (!this.shipmentCreatedAt) this.shipmentCreatedAt = now;
      if (!this.shippedAt) this.shippedAt = now;
      if (!this.deliveredAt) this.deliveredAt = now;
    }
    if (this.status === 'Cancelled' && !this.cancelledAt) {
      this.cancelledAt = now;
    }
  }
});

// Applies on findByIdAndUpdate / findOneAndUpdate (updateOrder, etc.)
orderSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  if (!update) return;

  const target = update.$set || update;
  const nextStatus = target.status;
  if (!nextStatus) return;

  const existing = await this.model
    .findOne(this.getQuery())
    .select('status shipmentCreatedAt shippedAt deliveredAt cancelledAt')
    .lean();

  const now = new Date();
  const isTransition = !existing || existing.status !== nextStatus;

  const stampIfNeeded = (field) => {
    const incoming = target[field];
    const hasIncoming =
      incoming !== undefined && incoming !== null && incoming !== '';

    if (!hasIncoming) {
      if (isTransition) {
        target[field] = existing?.[field] || now;
      } else if (incoming === undefined && !existing?.[field]) {
        target[field] = now;
      }
    }
  };

  if (nextStatus === 'Picked') {
    stampIfNeeded('shipmentCreatedAt');
  } else if (nextStatus === 'Shipped') {
    stampIfNeeded('shippedAt');
    if (!existing?.shipmentCreatedAt && !target.shipmentCreatedAt) {
      target.shipmentCreatedAt = now;
    }
  } else if (nextStatus === 'Delivered') {
    stampIfNeeded('deliveredAt');
    if (!existing?.shipmentCreatedAt && !target.shipmentCreatedAt) {
      target.shipmentCreatedAt = now;
    }
    if (!existing?.shippedAt && !target.shippedAt) {
      target.shippedAt = now;
    }
  } else if (nextStatus === 'Cancelled') {
    stampIfNeeded('cancelledAt');
  }

  this.setUpdate(update);
});

// INDEXING FOR PERFORMANCE
// 1. Core 3PL Dashboard Index
orderSchema.index({ customer: 1, division: 1, status: 1 });
// 2. Core End-User Index (allows rapid fetching of a specific shopper's order history)
orderSchema.index({ user: 1 });

export default mongoose.model('Order', orderSchema);
