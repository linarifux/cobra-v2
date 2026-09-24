import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Inventory from '../models/Inventory.js';
import ProcessingCharge from '../models/ProcessingCharge.js'; 
import User from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';
import { cancelShipment, voidLabel } from '../services/shipStationService.js';

import { sendPendingOrderEmail, sendOrderConfirmationEmail } from '../utils/emailService.js'; // Using your custom email service

// Helper to determine the user's access tier
const getAccessLevel = (user) => {
  if (!user) return 'guest';
  if (['super_admin', 'admin'].includes(user.role) || user.portal === 'admin') return 'global_admin';
  if (user.role === 'super_user') return 'division_admin';
  return 'standard_user';
};

// Helper to reliably determine if an order is international based on the country string
const checkIfInternational = (countryStr) => {
  if (!countryStr) return false; // Default to domestic if missing
  const normalizedCountry = countryStr.trim().toUpperCase();
  const domesticVariants = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'];
  return !domesticVariants.includes(normalizedCountry);
};

// Helper to calculate the Subtotal of line items
const calculateSubtotal = (orderData) => {
  return orderData.items ? orderData.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0) : 0;
};

// Helper to calculate the grand total of the order
const calculateTotalAmount = (orderData, calculatedFees, subtotal) => {
  const shippingCost = Number(orderData.shippingDetails?.shippingCost) || 0;
  const processingTotal = Number(calculatedFees?.totalProcessingFee) || 0;
  
  // Return Grand Total (Rounded to 2 decimals)
  return Math.round((subtotal + shippingCost + processingTotal) * 100) / 100;
};

// --- DYNAMIC FEE CALCULATION ENGINE ---
const calculateProcessingFees = async (orderData) => {
  // Fetch active charge configuration specific to the customer
  let config = {};
  if (orderData.customer) {
     const dbConfig = await ProcessingCharge.findOne({ customer: orderData.customer, isActive: true });
     if (dbConfig) config = dbConfig;
  }
  
  // Extract specific values, defaulting to 0 if none exist
  const cfgBaseUpTo10 = config.baseFeeUpTo10lbs !== undefined ? Number(config.baseFeeUpTo10lbs) : 0;
  const cfgBase11To20 = config.baseFee11To20lbs !== undefined ? Number(config.baseFee11To20lbs) : 0;
  const cfgWeight = config.weightSurcharge !== undefined ? Number(config.weightSurcharge) : 0;
  const cfgLineItem = config.lineItemSurcharge !== undefined ? Number(config.lineItemSurcharge) : 0;
  const cfgPackage = config.packageSurcharge !== undefined ? Number(config.packageSurcharge) : 0;
  const cfgPiece = config.pieceSurcharge !== undefined ? Number(config.pieceSurcharge) : 0;
  const cfgCarton = config.cartonSurcharge !== undefined ? Number(config.cartonSurcharge) : 0;
  const cfgPallet = config.palletProcessingFee !== undefined ? Number(config.palletProcessingFee) : 0;
  const cfgRush = config.rushSurcharge !== undefined ? Number(config.rushSurcharge) : 0;
  const cfgIntl = config.internationalSurcharge !== undefined ? Number(config.internationalSurcharge) : 0;

  const fees = {
    baseFee: 0,
    weightSurcharge: 0,
    lineItemSurcharge: 0,
    packageSurcharge: 0,
    pieceSurcharge: 0,
    cartonSurcharge: 0,
    rushFee: 0,
    internationalFee: 0,
    palletFee: 0,
    totalProcessingFee: 0
  };

  // 1. Weight & Base Fee 
  const weightLbs = (orderData.shippingDetails?.totalWeightOunces || 0) / 16;
  fees.baseFee = weightLbs <= 10 ? cfgBaseUpTo10 : cfgBase11To20;
  
  // 2. Weight Surcharge (Over 20 lbs)
  if (weightLbs > 20) {
    fees.weightSurcharge = (weightLbs - 20) * cfgWeight; 
  }

  // 3. Line Items (Over 3 lines)
  const lineItemsCount = orderData.items ? orderData.items.length : 0;
  if (lineItemsCount > 3) {
    fees.lineItemSurcharge = (lineItemsCount - 3) * cfgLineItem;
  }

  // 4. Packages (Over 1 package)
  const packageCount = orderData.shippingDetails?.totalBoxes || 
                      (orderData.shippingDetails?.packages ? orderData.shippingDetails.packages.length : 1);
  if (packageCount > 1) {
    fees.packageSurcharge = (packageCount - 1) * cfgPackage;
  }

  // 5. Pieces
  const totalPieces = orderData.items ? orderData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : 0;
  fees.pieceSurcharge = totalPieces * cfgPiece;

  // 6. Cartons
  const cartonCount = orderData.shippingDetails?.cartoons || 0; 
  fees.cartonSurcharge = cartonCount * cfgCarton;

  // 7. Pallets
  const palletCount = orderData.shippingDetails?.pallets || 0;
  fees.palletFee = palletCount * cfgPallet;

  // 8. Toggles
  fees.rushFee = orderData.isRushOrder ? cfgRush : 0;
  fees.internationalFee = orderData.isInternational ? cfgIntl : 0;

  // Rounding utility to prevent floating-point precision issues
  const round2 = (num) => Math.round(num * 100) / 100;

  fees.baseFee = round2(fees.baseFee);
  fees.weightSurcharge = round2(fees.weightSurcharge);
  fees.lineItemSurcharge = round2(fees.lineItemSurcharge);
  fees.packageSurcharge = round2(fees.packageSurcharge);
  fees.pieceSurcharge = round2(fees.pieceSurcharge);
  fees.cartonSurcharge = round2(fees.cartonSurcharge);
  fees.palletFee = round2(fees.palletFee);
  fees.rushFee = round2(fees.rushFee);
  fees.internationalFee = round2(fees.internationalFee);
  
  fees.totalProcessingFee = round2(
    fees.baseFee + fees.weightSurcharge + fees.lineItemSurcharge + 
    fees.packageSurcharge + fees.pieceSurcharge + fees.cartonSurcharge + 
    fees.rushFee + fees.internationalFee + fees.palletFee
  );

  return fees;
};

