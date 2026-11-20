import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as netSuiteApi from '../../utils/netSuiteApi';

const extractErrorMessage = (error, fallback = 'NetSuite request failed') => {
  const errData = error?.response?.data?.error ?? error?.response?.data;

  if (typeof errData === 'string' && errData.trim()) return errData;
  if (errData?.['o:errorDetails']?.[0]?.detail) {
    return errData['o:errorDetails'][0].detail;
  }
  if (errData?.detail) return errData.detail;
  if (errData?.message) return errData.message;
  if (error?.message) return error.message;

  return fallback;
};

// ==========================================
// ASYNC THUNKS
// ==========================================

export const fetchNetSuiteRecords = createAsyncThunk(
  'netsuite/fetchRecords',
  async (
    { recordType, query = '', forceRefresh = false },
    { getState, rejectWithValue },
  ) => {
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
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to fetch NetSuite records'),
      );
    }
  },
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
  },
);

export const fetchNetSuiteRecordById = createAsyncThunk(
  'netsuite/fetchRecordById',
  async (
    { recordType, id, forceRefresh = false },
    { getState, rejectWithValue },
  ) => {
    try {
      const cacheKey = `${recordType}:${id}`;
      const cachedRecord = getState().netsuite.recordDetailsCache[cacheKey];

      if (!forceRefresh && cachedRecord) {
        return { cacheKey, data: cachedRecord };
      }

      const data = await netSuiteApi.getRecordById(
        recordType,
        id,
        forceRefresh,
      );
      return { cacheKey, data };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to fetch the record'),
      );
    }
  },
);

export const createNetSuiteRecord = createAsyncThunk(
  'netsuite/createRecord',
  async ({ recordType, payload }, { rejectWithValue }) => {
    try {
      const data = await netSuiteApi.createRecord(recordType, payload);
      return { recordType, data };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to create NetSuite record'),
      );
    }
  },
);

export const updateNetSuiteRecord = createAsyncThunk(
  'netsuite/updateRecord',
  async ({ recordType, id, payload }, { rejectWithValue }) => {
    try {
      const data = await netSuiteApi.updateRecord(recordType, id, payload);
      return { recordType, id, payload, data };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to update NetSuite record'),
      );
    }
  },
);

export const fulfillNetSuiteOrder = createAsyncThunk(
  'netsuite/fulfillOrder',
  async ({ orderIdOrTranId, fulfillmentPayload }, { rejectWithValue }) => {
    try {
      const data = await netSuiteApi.fulfillOrder(
        orderIdOrTranId,
        fulfillmentPayload,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to sync fulfillment to NetSuite'),
      );
    }
  },
);

export const deleteNetSuiteRecord = createAsyncThunk(
  'netsuite/deleteRecord',
  async ({ recordType, id }, { rejectWithValue }) => {
    try {
      await netSuiteApi.deleteRecord(recordType, id);
      return { recordType, id };
    } catch (error) {
      return rejectWithValue(
        extractErrorMessage(error, 'Failed to delete NetSuite record'),
      );
    }
  },
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
  fulfillmentStatus: 'idle',
  fulfillmentError: null,
};

const netSuiteSlice = createSlice({
  name: 'netsuite',
  initialState,
  reducers: {
    clearNetSuiteError: (state) => {
      state.error = null;
      state.fulfillmentError = null;
    },
    clearSelectedRecord: (state) => {
      state.selectedRecord = null;
    },
    invalidateNetSuiteCache: (state) => {
      state.pageCache = {};
      state.recordDetailsCache = {};
    },
    resetFulfillmentStatus: (state) => {
      state.fulfillmentStatus = 'idle';
      state.fulfillmentError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch Page Records ---
      .addCase(fetchNetSuiteRecords.pending, (state, action) => {
        const { recordType, query = '', forceRefresh = false } =
          action.meta.arg;
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
          hasMore: data?.hasMore || false,
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

      // --- Create Record ---
      .addCase(createNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, data } = action.payload;
        state.pageCache = {};
        if (data && state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType].unshift(data);
        }
      })

      // --- Update Record (Handles 204 No Content / null response safely) ---
      .addCase(updateNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id, payload, data } = action.payload;
        const cacheKey = `${recordType}:${id}`;
        state.pageCache = {};

        const patch = data && typeof data === 'object' ? data : payload;
        if (state.recordDetailsCache[cacheKey] && patch) {
          state.recordDetailsCache[cacheKey] = {
            ...state.recordDetailsCache[cacheKey],
            ...patch,
          };
        } else {
          delete state.recordDetailsCache[cacheKey];
        }

        if (
          state.selectedRecord &&
          String(state.selectedRecord.id) === String(id) &&
          patch
        ) {
          state.selectedRecord = { ...state.selectedRecord, ...patch };
        }
      })

      // --- Fulfill Order (Transform to Shipped Item Fulfillment) ---
      .addCase(fulfillNetSuiteOrder.pending, (state) => {
        state.fulfillmentStatus = 'loading';
        state.fulfillmentError = null;
      })
      .addCase(fulfillNetSuiteOrder.fulfilled, (state, action) => {
        state.fulfillmentStatus = 'succeeded';
        state.pageCache = {};

        const { netSuiteOrderId, tranId, trackingNumbers = [] } =
          action.payload || {};

        if (netSuiteOrderId) {
          delete state.recordDetailsCache[`orders:${netSuiteOrderId}`];
        }

        // Optimistically update the order inside the cached orders list if loaded
        if (Array.isArray(state.recordsByRecordType.orders)) {
          state.recordsByRecordType.orders =
            state.recordsByRecordType.orders.map((order) => {
              const matchesId =
                netSuiteOrderId && String(order.id) === String(netSuiteOrderId);
              const matchesTranId =
                tranId &&
                String(order.tranid || '').toLowerCase() ===
                  String(tranId).toLowerCase();

              if (!matchesId && !matchesTranId) return order;

              return {
                ...order,
                status_name: 'Shipped',
                linkedtrackingnumberlist:
                  trackingNumbers.join(', ') || order.linkedtrackingnumberlist,
              };
            });
        }
      })
      .addCase(fulfillNetSuiteOrder.rejected, (state, action) => {
        state.fulfillmentStatus = 'failed';
        state.fulfillmentError =
          action.payload || 'Failed to sync fulfillment to NetSuite';
      })

      // --- Delete Record ---
      .addCase(deleteNetSuiteRecord.fulfilled, (state, action) => {
        const { recordType, id } = action.payload;
        state.pageCache = {};
        delete state.recordDetailsCache[`${recordType}:${id}`];
        if (state.recordsByRecordType[recordType]) {
          state.recordsByRecordType[recordType] =
            state.recordsByRecordType[recordType].filter(
              (item) => String(item.id) !== String(id),
            );
        }
      });
  },
});

export const {
  clearNetSuiteError,
  clearSelectedRecord,
  invalidateNetSuiteCache,
  resetFulfillmentStatus,
} = netSuiteSlice.actions;
export default netSuiteSlice.reducer;