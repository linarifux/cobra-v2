import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to generate auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch Categories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_URL}/categories`, {
        headers: getAuthHeaders()
      });
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
      const response = await axios.post(`${API_URL}/categories`, categoryData, {
        headers: getAuthHeaders()
      });
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
      const response = await axios.put(`${API_URL}/categories/${id}`, categoryData, {
        headers: getAuthHeaders()
      });
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
      await axios.delete(`${API_URL}/categories/${id}`, {
        headers: getAuthHeaders()
      });
      
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