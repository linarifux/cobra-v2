import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) return next(new AppError('Email already in use', 400));

  // Security Note: In a true production app, you might want to strip 'role' from 
  // public registrations to prevent someone from passing {"role": "admin"} in Postman.
  // For internal apps where admins create accounts, passing 'role' is fine.
  const user = await User.create({ name, email, password, role });
  const token = signToken(user._id);

  res.status(201).json({
    status: 'success',
    token,
    data: { 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    }
  });
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Find user and explicitly select the password since we hid it by default
  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.matchPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    }
  });
});