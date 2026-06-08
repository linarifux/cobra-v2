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
  const customer = await Customer.findById(req.params.id);

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
      new: true, // Returns the updated document
      runValidators: true // Ensures the new data meets schema requirements
    }
  );

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