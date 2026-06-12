import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new order
// @route   POST /api/v1/orders
// @route   POST /api/v1/customers/:customerId/orders
export const createOrder = catchAsync(async (req, res, next) => {
  // If hitting the nested route, ensure the customer ID is attached to the body
  if (!req.body.customer) req.body.customer = req.params.customerId;

  const order = await Order.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Get all orders (with optional customer filter)
// @route   GET /api/v1/orders
// @route   GET /api/v1/customers/:customerId/orders
export const getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  // Support nested routing to get only one customer's orders
  if (req.params.customerId) filter = { customer: req.params.customerId };

  const orders = await Order.find(filter)
    .populate('customer', 'customerName contactEmail')
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
  ).populate('customer', 'customerName').populate('shippingDetails.carrierId', 'carrierType accountName');

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