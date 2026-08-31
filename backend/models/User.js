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
  userAddress: {
    street1: { type: String, trim: true },
    street2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true, default: 'US' }
  },
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

userSchema.index({ divisions: 1 });

// CUSTOM VALIDATOR
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

// 1. Hash password before saving 
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  this.password = await bcrypt.hash(this.password, 12);
});

// 2. Hash password on updates 
userSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  
  // Helper to check if string is ALREADY a bcrypt hash 
  // (bcrypt hashes always start with $2 and are exactly 60 chars long)
  const isAlreadyHashed = (str) => typeof str === 'string' && str.startsWith('$2') && str.length === 60;
  
  if (update.password && !isAlreadyHashed(update.password)) {
    update.password = await bcrypt.hash(update.password, 12);
  } 
  else if (update.$set && update.$set.password && !isAlreadyHashed(update.$set.password)) {
    update.$set.password = await bcrypt.hash(update.$set.password, 12);
  }
});

// Instance method to verify password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);