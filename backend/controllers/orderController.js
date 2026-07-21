import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// Helper to determine the user's access tier
const getAccessLevel = (user) => {
  if (!user) return 'guest';
  // Global Admins can see everything across the system
  if (['super_admin', 'admin'].includes(user.role) || user.portal === 'admin') return 'global_admin';
  // Super Users are scoped strictly to their assigned divisions
  if (user.role === 'super_user') return 'division_admin';
  // Standard users are scoped only to their personal orders
  return 'standard_user';
};

// @desc    Create a new order
// @route   POST /api/v1/orders
export const createOrder = catchAsync(async (req, res, next) => {
  if (!req.body.customer && req.params.customerId) req.body.customer = req.params.customerId;
  if (!req.body.division && req.params.divisionId) req.body.division = req.params.divisionId;
  if (!req.body.user && req.params.userId) req.body.user = req.params.userId;
  if (!req.body.user && req.user) req.body.user = req.user._id;

  const order = await Order.create(req.body);

  await order.populate([
    { path: 'customer', select: 'customerName contactEmail' },
    { path: 'division', select: 'divisionName divisionCode' },
    { path: 'user', select: 'name firstName lastName email' } 
  ]);

  res.status(201).json({ status: 'success', data: { order } });
});

// @desc    Get all orders
// @route   GET /api/v1/orders
export const getAllOrders = catchAsync(async (req, res, next) => {
  let filter = {};
  
  if (req.params.customerId) filter.customer = req.params.customerId;
  if (req.params.divisionId) filter.division = req.params.divisionId;

  // --- 3-TIER ROLE-BASED ACCESS CONTROL (RBAC) ---
  const accessLevel = getAccessLevel(req.user);

  if (accessLevel === 'standard_user') {
    // Standard user: Forcefully scope to their own orders
    filter.user = req.user._id;

  } else if (accessLevel === 'division_admin') {
    // Super User: Scope to their assigned divisions
    const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];
    
    if (filter.division) {
      // If a specific division is requested, verify they have access to it
      if (!userDivisions.includes(String(filter.division))) {
        return next(new AppError('You do not have permission to view orders for this division', 403));
      }
    } else {
      // If no division is specified, return orders from ALL their assigned divisions
      filter.division = { $in: userDivisions };
    }
    
    // Allow filtering by specific user if requested via query
    if (req.params.userId) filter.user = req.params.userId;
    if (req.query.user) filter.user = req.query.user;
    if (req.query.userId) filter.user = req.query.userId;

  } else {
    // Global Admin: Allow them to view all, OR filter by specific user if queried
    if (req.params.userId) filter.user = req.params.userId;
    if (req.query.user) filter.user = req.query.user;
    if (req.query.userId) filter.user = req.query.userId;
  }

  const orders = await Order.find(filter)
    .populate('customer', 'customerName contactEmail')
    .populate('division', 'divisionName divisionCode') 
    .populate('user', 'name firstName lastName email') 
    .populate('shippingDetails.carrierId', 'carrierType accountName')
    .sort('-createdAt');

  res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
});

// @desc    Get a single order by ID
// @route   GET /api/v1/orders/:id
export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'customerName contactEmail contactNumber address')
    .populate('division', 'divisionName divisionCode address') 
    .populate('user', 'name firstName lastName email phone') 
    .populate('shippingDetails.carrierId', 'carrierType accountName');

  if (!order) return next(new AppError('No order found with that ID', 404));

  const accessLevel = getAccessLevel(req.user);
  
  // Prevent unauthorized ID guessing
  if (accessLevel !== 'global_admin') {
    const orderUserId = String(order.user?._id || order.user);
    const orderDivisionId = String(order.division?._id || order.division);

    if (accessLevel === 'division_admin') {
      const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];
      if (!userDivisions.includes(orderDivisionId)) {
        return next(new AppError('You do not have permission to view orders outside your assigned divisions', 403));
      }
    } else {
      if (orderUserId !== String(req.user._id)) {
        return next(new AppError('You do not have permission to view this order', 403));
      }
    }
  }

  res.status(200).json({ status: 'success', data: { order } });
});

// @desc    Update an order
// @route   PUT /api/v1/orders/:id
export const updateOrder = catchAsync(async (req, res, next) => {
  let order = await Order.findById(req.params.id);

  if (!order) return next(new AppError('No order found with that ID', 404));

  const accessLevel = getAccessLevel(req.user);

  if (accessLevel !== 'global_admin') {
    const orderUserId = String(order.user?._id || order.user);
    const orderDivisionId = String(order.division?._id || order.division);

    if (accessLevel === 'division_admin') {
      const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];
      if (!userDivisions.includes(orderDivisionId)) {
        return next(new AppError('You do not have permission to update orders outside your assigned divisions', 403));
      }
    } else {
      if (orderUserId !== String(req.user._id)) {
        return next(new AppError('You do not have permission to update this order', 403));
      }
    }
  }

  order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('customer', 'customerName')
    .populate('division', 'divisionName divisionCode') 
    .populate('user', 'name firstName lastName email') 
    .populate('shippingDetails.carrierId', 'carrierType accountName');

  res.status(200).json({ status: 'success', data: { order } });
});

// @desc    Delete an order
// @route   DELETE /api/v1/orders/:id
export const deleteOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) return next(new AppError('No order found with that ID', 404));

  const accessLevel = getAccessLevel(req.user);

  if (accessLevel !== 'global_admin') {
    const orderUserId = String(order.user?._id || order.user);
    const orderDivisionId = String(order.division?._id || order.division);

    if (accessLevel === 'division_admin') {
      const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];
      if (!userDivisions.includes(orderDivisionId)) {
        return next(new AppError('You do not have permission to delete orders outside your assigned divisions', 403));
      }
    } else {
      if (orderUserId !== String(req.user._id)) {
        return next(new AppError('You do not have permission to delete this order', 403));
      }
    }
  }

  await Order.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});