import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as netSuiteApi from '../../utils/netSuiteApi';

// ==========================================
// ASYNC THUNKS
// ==========================================

export const fetchNetSuiteRecords = createAsyncThunk(
  'netsuite/fetchRecords',
  async ({ recordType, query = '' }, { rejectWithValue }) => {
    try {
      const response = await netSuiteApi.getRecords(recordType, query);
      return { recordType, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchNetSuiteRecordById = createAsyncThunk(
  'netsuite/fetchRecordById',
  async ({ recordType, id }, { rejectWithValue }) => {
    try {
      const response = await netSuiteApi.getRecordById(recordType, id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createNetSuiteRecord = createAsyncThunk(
  'netsuite/createRecord',
  async ({ recordType, payload }, { rejectWithValue }) => {
    try {
      const response = await netSuiteApi.createRecord(recordType, payload);
      return { recordType, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateNetSuiteRecord = createAsyncThunk(
  'netsuite/updateRecord',
  async ({ recordType, id, payload }, { rejectWithValue }) => {
    try {
      const response = await netSuiteApi.updateRecord(recordType, id, payload);
      return { recordType, id, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteNetSuiteRecord = createAsyncThunk(
  'netsuite/deleteRecord',
  async ({ recordType, id }, { rejectWithValue }) => {
    try {
      await netSuiteApi.deleteRecord(recordType, id);
      return { recordType, id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// ==========================================
// SLICE DEFINITION
// ==========================================

const initialState = {
  recordsByRecordType: {}, 
  selectedRecord: null, 
  status: 'idle', 
  error: null,
};

const netSuiteSlice = createSlice({
  name: 'netsuite',
  initialState,
  reducers: {
    clearNetSuiteError: (state) => {
      state.error = null;
    },
    clearSelectedRecord: (state) => {
      state.selectedRecord = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All Records ---
      .addCase(fetchNetSuiteRecords.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNetSuiteRecords.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { recordType, data } = action.payload;
        // Adjust based on NetSuite's exact list return shape
        state.recordsByRecordType[recordType] = data?.items || data; 
      })
      .addCase(fetchNetSuiteRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch NetSuite records';
      })

      // --- Fetch Record By ID ---
      .addCase(fetchNetSuiteRecordById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.selectedRecord = null; 
      })
      .addCase(fetchNetSuiteRecordById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.selectedRecord = action.payload;
      })
      .addCase(fetchNetSuiteRecordById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch the record';
      })

      // --- Create Record ---
      .addCase(createNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, data } = action.payload;
        if (state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType].unshift(data);
        }
      })

      // --- Update Record ---
      .addCase(updateNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id, data } = action.payload;
        
        if (state.recordsByRecordType[recordType]) {
          const index = state.recordsByRecordType[recordType].findIndex(item => item.id === id || item.internalId === id);
          if (index !== -1) {
            state.recordsByRecordType[recordType][index] = { ...state.recordsByRecordType[recordType][index], ...data };
          }
        }

        if (state.selectedRecord && (state.selectedRecord.id === id || state.selectedRecord.internalId === id)) {
          state.selectedRecord = { ...state.selectedRecord, ...data };
        }
      })

      // --- Delete Record ---
      .addCase(deleteNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id } = action.payload;
        
        if (state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType] = state.recordsByRecordType[recordType].filter(
            item => item.id !== id && item.internalId !== id
          );
        }

        if (state.selectedRecord && (state.selectedRecord.id === id || state.selectedRecord.internalId === id)) {
          state.selectedRecord = null;
        }
      });
  }
});

export const { clearNetSuiteError, clearSelectedRecord } = netSuiteSlice.actions;
export default netSuiteSlice.reducer;