import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary based on your file structure

// 1. Fetch ALL Users
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users');
      return response.data.data.users || response.data.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch users');
    }
  }
);

// 2. Create Dynamic User
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const payload = { ...userData };
      // Strip out customer assignment if the user is an internal admin
      if (payload.portal === 'admin') delete payload.customer;

      const response = await api.post('/users', payload);
      return response.data.data.user || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create user');
    }
  }
);

// 3. Update Existing User
export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, ...userData }, { rejectWithValue }) => {
    try {
      const payload = { ...userData };
      if (payload.portal === 'admin') delete payload.customer;
      
      // If password is empty, don't send it to backend so we don't accidentally overwrite it
      if (!payload.password) delete payload.password;

      const response = await api.put(`/users/${id}`, payload);
      return response.data.data.user || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update user');
    }
  }
);

// 4. Delete User
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/users/${id}`);
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete user');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    status: 'idle', 
    createStatus: 'idle',
    error: null
  },
  reducers: {
    clearUserErrors: (state) => {
      state.error = null;
      state.createStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // Create
      .addCase(createUser.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.items.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })
      
      // Update
      .addCase(updateUser.pending, (state) => {
        state.createStatus = 'loading';
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        // Replace the old user data with the updated user data in the array
        state.items = state.items.map(user => 
          user._id === action.payload._id ? action.payload : user
        );
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter(u => u._id !== action.payload);
      });
  }
});

export const { clearUserErrors } = userSlice.actions;
export default userSlice.reducer;