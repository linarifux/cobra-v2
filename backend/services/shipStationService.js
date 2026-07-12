import axios from 'axios';

// Extract and clean the API key securely
const shipStationKey = process.env.SHIPSTATION_API_KEY?.replace(/['"]/g, '').trim();

// Initialize the ShipStation V2 Axios Instance
export const shipStationAPI = axios.create({
  baseURL: 'https://ssapi.shipstation.com',
  headers: {
    // V2 Authentication: Utilizing ONLY the API Key
    'Authorization': shipStationKey, 
    'Content-Type': 'application/json'
  }
});

// --- HELPER FUNCTIONS ---

export const getOrders = async (params = {}) => {
  const response = await shipStationAPI.get('/orders', { params });
  return response.data;
};

export const createOrder = async (orderPayload) => {
  const response = await shipStationAPI.post('/orders/createorder', orderPayload);
  return response.data;
};

export const getRates = async (ratePayload) => {
  const response = await shipStationAPI.post('/shipments/getrates', ratePayload);
  return response.data;
};