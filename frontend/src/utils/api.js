import axios from 'axios';

// Create an Axios instance with base configuration
const api = axios.create({
  // In development, this points to your local Node server (e.g., http://localhost:5000/api/v1)
  // In production, this should point to your AWS backend URL
  baseURL: import.meta.env.VITE_API_URL ,
  
  // Set headers to ensure JSON payloads are parsed correctly
  headers: {
    'Content-Type': 'application/json',
  },
  
  // Optional: Set a timeout (in milliseconds) so requests don't hang indefinitely
  timeout: 10000, 
});

// ----------------------------------------------------------------------
// REQUEST INTERCEPTOR
// Runs BEFORE every single request leaves your frontend
// ----------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    // 1. Get the authentication token from local storage (or your state manager)
    const token = localStorage.getItem('token');

    // 2. If a token exists, attach it securely to the Authorization header
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request setup errors
    return Promise.reject(error);
  }
);

// ----------------------------------------------------------------------
// RESPONSE INTERCEPTOR
// Runs BEFORE your components/thunks receive the response data
// ----------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx triggers this function
    return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx trigger this function
    
    // Example: Handle 401 Unauthorized (Token expired or invalid)
    if (error.response && error.response.status === 401) {
      console.warn("Authentication invalid or expired. Redirecting to login.");
      
      // Clean up local state
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Optionally force a hard reload to clear memory and kick the user to the login screen
      // window.location.href = '/login'; 
    }

    // You can also add global error logging/toast notifications here
    // toast.error(error.response?.data?.message || 'An unexpected error occurred');

    return Promise.reject(error);
  }
);

export default api;