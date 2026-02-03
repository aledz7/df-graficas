import axios from 'axios';
import { apiDataManager } from '@/lib/apiDataManager';

// Configuração base do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // URL base da API do Laravel
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Importante para o Laravel Sanctum
});

// Interceptor para adicionar o token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = apiDataManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se o erro for 401 (não autorizado), remove o token
    if (error.response && error.response.status === 401) {
      apiDataManager.removeToken();
    }
    return Promise.reject(error);
  }
);

export default api;
