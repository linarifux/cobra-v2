import TypePiece from '../models/TypePiece.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new Type Piece
// @route   POST /api/v1/type-pieces
export const createTypePiece = catchAsync(async (req, res, next) => {
  const typePiece = await TypePiece.create(req.body);

  // Populate customer data before sending response
  await typePiece.populate('customer', 'customerName');

  res.status(201).json({
    status: 'success',
    data: { typePiece }
  });
});

// @desc    Get all Type Pieces (Supports filtering by Customer)
// @route   GET /api/v1/type-pieces
export const getAllTypePieces = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // If a customer ID is passed in the query (e.g., ?customer=123), filter by it
  if (req.query.customer) {
    filter.customer = req.query.customer;
  }

  const typePieces = await TypePiece.find(filter)
    .populate('customer', 'customerName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: typePieces.length,
    data: { typePieces }
  });
});

// @desc    Get a single Type Piece
// @route   GET /api/v1/type-pieces/:id
export const getTypePieceById = catchAsync(async (req, res, next) => {
  const typePiece = await TypePiece.findById(req.params.id).populate('customer', 'customerName');

  if (!typePiece) {
    return next(new AppError('No Type Piece found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { typePiece }
  });
});

// @desc    Update a Type Piece
// @route   PUT /api/v1/type-pieces/:id
export const updateTypePiece = catchAsync(async (req, res, next) => {
  const typePiece = await TypePiece.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate('customer', 'customerName');

  if (!typePiece) {
    return next(new AppError('No Type Piece found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { typePiece }
  });
});

// @desc    Delete a Type Piece
// @route   DELETE /api/v1/type-pieces/:id
export const deleteTypePiece = catchAsync(async (req, res, next) => {
  const typePiece = await TypePiece.findByIdAndDelete(req.params.id);

  if (!typePiece) {
    return next(new AppError('No Type Piece found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});