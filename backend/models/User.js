import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'], 
    minlength: 8,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  // NEW: Primary default address stored directly on the user profile
  userAddress: {
    street1: { type: String, trim: true },
    street2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'US' }
  },
  // NEW: Array of ObjectIds referencing the separate Address model for additional addresses
  addresses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  }],
  portal: {
    type: String,
    enum: ['admin', 'order'],
    required: [true, 'User must be assigned to a specific portal']
  },
  role: {
    type: String,
    required: [true, 'User must have a role']
  },
  // If the user is on the Order Portal, they MUST belong to a specific customer account
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: function() {
      return this.portal === 'order';
    }
  },
  divisions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Division',
    required: false
  }],
  chargeCode: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Add index for fast reverse-lookups when querying users by division
userSchema.index({ divisions: 1 });

// CUSTOM VALIDATOR: Ensure roles strictly match their allowed portals
userSchema.pre('validate', function() {
  const adminRoles = ['super_admin', 'admin'];
  const orderRoles = ['super_user', 'manager', 'standard'];

  if (this.portal === 'admin' && !adminRoles.includes(this.role)) {
    this.invalidate('role', `Invalid role for Admin Portal. Allowed: ${adminRoles.join(', ')}`);
  }
  
  if (this.portal === 'order' && !orderRoles.includes(this.role)) {
    this.invalidate('role', `Invalid role for Order Portal. Allowed: ${orderRoles.join(', ')}`);
  }
});

// 1. Hash password before saving (Triggered on User.create or user.save())
userSchema.pre('save', async function () {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return;
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// 2. Hash password on updates (Triggered on findByIdAndUpdate)
userSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  
  // Check if the password is being updated directly
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 12);
  } 
  // Check if the password is being updated inside a $set operator (Mongoose sometimes wraps it)
  else if (update.$set && update.$set.password) {
    update.$set.password = await bcrypt.hash(update.$set.password, 12);
  }
});

// Instance method to verify password during login
userSchema.methods.matchPassword = async function (enteredPassword, userPassword) {
  return await bcrypt.compare(enteredPassword, userPassword);
};

export default mongoose.model('User', userSchema);