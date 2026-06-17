import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to generate auth headers securely
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// -------------------------------------------------------------
// ASYNC THUNKS
// -------------------------------------------------------------

// 1. Fetch All Receiving Records
export const fetchReceivingLogs = createAsyncThunk(
  'receiving/fetchReceivingLogs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/receiving`, {
        headers: getAuthHeaders()
      });
      return response.data.data.receiving; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch receiving logs');
    }
  }
);

// 2. Fetch Single Receiving Record by ID
export const fetchReceivingById = createAsyncThunk(
  'receiving/fetchReceivingById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/receiving/${id}`, {
        headers: getAuthHeaders()
      });
      return response.data.data.receiving;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch receiving details');
    }
  }
);

// 3. Create New Receiving Record (Inbound Shipment)
export const createReceivingLog = createAsyncThunk(
  'receiving/createReceivingLog',
  async (receivingData, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/receiving`, receivingData, {
        headers: getAuthHeaders()
      });
      return response.data.data.receiving;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create receiving log');
    }
  }
);

// 4. Update Receiving Record
export const updateReceivingLog = createAsyncThunk(
  'receiving/updateReceivingLog',
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_URL}/receiving/${id}`, updateData, {
        headers: getAuthHeaders()
      });
      return response.data.data.receiving;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update receiving log');
    }
  }
);

// 5. Delete Receiving Record
export const deleteReceivingLog = createAsyncThunk(
  'receiving/deleteReceivingLog',
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_URL}/receiving/${id}`, {
        headers: getAuthHeaders()
      });
      // Return the ID so the reducer knows which item to remove from the UI state
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete receiving log');
    }
  }
);


// -------------------------------------------------------------
// REDUX SLICE
// -------------------------------------------------------------

const receivingSlice = createSlice({
  name: 'receiving',
  initialState: {
    items: [],           // Array of all receiving logs
    currentLog: null,    // The specific log being viewed/edited
    status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
    currentLogStatus: 'idle', // Separate status for fetching a single log
    error: null
  },
  reducers: {
    // Utility to clear the currently viewed log when navigating away from the details page
    clearCurrentReceivingLog: (state) => {
      state.currentLog = null;
      state.currentLogStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addCase(fetchReceivingLogs.pending, (state) => { 
        state.status = 'loading'; 
      })
      .addCase(fetchReceivingLogs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchReceivingLogs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // --- Fetch Single ---
      .addCase(fetchReceivingById.pending, (state) => { 
        state.currentLogStatus = 'loading'; 
      })
      .addCase(fetchReceivingById.fulfilled, (state, action) => {
        state.currentLogStatus = 'succeeded';
        state.currentLog = action.payload;
      })
      .addCase(fetchReceivingById.rejected, (state, action) => {
        state.currentLogStatus = 'failed';
        state.error = action.payload;
      })
      
      // --- Create ---
      .addCase(createReceivingLog.fulfilled, (state, action) => {
        // Automatically add the new receipt to the top of the list
        state.items.unshift(action.payload);
      })
      
      // --- Update ---
      .addCase(updateReceivingLog.fulfilled, (state, action) => {
        // Update the item in the array if it exists
        const index = state.items.findIndex(log => log._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // Also update the current log if it's the one being edited
        if (state.currentLog && state.currentLog._id === action.payload._id) {
          state.currentLog = action.payload;
        }
      })
      
      // --- Delete ---
      .addCase(deleteReceivingLog.fulfilled, (state, action) => {
        // Remove the deleted log from the array
        state.items = state.items.filter(log => log._id !== action.payload);
        // Clear current log if it was the one deleted
        if (state.currentLog && state.currentLog._id === action.payload) {
          state.currentLog = null;
        }
      });
  }
});

export const { clearCurrentReceivingLog } = receivingSlice.actions;
export default receivingSlice.reducer;