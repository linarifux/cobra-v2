import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary based on your folder structure

// 1. Fetch All Locations
export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/locations');
      return response.data.data.locations; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch locations');
    }
  }
);

// 2. Fetch Single Location By ID
export const fetchLocationById = createAsyncThunk(
  'locations/fetchLocationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/locations/${id}`);
      return response.data.data.location;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch location details');
    }
  }
);

// 3. Create Location
export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await api.post('/locations', locationData);
      return response.data.data.location;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create location');
    }
  }
);

// 4. Update Location
export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async ({ id, locationData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/locations/${id}`, locationData);
      return response.data.data.location;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update location');
    }
  }
);

// 5. Delete Location
export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/locations/${id}`);
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete location');
    }
  }
);

const locationSlice = createSlice({
  name: 'locations',
  initialState: {
    items: [],
    currentItem: null,
    status: 'idle', 
    error: null
  },
  reducers: {
    clearCurrentLocation: (state) => {
      state.currentItem = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchLocations.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Fetch Single
      .addCase(fetchLocationById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      
      // Create
      .addCase(createLocation.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      
      // Update
      .addCase(updateLocation.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentItem && state.currentItem._id === action.payload._id) {
          state.currentItem = action.payload;
        }
      })
      
      // Delete
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      });
  }
});

export const { clearCurrentLocation } = locationSlice.actions;
export default locationSlice.reducer;