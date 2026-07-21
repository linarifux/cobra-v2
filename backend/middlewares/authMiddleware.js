import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// 1. Protect routes (Verify token and inject User into request)
export const protect = catchAsync(async (req, res, next) => {
  // console.log(req.headers)
  
  
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please log in to get access.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }


  // Check if user is active/disabled
  if (!currentUser.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 403));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// 2. Restrict to specific portals (e.g., Only 'admin' portal users can access this route)
export const requirePortal = (portalType) => {
  return (req, res, next) => {

    if (req?.user?.portal !== portalType) {
      return next(new AppError(`Access denied. This route requires ${portalType} portal access.`, 403));
    }
    next();
  };
};

// 3. Restrict to specific roles (e.g., ['super_admin', 'admin'])
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403));
    }
    next();
  };
};
