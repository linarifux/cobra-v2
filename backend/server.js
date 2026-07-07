import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db.js';
import AppError from './utils/AppError.js';
import { globalErrorHandler } from './middlewares/errorMiddleware.js';

// routes
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import divisionRoutes from './routes/divisionRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import carrierRoutes from './routes/carrierRoutes.js';
import userRoutes from './routes/userRoutes.js';
import receivingRoutes from './routes/receivingRoutes.js'
import uploadRoutes from './routes/uploadRoutes.js'
import typePieceRouter from './routes/typePieceRoutes.js';

// 1. Initialize Database Connection
connectDB();

// 2. Initialize Express App
const app = express();

// 3. Security & Utility Middlewares

// FIX: Bulletproof Helmet config for local development with Vite
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" } // Prevents Helmet from blocking external images/assets
}));

app.use(cors({ 
  origin: [
    "http://localhost:5173", 
    "http://localhost:5174",
    "http://localhost:5000", 
    "https://cobra-v2.vercel.app", 
    "https://cobra-v2.netlify.app", 
    "https://dsm-mi-orders.netlify.app",
    "d1ymwhyqj02a47.cloudfront.net",
    "http://98.83.145.156:5000",
    "d3s3grz6mr9lfw.cloudfront.net"
  ],
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/', (req, res) => {
  res.send('Welcome to COBRA API');
});

// 4. Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/divisions', divisionRoutes);
app.use('/api/v1/categories', categoryRoutes); 
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/carriers', carrierRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/receiving', receivingRoutes);
app.use('/api/v1/upload', uploadRoutes)
app.use('/api/v1/type-pieces', typePieceRouter);


// 5. Global Error Handler
app.use(globalErrorHandler);

// 6. Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// 7. Handle Unhandled Rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  
  // Gracefully close the server before exiting
  server.close(() => {
    process.exit(1);
  });
});