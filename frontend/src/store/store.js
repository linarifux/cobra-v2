import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';

export const store = configureStore({
  reducer: {
    customers: customerReducer,
    // Add other slices here as your app grows (orders, auth, etc.)
  },
});