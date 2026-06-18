import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary based on your folder structure

// 1. Fetch All Divisions
export const fetchDivisions = createAsyncThunk(
  'divisions/fetchDivisions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/divisions');
      return response.data.data.divisions; 
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
      return response.data.data.division;
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
      return response.data.data.division;
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
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete division');
    }
  }
);

const divisionSlice = createSlice({
  name: 'divisions',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchDivisions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchDivisions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchDivisions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create
      .addCase(createDivision.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Update
      .addCase(updateDivision.fulfilled, (state, action) => {
        const index = state.items.findIndex(div => div._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteDivision.fulfilled, (state, action) => {
        state.items = state.items.filter(div => div._id !== action.payload);
      });
  }
});

export default divisionSlice.reducer;