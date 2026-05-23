import { configureStore } from '@reduxjs/toolkit';
import ordersReducer from '../features/orders/ordersSlice';
import importsReducer from '../features/imports/importsSlice';
import shippingReducer from '../features/shipping/shippingSlice';

export const store = configureStore({
  reducer: {
    orders: ordersReducer,
    imports: importsReducer,
    shipping: shippingReducer,
  },
  // RTK includes thunk middleware by default for async backend calls later
});