import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new order
// @route   POST /api/v1/orders
// @route   POST /api/v1/customers/:customerId/orders
// @route   POST /api/v1/divisions/:divisionId/orders
export const createOrder = catchAsync(async (req, res, next) => {
  // Support nested routing for both customer and division boundaries
  if (!req.body.customer && req.params.customerId) req.body.customer = req.params.customerId;
  if (!req.body.division && req.params.divisionId) req.body.division = req.params.divisionId;
  if (!req.body.user && req.params.userId) req.body.user = req.params.userId;

  const order = await Order.create(req.body);

  // Populate relational data before returning the new document
  await order.populate([
    { path: 'customer', select: 'customerName contactEmail' },
    { path: 'division', select: 'divisionName divisionCode' },
    { path: 'user', select: 'name firstName lastName email' } // Populate new user field
  ]);

  res.status(201).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Get all orders (with optional customer, division, or user filter)
// @route   GET /api/v1/orders
// @route   GET /api/v1/customers/:customerId/orders
// @route   GET /api/v1/divisions/:divisionId/orders
// @route   GET /api/v1/users/:userId/orders
export const getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Support nested routing parameters
  if (req.params.customerId) filter.customer = req.params.customerId;
  if (req.params.divisionId) filter.division = req.params.divisionId;
  if (req.params.userId) filter.user = req.params.userId;

  // Support query string filtering (e.g., ?user=64a2... OR ?userId=64a2...)
  if (req.query.user) filter.user = req.query.user;
  if (req.query.userId) filter.user = req.query.userId;

  const orders = await Order.find(filter)
    .populate('customer', 'customerName contactEmail')
    .populate('division', 'divisionName divisionCode') 
    .populate('user', 'name firstName lastName email') // Supply shopper details to frontend
    .populate('shippingDetails.carrierId', 'carrierType accountName')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// @desc    Get a single order by ID
// @route   GET /api/v1/orders/:id
export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'customerName contactEmail contactNumber address')
    .populate('division', 'divisionName divisionCode address') 
    .populate('user', 'name firstName lastName email phone') // Include full shopper context
    .populate('shippingDetails.carrierId', 'carrierType accountName');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Update an order (status, tracking, etc.)
// @route   PUT /api/v1/orders/:id
export const updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  )
  .populate('customer', 'customerName')
  .populate('division', 'divisionName divisionCode') 
  .populate('user', 'name firstName lastName email') // Ensure populated on return
  .populate('shippingDetails.carrierId', 'carrierType accountName');

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Delete an order
// @route   DELETE /api/v1/orders/:id
export const deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});