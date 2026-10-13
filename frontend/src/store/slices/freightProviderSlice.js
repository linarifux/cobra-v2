import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Ensure this points to your authorized Axios instance

// --- Thunks ---

// 1. Fetch Configured Freight Providers from DB (Supports division scoping via query params)
export const fetchConfiguredFreightProviders = createAsyncThunk(
  'freightProviders/fetchConfigured',
  async (divisionId = '', { rejectWithValue }) => {
    try {
      const url = divisionId ? `/freight-providers?division=${divisionId}` : `/freight-providers`;
      const response = await api.get(url);
      
      return response.data.data.providers || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch configured freight providers');
    }
  }
);

// 2. Fetch Live Freight Providers directly from ShipStation
export const fetchLiveFreightProviders = createAsyncThunk(
  'freightProviders/fetchLive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get(`/freight-providers/live`);
      return response.data.data.providers || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch live freight providers');
    }
  }
);

// 3. Add/Configure a New Freight Provider
export const addFreightProvider = createAsyncThunk(
  'freightProviders/add',
  async (providerData, { rejectWithValue }) => {
    try {
      const response = await api.post(`/freight-providers`, providerData);
      return response.data.data.provider || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to add freight provider configuration');
    }
  }
);

// 4. Update Existing Freight Provider Configuration
export const updateFreightProvider = createAsyncThunk(
  'freightProviders/update',
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/freight-providers/${id}`, updatedData);
      return response.data.data.provider || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update freight provider');
    }
  }
);

// 5. Delete/Remove a Freight Provider Configuration
export const removeFreightProvider = createAsyncThunk(
  'freightProviders/remove',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/freight-providers/${id}`);
      return id; // Return ID to easily filter it out of the Redux state array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove freight provider');
    }
  }
);

// --- Slice Definition ---
const freightProviderSlice = createSlice({
  name: 'freightProviders',
  initialState: {
    items: [],           // Configured providers stored in your local DB
    liveProviders: [],   // Live list of providers fetched directly from the ShipStation API
    status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed' (for DB operations)
    liveStatus: 'idle',  // 'idle' | 'loading' | 'succeeded' | 'failed' (for ShipStation API)
    error: null
  },
  reducers: {
    // Utility to wipe state (e.g., on user logout or unmounting)
    clearFreightProviders: (state) => {
      state.items = [];
      state.liveProviders = [];
      state.status = 'idle';
      state.liveStatus = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Configured Providers (DB) ---
      .addCase(fetchConfiguredFreightProviders.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchConfiguredFreightProviders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchConfiguredFreightProviders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Fetch Live Providers (ShipStation API) ---
      .addCase(fetchLiveFreightProviders.pending, (state) => {
        state.liveStatus = 'loading';
      })
      .addCase(fetchLiveFreightProviders.fulfilled, (state, action) => {
        state.liveStatus = 'succeeded';
        state.liveProviders = action.payload;
      })
      .addCase(fetchLiveFreightProviders.rejected, (state) => {
        state.liveStatus = 'failed';
      })

      // --- Add Provider ---
      .addCase(addFreightProvider.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })

      // --- Update Provider ---
      .addCase(updateFreightProvider.fulfilled, (state, action) => {
        const index = state.items.findIndex(p => String(p._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      // --- Remove Provider ---
      .addCase(removeFreightProvider.fulfilled, (state, action) => {
        state.items = state.items.filter(p => String(p._id) !== String(action.payload));
      });
  }
});

export const { clearFreightProviders } = freightProviderSlice.actions;
export default freightProviderSlice.reducer;