import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as XLSX from 'xlsx';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const safeJsonParse = (str, defaultValue) => {
  if (typeof str !== 'string') {
    return defaultValue;
  }
  try {
    const parsed = JSON.parse(str);
    return parsed === null ? defaultValue : parsed;
  } catch (e) {
    return defaultValue;
  }
};

export const formatCurrency = (value, locale = 'pt-BR', currency = 'BRL') => {
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numberValue);
};

export const formatCurrencySilent = (value, locale = 'pt-BR', currency = 'BRL') => {
  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    return '';
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numberValue);
};

export const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
  const number = parseFloat(value);
  if (isNaN(number)) {
    return '0,00';
  }
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: minimumFractionDigits,
    maximumFractionDigits: maximumFractionDigits,
  });
};

export const safeParseFloat = (value, defaultValue = 0) => {
  // Verificar se o valor é null, undefined ou string vazia
  if (value === null || value === undefined || String(value).trim() === '') {
    return defaultValue;
  }
  
  // Converter para string e substituir vírgula por ponto
  const strValue = String(value).replace(',', '.');
  const num = parseFloat(strValue);
  
  // Retornar o valor padrão se não for um número válido
  return isNaN(num) ? defaultValue : num;
};

export const safeParseInt = (value, defaultValue = 0) => {
  // Verificar se o valor é null, undefined ou string vazia
  if (value === null || value === undefined || String(value).trim() === '') {
    return defaultValue;
  }
  
  // Converter para string e substituir vírgula por ponto
  const strValue = String(value).replace(',', '.');
  const num = parseInt(strValue, 10);
  
  // Retornar o valor padrão se não for um número válido
  return isNaN(num) ? defaultValue : num;
};

export const generateUniqueId = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
};

export const exportToExcel = (data, sheetName = 'Sheet1', fileName = 'export.xlsx') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
    return { success: true, message: "Exportado com sucesso!" };
  } catch (error) {
    console.error("Erro ao exportar para Excel:", error);
    return { success: false, message: `Erro ao exportar: ${error.message}` };
  }
};

export const importFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (error) {
          console.error('Erro ao importar do Excel:', error);
          reject(new Error(`Erro ao processar o arquivo: ${error.message}`));
        }
      };
      reader.onerror = (error) => {
        console.error('Erro ao ler o arquivo:', error);
        reject(new Error(`Erro ao ler o arquivo: ${error.message}`));
      };
      reader.readAsBinaryString(file);
    } catch (e) {
      reject(e);
    }
  });
};

export function base64ToBlob(base64, type = 'application/octet-stream') {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}

export function isPromocaoAtiva(produto) {
  if (!produto || !produto.promocao_ativa) {
    return false;
  }
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); 

  const inicio = produto.promo_data_inicio ? new Date(produto.promo_data_inicio) : null;
  const fim = produto.promo_data_fim ? new Date(produto.promo_data_fim) : null;

  if (inicio && fim) {
    return hoje >= inicio && hoje <= fim;
  }
  if (inicio) {
    return hoje >= inicio;
  }
  if (fim) {
    return hoje <= fim;
  }
  return true; 
}

/**
 * Carrega dados do apiDataManager de forma consistente
 * @param {string} key - Chave dos dados
 * @param {any} defaultValue - Valor padrão se não encontrar dados
 * @returns {Promise<any>} - Dados carregados ou valor padrão
 */
export async function loadData(key, defaultValue = null) {
  try {
    const { apiDataManager } = await import('@/lib/apiDataManager');
    const data = await apiDataManager.getData(key);
    
    // Se os dados são null, undefined ou string vazia, retorna o valor padrão
    if (data === null || data === undefined || data === '') {
      return defaultValue;
    }
    
    // Se o valor padrão é um array e os dados não são um array, retorna o valor padrão
    if (Array.isArray(defaultValue) && !Array.isArray(data)) {
      console.warn(`Dados para ${key} não são um array, retornando valor padrão`);
      return defaultValue;
    }
    
    return data;
  } catch (error) {
    console.error(`Erro ao carregar dados para ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Carrega dados do apiDataManager usando getItem (para compatibilidade)
 * @param {string} key - Chave dos dados
 * @param {any} defaultValue - Valor padrão se não encontrar dados
 * @returns {Promise<any>} - Dados carregados ou valor padrão
 */
export async function loadDataWithGetItem(key, defaultValue = null) {
  try {
    const { apiDataManager } = await import('@/lib/apiDataManager');
    const data = await apiDataManager.getItem(key);
    const parsed = safeJsonParse(data, defaultValue);
    
    // Se o valor padrão é um array, garantir que o retorno também seja
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
      console.warn(`Dados carregados para ${key} não são um array válido. Retornando array vazio.`);
      return [];
    }
    
    return parsed;
  } catch (error) {
    console.error(`Erro ao carregar dados para ${key}:`, error);
    return defaultValue;
  }
}