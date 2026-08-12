import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchVendors = createAsyncThunk('vendors/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/vendors');
    return response.data.data.vendors;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch vendors');
  }
});

export const createVendor = createAsyncThunk('vendors/create', async (vendorData, { rejectWithValue }) => {
  try {
    const response = await api.post('/vendors', vendorData);
    return response.data.data.vendor;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create vendor');
  }
});

export const updateVendor = createAsyncThunk('vendors/update', async ({ id, vendorData }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/vendors/${id}`, vendorData);
    return response.data.data.vendor;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update vendor');
  }
});

export const deleteVendor = createAsyncThunk('vendors/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/vendors/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete vendor');
  }
});

const vendorSlice = createSlice({
  name: 'vendors',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendors.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchVendors.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchVendors.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createVendor.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateVendor.fulfilled, (state, action) => {
        const index = state.items.findIndex(v => v._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteVendor.fulfilled, (state, action) => {
        state.items = state.items.filter(v => v._id !== action.payload);
      });
  }
});

export default vendorSlice.reducer;