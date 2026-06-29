import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Replace with your Axios instance path

// --- Thunks ---

// 1. Fetch All Type Pieces (Optionally filtered by Customer)
export const fetchTypePieces = createAsyncThunk(
  'typePieces/fetchAll', 
  async (customerId = '', { rejectWithValue }) => {
    try {
      const url = customerId ? `/type-pieces?customer=${customerId}` : `/type-pieces`;
      const response = await api.get(url);
      
      // Defensive fallback in case the backend wrapper changes
      return response.data.data.typePieces || response.data.data || [];
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch Type Pieces');
    }
  }
);

// 2. Create a Type Piece
export const createTypePiece = createAsyncThunk(
  'typePieces/create', 
  async (typePieceData, { rejectWithValue }) => {
    try {
      const response = await api.post('/type-pieces', typePieceData);
      return response.data.data.typePiece || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create Type Piece');
    }
  }
);

// 3. Update a Type Piece
export const updateTypePiece = createAsyncThunk(
  'typePieces/update', 
  // FIX: Destructure 'updateData' to perfectly match what the UI is dispatching
  async ({ id, updateData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/type-pieces/${id}`, updateData);
      return response.data.data.typePiece || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update Type Piece');
    }
  }
);

// 4. Delete a Type Piece
export const deleteTypePiece = createAsyncThunk(
  'typePieces/delete', 
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/type-pieces/${id}`);
      return id; // Return the ID so the slice can filter it out of the array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete Type Piece');
    }
  }
);


// --- Slice Definition ---

const typePieceSlice = createSlice({
  name: 'typePieces',
  initialState: { 
    items: [], 
    status: 'idle', 
    error: null 
  },
  reducers: {
    // Utility to wipe state (e.g., on user logout)
    clearTypePieces: (state) => {
      state.items = [];
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch ---
      .addCase(fetchTypePieces.pending, (state) => { 
        state.status = 'loading'; 
        state.error = null; // Clear previous errors on new fetch
      })
      .addCase(fetchTypePieces.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTypePieces.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      
      // --- Create ---
      .addCase(createTypePiece.fulfilled, (state, action) => {
        // Push the new item to the top of the list immediately
        state.items.unshift(action.payload);
      })
      
      // --- Update ---
      .addCase(updateTypePiece.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // --- Delete ---
      .addCase(deleteTypePiece.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload);
      });
  },
});

export const { clearTypePieces } = typePieceSlice.actions;
export default typePieceSlice.reducer;