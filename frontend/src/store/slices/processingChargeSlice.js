import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// 1. Fetch Processing Charges for a Specific Customer
export const fetchProcessingChargesByCustomer = createAsyncThunk(
  'processingCharges/fetchByCustomer',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/processing-charges/customer/${customerId}`);
      return response.data.data.processingCharges || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch processing charges');
    }
  }
);

// 2. Fetch Single Processing Charge by ID
export const fetchProcessingChargeById = createAsyncThunk(
  'processingCharges/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/processing-charges/${id}`);
      return response.data.data.processingCharge || null;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch processing charge details');
    }
  }
);

// 3. Create a Processing Charge
export const createProcessingCharge = createAsyncThunk(
  'processingCharges/create',
  async (chargeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/processing-charges', chargeData);
      return response.data.data.processingCharge;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create processing charge');
    }
  }
);

// 4. Update a Processing Charge
export const updateProcessingCharge = createAsyncThunk(
  'processingCharges/update',
  async ({ id, chargeData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/processing-charges/${id}`, chargeData);
      return response.data.data.processingCharge;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update processing charge');
    }
  }
);

// 5. Delete a Processing Charge
export const deleteProcessingCharge = createAsyncThunk(
  'processingCharges/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/processing-charges/${id}`);
      return id; // Return ID to filter it out of the current state
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete processing charge');
    }
  }
);

const processingChargeSlice = createSlice({
  name: 'processingCharges',
  initialState: {
    items: [],
    currentCharge: null,
    status: 'idle',
    error: null
  },
  reducers: {
    clearCurrentCharge: (state) => {
      state.currentCharge = null;
    },
    clearChargeError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch By Customer
      .addCase(fetchProcessingChargesByCustomer.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProcessingChargesByCustomer.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchProcessingChargesByCustomer.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch Single
      .addCase(fetchProcessingChargeById.fulfilled, (state, action) => {
        state.currentCharge = action.payload;
      })
      // Create
      .addCase(createProcessingCharge.fulfilled, (state, action) => {
        state.items = [action.payload]; // Overwrite list since it's 1:1 per customer
      })
      // Update
      .addCase(updateProcessingCharge.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteProcessingCharge.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      });
  }
});

export const { clearCurrentCharge, clearChargeError } = processingChargeSlice.actions;
export default processingChargeSlice.reducer;

