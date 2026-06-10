import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch All Inventory
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch inventory');
      return data.data.inventory; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Fetch Single Inventory Item (Includes Audit Ledger)
export const fetchInventoryById = createAsyncThunk(
  'inventory/fetchInventoryById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch inventory details');
      return data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 3. Create Inventory
export const createInventory = createAsyncThunk(
  'inventory/createInventory',
  async (inventoryData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(inventoryData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create inventory item');
      return data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 4. Update Inventory
export const updateInventory = createAsyncThunk(
  'inventory/updateInventory',
  async ({ id, inventoryData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(inventoryData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update inventory item');
      return data.data.inventory;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 5. Delete Inventory
export const deleteInventory = createAsyncThunk(
  'inventory/deleteInventory',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete inventory item');
      }
      return id; 
    } catch (error) {
      return rejectWithValue(error.message);
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
      .addCase(fetchInventory.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchInventoryById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchInventoryById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentItem = action.payload;
      })
      .addCase(createInventory.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateInventory.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
        if (state.currentItem && state.currentItem._id === action.payload._id) {
          state.currentItem = action.payload;
        }
      })
      .addCase(deleteInventory.fulfilled, (state, action) => {
        state.items = state.items.filter(item => item._id !== action.payload);
      });
  }
});

export const { clearCurrentInventoryItem } = inventorySlice.actions;
export default inventorySlice.reducer;