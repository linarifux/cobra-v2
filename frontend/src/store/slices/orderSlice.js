import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api"; // Adjust the import path if necessary based on your folder structure

// --- Thunks ---

// 1. Fetch All Orders
export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async ({ customerId, divisionId } = {}, { rejectWithValue }) => {
    try {
      let endpoint = "/orders";

      // Utilize the nested Express routes we configured in the backend
      if (divisionId) {
        endpoint = `/divisions/${divisionId}/orders`;
      } else if (customerId) {
        endpoint = `/customers/${customerId}/orders`;
      }

      const response = await api.get(endpoint);
      return response.data.data.orders || response.data.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch orders"
      );
    }
  },
);

// 2. Fetch Single Order by ID
export const fetchOrderById = createAsyncThunk(
  "orders/fetchOrderById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/${id}`);
      return response.data.data.order || response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch order details"
      );
    }
  },
);

// 3. Create New Order
export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      let endpoint = "/orders";
      const response = await api.post(endpoint, orderData);
      return response.data.data.order || response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to create order"
      );
    }
  },
);

// 4. Update Existing Order (e.g., status changes, adding tracking)
export const updateOrder = createAsyncThunk(
  "orders/updateOrder",
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${id}`, updateData);
      return response.data.data.order || response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to update order"
      );
    }
  },
);

// 5. Delete Order
export const deleteOrder = createAsyncThunk(
  "orders/deleteOrder",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/orders/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to delete order"
      );
    }
  },
);

// 6. Generate New Label via ShipStation
export const generateOrderLabel = createAsyncThunk(
  "orders/generateLabel",
  async ({ orderId, fulfillmentData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/shipstation/label/${orderId}`, fulfillmentData);
      return response.data.data; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to generate shipping label"
      );
    }
  },
);

// --- NEW: Download/Print Previously Purchased Label ---
export const downloadPurchasedLabel = createAsyncThunk(
  "orders/downloadPurchasedLabel",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/shipstation/labels/download/${orderId}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to download the label."
      );
    }
  }
);


// --- Slice Definition ---
const orderSlice = createSlice({
  name: "orders",
  initialState: {
    items: [],
    currentOrder: null,
    status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
  },
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearOrders: (state) => {
      state.items = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addCase(fetchOrders.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Fetch Single ---
      .addCase(fetchOrderById.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // --- Create ---
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // --- Update ---
      .addCase(updateOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }

        if (state.currentOrder && String(state.currentOrder._id) === String(action.payload._id)) {
          state.currentOrder = action.payload;
        }
      })

      // --- Delete ---
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.items = state.items.filter((o) => String(o._id) !== String(action.payload));

        if (state.currentOrder && String(state.currentOrder._id) === String(action.payload)) {
          state.currentOrder = null;
        }
      })

      // --- Label Generation ---
      .addCase(generateOrderLabel.pending, (state) => {})
      .addCase(generateOrderLabel.fulfilled, (state, action) => {
        state.currentOrder = action.payload.order; 
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload.order._id));
        if (index !== -1) {
          state.items[index] = action.payload.order;
        }
      })

      // --- Label Download ---
      .addCase(downloadPurchasedLabel.pending, (state) => {})
      .addCase(downloadPurchasedLabel.fulfilled, (state) => {})
      .addCase(downloadPurchasedLabel.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearCurrentOrder, clearOrders } = orderSlice.actions;
export default orderSlice.reducer;