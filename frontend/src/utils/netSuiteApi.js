import axios from 'axios';

// Create an Axios instance pointing to the Node.js backend router
const netSuiteClient = axios.create({
  baseURL: import.meta.env.VITE_NETSUITE_API_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getRecords = async (recordType, query = '') => {
  // Ensure the query safely starts with '?' if parameters exist
  const queryString = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  const response = await netSuiteClient.get(`/${recordType}${queryString}`);
  
  // Unwrap the backend's standard { success: true, data: { ... } } response structure
  return response.data.data; 
};

export const getRecordById = async (recordType, id) => {
  const response = await netSuiteClient.get(`/${recordType}/${id}`);
  return response.data.data;
};

export const createRecord = async (recordType, payload) => {
  const response = await netSuiteClient.post(`/${recordType}`, payload);
  return response.data.data;
};

export const updateRecord = async (recordType, id, payload) => {
  const response = await netSuiteClient.patch(`/${recordType}/${id}`, payload);
  return response.data.data;
};

export const deleteRecord = async (recordType, id) => {
  const response = await netSuiteClient.delete(`/${recordType}/${id}`);
  return response.data;
};