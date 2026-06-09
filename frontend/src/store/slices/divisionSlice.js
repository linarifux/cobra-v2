import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to generate auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch All Divisions
export const fetchDivisions = createAsyncThunk(
  'divisions/fetchDivisions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/divisions`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch divisions');

      return data.data.divisions; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Create New Division
export const createDivision = createAsyncThunk(
  'divisions/createDivision',
  async (divisionData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/divisions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(divisionData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create division');

      return data.data.division;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 3. Update Existing Division
export const updateDivision = createAsyncThunk(
  'divisions/updateDivision',
  async ({ id, divisionData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/divisions/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(divisionData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update division');

      return data.data.division;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 4. Delete Division
export const deleteDivision = createAsyncThunk(
  'divisions/deleteDivision',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/divisions/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete division');
      }

      return id; 
    } catch (error) {
      return rejectWithValue(error.message);
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