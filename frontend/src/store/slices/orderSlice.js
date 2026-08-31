import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../utils/api";

// --- Thunks ---

// 1. Fetch All Orders (Dynamically scoped via query params for RBAC)
export const fetchOrders = createAsyncThunk(
  "orders/fetchOrders",
  async (params = {}, { rejectWithValue }) => {
    try {
      const { customerId, divisionId, userId } = params;
      
      const queryParams = new URLSearchParams();
      if (customerId) queryParams.append('customer', customerId);
      if (divisionId) queryParams.append('division', divisionId);
      if (userId) queryParams.append('user', userId); 

      const queryString = queryParams.toString();
      const endpoint = queryString ? `/orders?${queryString}` : `/orders`;

      const response = await api.get(endpoint);
      return response.data.data.orders || response.data.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch orders"
      );
    }
  }
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
  }
);

// NEW: Fetch Orders by User ID 
export const fetchOrdersByUser = createAsyncThunk(
  "orders/fetchOrdersByUser",
  async (userId, { rejectWithValue }) => {
    try {
      // Assuming you mapped it to /orders/user/:userId in your backend routes
      const response = await api.get(`/orders/user/${userId}`);
      return response.data.data.orders || response.data.data || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch user orders"
      );
    }
  }
);

// 3. Create New Order
export const createOrder = createAsyncThunk(
  "orders/createOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post("/orders", orderData);
      return response.data.data.order || response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to create order"
      );
    }
  }
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
  }
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
  }
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
  }
);

// 7. Download/Print Previously Purchased Label
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

// 8. Void Existing Label
export const voidOrderLabel = createAsyncThunk(
  "orders/voidLabel",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/shipstation/labels/void/${orderId}`);
      return response.data.data.order;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to void label"
      );
    }
  }
);

// 9. Cancel Unlabeled Shipment
export const cancelOrderShipment = createAsyncThunk(
  "orders/cancelShipment",
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.put(`/shipstation/shipments/cancel/${orderId}`);
      return response.data.data.order;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to cancel shipment"
      );
    }
  }
);

// 10. Create Shipment (Without Purchasing Label)
export const createOrderShipment = createAsyncThunk(
  "orders/createShipment",
  async ({ orderId, fulfillmentData }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/shipstation/shipments/${orderId}`, fulfillmentData);
      return response.data.data; // This expects { shipment, order } from the backend
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to create shipment"
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
    status: "idle",
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
      // Fetch All Orders
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

      // Fetch Orders By User
      .addCase(fetchOrdersByUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchOrdersByUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.items = action.payload;
      })
      .addCase(fetchOrdersByUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Fetch Order by ID
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

      // Create Order
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // Update Order
      .addCase(updateOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }

        if (state.currentOrder && String(state.currentOrder._id) === String(action.payload._id)) {
          state.currentOrder = action.payload;
        }
      })

      // Delete Order
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.items = state.items.filter((o) => String(o._id) !== String(action.payload));

        if (state.currentOrder && String(state.currentOrder._id) === String(action.payload)) {
          state.currentOrder = null;
        }
      })

      // Generate Label
      .addCase(generateOrderLabel.fulfilled, (state, action) => {
        state.currentOrder = action.payload.order; 
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload.order._id));
        if (index !== -1) {
          state.items[index] = action.payload.order;
        }
      })
      
      // Download Label
      .addCase(downloadPurchasedLabel.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Void / Cancel Actions
      .addCase(voidOrderLabel.fulfilled, (state, action) => {
        state.currentOrder = action.payload; 
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(cancelOrderShipment.fulfilled, (state, action) => {
        state.currentOrder = action.payload; 
        const index = state.items.findIndex((o) => String(o._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // Create Shipment
      .addCase(createOrderShipment.fulfilled, (state, action) => {
        if (action.payload.order) {
          state.currentOrder = action.payload.order;
          const index = state.items.findIndex((o) => String(o._id) === String(action.payload.order._id));
          if (index !== -1) {
            state.items[index] = action.payload.order;
          }
        }
      });
  },
});

export const { clearCurrentOrder, clearOrders } = orderSlice.actions;
export default orderSlice.reducer;