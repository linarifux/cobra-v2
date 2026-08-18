import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api';

export const fetchChargeTypes = createAsyncThunk('chargeTypes/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/charge-types');
    return response.data.data.chargeTypes;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch charge types');
  }
});

export const createChargeType = createAsyncThunk('chargeTypes/create', async (data, { rejectWithValue }) => {
  try {
    const response = await api.post('/charge-types', data);
    return response.data.data.chargeType;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create charge type');
  }
});

export const updateChargeType = createAsyncThunk('chargeTypes/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/charge-types/${id}`, data);
    return response.data.data.chargeType;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update charge type');
  }
});

export const deleteChargeType = createAsyncThunk('chargeTypes/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/charge-types/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete charge type');
  }
});

const chargeTypeSlice = createSlice({
  name: 'chargeTypes',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchChargeTypes.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchChargeTypes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchChargeTypes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createChargeType.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateChargeType.fulfilled, (state, action) => {
        const index = state.items.findIndex(ct => ct._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteChargeType.fulfilled, (state, action) => {
        state.items = state.items.filter(ct => ct._id !== action.payload);
      });
  }
});

export default chargeTypeSlice.reducer;