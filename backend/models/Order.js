import mongoose from 'mongoose';

// Sub-schema for individual items in the order
const orderItemSchema = new mongoose.Schema({
  inventoryItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, 'An order item must reference an inventory asset']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price at time of order is required']
  },
  totalPrice: {
    type: Number,
    required: true
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
      uppercase: true, // e.g., ORD-99382
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'An order must belong to a customer']
    },
    referencePO: {
      type: String,
      trim: true,
      default: 'N/A' // e.g., Purchase Order number provided by the B2B client
    },
    status: {
      type: String,
      enum: ['Pending', 'Allocated', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'On Hold'],
      default: 'Pending'
    },
    priority: {
      type: String,
      enum: ['Standard', 'Expedited', 'Urgent'],
      default: 'Standard'
    },
    
    // Financials & Line Items
    items: [orderItemSchema],
    orderTotal: {
      type: Number,
      required: true,
      default: 0
    },

    // Logistics
    shippingDetails: {
      carrier: { type: String, trim: true, default: 'Pending' },
      trackingCode: { type: String, trim: true, default: 'Pending' },
      shippingMethod: { type: String, trim: true, default: 'Standard Ground' },
      estimatedDelivery: { type: Date }
    },
    
    assignedStaff: {
      type: String,
      trim: true,
      default: 'Unassigned'
    }
  },
  { 
    timestamps: true 
  }
);

// Auto-calculate the order total before saving if items are modified
orderSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.orderTotal = this.items.reduce((sum, item) => {
      // Ensure the line item total is also correct
      item.totalPrice = item.quantity * item.unitPrice;
      return sum + item.totalPrice;
    }, 0);
  }
  next();
});

// Indexes for faster dashboard queries
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });

export default mongoose.model('Order', orderSchema);