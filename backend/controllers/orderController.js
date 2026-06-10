import Order from '../models/Order.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new order
// @route   POST /api/v1/orders
export const createOrder = catchAsync(async (req, res, next) => {
  // If routing is nested via customer (e.g., POST /customers/:customerId/orders)
  if (!req.body.customer && req.params.customerId) {
    req.body.customer = req.params.customerId;
  }

  // NOTE: In a full production system, you would also want to decrement the 
  // Inventory pipelineSupply or unitsOnHand here inside a MongoDB Transaction.
  
  const order = await Order.create(req.body);

  // Populate data before returning to frontend
  await order.populate([
    { path: 'customer', select: 'customerName contactEmail' },
    { path: 'items.inventoryItem', select: 'itemName sku' }
  ]);

  res.status(201).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Get all orders
// @route   GET /api/v1/orders
// @route   GET /api/v1/customers/:customerId/orders
export const getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  
  if (req.params.customerId) {
    filter = { customer: req.params.customerId };
  }

  const orders = await Order.find(filter)
    .populate('customer', 'customerName')
    .sort('-createdAt'); // Newest orders first

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: { orders }
  });
});

// @desc    Get single order by ID
// @route   GET /api/v1/orders/:id
export const getOrderById = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'customerName contactEmail contactNumber address')
    .populate({
      path: 'items.inventoryItem',
      select: 'itemName sku unitCost locationCoordinates'
    });

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { order }
  });
});

// @desc    Update an order (e.g., Status change, add tracking)
// @route   PUT /api/v1/orders/:id
export const updateOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true 
    }
  ).populate('customer', 'customerName')
   .populate('items.inventoryItem', 'itemName sku');

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