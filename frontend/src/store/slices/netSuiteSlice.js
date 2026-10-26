import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as netSuiteApi from '../../utils/netSuiteApi';

// ==========================================
// ASYNC THUNKS
// ==========================================

export const fetchNetSuiteRecords = createAsyncThunk(
  'netsuite/fetchRecords',
  async ({ recordType, query = '', forceRefresh = false }, { getState, rejectWithValue }) => {
    try {
      const cacheKey = `${recordType}:${query}`;
      const existingCache = getState().netsuite.pageCache[cacheKey];

      // Serve directly from Redux cache in 0ms if not forcing refresh
      if (!forceRefresh && existingCache) {
        return { recordType, cacheKey, data: existingCache, fromCache: true };
      }

      const finalQuery = forceRefresh
        ? `${query}${query ? '&' : ''}refresh=true`
        : query;

      const data = await netSuiteApi.getRecords(recordType, finalQuery);
      return { recordType, cacheKey, data, fromCache: false };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Silent background prefetch for the next page (does not trigger loading spinners)
export const prefetchNetSuiteRecords = createAsyncThunk(
  'netsuite/prefetchRecords',
  async ({ recordType, query = '' }, { getState }) => {
    const cacheKey = `${recordType}:${query}`;
    if (getState().netsuite.pageCache[cacheKey]) {
      return null; // Already cached
    }
    const data = await netSuiteApi.getRecords(recordType, query);
    return { cacheKey, data };
  }
);

export const fetchNetSuiteRecordById = createAsyncThunk(
  'netsuite/fetchRecordById',
  async ({ recordType, id, forceRefresh = false }, { getState, rejectWithValue }) => {
    try {
      const cacheKey = `${recordType}:${id}`;
      const cachedRecord = getState().netsuite.recordDetailsCache[cacheKey];

      if (!forceRefresh && cachedRecord) {
        return { cacheKey, data: cachedRecord };
      }

      const data = await netSuiteApi.getRecordById(recordType, id);
      return { cacheKey, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createNetSuiteRecord = createAsyncThunk(
  'netsuite/createRecord',
  async ({ recordType, payload }, { rejectWithValue }) => {
    try {
      const data = await netSuiteApi.createRecord(recordType, payload);
      return { recordType, data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateNetSuiteRecord = createAsyncThunk(
  'netsuite/updateRecord',
  async ({ recordType, id, payload }, { rejectWithValue }) => {
    try {
      const data = await netSuiteApi.updateRecord(recordType, id, payload);
      return { recordType, id, data };
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
  hasMoreByRecordType: {},
  pageCache: {},          // Stores visited & prefetched pages by query key
  recordDetailsCache: {}, // Stores full single-record details by ID
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
    },
    invalidateNetSuiteCache: (state) => {
      state.pageCache = {};
      state.recordDetailsCache = {};
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Page Records ---
      .addCase(fetchNetSuiteRecords.pending, (state, action) => {
        const { recordType, query = '', forceRefresh = false } = action.meta.arg;
        const cacheKey = `${recordType}:${query}`;
        // Only show loading spinner if page isn't already in Redux cache
        if (forceRefresh || !state.pageCache[cacheKey]) {
          state.status = 'loading';
        }
        state.error = null;
      })
      .addCase(fetchNetSuiteRecords.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { recordType, cacheKey, data } = action.payload;
        const items = data?.items || data || [];
        const hasMore = data?.hasMore || false;

        state.recordsByRecordType[recordType] = items;
        state.hasMoreByRecordType[recordType] = hasMore;
        state.pageCache[cacheKey] = { items, hasMore };
      })
      .addCase(fetchNetSuiteRecords.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch NetSuite records';
      })

      // --- Silent Background Prefetch ---
      .addCase(prefetchNetSuiteRecords.fulfilled, (state, action) => {
        if (!action.payload) return;
        const { cacheKey, data } = action.payload;
        state.pageCache[cacheKey] = {
          items: data?.items || data || [],
          hasMore: data?.hasMore || false
        };
      })

      // --- Fetch Single Record By ID ---
      .addCase(fetchNetSuiteRecordById.pending, (state, action) => {
        const { recordType, id, forceRefresh = false } = action.meta.arg;
        const cacheKey = `${recordType}:${id}`;
        if (forceRefresh || !state.recordDetailsCache[cacheKey]) {
          state.status = 'loading';
          state.selectedRecord = null;
        }
        state.error = null;
      })
      .addCase(fetchNetSuiteRecordById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const { cacheKey, data } = action.payload;
        state.selectedRecord = data;
        state.recordDetailsCache[cacheKey] = data;
      })
      .addCase(fetchNetSuiteRecordById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch the record';
      })

      // --- Create / Update / Delete Invalidate Page Cache ---
      .addCase(createNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, data } = action.payload;
        state.pageCache = {};
        if (state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType].unshift(data);
        }
      })
      .addCase(updateNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id, data } = action.payload;
        state.pageCache = {};
        state.recordDetailsCache[`${recordType}:${id}`] = data;
        if (state.selectedRecord && String(state.selectedRecord.id) === String(id)) {
          state.selectedRecord = { ...state.selectedRecord, ...data };
        }
      })
      .addCase(deleteNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id } = action.payload;
        state.pageCache = {};
        delete state.recordDetailsCache[`${recordType}:${id}`];
        if (state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType] = state.recordsByRecordType[recordType].filter(
            item => String(item.id) !== String(id)
          );
        }
      });
  }
});

export const { clearNetSuiteError, clearSelectedRecord, invalidateNetSuiteCache } = netSuiteSlice.actions;
export default netSuiteSlice.reducer;