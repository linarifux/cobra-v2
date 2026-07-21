import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; 

// 1. Fetch cart from DB on login/load
export const fetchCartDb = createAsyncThunk('cart/fetchCartDb', async (_, { rejectWithValue }) => {
  try {
    // FIX: Updated endpoint from '/carts' to '/cart' to match the Express router
    const response = await api.get('/cart');
    return response.data.data.cart.items || [];
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
  }
});

// 2. Background sync to DB
export const syncCartDb = createAsyncThunk('cart/syncCartDb', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const cartItems = state.cart.items;
    
    // Safety check: Don't sync if user isn't logged in
    if (!state.auth?.user) return null;

    // Safely extract the Customer and Division ObjectIds
    const customerId = state.auth.user.customer?._id || state.auth.user.customer;
    const divisionId = state.divisions?.activeDivision?._id || state.divisions?.activeDivision;

    const payload = {
      customer: customerId,
      division: divisionId,
      items: cartItems.map(item => ({
        // Ensure accurate mapping to the Mongoose cartItemSchema
        product: item.product?._id || item.product?.id,
        sku: item.product?.sku || 'N/A',
        name: item.product?.itemName || item.product?.desc || 'Product',
        quantity: item.quantity,
        unitPrice: Number(item.product?.price || item.product?.unitCost || 0)
      }))
    };

    // FIX: Updated endpoint from '/carts' to '/cart'
    const response = await api.put('/cart', payload);
    return response.data.data.cart.items;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to sync cart');
  }
});

// 3. Clear cart completely from DB (used after successful checkout)
export const clearCartDb = createAsyncThunk('cart/clearCartDb', async (_, { rejectWithValue }) => {
  try {
    // FIX: Updated endpoint from '/carts' to '/cart'
    await api.delete('/cart');
    return [];
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to clear cart');
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    // These reducers handle the INSTANT UI updates (Optimistic UI)
    addItemLocal: (state, action) => {
      const product = action.payload;
      const existingItem = state.items.find(
        item => String(item.product._id || item.product.id) === String(product._id || product.id)
      );
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ product, quantity: 1 });
      }
    },
    removeItemLocal: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter(
        item => String(item.product._id || item.product.id) !== String(productId)
      );
    },
    updateQuantityLocal: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => String(item.product._id || item.product.id) === String(id));
      if (item && quantity > 0) {
        item.quantity = quantity;
      }
    },
    clearCartLocal: (state) => {
      state.items = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle the initial fetch from the database
      .addCase(fetchCartDb.pending, (state) => { 
        state.status = 'loading'; 
      })
      .addCase(fetchCartDb.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload; // Loads the populated items from the DB
      })
      .addCase(fetchCartDb.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Clear Cart from DB clears the local state too
      .addCase(clearCartDb.fulfilled, (state) => {
        state.items = [];
      });
  }
});

// Internal synchronous actions
const { addItemLocal, removeItemLocal, updateQuantityLocal, clearCartLocal } = cartSlice.actions;

// --- EXPORTED THUNKS FOR COMPONENTS ---
// These wrap the local updates + trigger the background database sync automatically

export const addToCart = (product) => (dispatch) => {
  dispatch(addItemLocal(product));
  dispatch(syncCartDb());
};

export const removeFromCart = (productId) => (dispatch) => {
  dispatch(removeItemLocal(productId));
  dispatch(syncCartDb());
};

export const updateQuantity = (id, quantity) => (dispatch) => {
  dispatch(updateQuantityLocal({ id, quantity }));
  dispatch(syncCartDb());
};

export const clearCart = () => (dispatch) => {
  dispatch(clearCartLocal());
  dispatch(clearCartDb());
}

export default cartSlice.reducer;