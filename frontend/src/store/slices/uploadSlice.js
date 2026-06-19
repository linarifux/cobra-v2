import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Your authorized Axios instance

// @desc    Handles the 2-step S3 upload process completely within Redux
export const uploadImageToS3 = createAsyncThunk(
  'upload/uploadImageToS3',
  async (file, { rejectWithValue }) => {
    try {
      // Step 1: Get the Presigned URL from our Node backend
      // We encode the URI components to safely handle spaces/special characters in filenames
      const urlResponse = await api.get(
        `/upload/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`
      );

      const { presignedUrl, finalImageUrl } = urlResponse.data;

      // Step 2: Upload the file DIRECTLY to AWS S3 using the presigned URL
      // CRITICAL: We use native fetch here, NOT the `api` instance!
      // If we use the `api` instance, it will attach our app's JWT Bearer token to the AWS request, 
      // which will cause AWS to throw a signature/authorization error.
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to push file data directly to S3 bucket');
      }

      // Step 3: Return the final public S3 URL so the component can save it to MongoDB
      return finalImageUrl;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Image upload pipeline failed'
      );
    }
  }
);

const uploadSlice = createSlice({
  name: 'upload',
  initialState: {
    isUploading: false,
    lastUploadedUrl: null,
    error: null,
  },
  reducers: {
    clearUploadState: (state) => {
      state.isUploading = false;
      state.lastUploadedUrl = null;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadImageToS3.pending, (state) => {
        state.isUploading = true;
        state.error = null;
      })
      .addCase(uploadImageToS3.fulfilled, (state, action) => {
        state.isUploading = false;
        state.lastUploadedUrl = action.payload; // Contains the finalImageUrl
      })
      .addCase(uploadImageToS3.rejected, (state, action) => {
        state.isUploading = false;
        state.error = action.payload;
      });
  }
});

export const { clearUploadState } = uploadSlice.actions;
export default uploadSlice.reducer;