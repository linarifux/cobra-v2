import User from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// @desc    Create a new user (Order Portal users or Admin users)
// @route   POST /api/v1/users
export const createUser = catchAsync(async (req, res, next) => {
  const { name, email, password, portal, role, customer, divisions } = req.body;

  // Security Check: Only super_admins can create other Admin portal users
  if (portal === 'admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only Super Admins can create Admin Portal users.', 403));
  }

  // Security Check: Standard admins can create order portal users, but must provide customer ID
  if (portal === 'order' && !customer) {
    return next(new AppError('Order portal users must be assigned to a Customer.', 400));
  }

  const newUser = await User.create({
    name,
    email,
    password,
    portal,
    role,
    customer: portal === 'order' ? customer : undefined,
    divisions: portal === 'order' ? (divisions || []) : []
  });

  // Strip password from memory before returning
  newUser.password = undefined;

  // Populate relational arrays so the frontend has immediate access to names/codes
  await newUser.populate('customer', 'customerName');
  await newUser.populate('divisions', 'divisionName divisionCode status');

  res.status(201).json({
    status: 'success',
    data: { user: newUser }
  });
});

// @desc    Get all users (Filterable)
// @route   GET /api/v1/users
export const getAllUsers = catchAsync(async (req, res, next) => {
  // Allows querying like /api/v1/users?portal=order&customer=123
  const filter = { ...req.query }; 
  
  const users = await User.find(filter)
    .populate('customer', 'customerName')
    .populate('divisions', 'divisionName divisionCode status'); // <--- CRITICAL FOR FRONTEND

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users }
  });
});

// @desc    Update a user (Role, Name, Active Status, Divisions)
// @route   PUT /api/v1/users/:id
export const updateUser = catchAsync(async (req, res, next) => {
  
  // Security Check: Prevent accidental password overwrites via standard PUT requests
  if (req.body.password) {
    return next(new AppError('This route is not for password updates. Please use the secure password reset flow.', 400));
  }

  const userToUpdate = await User.findById(req.params.id);
  if (!userToUpdate) return next(new AppError('No user found', 404));

  // Security Check: Only super_admin can modify other admins
  if (userToUpdate.portal === 'admin' && req.user.role !== 'super_admin') {
    return next(new AppError('Only Super Admins can modify Admin Portal users.', 403));
  }

  const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
  .populate('customer', 'customerName')
  .populate('divisions', 'divisionName divisionCode status'); // <--- CRITICAL FOR FRONTEND

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser }
  });
});

// @desc    Delete a user completely
// @route   DELETE /api/v1/users/:id
export const deleteUser = catchAsync(async (req, res, next) => {
  // This route should ideally be protected by middleware to ONLY allow super_admin
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});