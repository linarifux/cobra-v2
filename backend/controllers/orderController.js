import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { cancelShipment, voidLabel } from '../services/shipStationService.js';

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

// @desc    Create a new order and deduct inventory (LOCAL DB ONLY - NO SHIPSTATION PUSH)
// @route   POST /api/v1/orders
export const createOrder = catchAsync(async (req, res, next) => {
  if (!req.body.customer && req.params.customerId) req.body.customer = req.params.customerId;
  if (!req.body.division && req.params.divisionId) req.body.division = req.params.divisionId;

  if (!req.body.user && req.params.userId) req.body.user = req.params.userId;

  if (!req.body.shippingDetails?.carrierType || !req.body.shippingDetails?.serviceCode) {
    return next(new AppError('Shipping carrier and service code are required to process the order.', 400));
  }

  const customer = await Customer.findById(req.body.customer);
  if (!customer) return next(new AppError('Customer not found.', 404));

  let order = new Order(req.body);
  order.customer = customer;

  // 1. Save the order strictly to the local database
  await order.save();

  // 2. Deduct Inventory Quantities & Append Audit Ledger
  if (order.items && order.items.length > 0) {
    try {
      await Promise.all(order.items.map(async (item) => {
        const deduction = Number(item.quantity) || 1;
        await Inventory.findOneAndUpdate(
          { sku: item.sku, customer: order.customer },
          {
            $inc: { available: -deduction, unitsOnHand: -deduction }, $push: {
              auditLedger: {
                event: 'Order Placed',
                referenceId: order.orderNumber || order._id.toString(),
                quantityDelta: -deduction
              }
            }
          },
          { new: true, runValidators: true }
        );
      }));
    } catch (invError) {
      console.error(`[Inventory Sync Warning] Failed to deduct stock for Order ${order._id}:`, invError.message);
    }
  }

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

  if (req.query.customer && req.query.customer !== 'All') filter.customer = req.query.customer;
  if (req.query.division && req.query.division !== 'All') filter.division = req.query.division;
  if (req.query.user && req.query.user !== 'All') filter.user = req.query.user;
  if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;

  if (req.query.search) {
    filter.$or = [
      { orderNumber: { $regex: req.query.search, $options: 'i' } },
      { 'shippingAddress.recipientName': { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const accessLevel = getAccessLevel(req.user);

  if (accessLevel === 'standard_user') {
    filter.user = req.user._id;
  } else if (accessLevel === 'division_admin') {
    const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];

    if (filter.division) {
      if (!userDivisions.includes(String(filter.division))) {
        return next(new AppError('You do not have permission to view orders for this division', 403));
      }
    } else {
      filter.division = { $in: userDivisions };
    }
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

  // --- AUTOMATED SHIPSTATION & INVENTORY CLEANUP ON CANCELLATION ---
  if (req.body.status === 'Cancelled' && order.status !== 'Cancelled') {
    const labelId = order.shipstationDetails?.labelId;
    const shipmentId = order.shipstationDetails?.orderId;

    // 1. Clean ShipStation
    try {
      if (labelId) await voidLabel(labelId);
      else if (shipmentId) await cancelShipment(shipmentId);
    } catch (e) {
      console.warn(`Failed to selectively void ShipStation records for cancelled order ${order._id}:`, e.message);
    }

    // 2. Restock Inventory
    if (order.items && order.items.length > 0) {
      try {
        await Promise.all(order.items.map(async (item) => {
          const restockQty = Number(item.quantity) || 1;
          await Inventory.findOneAndUpdate(
            { sku: item.sku, customer: order.customer },
            {
              $inc: { available: restockQty, unitsOnHand: restockQty },
              $push: {
                auditLedger: {
                  event: 'Order Cancellation Restock',
                  referenceId: order.orderNumber || order._id.toString(),
                  quantityDelta: restockQty
                }
              }
            },
            { new: true, runValidators: true }
          );
        }));
      } catch (invError) {
        console.error(`[Inventory Sync Warning] Failed to restock for cancelled Order ${order._id}:`, invError.message);
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

  // --- AUTOMATED SHIPSTATION CLEANUP ---
  const labelId = order.shipstationDetails?.labelId;
  const shipmentId = order.shipstationDetails?.orderId;

  try {
    if (labelId) await voidLabel(labelId);
    else if (shipmentId) await cancelShipment(shipmentId);
  } catch (e) {
    console.warn(`Failed to cleanup ShipStation records for deleted order ${order._id}:`, e.message);
  }

  // --- AUTOMATED INVENTORY RESTOCK ON DELETION ---
  const safeToDeleteStatus = ['shipped', 'delivered', 'cancelled', 'billed'];
  const currentStatus = order.status?.toLowerCase() || 'new';
  const needsRestock = !safeToDeleteStatus.includes(currentStatus);

  if (needsRestock && order.items && order.items.length > 0) {
    try {
      await Promise.all(order.items.map(async (item) => {
        const restockQty = Number(item.quantity) || 1;
        await Inventory.findOneAndUpdate(
          { sku: item.sku, customer: order.customer },
          {
            $inc: { available: restockQty, unitsOnHand: restockQty },
            $push: {
              auditLedger: {
                event: 'Order Deletion Restock',
                referenceId: order.orderNumber || order._id.toString(),
                quantityDelta: restockQty
              }
            }
          },
          { new: true, runValidators: true }
        );
      }));
    } catch (invError) {
      console.error(`[Inventory Sync Warning] Failed to restock for deleted Order ${order._id}:`, invError.message);
    }
  }

  await Order.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});