// @desc    Create a new order
export const createOrder = catchAsync(async (req, res, next) => {
  if (!req.body.customer && req.params.customerId) req.body.customer = req.params.customerId;
  if (!req.body.division && req.params.divisionId) req.body.division = req.params.divisionId;
  if (!req.body.user && req.params.userId) req.body.user = req.params.userId;

  if (!req.body.shippingDetails?.carrierType || !req.body.shippingDetails?.serviceCode) {
    return next(new AppError('Shipping carrier and service code are required to process the order.', 400));
  }

  const customer = await Customer.findById(req.body.customer);
  if (!customer) return next(new AppError('Customer not found.', 404));

  // --- AUTOMATED INTERNATIONAL DETECTION ---
  const orderCountry = req.body.shippingAddress?.country || 'US';
  req.body.isInternational = checkIfInternational(orderCountry);

  // --- CALCULATE SUBTOTAL & PROCESSING FEES ---
  req.body.subtotal = calculateSubtotal(req.body);
  req.body.processingFees = await calculateProcessingFees(req.body);

  // --- CALCULATE GRAND TOTAL ---
  req.body.totalAmount = calculateTotalAmount(req.body, req.body.processingFees, req.body.subtotal);

  let order = new Order(req.body);
  order.customer = customer;

  if (req.body.qtyLimitExceeds === true) {
    order.status = 'Pending';
  }

  // --- MONTHLY ORDER LIMIT CHECK ---
  let orderUser = null;
  const targetUserId = req.body.user || (req.user ? req.user._id : null);
  
  if (targetUserId) {
    orderUser = await User.findById(targetUserId);
    if (orderUser && typeof orderUser.orderLimit === 'number') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthlyOrderCount = await Order.countDocuments({
        user: targetUserId,
        createdAt: { $gte: startOfMonth,$lte: endOfMonth }
      });

      if (monthlyOrderCount >= orderUser.orderLimit) {
        order.status = 'Pending';
      }
    }
  }

  await order.save();

  // --- EMAIL TRIGGER LOGIC ---
  const recipientName = orderUser?.name || order.shippingAddress?.recipientName;
  const fallbackEmail = orderUser?.email || order.shippingAddress?.email;

  if (fallbackEmail) {
    try {
      if (order.status === 'Pending') {
        // ALWAYS send alert to the operations team
        await sendPendingOrderEmail('orders@mi-kro.com', recipientName, order.orderNumber, order.subtotal);
        
        // Privilege Check: If current user cannot release orders, find an admin/super_user who can
        let notifyEmail = null;

        if (orderUser && orderUser.releasePendingOrders === true) {
          notifyEmail = orderUser.email;
        } else {
          // Find the first active user under this specific customer who possesses release permissions
          const privilegedUser = await User.findOne({ 
            customer: order.customer, 
            releasePendingOrders: true,
            isActive: true 
          }).select('email');

          if (privilegedUser) {
            notifyEmail = privilegedUser.email;
          }
        }

        // Dispatch alert if a valid target was identified
        if (notifyEmail) {
          await sendPendingOrderEmail(notifyEmail, recipientName, order.orderNumber, order.subtotal);
        }

      } else {
        // Standard Confirmation
        await sendOrderConfirmationEmail(fallbackEmail, order);
      }
    } catch (emailError) {
      console.error(`Failed to send email for order ${order.orderNumber}:`, emailError);
    }
  }

  if (order.items && order.items.length > 0) {
    try {
      await Promise.all(order.items.map(async (item) => {
        const deduction = Number(item.quantity) || 1;
        await Inventory.findOneAndUpdate(
          { sku: item.sku, customer: order.customer },
          {
            $inc: { available: -deduction, unitsOnHand: -deduction },$push: {
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
      console.error(`[Inventory Sync Warning] Failed to deduct stock:`, invError.message);
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
      { 'shippingAddress.recipientName': { $regex: req.query.search, $options: 'i' } },
      { 'shippingAddress.companyName': { $regex: req.query.search, $options: 'i' } } 
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
export const getOrder = catchAsync(async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', '_id carrierConfigurations customerName contactEmail contactNumber address')
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
export const updateOrder = catchAsync(async (req, res, next) => {
  let order = await Order.findById(req.params.id)
    .populate('user', 'email name releasePendingOrders');

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

  // --- EVENT CATCH: DETECT STATUS CHANGE TO PENDING ---
  const isChangingToPending = req.body.status === 'Pending' && order.status !== 'Pending';
  
  // --- EVENT CATCH: DETECT ANY UPDATE ON A NEW ORDER ---
  const isStandardUpdate = !isChangingToPending && req.body.status !== 'Cancelled';

  const mergedData = { 
    ...order.toObject(), 
    ...req.body,
    shippingDetails: {
      ...(order.shippingDetails ? order.shippingDetails.toObject() : {}),
      ...(req.body.shippingDetails || {})
    },
    shippingAddress: {
      ...(order.shippingAddress ? order.shippingAddress.toObject() : {}),
      ...(req.body.shippingAddress || {})
    },
    items: req.body.items || order.items
  };
  
  req.body.isInternational = checkIfInternational(mergedData.shippingAddress?.country);
  mergedData.isInternational = req.body.isInternational; 

  // --- RE-CALCULATE SUBTOTAL, FEES & TOTAL ON UPDATE ---
  req.body.subtotal = calculateSubtotal(mergedData);
  req.body.processingFees = await calculateProcessingFees(mergedData);
  req.body.totalAmount = calculateTotalAmount(mergedData, req.body.processingFees, req.body.subtotal);

  if (req.body.status === 'Cancelled' && order.status !== 'Cancelled') {
    const labelId = order.shipstationDetails?.labelId;
    const shipmentId = order.shipstationDetails?.orderId;

    try {
      if (labelId) await voidLabel(labelId);
      else if (shipmentId) await cancelShipment(shipmentId);
    } catch (e) {
      console.warn(`Failed to selectively void ShipStation records:`, e.message);
    }

    if (order.items && order.items.length > 0) {
      try {
        await Promise.all(order.items.map(async (item) => {
          const restockQty = Number(item.quantity) || 1;
          await Inventory.findOneAndUpdate(
            { sku: item.sku, customer: order.customer },
            {
              $inc: { available: restockQty, unitsOnHand: restockQty },$push: {
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
        console.error(`[Inventory Sync Warning] Failed to restock:`, invError.message);
      }
    }
  }

  order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('customer', 'customerName')
    .populate('division', 'divisionName divisionCode')
    .populate('user', 'name firstName lastName email releasePendingOrders')
    .populate('shippingDetails.carrierId', 'carrierType accountName');

  // --- EMAIL TRIGGER LOGIC FOR UPDATES ---
  const orderUser = order.user;
  const recipientEmail = orderUser?.email || order.shippingAddress?.email;
  const recipientName = orderUser?.name || order.shippingAddress?.recipientName;

  if (recipientEmail) {
    try {
      if (isChangingToPending) {
        // ALWAYS send alert to the operations team
        await sendPendingOrderEmail('orders@mi-kro.com', recipientName, order.orderNumber, order.subtotal);
        
        // Privilege Check: If current user cannot release orders, find an admin/super_user who can
        let notifyEmail = null;

        if (orderUser && orderUser.releasePendingOrders === true) {
          notifyEmail = orderUser.email;
        } else {
          // Find the first active user under this specific customer who possesses release permissions
          const privilegedUser = await User.findOne({ 
            customer: order.customer, 
            releasePendingOrders: true,
            isActive: true 
          }).select('email');

          if (privilegedUser) {
            notifyEmail = privilegedUser.email;
          }
        }

        // Dispatch alert if a valid target was identified
        if (notifyEmail) {
          await sendPendingOrderEmail(notifyEmail, recipientName, order.orderNumber, order.subtotal);
        }

      } else if (isStandardUpdate) {
        // Standard Update Confirmation
        await sendOrderConfirmationEmail(recipientEmail, order);
      }
    } catch (emailError) {
      console.error(`Failed to send email update for order ${order.orderNumber}:`, emailError);
    }
  }

  res.status(200).json({ status: 'success', data: { order } });
});

// @desc    Delete an order
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

  const labelId = order.shipstationDetails?.labelId;
  const shipmentId = order.shipstationDetails?.orderId;

  try {
    if (labelId) await voidLabel(labelId);
    else if (shipmentId) await cancelShipment(shipmentId);
  } catch (e) {
    console.warn(`Failed to cleanup ShipStation records:`, e.message);
  }

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
            $inc: { available: restockQty, unitsOnHand: restockQty },$push: {
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
      console.error(`[Inventory Sync Warning] Failed to restock:`, invError.message);
    }
  }
  
  await Order.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
});

// @desc    Get all orders belonging to a specific user
// @route   GET /api/v1/users/:userId/orders OR /api/v1/orders/user/:userId
export const getOrdersByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new AppError('User ID is required to fetch orders.', 400));
  }

  const accessLevel = getAccessLevel(req.user);

  // Security Check: Standard users can ONLY request their own orders
  if (accessLevel === 'standard_user' && String(req.user._id) !== String(userId)) {
    return next(new AppError('You do not have permission to view orders for this user.', 403));
  }

  const filter = { user: userId };

  // Security Check: Division admins can only see this user's orders if they belong to their assigned divisions
  if (accessLevel === 'division_admin') {
    const userDivisions = req.user.divisions ? req.user.divisions.map(d => String(d._id || d)) : [];
    filter.division = { $in: userDivisions };
  }

  const orders = await Order.find(filter)
    .populate('customer', 'customerName contactEmail')
    .populate('division', 'divisionName divisionCode')
    .populate('user', 'name firstName lastName email')
    .populate('shippingDetails.carrierId', 'carrierType accountName')
    .sort('-createdAt'); // Sorts newest first

  res.status(200).json({ 
    status: 'success', 
    results: orders.length, 
    data: { orders } 
  });
});