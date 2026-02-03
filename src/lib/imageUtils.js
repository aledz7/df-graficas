/**
 * Utilitário para construir URLs de imagens corretamente
 */

/**
 * Gera a URL completa para uma imagem
 * @param {string} path - Caminho da imagem
 * @returns {string} URL completa da imagem
 */
export const getImageUrl = (path) => {
  if (!path) return null;

  // Normalizar valores não-string comumente retornados (objeto com url, array etc.)
  if (typeof path !== 'string') {
    if (path && typeof path === 'object') {
      if (typeof path.url === 'string') {
        path = path.url;
      } else if (typeof path.path === 'string') {
        path = path.path;
      } else if (Array.isArray(path) && path.length > 0) {
        path = String(path[0]);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  // Se já for uma URL completa ou base64, retorna como está
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // Obtém a URL base da API do ambiente
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Forçar uso da porta 8000 para imagens (onde o backend está rodando)
  const finalApiBaseUrl = apiBaseUrl.replace(/:\d+/, ':8000');
  
  // Sempre usar URL absoluta para imagens do storage
  // Se o caminho já começar com /storage, não adicionar novamente
  if (path.startsWith('/storage')) {
    return `${finalApiBaseUrl}${path}`;
  }
  
  // Se o caminho não começar com /storage, adicionar
  return `${finalApiBaseUrl}/storage/${path}`;
};

/**
 * Processa uma lista de URLs de imagens
 * @param {string[]} paths - Array de caminhos de imagens
 * @returns {string[]} - Array de URLs completas
 */
export const getImageUrls = (paths) => {
  if (!Array.isArray(paths)) return [];
  return paths.map(path => getImageUrl(path)).filter(Boolean);
}; 