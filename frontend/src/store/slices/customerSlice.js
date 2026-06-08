import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to generate auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch All Customers
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch customers');

      return data.data.customers; 
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 2. Fetch Single Customer by ID
export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/customers/${id}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch customer details');

      return data.data.customer;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 3. Create New Customer
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to create customer');

      return data.data.customer;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 4. Update Existing Customer
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/customers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update customer');

      return data.data.customer;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 5. Delete Customer
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete customer');
      }

      return id; // Return the ID so the reducer knows which item to remove from state
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    currentCustomer: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addCase(fetchCustomers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Fetch Single ---
      .addCase(fetchCustomerById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Create ---
      .addCase(createCustomer.fulfilled, (state, action) => {
        // Push the newly created customer to the top of the array
        state.items.unshift(action.payload);
      })

      // --- Update ---
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        // Also update currentCustomer if it's the one currently being viewed
        if (state.currentCustomer && state.currentCustomer._id === action.payload._id) {
          state.currentCustomer = action.payload;
        }
      })

      // --- Delete ---
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c._id !== action.payload);
        if (state.currentCustomer && state.currentCustomer._id === action.payload) {
          state.currentCustomer = null;
        }
      });
  }
});

export const { clearCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;