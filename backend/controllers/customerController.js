import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new customer
// @route   POST /api/v1/customers
export const createCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.create(req.body);

  res.status(201).json({
    status: 'success',
    data: { customer }
  });
});

// @desc    Get all customers
// @route   GET /api/v1/customers
export const getAllCustomers = catchAsync(async (req, res, next) => {
  const customers = await Customer.find().sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: customers.length,
    data: { customers }
  });
});

// @desc    Get a single customer by ID
// @route   GET /api/v1/customers/:id
export const getCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate('carrierConfigurations.carrier'); // Populating full carrier object to avoid missing fields

  if (!customer) {
    return next(new AppError('No customer found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { customer }
  });
});

// @desc    Update a customer
// @route   PUT /api/v1/customers/:id
export const updateCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  ).populate('carrierConfigurations.carrier');

  if (!customer) {
    return next(new AppError('No customer found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { customer }
  });
});

// @desc    Assign or update a carrier configuration for a specific customer
// @route   PUT /api/v1/customers/:id/carriers
export const updateCustomerCarriers = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { carrierConfigurations: req.body.carrierConfigurations },
    { new: true, runValidators: true }
  ).populate('carrierConfigurations.carrier');

  if (!customer) {
    return next(new AppError('No customer found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { customer }
  });
});

// @desc    Delete a customer
// @route   DELETE /api/v1/customers/:id
export const deleteCustomer = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);

  if (!customer) {
    return next(new AppError('No customer found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});


// ==========================================
// ROBUST RELATIONAL FETCH CONTROLLERS
// ==========================================

// @desc    Get all carrier configurations for a specific customer
// @route   GET /api/v1/customers/:id/carriers
export const getCustomerCarriers = catchAsync(async (req, res, next) => {
  // Fallback covers standard route (/:id) and nested route (/:customerId)
  const targetId = req.params.id || req.params.customerId;
  
  const customer = await Customer.findById(targetId)
    .populate('carrierConfigurations.carrier');

  if (!customer) return next(new AppError('No customer found with that ID', 404));

  res.status(200).json({
    status: 'success',
    data: { carriers: customer.carrierConfigurations || [] }
  });
});

// @desc    Get all inventory belonging to a specific customer
// @route   GET /api/v1/customers/:id/inventory
export const getCustomerInventory = catchAsync(async (req, res, next) => {
  const targetId = req.params.id || req.params.customerId;
  
  // Safely uses Mongoose cache to query Inventory model without strict import path dependencies
  const Inventory = mongoose.model('Inventory');
  const inventory = await Inventory.find({ customer: targetId })
    .populate('division')
    .populate('category')
    .populate('locations'); 

  res.status(200).json({
    status: 'success',
    results: inventory?.length || 0,
    data: { inventory: inventory || [] }
  });
});

// @desc    Get all users associated with a specific customer
// @route   GET /api/v1/customers/:id/users
export const getCustomerUsers = catchAsync(async (req, res, next) => {
  const targetId = req.params.id || req.params.customerId;
  
  // Safely uses Mongoose cache to query User model
  const User = mongoose.model('User');
  const users = await User.find({ customer: targetId }).select('-password'); // Never send passwords to frontend

  res.status(200).json({
    status: 'success',
    results: users?.length || 0,
    data: { users: users || [] }
  });
});