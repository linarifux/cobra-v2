import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/errorMiddleware.js';

// 1. Initialize Database Connection
connectDB();

// 2. Initialize Express App
const app = express();

// 3. Security & Utility Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. Routes
app.use('/api/v1/auth', authRoutes);

// 5. Unhandled Routes (404 handler)
// app.all('*', (req, res, next) => {
//   next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// 6. Global Error Handler
app.use(globalErrorHandler);

// 7. Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// 8. Handle Unhandled Rejections (e.g., bad database credentials)
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Gracefully close the server before exiting
  server.close(() => {
    process.exit(1);
  });
});