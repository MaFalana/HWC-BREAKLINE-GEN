import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://surface-gen-api.purplebush-adcf4e3b.eastus.azurecontainerapps.io';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 503 || error.response?.status === 502) {
      // Retry once for server errors
      const originalRequest = error.config;
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        await new Promise(resolve => setTimeout(resolve, 1000));
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);