import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
    },
    hierarchyDepth: {
      type: Number,
      default: 1, // Lvl 1 by default
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null, // Null means it has no parent (Lvl 1)
    },
    division: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Division',
      required: [true, 'A category must be mapped to a division branch'],
    }
  },
  { 
    timestamps: true 
  }
);

// Add an index to speed up querying by division or parent
categorySchema.index({ division: 1 });
categorySchema.index({ parentCategory: 1 });

// AUTO-CALCULATE HIERARCHY DEPTH
// Before saving, check if the parentCategory was changed/added
categorySchema.pre('save', async function () {
  if (this.isModified('parentCategory')) {
    if (this.parentCategory) {
      // Find the parent and set this depth to parent.depth + 1
      const parent = await this.constructor.findById(this.parentCategory);
      if (parent) {
        this.hierarchyDepth = parent.hierarchyDepth + 1;
      }
    } else {
      // If parent is set to null, it resets to a top-level category
      this.hierarchyDepth = 1;
    }
  }
});

export default mongoose.model('Category', categorySchema);