import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; 
export const fetchCarriers = createAsyncThunk('carriers/fetchCarriers', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/carriers');
    return res.data.data.carriers;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const addCarrier = createAsyncThunk('carriers/addCarrier', async (carrierData, { rejectWithValue }) => {
  try {
    const res = await api.post('/carriers', carrierData);
    return res.data.data.carrier;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const updateCarrierConfig = createAsyncThunk('carriers/updateCarrierConfig', async ({ id, updatedData }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/carriers/${id}`, updatedData);
    return res.data.data.carrier;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const removeCarrierProfile = createAsyncThunk('carriers/removeCarrierProfile', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/carriers/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const carrierSlice = createSlice({
  name: 'carriers',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCarriers.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCarriers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCarriers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(addCarrier.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateCarrierConfig.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(removeCarrierProfile.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c._id !== action.payload);
      });
  }
});

export default carrierSlice.reducer;