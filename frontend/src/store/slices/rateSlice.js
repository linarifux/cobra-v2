import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Ensure this points to your authorized Axios instance

// --- Thunks ---

// 1. Fetch All Rates
export const fetchRates = createAsyncThunk(
  'rates/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/rates');
      return response.data.data.rates || response.data.data; 
    } catch (error) {
      // Gracefully handle 404 so it doesn't crash the frontend UI if the backend route isn't built yet
      if (error.response?.status === 404) {
        console.warn('⚠️ /api/v1/rates endpoint not found. Defaulting to empty rates array.');
        return [];
      }
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch rates');
    }
  }
);

// 2. Fetch Single Rate by ID
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

// 3. Create a Rate
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

// 4. Update a Rate
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

// 5. Delete a Rate
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


// 6. NEW: Fetch Rate Shoppers
export const fetchRateShoppers = createAsyncThunk(
  'rates/fetchRateShoppers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/shipstation/rate-shoppers');
      return response.data.data.rateShoppers || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch rate shoppers');
    }
  }
);

// 7. NEW: Fetch Rates with Explicit Payload Options (Using Shipment ID)
export const fetchRatesWithShipmentId = createAsyncThunk(
  'rates/fetchRatesWithShipmentId',
  async ({ shipmentId, rateOptions }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/shipstation/shipments/${shipmentId}/get-rates`, { rate_options: rateOptions });
      return response.data.data.rates || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch shipment rates');
    }
  }
);

// --- Slice Definition ---
const rateSlice = createSlice({
  name: 'rates',
  initialState: {
    items: [],                   // Array of all rates
    rateShoppers: [],            // Array of rate shoppers (Best Value, Cheapest, etc.)
    shipmentRates: [],           // Array of fetched live rates
    currentRate: null,           // Single selected rate
    status: 'idle',              // DB Fetching status
    rateShoppersStatus: 'idle',  // Rate Shopper API status
    shipmentRatesStatus: 'idle', // Live Rates API status
    error: null
  },
  reducers: {
    clearCurrentRate: (state) => {
      state.currentRate = null;
    },
    clearRateShoppers: (state) => {
      state.rateShoppers = [];
      state.rateShoppersStatus = 'idle';
    },
    clearShipmentRates: (state) => {
      state.shipmentRates = [];
      state.shipmentRatesStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
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

      // Fetch Single
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

      // Fetch Rate Shoppers
      .addCase(fetchRateShoppers.pending, (state) => {
        state.rateShoppersStatus = 'loading';
      })
      .addCase(fetchRateShoppers.fulfilled, (state, action) => {
        state.rateShoppersStatus = 'succeeded';
        state.rateShoppers = action.payload;
        state.error = null;
      })
      .addCase(fetchRateShoppers.rejected, (state, action) => {
        state.rateShoppersStatus = 'failed';
        state.error = action.payload;
      })

      // Fetch Rates With Shipment ID
      .addCase(fetchRatesWithShipmentId.pending, (state) => {
        state.shipmentRatesStatus = 'loading';
      })
      .addCase(fetchRatesWithShipmentId.fulfilled, (state, action) => {
        state.shipmentRatesStatus = 'succeeded';
        state.shipmentRates = action.payload;
        state.error = null;
      })
      .addCase(fetchRatesWithShipmentId.rejected, (state, action) => {
        state.shipmentRatesStatus = 'failed';
        state.error = action.payload;
      })

      // Create
      .addCase(createRate.fulfilled, (state, action) => {
        state.items.unshift(action.payload); 
      })

      // Update
      .addCase(updateRate.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentRate && state.currentRate._id === action.payload._id) {
          state.currentRate = action.payload;
        }
      })

      // Delete
      .addCase(deleteRate.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
        if (state.currentRate && state.currentRate._id === action.payload) {
          state.currentRate = null;
        }
      });
  }
});

export const { clearCurrentRate, clearRateShoppers, clearShipmentRates } = rateSlice.actions;
export default rateSlice.reducer;