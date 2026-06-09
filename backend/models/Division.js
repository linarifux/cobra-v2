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

export default mongoose.model('Division', divisionSchema);