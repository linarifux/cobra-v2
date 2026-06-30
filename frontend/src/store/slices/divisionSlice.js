import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary based on your folder structure

// --- Thunks ---

// 1. Fetch Divisions (Supports fetching globally OR scoped to a specific customer)
export const fetchDivisions = createAsyncThunk(
  'divisions/fetchDivisions',
  async (customerId = '', { rejectWithValue }) => {
    try {
      // Dynamically switch to the nested route if filtering by a specific customer
      const url = customerId ? `/customers/${customerId}/divisions` : '/divisions';
      const response = await api.get(url);
      
      // Defensive fallback against API wrapping changes
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

// 4. Delete Division
export const deleteDivision = createAsyncThunk(
  'divisions/deleteDivision',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/divisions/${id}`);
      return id; // Return ID to filter out of the Redux state array
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
    // Utility to wipe state (e.g., on user logout or when leaving a customer context)
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
      
      // --- Update ---
      .addCase(updateDivision.fulfilled, (state, action) => {
        // Enforce string comparison to prevent ID type mismatch bugs
        const index = state.items.findIndex(div => String(div._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // --- Delete ---
      .addCase(deleteDivision.fulfilled, (state, action) => {
        // Enforce string comparison to prevent ID type mismatch bugs
        state.items = state.items.filter(div => String(div._id) !== String(action.payload));
      });
  }
});

export const { clearDivisions } = divisionSlice.actions;
export default divisionSlice.reducer;