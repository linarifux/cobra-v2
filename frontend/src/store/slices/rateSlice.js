import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Ensure this points to your authorized Axios instance

// --- Thunks ---

// 1. Fetch All Rates (Database Rates)
export const fetchRates = createAsyncThunk(
  'rates/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/rates');
      return response.data.data.rates || response.data.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch rates');
    }
  }
);

// 2. Fetch Single Rate by ID (Database Rates)
export const fetchRateById = createAsyncThunk(
  'rates/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/rates/${id}`);
      return response.data.data.rate || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch rate details');
    }
  }
);

// 3. Create a Rate (Database Rates)
export const createRate = createAsyncThunk(
  'rates/create',
  async (rateData, { rejectWithValue }) => {
    try {
      const response = await api.post('/rates', rateData);
      return response.data.data.rate || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create rate');
    }
  }
);

// 4. Update a Rate (Database Rates)
export const updateRate = createAsyncThunk(
  'rates/update',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/rates/${id}`, updateData);
      return response.data.data.rate || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update rate');
    }
  }
);

// 5. Delete a Rate (Database Rates)
export const deleteRate = createAsyncThunk(
  'rates/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/rates/${id}`);
      return id; // Return the ID so we can filter it out of the state array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete rate');
    }
  }
);

// 6. NEW: Fetch Live ShipStation Rates by Shipment ID
export const fetchRatesByShipmentId = createAsyncThunk(
  'rates/fetchByShipmentId',
  async (shipmentId, { rejectWithValue }) => {
    try {
      // Assuming ShipStation routes are mounted at /shipstation on your backend
      const response = await api.get(`/shipstation/shipments/${shipmentId}/rates`);
      return response.data.data.rates || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch shipment rates');
    }
  }
);



// --- Slice Definition ---
const rateSlice = createSlice({
  name: 'rates',
  initialState: {
    items: [],                // Array of all database rates
    shipmentRates: [],        // Array of live ShipStation rates for a specific shipment
    currentRate: null,        // Single selected database rate
    status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed' (For Database Rates)
    shipmentRatesStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' (For ShipStation Rates)
    error: null
  },
  reducers: {
    clearCurrentRate: (state) => {
      state.currentRate = null;
    },
    clearShipmentRates: (state) => {
      state.shipmentRates = [];
      state.shipmentRatesStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All (Database)
      .addCase(fetchRates.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchRates.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchRates.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Single (Database)
      .addCase(fetchRateById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchRateById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentRate = action.payload;
      })
      .addCase(fetchRateById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // Fetch Live Rates by Shipment ID (ShipStation)
      .addCase(fetchRatesByShipmentId.pending, (state) => {
        state.shipmentRatesStatus = 'loading';
      })
      .addCase(fetchRatesByShipmentId.fulfilled, (state, action) => {
        state.shipmentRatesStatus = 'succeeded';
        state.shipmentRates = action.payload;
        state.error = null;
      })
      .addCase(fetchRatesByShipmentId.rejected, (state, action) => {
        state.shipmentRatesStatus = 'failed';
        state.error = action.payload;
      })

      // Create (Database)
      .addCase(createRate.fulfilled, (state, action) => {
        state.items.unshift(action.payload); 
      })

      // Update (Database)
      .addCase(updateRate.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRate && state.currentRate._id === action.payload._id) {
          state.currentRate = action.payload;
        }
      })

      // Delete (Database)
      .addCase(deleteRate.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
        if (state.currentRate && state.currentRate._id === action.payload) {
          state.currentRate = null;
        }
      });
  }
});

export const { clearCurrentRate, clearShipmentRates } = rateSlice.actions;
export default rateSlice.reducer;