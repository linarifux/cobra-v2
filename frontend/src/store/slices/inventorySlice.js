import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; 

// 1. Fetch All Inventory
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/inventory');
      return response.data.data.inventory; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch inventory');
    }
  }
);

// 2. Fetch Single Inventory Item (Includes Audit Ledger)
export const fetchInventoryById = createAsyncThunk(
  'inventory/fetchInventoryById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return response.data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch inventory details');
    }
  }
);

// NEW: Fetch Single Inventory Item by Division and Corporate SKU
export const fetchInventoryByLookup = createAsyncThunk(
  'inventory/fetchInventoryByLookup',
  async ({ divisionId, corporateSku }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/inventory/lookup/division/${divisionId}/sku/${corporateSku}`);
      return response.data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to find matching inventory item');
    }
  }
);

// 3. Create Inventory
export const createInventory = createAsyncThunk(
  'inventory/createInventory',
  async (inventoryData, { rejectWithValue }) => {
    try {
      const response = await api.post('/inventory', inventoryData);
      return response.data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create inventory item');
    }
  }
);

// 4. Update Inventory
export const updateInventory = createAsyncThunk(
  'inventory/updateInventory',
  async ({ id, inventoryData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/inventory/${id}`, inventoryData);
      return response.data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update inventory item');
    }
  }
);

// 5. Delete Inventory
export const deleteInventory = createAsyncThunk(
  'inventory/deleteInventory',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/inventory/${id}`);
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete inventory item');
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    items: [],
    currentItem: null,
    status: 'idle', 
    error: null
  },
  reducers: {
    clearCurrentInventoryItem: (state) => {
      state.currentItem = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchInventory.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch Single by ID
      .addCase(fetchInventoryById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchInventoryById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(fetchInventoryById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Fetch Single by Lookup (Division/SKU)
      .addCase(fetchInventoryByLookup.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchInventoryByLookup.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(fetchInventoryByLookup.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create
      .addCase(createInventory.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // Update
      .addCase(updateInventory.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentItem && state.currentItem._id === action.payload._id) {
          state.currentItem = action.payload;
        }
      })
      // Delete
      .addCase(deleteInventory.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      });
  }
});

export const { clearCurrentInventoryItem } = inventorySlice.actions;
export default inventorySlice.reducer;