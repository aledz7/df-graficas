/**
 * Utilitário para gerenciar URLs da API de forma dinâmica
 * Suporta tanto jet-impre.com quanto www.jet-impre.com
 */

// Função para determinar a URL base da API baseada no domínio atual
export const getApiBaseUrl = () => {
  // Se estiver no servidor (SSR), usar a variável de ambiente
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL || '';
  }

  const currentHost = window.location.hostname;
  
  // Se estiver em desenvolvimento
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return import.meta.env.VITE_API_URL || 'http://localhost:8001';
  }
  
  // Se estiver em produção, usar o domínio atual
  const protocol = window.location.protocol;
  const domain = currentHost;
  
  // Aceitar tanto com www quanto sem www
  if (domain === 'jet-impre.com' || domain === 'www.jet-impre.com') {
    return `${protocol}//${domain}/backend`;
  }
  
  // Fallback para a variável de ambiente
  return import.meta.env.VITE_API_URL || '';
};

// Função para construir URLs completas da API
export const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Função para verificar se estamos em produção
export const isProduction = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_APP_ENV === 'production';
  }
  
  const currentHost = window.location.hostname;
  return currentHost === 'jet-impre.com' || currentHost === 'www.jet-impre.com';
};

// Função para verificar se estamos em desenvolvimento
export const isDevelopment = () => {
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_APP_ENV === 'development';
  }
  
  const currentHost = window.location.hostname;
  return currentHost === 'localhost' || currentHost === '127.0.0.1';
};

// URLs específicas da API
export const API_ENDPOINTS = {
  LOGIN: '/api/login',
  REGISTER: '/api/register',
  LOGOUT: '/api/logout',
  ME: '/api/me',
  STORAGE: '/storage',
};

// Função para obter URL de storage
export const getStorageUrl = (path) => {
  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${API_ENDPOINTS.STORAGE}${cleanPath}`;
}; 