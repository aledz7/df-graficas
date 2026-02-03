/**
 * Utilitários para manipulação de datas
 * Corrige problemas de fuso horário ao salvar datas no banco de dados
 */

/**
 * Converte uma data local para o formato ISO aceito pelo backend Laravel
 * sem perder o fuso horário (evita conversão para UTC)
 * 
 * @param {Date} date - Data a ser convertida (padrão: data/hora atual)
 * @returns {string} Data no formato 'YYYY-MM-DD HH:mm:ss'
 */
export const formatDateForBackend = (date = new Date()) => {
  const d = new Date(date);
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Converte uma data local para formato ISO com timezone local
 * Mantém o horário local sem converter para UTC
 * 
 * @param {Date} date - Data a ser convertida (padrão: data/hora atual)
 * @returns {string} Data no formato ISO com timezone local
 */
export const toLocalISOString = (date = new Date()) => {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, -1); // Remove o 'Z' do final
};

/**
 * Retorna a data/hora atual no formato aceito pelo backend
 * @returns {string} Data/hora atual no formato 'YYYY-MM-DD HH:mm:ss'
 */
export const getCurrentDateTime = () => {
  return formatDateForBackend(new Date());
};

/**
 * Formata uma data para exibição no formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada (DD/MM/YYYY HH:mm)
 */
export const formatDateTimeBR = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Formata uma data para exibição no formato brasileiro (apenas data)
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada (DD/MM/YYYY)
 */
export const formatDateBR = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export default {
  formatDateForBackend,
  toLocalISOString,
  getCurrentDateTime,
  formatDateTimeBR,
  formatDateBR,
};

