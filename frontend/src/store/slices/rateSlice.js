import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Ensure this points to your authorized Axios instance

// --- Thunks ---

// 1. Fetch All Rates
export const fetchRates = createAsyncThunk(
  'rates/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/rates');
      // Adjust this path based on the exact shape of your Express response
      return response.data.data.rates || response.data.data; 
    } catch (error) {
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


// --- Slice Definition ---
const rateSlice = createSlice({
  name: 'rates',
  initialState: {
    items: [],           // Array of all rates
    currentRate: null,   // Single selected rate
    status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    clearCurrentRate: (state) => {
      state.currentRate = null;
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

      // Create
      .addCase(createRate.fulfilled, (state, action) => {
        // Add the new rate to the top of the list
        state.items.unshift(action.payload); 
      })

      // Update
      .addCase(updateRate.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // If the updated rate is currently being viewed, update that too
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

export const { clearCurrentRate } = rateSlice.actions;
export default rateSlice.reducer;