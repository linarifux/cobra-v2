import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path if necessary

// --- Helper: Safely Load User from Storage ---
// Prevents the app from crashing if localStorage data is corrupted or 'undefined'
const loadUserFromStorage = () => {
  try {
    const serializedUser = localStorage.getItem('user');
    if (serializedUser === null || serializedUser === 'undefined') {
      return null;
    }
    return JSON.parse(serializedUser);
  } catch (err) {
    console.warn('⚠️ Corrupted user data found in localStorage. Wiping clean.');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    return null;
  }
};

// @desc    Login User
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password, portal }, { rejectWithValue }) => {
    try {
      // Axios automatically parses JSON and throws errors for non-2xx status codes
      const response = await api.post('/auth/login', { email, password, portal });
      const data = response.data;

      // Save token & user to local storage securely
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      return data;
    } catch (error) {
      // Axios puts backend error messages in error.response.data
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Authentication failed. Please check your credentials.'
      );
    }
  }
);

// @desc    Get Current Logged In User Session (Validates Token on Refresh)
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      // Fail fast if no token exists in storage before making the network request
      if (!localStorage.getItem('token')) {
        throw new Error('No active session token found.');
      }

      // The api.js interceptor automatically attaches the Bearer token to this request!
      const response = await api.get('/auth/me');
      const data = response.data;

      // Update stored user data in case roles/names were changed on the backend
      localStorage.setItem('user', JSON.stringify(data.data.user));

      return data.data.user;
    } catch (error) {
      // If token is invalid/expired/tampered with, purge the storage to force a clean re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Session expired or invalid.'
      );
    }
  }
);

// Initialize state safely
const initialState = {
  user: loadUserFromStorage(),
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      // 1. Purge Local Storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 2. Reset Redux State
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Login Cases ---
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.token = action.payload.token;
        state.user = action.payload.data.user;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      
      // --- Fetch Current User Cases ---
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        // If the session fetch fails (e.g., token expired), automatically log them out of state
        state.status = 'failed';
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        // We purposely do NOT set state.error here so we don't flash an error banner 
        // to a user who simply has an expired token and just needs to log back in.
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;