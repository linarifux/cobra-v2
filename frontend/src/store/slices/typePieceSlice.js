import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Replace with your Axios instance path

// Thunks
export const fetchTypePieces = createAsyncThunk('typePieces/fetchAll', async (customerId = '', { rejectWithValue }) => {
  try {
    const url = customerId ? `/type-pieces?customer=${customerId}` : `/type-pieces`;
    const response = await api.get(url);
    return response.data.data.typePieces;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch Type Pieces');
  }
});

export const createTypePiece = createAsyncThunk('typePieces/create', async (data, { rejectWithValue }) => {
  try {
    const response = await api.post('/type-pieces', data);
    return response.data.data.typePiece;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to create Type Piece');
  }
});

export const updateTypePiece = createAsyncThunk('typePieces/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await api.put(`/type-pieces/${id}`, data);
    return response.data.data.typePiece;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to update Type Piece');
  }
});

export const deleteTypePiece = createAsyncThunk('typePieces/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/type-pieces/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete Type Piece');
  }
});

const typePieceSlice = createSlice({
  name: 'typePieces',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTypePieces.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchTypePieces.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTypePieces.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Create
      .addCase(createTypePiece.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      // Update
      .addCase(updateTypePiece.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) state.items[index] = action.payload;
      })
      // Delete
      .addCase(deleteTypePiece.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item._id !== action.payload);
      });
  },
});

export default typePieceSlice.reducer;