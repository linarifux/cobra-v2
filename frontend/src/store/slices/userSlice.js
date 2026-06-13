import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch Admin Portal Users
export const fetchAdminUsers = createAsyncThunk(
  'users/fetchAdminUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/users?portal=admin`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch users');

      return data.data.users; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Create New Admin User
export const createAdminUser = createAsyncThunk(
  'users/createAdminUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...userData, portal: 'admin' }) // Force portal to admin
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create user');

      return data.data.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 3. Delete Admin User
export const deleteAdminUser = createAsyncThunk(
  'users/deleteAdminUser',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete user');
      }

      return id; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    status: 'idle', 
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createAdminUser.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        state.items = state.items.filter(u => u._id !== action.payload);
      });
  }
});

export default userSlice.reducer;