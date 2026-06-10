import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';
import divisionReducer from './slices/divisionSlice';
import categoryReducer from './slices/categorySlice';
import inventoryReducer from './slices/inventorySlice';
import locationReducer from './slices/locationSlice';

export const store = configureStore({
  reducer: {
    customers: customerReducer,
    divisions: divisionReducer,
    categories: categoryReducer,
    inventory: inventoryReducer,
    locations: locationReducer,
  },
});