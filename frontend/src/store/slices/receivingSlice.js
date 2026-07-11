import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; 

// -------------------------------------------------------------
// ASYNC THUNKS
// -------------------------------------------------------------

export const fetchReceivingLogs = createAsyncThunk('receiving/fetchReceivingLogs', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/receiving');
    return response.data.data.receiving; 
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch receiving logs'); }
});

export const fetchReceivingById = createAsyncThunk('receiving/fetchReceivingById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get(`/receiving/${id}`);
    return response.data.data.receiving;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch receiving details'); }
});

export const createReceivingLog = createAsyncThunk('receiving/createReceivingLog', async (receivingData, { rejectWithValue }) => {
  try {
    const response = await api.post('/receiving', receivingData);
    return response.data.data.receiving;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create receiving log'); }
});

export const updateReceivingLog = createAsyncThunk('receiving/updateReceivingLog', async ({ id, updateData }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/receiving/${id}`, updateData);
    return response.data.data.receiving;
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update receiving log'); }
});

export const deleteReceivingLog = createAsyncThunk('receiving/deleteReceivingLog', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/receiving/${id}`);
    return id; 
  } catch (error) { return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete receiving log'); }
});

// UPDATED: Now accepts { id, formData } to upload the PDF file to the backend
export const sendReceivingEmail = createAsyncThunk('receiving/sendReceivingEmail', async ({ id, formData }, { rejectWithValue }) => {
  try {
    const response = await api.post(`/receiving/${id}/save-and-send`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000 // 30 seconds timeout for email dispatch
    });
    return response.data;
  } catch (error) {
    // Check if the error is specifically a timeout
      if (error.code === 'ECONNABORTED') {
        return rejectWithValue('The file upload took too long. Please check your internet connection.');
      }
    return rejectWithValue(error.response?.data?.message || error.message || 'Failed to dispatch email confirmation');
  }
});

// -------------------------------------------------------------
// REDUX SLICE
// -------------------------------------------------------------
const receivingSlice = createSlice({
  name: 'receiving',
  initialState: { items: [], currentLog: null, status: 'idle', currentLogStatus: 'idle', error: null },
  reducers: {
    clearCurrentReceivingLog: (state) => {
      state.currentLog = null;
      state.currentLogStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReceivingLogs.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchReceivingLogs.fulfilled, (state, action) => { state.status = 'succeeded'; state.items = action.payload; })
      .addCase(fetchReceivingLogs.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      
      .addCase(fetchReceivingById.pending, (state) => { state.currentLogStatus = 'loading'; })
      .addCase(fetchReceivingById.fulfilled, (state, action) => { state.currentLogStatus = 'succeeded'; state.currentLog = action.payload; })
      .addCase(fetchReceivingById.rejected, (state, action) => { state.currentLogStatus = 'failed'; state.error = action.payload; })
      
      .addCase(createReceivingLog.fulfilled, (state, action) => { state.items.unshift(action.payload); })
      
      .addCase(updateReceivingLog.fulfilled, (state, action) => {
        const index = state.items.findIndex(log => log._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentLog && state.currentLog._id === action.payload._id) state.currentLog = action.payload;
      })
      
      .addCase(deleteReceivingLog.fulfilled, (state, action) => {
        state.items = state.items.filter(log => log._id !== action.payload);
        if (state.currentLog && state.currentLog._id === action.payload) state.currentLog = null;
      });
  }
});

export const { clearCurrentReceivingLog } = receivingSlice.actions;
export default receivingSlice.reducer;