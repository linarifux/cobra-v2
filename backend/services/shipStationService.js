// services/shipStationService.js
import axios from 'axios';

const shipStationApi = axios.create({
  baseURL: 'https://ssapi.shipstation.com', // Base URL for ShipStation
  headers: {
    'API-Key': process.env.SHIPSTATION_API_KEY, 
    'Content-Type': 'application/json'
  }
});

export default shipStationApi;