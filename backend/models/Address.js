import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'An address must belong to a user'],
      validate: {
        // Asynchronously validates that the referenced user belongs to the 'order' portal
        validator: async function (userId) {
          // Skip the DB check if the user reference hasn't changed during an update
          if (!this.isModified('user')) return true;
          
          const User = mongoose.model('User');
          const userDoc = await User.findById(userId).select('portal');
          
          if (!userDoc) return false;
          return userDoc.portal === 'order';
        },
        message: 'Invalid assignment: The associated user must belong to the "order" portal'
      }
    },
    firstName: {
      type: String,
      required: [true, 'First name is required for delivery/billing'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required for delivery/billing'],
      trim: true
    },
    contactPhone: {
      type: String,
      trim: true
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    street1: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    street2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'State/Province is required'],
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP/Postal code is required'],
      trim: true
    },
    country: {
      type: String,
      default: 'USA',
      trim: true
    },
    addressType: {
      type: String,
      enum: ['Shipping', 'Billing', 'Both'],
      default: 'Shipping'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true 
  }
);

// Add an index to speed up querying a user's address book
addressSchema.index({ user: 1 });

// PRE-SAVE HOOK FIX: 
// Removed 'next' parameter. When using an async function, Mongoose automatically 
// waits for the Promise to resolve. Calling next() manually inside an async hook crashes it.
addressSchema.pre('save', async function () {
  if (this.isModified('isDefault') && this.isDefault === true) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id }, addressType: this.addressType },
      { isDefault: false }
    );
  }
});

export default mongoose.model('Address', addressSchema);