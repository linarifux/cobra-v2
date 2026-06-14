import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch ALL Users
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch users');

      return data.data.users || data.data; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Create Dynamic User
export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData, { rejectWithValue }) => {
    try {
      const payload = { ...userData };
      if (payload.portal === 'admin') delete payload.customer;

      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create user');

      return data.data.user || data.data;
    } catch (error) {
      return rejectWithValue(error.message);
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

      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update user');

      return data.data.user || data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 4. Delete User
export const deleteUser = createAsyncThunk(
  'users/deleteUser',
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