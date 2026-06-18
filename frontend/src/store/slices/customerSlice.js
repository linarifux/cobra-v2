import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../utils/api'; // Adjust the import path based on your folder structure

// 1. Fetch All Customers
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/customers');
      return response.data.data.customers; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch customers');
    }
  }
);

// 2. Fetch Single Customer by ID
export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${id}`);
      return response.data.data.customer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch customer details');
    }
  }
);

// --- NEW RELATIONAL FETCHES FOR SPECIFIC CUSTOMER ---

export const fetchCustomerCarriers = createAsyncThunk(
  'customers/fetchCustomerCarriers',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${customerId}/carriers`);
      return response.data.data.carriers || response.data.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch customer carriers');
    }
  }
);

export const fetchCustomerInventory = createAsyncThunk(
  'customers/fetchCustomerInventory',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${customerId}/inventory`);
      return response.data.data.inventory || response.data.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch customer inventory');
    }
  }
);

export const fetchCustomerUsers = createAsyncThunk(
  'customers/fetchCustomerUsers',
  async (customerId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/customers/${customerId}/users`);
      return response.data.data.users || response.data.data; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch customer users');
    }
  }
);

// ----------------------------------------------------

// 3. Create New Customer
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData, { rejectWithValue }) => {
    try {
      const response = await api.post('/customers', customerData);
      return response.data.data.customer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to create customer');
    }
  }
);

// 4. Update Existing Customer
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/customers/${id}`, customerData);
      return response.data.data.customer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update customer');
    }
  }
);

// 5. Update Customer Carrier Assignments
export const updateCustomerCarriersConfig = createAsyncThunk(
  'customers/updateCustomerCarriersConfig',
  async ({ id, carrierConfigurations }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/customers/${id}/carriers`, { carrierConfigurations });
      return response.data.data.customer;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to update carrier configuration');
    }
  }
);

// 6. Delete Customer
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/customers/${id}`);
      return id; 
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to delete customer');
    }
  }
);

const customerSlice = createSlice({
  name: 'customers',
  initialState: {
    items: [],
    currentCustomer: null,
    // Store relational data specifically for the currently viewed customer
    customerCarriers: [],
    customerInventory: [],
    customerUsers: [],
    status: 'idle', 
    error: null
  },
  reducers: {
    clearCurrentCustomer: (state) => {
      state.currentCustomer = null;
      state.customerCarriers = [];
      state.customerInventory = [];
      state.customerUsers = [];
    }
  },
  extraReducers: (builder) => {
    builder
      // --- Fetch All ---
      .addCase(fetchCustomers.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Fetch Single ---
      .addCase(fetchCustomerById.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // --- Fetch Relational Data ---
      .addCase(fetchCustomerCarriers.fulfilled, (state, action) => {
        state.customerCarriers = action.payload;
      })
      .addCase(fetchCustomerInventory.fulfilled, (state, action) => {
        state.customerInventory = action.payload;
      })
      .addCase(fetchCustomerUsers.fulfilled, (state, action) => {
        state.customerUsers = action.payload;
      })

      // --- Create ---
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      // --- Update ---
      .addCase(updateCustomer.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentCustomer && state.currentCustomer._id === action.payload._id) {
          state.currentCustomer = action.payload;
        }
      })

      // --- Update Customer Carriers ---
      .addCase(updateCustomerCarriersConfig.fulfilled, (state, action) => {
        const index = state.items.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.currentCustomer && state.currentCustomer._id === action.payload._id) {
          state.currentCustomer = action.payload;
        }
      })

      // --- Delete ---
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.items = state.items.filter(c => c._id !== action.payload);
        if (state.currentCustomer && state.currentCustomer._id === action.payload) {
          state.currentCustomer = null;
          state.customerCarriers = [];
          state.customerInventory = [];
          state.customerUsers = [];
        }
      });
  }
});

export const { clearCurrentCustomer } = customerSlice.actions;
export default customerSlice.reducer;