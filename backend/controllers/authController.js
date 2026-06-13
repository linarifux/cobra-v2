import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user }
  });
};

// @desc    Login user (Automatically routes based on portal type)
// @route   POST /api/v1/auth/login
export const login = catchAsync(async (req, res, next) => {
  const { email, password, portal } = req.body;

  // 1. Check if email, password, and portal exist
  if (!email || !password || !portal) {
    return next(new AppError('Please provide email, password, and portal target', 400));
  }

  // 2. Check if user exists && password is correct (specifically for that portal)
  const user = await User.findOne({ email, portal }).select('+password');

  if (!user || !(await user.matchPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password for this portal', 401));
  }

  // 3. Check if account is active
  if (!user.isActive) {
    return next(new AppError('This account has been deactivated.', 403));
  }

  // 4. Send token
  createSendToken(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
export const getMe = catchAsync(async (req, res, next) => {
  // req.user is injected by the `protect` middleware
  const user = await User.findById(req.user._id).populate('customer', 'customerName status');

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});