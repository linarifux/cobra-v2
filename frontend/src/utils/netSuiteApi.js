import api from './api'; // Reuses your existing configured backend Axios instance

export const getRecords = async (recordType, query = '') => {
  // Ensure the query safely starts with '?' if parameters exist
  const queryString = query ? (query.startsWith('?') ? query : `?${query}`) : '';
  
  // Routes to your Node.js backend: /api/v1/netsuite/salesOrder
  const response = await api.get(`/netsuite/${recordType}${queryString}`);
  
  // Unwrap the backend's standard { success: true, data: { ... } } response structure
  return response.data.data; 
};

export const getRecordById = async (recordType, id) => {
  const response = await api.get(`/netsuite/${recordType}/${id}`);
  return response.data.data;
};

export const createRecord = async (recordType, payload) => {
  const response = await api.post(`/netsuite/${recordType}`, payload);
  return response.data.data;
};

export const updateRecord = async (recordType, id, payload) => {
  const response = await api.patch(`/netsuite/${recordType}/${id}`, payload);
  return response.data.data;
};

export const deleteRecord = async (recordType, id) => {
  const response = await api.delete(`/netsuite/${recordType}/${id}`);
  return response.data;
};
