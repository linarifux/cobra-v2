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
    select: false // Never return password in standard queries
  },
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
    // Require at least one division for order portal users
    validate: [
      function(val) {
        if (this.portal === 'order') return val && val.length > 0;
        return true;
      },
      'Order portal users must have at least one division assigned'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// CUSTOM VALIDATOR: Ensure roles strictly match their allowed portals
// FIX: Removed the 'next' parameter for synchronous execution
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

// Hash password before saving
// FIX: Removed the 'next' parameter. Mongoose automatically awaits the async function.
userSchema.pre('save', async function () {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return;
  
  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
});

// Instance method to verify password during login
userSchema.methods.matchPassword = async function (enteredPassword, userPassword) {
  return await bcrypt.compare(enteredPassword, userPassword);
};

export default mongoose.model('User', userSchema);