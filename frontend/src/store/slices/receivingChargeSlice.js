import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

// --- Thunks ---

export const fetchReceivingCharges = createAsyncThunk(
  'receivingCharges/fetchAll',
  async (customerId = null, { rejectWithValue }) => {
    try {
      const endpoint = customerId ? `/receiving-charges?customer=${customerId}` : '/receiving-charges';
      const response = await api.get(endpoint);
      return response.data.data.charges;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch receiving charges');
    }
  }
);

export const createReceivingCharge = createAsyncThunk(
  'receivingCharges/create',
  async (chargeData, { rejectWithValue }) => {
    try {
      const response = await api.post('/receiving-charges', chargeData);
      return response.data.data.charge;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create receiving charge');
    }
  }
);

export const updateReceivingCharge = createAsyncThunk(
  'receivingCharges/update',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/receiving-charges/${id}`, updateData);
      return response.data.data.charge;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update receiving charge');
    }
  }
);

export const deleteReceivingCharge = createAsyncThunk(
  'receivingCharges/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/receiving-charges/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete receiving charge');
    }
  }
);

// --- Slice Definition ---

const receivingChargeSlice = createSlice({
  name: 'receivingCharges',
  initialState: {
    items: [],
    status: 'idle',
    error: null
  },
  reducers: {
    clearReceivingCharges: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceivingCharges.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchReceivingCharges.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchReceivingCharges.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createReceivingCharge.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateReceivingCharge.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => String(c._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteReceivingCharge.fulfilled, (state, action) => {
        state.items = state.items.filter(c => String(c._id) !== String(action.payload));
      });
  }
});

export const { clearReceivingCharges } = receivingChargeSlice.actions;
export default receivingChargeSlice.reducer;