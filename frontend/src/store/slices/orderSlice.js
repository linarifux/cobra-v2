import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch All Orders (Supports global or customer-specific fetching)
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (customerId = null, { rejectWithValue }) => {
    try {
      const endpoint = customerId 
        ? `${API_URL}/customers/${customerId}/orders` 
        : `${API_URL}/orders`;
        
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch orders');

      return data.data.orders; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Fetch Single Order by ID
export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch order details');

      return data.data.order;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 3. Create New Order
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create order');

      return data.data.order;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 4. Update Existing Order (e.g., status changes, adding tracking)
export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order');

      return data.data.order;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 5. Delete Order
export const deleteOrder = createAsyncThunk(
  'orders/deleteOrder',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete order');
      }

      return id; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    items: [],
    currentOrder: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addCase(fetchOrders.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Fetch Single ---
      .addCase(fetchOrderById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Create ---
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // --- Update ---
      .addCase(updateOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex(o => o._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentOrder && state.currentOrder._id === action.payload._id) {
          state.currentOrder = action.payload;
        }
      })

      // --- Delete ---
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.items = state.items.filter(o => o._id !== action.payload);
        if (state.currentOrder && state.currentOrder._id === action.payload) {
          state.currentOrder = null;
        }
      });
  }
});

export const { clearCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;