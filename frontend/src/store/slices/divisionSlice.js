import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; 

// --- Thunks ---

// 1. Fetch Divisions
export const fetchDivisions = createAsyncThunk(
  'divisions/fetchDivisions',
  async (customerId = '', { rejectWithValue }) => {
    try {
      const url = customerId ? `/customers/${customerId}/divisions` : '/divisions';
      const response = await api.get(url);
      return response.data.data.divisions || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch divisions');
    }
  }
);

// 2. Create New Division
export const createDivision = createAsyncThunk(
  'divisions/createDivision',
  async (divisionData, { rejectWithValue }) => {
    try {
      const response = await api.post('/divisions', divisionData);
      return response.data.data.division || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create division');
    }
  }
);

// 3. Update Existing Division
export const updateDivision = createAsyncThunk(
  'divisions/updateDivision',
  async ({ id, divisionData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/divisions/${id}`, divisionData);
      return response.data.data.division || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update division');
    }
  }
);

// NEW: Upload Division Logo
export const uploadDivisionLogo = createAsyncThunk(
  'divisions/uploadDivisionLogo',
  async ({ id, file }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.put(`/divisions/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data.division; // Backend should return updated division object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to upload logo');
    }
  }
);

// 4. Delete Division
export const deleteDivision = createAsyncThunk(
  'divisions/deleteDivision',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/divisions/${id}`);
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete division');
    }
  }
);

// --- Slice Definition ---
const divisionSlice = createSlice({
  name: 'divisions',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    clearDivisions: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch ---
      .addCase(fetchDivisions.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDivisions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDivisions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // --- Create ---
      .addCase(createDivision.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      
      // --- Update (Standard & Logo) ---
      .addCase(updateDivision.fulfilled, (state, action) => {
        const index = state.items.findIndex(div => String(div._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(uploadDivisionLogo.fulfilled, (state, action) => {
        const index = state.items.findIndex(div => String(div._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // --- Delete ---
      .addCase(deleteDivision.fulfilled, (state, action) => {
        state.items = state.items.filter(div => String(div._id) !== String(action.payload));
      });
  }
});

export const { clearDivisions } = divisionSlice.actions;
export default divisionSlice.reducer;
