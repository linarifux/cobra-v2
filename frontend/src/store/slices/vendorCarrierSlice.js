import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchVendorCarriers = createAsyncThunk('vendorCarriers/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/vendor-carriers');
    return response.data.data.vendorCarriers;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch vendor carriers');
  }
});

export const createVendorCarrier = createAsyncThunk('vendorCarriers/create', async (data, { rejectWithValue }) => {
  try {
    const response = await api.post('/vendor-carriers', data);
    return response.data.data.vendorCarrier;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create vendor carrier');
  }
});

export const updateVendorCarrier = createAsyncThunk('vendorCarriers/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/vendor-carriers/${id}`, data);
    return response.data.data.vendorCarrier;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update vendor carrier');
  }
});

export const deleteVendorCarrier = createAsyncThunk('vendorCarriers/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/vendor-carriers/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete vendor carrier');
  }
});

const vendorCarrierSlice = createSlice({
  name: 'vendorCarriers',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorCarriers.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchVendorCarriers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchVendorCarriers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createVendorCarrier.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateVendorCarrier.fulfilled, (state, action) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteVendorCarrier.fulfilled, (state, action) => {
        state.items = state.items.filter(v => v._id !== action.payload);
      });
  }
});

export default vendorCarrierSlice.reducer;