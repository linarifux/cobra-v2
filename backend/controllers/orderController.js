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

  const order = await Order.create(req.body);

  // Populate relational data before returning the new document
  await order.populate([
    { path: 'customer', select: 'customerName contactEmail' },
    { path: 'division', select: 'divisionName divisionCode' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Get all orders (with optional customer or division filter)
// @route   GET /api/v1/orders
// @route   GET /api/v1/customers/:customerId/orders
// @route   GET /api/v1/divisions/:divisionId/orders
export const getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  
  // Support nested routing to scope orders to specific relational boundaries
  if (req.params.customerId) filter.customer = req.params.customerId;
  if (req.params.divisionId) filter.division = req.params.divisionId;

  const orders = await Order.find(filter)
    .populate('customer', 'customerName contactEmail')
    .populate('division', 'divisionName divisionCode') //  Supply division details to the frontend
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
    .populate('division', 'divisionName divisionCode address') // Include full division context
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
  .populate('division', 'divisionName divisionCode') // Ensure populated on return
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