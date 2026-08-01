import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Ensure this points to your authorized Axios instance

// --- Thunks ---

// 1. Fetch Carriers (Supports fetching globally OR scoped to a specific division)
export const fetchCarriers = createAsyncThunk(
  'carriers/fetchCarriers',
  async (divisionId = '', { rejectWithValue }) => {
    try {
      // If a divisionId is passed, hit the nested route. Otherwise, fetch all.
      const url = divisionId ? `/divisions/${divisionId}/carriers` : `/carriers`;
      const response = await api.get(url);
      
      // Defensive fallback against API wrapping changes
      return response.data.data.carriers || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch shipping integrations');
    }
  }
);

// 2. Add/Configure a New Carrier
export const addCarrier = createAsyncThunk(
  'carriers/addCarrier',
  async (carrierData, { rejectWithValue }) => {
    try {
      // Route through the division-specific endpoint if division is provided in the payload
      const url = carrierData.division ? `/divisions/${carrierData.division}/carriers` : `/carriers`;
      const response = await api.post(url, carrierData);
      
      return response.data.data.carrier || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to deploy integration');
    }
  }
);

// 3. Update Carrier Configuration (Credentials or Allowed Services)
export const updateCarrierConfig = createAsyncThunk(
  'carriers/updateCarrierConfig',
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/carriers/${id}`, updatedData);
      return response.data.data.carrier || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update integration');
    }
  }
);

// 4. Delete/Remove a Carrier Integration
export const removeCarrierProfile = createAsyncThunk(
  'carriers/removeCarrierProfile',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/carriers/${id}`);
      return id; // Return ID to filter out of the Redux state array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to remove integration');
    }
  }
);

// 5. NEW: Fetch Package Types by ShipStation Carrier ID
export const fetchCarrierPackages = createAsyncThunk(
  'carriers/fetchCarrierPackages',
  async (shipStationId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/shipstation/carriers/${shipStationId}/packages`);
      return response.data.data || response.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch package types');
    }
  }
);

// --- Slice Definition ---
const carrierSlice = createSlice({
  name: 'carriers',
  initialState: {
    items: [],
    packageTypes: [], // Store the fetched package types here
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    packageStatus: 'idle',
    error: null
  },
  reducers: {
    // Utility to wipe state (e.g., on user logout or unmounting)
    clearCarriers: (state) => {
      state.items = [];
      state.packageTypes = [];
      state.status = 'idle';
      state.packageStatus = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Carriers ---
      .addCase(fetchCarriers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCarriers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCarriers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // --- Add Carrier ---
      .addCase(addCarrier.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      
      // --- Update Carrier ---
      .addCase(updateCarrierConfig.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => String(c._id) === String(action.payload._id));
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // --- Remove Carrier ---
      .addCase(removeCarrierProfile.fulfilled, (state, action) => {
        state.items = state.items.filter(c => String(c._id) !== String(action.payload));
      })

      // --- Fetch Carrier Packages (NEW) ---
      .addCase(fetchCarrierPackages.pending, (state) => {
        state.packageStatus = 'loading';
      })
      .addCase(fetchCarrierPackages.fulfilled, (state, action) => {
        state.packageStatus = 'succeeded';
        state.packageTypes = action.payload;
      })
      .addCase(fetchCarrierPackages.rejected, (state) => {
        state.packageStatus = 'failed';
      });
  }
});

export const { clearCarriers } = carrierSlice.actions;
export default carrierSlice.reducer;