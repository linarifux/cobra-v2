import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchLocations = createAsyncThunk(
  'locations/fetchLocations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/locations`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch locations');
      return data.data.locations; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchLocationById = createAsyncThunk(
  'locations/fetchLocationById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/locations/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch location details');
      return data.data.location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createLocation = createAsyncThunk(
  'locations/createLocation',
  async (locationData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/locations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create location');
      return data.data.location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateLocation = createAsyncThunk(
  'locations/updateLocation',
  async ({ id, locationData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/locations/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(locationData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update location');
      return data.data.location;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteLocation = createAsyncThunk(
  'locations/deleteLocation',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/locations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete location');
      }
      return id; 
    } catch (error) {
      return rejectWithValue(error.message);
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
      .addCase(fetchLocations.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchLocations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchLocations.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchLocationById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchLocationById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateLocation.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentItem && state.currentItem._id === action.payload._id) {
          state.currentItem = action.payload;
        }
      })
      .addCase(deleteLocation.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      });
  }
});

export const { clearCurrentLocation } = locationSlice.actions;
export default locationSlice.reducer;