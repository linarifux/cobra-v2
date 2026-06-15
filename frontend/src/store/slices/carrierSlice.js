import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchCarriers = createAsyncThunk('carriers/fetchCarriers', async (_, { rejectWithValue }) => {
  try {
    const res = await fetch(`${API_URL}/carriers`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.data.carriers;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const addCarrier = createAsyncThunk('carriers/addCarrier', async (carrierData, { rejectWithValue }) => {
  console.log(carrierData);
  
  try {
    const res = await fetch(`${API_URL}/carriers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(carrierData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.data.carrier;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const updateCarrierConfig = createAsyncThunk('carriers/updateCarrierConfig', async ({ id, updatedData }, { rejectWithValue }) => {
  try {
    const res = await fetch(`${API_URL}/carriers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updatedData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.data.carrier;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const removeCarrierProfile = createAsyncThunk('carriers/removeCarrierProfile', async (id, { rejectWithValue }) => {
  try {
    const res = await fetch(`${API_URL}/carriers/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message);
    }
    return id;
  } catch (err) {
    return rejectWithValue(err.message);
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