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
    // NEW: The Relational Link to Customer
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
    timestamps: true 
  }
);

// Add an index to improve read performance when querying divisions for a specific customer
divisionSchema.index({ customer: 1 });

export default mongoose.model('Division', divisionSchema);