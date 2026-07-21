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
  async ({ id, userData, ...rest }, { rejectWithValue }) => {
    try {
      // FIX: Safely handle both { id, userData: {...} } AND { id, name: '...', email: '...' } dispatch patterns
      const payload = userData ? { ...userData } : { ...rest };
      
      if (payload.portal === 'admin') delete payload.customer;
      
      // If password is empty, don't send it to backend so we don't accidentally overwrite it
      if (!payload.password) delete payload.password;

      const response = await api.put(`/users/${id}`, payload);
      return response.data.data.user || response.data.data;
    } catch (error) {
      console.log(error);
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

// 5. Get Single User
export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data.data.user || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch user');
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    currentUser: null, // <-- ADDED: Holds the single fetched user
    status: 'idle', 
    detailsStatus: 'idle', // <-- ADDED: Tracks loading state for a single user fetch
    createStatus: 'idle',
    error: null
  },
  reducers: {
    clearUserErrors: (state) => {
      state.error = null;
      state.createStatus = 'idle';
    },
    clearCurrentUser: (state) => { // <-- ADDED: Clears data when unmounting profile page
      state.currentUser = null;
      state.detailsStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
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
      
      // --- Fetch Single User ---
      .addCase(fetchUserById.pending, (state) => {
        state.detailsStatus = 'loading';
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.detailsStatus = 'succeeded';
        state.currentUser = action.payload;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.detailsStatus = 'failed';
        state.error = action.payload;
      })

      // --- Create ---
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
      
      // --- Update ---
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
        // Also update currentUser if we are currently editing/viewing them
        if (state.currentUser && state.currentUser._id === action.payload._id) {
          state.currentUser = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.error = action.payload;
      })

      // --- Delete ---
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter(u => u._id !== action.payload);
        // Clear currentUser if the deleted user was the one currently loaded
        if (state.currentUser && state.currentUser._id === action.payload) {
          state.currentUser = null;
        }
      });
  }
});

export const { clearUserErrors, clearCurrentUser } = userSlice.actions; 
export default userSlice.reducer;