import { configureStore } from '@reduxjs/toolkit';

// Auth & Users
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

// App Data
import customerReducer from './slices/customerSlice';
import divisionReducer from './slices/divisionSlice';
import categoryReducer from './slices/categorySlice';
import inventoryReducer from './slices/inventorySlice';
import locationReducer from './slices/locationSlice';
import carrierReducer from './slices/carrierSlice';
import orderReducer from './slices/orderSlice';
import receivingReducer from './slices/receivingSlice';
import typePieceReducer from './slices/typePieceSlice'
import uploadReducer from './slices/uploadSlice'
import cartReducer from './slices/cartSlice'

export const store = configureStore({
  reducer: {
    // 1. Security & Access
    auth: authReducer,
    users: userReducer,
    
    // 2. Core Logistics Data
    customers: customerReducer,
    divisions: divisionReducer,
    categories: categoryReducer,
    inventory: inventoryReducer,
    locations: locationReducer,
    carriers: carrierReducer,
    orders: orderReducer,
    receiving: receivingReducer,
    typePieces: typePieceReducer,
    upload: uploadReducer,
    cart: cartReducer
  },
});