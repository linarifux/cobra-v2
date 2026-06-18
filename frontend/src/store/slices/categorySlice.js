import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary based on your folder structure

// 1. Fetch Categories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      // The interceptor automatically attaches the base URL and Auth Token
      const response = await api.get('/categories');
      // Axios auto-parses JSON into the `data` property
      return response.data.data.categories; 
    } catch (error) {
      // Safely extract the backend error message, fallback to generic message
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch categories');
    }
  }
);

// 2. Create Category
export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await api.post('/categories', categoryData);
      return response.data.data.category;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create category');
    }
  }
);

// 3. Update Category
export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, categoryData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/categories/${id}`, categoryData);
      return response.data.data.category;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update category');
    }
  }
);

// 4. Delete Category
export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/categories/${id}`);
      
      // CRITICAL: Return the ID so the reducer can filter it out of the UI state
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete category');
    }
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState: {
    items: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // --- Fetch ---
      .addCase(fetchCategories.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // --- Create ---
      .addCase(createCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      
      // --- Update ---
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.items.findIndex(cat => cat._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      
      // --- Delete ---
      .addCase(deleteCategory.fulfilled, (state, action) => {
        // Automatically removes the deleted category from the Redux store
        state.items = state.items.filter(cat => cat._id !== action.payload);
      });
  }
});

export default categorySlice.reducer;