import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

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
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, portal }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please check your credentials.');
      }

      // Save token & user to local storage securely
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// @desc    Get Current Logged In User Session (Validates Token on Refresh)
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No active session token found.');

      const response = await fetch(`${API_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Session expired or invalid.');
      }

      // Update stored user data in case roles/names were changed on the backend
      localStorage.setItem('user', JSON.stringify(data.data.user));

      return data.data.user;
    } catch (error) {
      // If token is invalid/expired/tampered with, purge the storage to force a clean re-login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue(error.message);
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