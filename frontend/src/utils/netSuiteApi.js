import api from './api'; // Reuses your existing configured backend Axios instance

const formatQuery = (query = '') =>
  query ? (query.startsWith('?') ? query : `?${query}`) : '';

export const getRecords = async (recordType, query = '') => {
  const queryString = formatQuery(query);
  const response = await api.get(`/netsuite/${recordType}${queryString}`);
  return response.data.data;
};

export const getRecordById = async (recordType, id, forceRefresh = false) => {
  const queryString = forceRefresh ? '?refresh=true' : '';
  const response = await api.get(`/netsuite/${recordType}/${id}${queryString}`);
  const recordData = response.data.data;

  // Preserve __recordType returned by /netsuite/orders/:id (salesOrder vs transferOrder)
  if (recordData && response.data.__recordType) {
    return { ...recordData, __recordType: response.data.__recordType };
  }

  return recordData;
};

export const createRecord = async (recordType, payload) => {
  const response = await api.post(`/netsuite/${recordType}`, payload);
  return response.data.data;
};

export const updateRecord = async (recordType, id, payload, query = '') => {
  const queryString = formatQuery(query);
  const response = await api.patch(
    `/netsuite/${recordType}/${id}${queryString}`,
    payload,
  );
  return response.data.data;
};

export const fulfillOrder = async (orderIdOrTranId, fulfillmentPayload) => {
  const response = await api.post(
    `/netsuite/orders/${encodeURIComponent(orderIdOrTranId)}/fulfill`,
    fulfillmentPayload,
  );
  return response.data.data;
};

export const deleteRecord = async (recordType, id) => {
  const response = await api.delete(`/netsuite/${recordType}/${id}`);
  return response.data;
};