import Category from '../models/Category.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new category
// @route   POST /api/v1/categories
// @route   POST /api/v1/divisions/:divisionId/categories
export const createCategory = catchAsync(async (req, res, next) => {
  // Support for nested routes: auto-assign division if passed in URL
  if (!req.body.division && req.params.divisionId) {
    req.body.division = req.params.divisionId;
  }

  // The pre-save hook in the model will auto-calculate hierarchyDepth based on parentCategory
  const category = await Category.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { category }
  });
});

// @desc    Get all categories
// @route   GET /api/v1/categories
// @route   GET /api/v1/divisions/:divisionId/categories
export const getAllCategories = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.divisionId) {
    filter = { division: req.params.divisionId };
  }

  // Populate references so frontend can display names instead of IDs
  const categories = await Category.find(filter)
    .populate('division', 'divisionName divisionCode')
    .populate('parentCategory', 'categoryName hierarchyDepth')
    .sort('hierarchyDepth categoryName');

  res.status(200).json({
    status: 'success',
    results: categories.length,
    data: { categories }
  });
});

// @desc    Get a single category
// @route   GET /api/v1/categories/:id
export const getCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findById(req.params.id)
    .populate('division', 'divisionName divisionCode')
    .populate('parentCategory', 'categoryName hierarchyDepth');

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

// @desc    Update a category
// @route   PUT /api/v1/categories/:id
export const updateCategory = catchAsync(async (req, res, next) => {
  // Find the document first so the `pre('save')` hook fires to recalculate depth
  const category = await Category.findById(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  // Update fields
  if (req.body.categoryName) category.categoryName = req.body.categoryName;
  if (req.body.division) category.division = req.body.division;
  
  // Checking for undefined allows us to explicitly set it to null
  if (req.body.parentCategory !== undefined) {
    category.parentCategory = req.body.parentCategory; 
  }

  await category.save();

  // Populate before sending back
  await category.populate([
    { path: 'division', select: 'divisionName divisionCode' },
    { path: 'parentCategory', select: 'categoryName hierarchyDepth' }
  ]);

  res.status(200).json({
    status: 'success',
    data: { category }
  });
});

// @desc    Delete a category
// @route   DELETE /api/v1/categories/:id
export const deleteCategory = catchAsync(async (req, res, next) => {
  const category = await Category.findByIdAndDelete(req.params.id);

  if (!category) {
    return next(new AppError('No category found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});