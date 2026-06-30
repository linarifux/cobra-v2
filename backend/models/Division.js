import mongoose from 'mongoose';

const divisionSchema = new mongoose.Schema(
  {
    divisionName: {
      type: String,
      required: [true, 'Division name is required'],
      trim: true,
    },
    divisionCode: {
      type: String,
      required: [true, 'Division code is required'],
      unique: true,
      trim: true,
      uppercase: true, // Automatically converts inputs like "div-nas" to "DIV-NAS"
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      // Fix: Mongoose regex fails on empty strings. We allow empty strings or valid emails.
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'], 
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zip: { type: String, trim: true },
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'A division must belong to a customer'],
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    }
  },
  
  { 
    timestamps: true,
    // CRITICAL: You must enable virtuals so they are included when sending JSON to the frontend
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add an index to improve read performance when querying divisions for a specific customer
divisionSchema.index({ customer: 1 });

// --- THE M2M VIRTUAL POPULATE ---
// This acts as an array of Users without storing duplicate data in the database.
// Mongoose dynamically searches the User collection where `divisions` includes this division's _id.
divisionSchema.virtual('users', {
  ref: 'User',                 // The model to query
  localField: '_id',           // Find the _id of this division...
  foreignField: 'divisions',   // ...inside the 'divisions' array of the User model
});

export default mongoose.model('Division', divisionSchema);