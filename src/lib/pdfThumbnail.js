// Utilitário para gerar thumbnail (data URL) da primeira página de um PDF
// Requer a dependência 'pdfjs-dist'

import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do PDF.js usando CDN (compatível com Vite sem resolver o arquivo do node_modules)
// Usa a versão do próprio pdfjs para montar a URL
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Gera um data URL PNG da primeira página de um PDF
 * @param {string} pdfUrl URL absoluto do PDF
 * @param {number} maxSize Tamanho máximo do lado maior da miniatura (px)
 * @returns {Promise<string>} data URL da imagem PNG
 */
export async function generatePdfThumbnail(pdfUrl, maxSize = 128) {
  if (!pdfUrl) throw new Error('pdfUrl é obrigatório');

  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 1 });
  const ratio = viewport.width / viewport.height;
  const width = ratio >= 1 ? maxSize : Math.round(maxSize * ratio);
  const height = ratio >= 1 ? Math.round(maxSize / ratio) : maxSize;
  const scale = width / viewport.width;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const scaledViewport = page.getViewport({ scale });

  canvas.width = Math.ceil(scaledViewport.width);
  canvas.height = Math.ceil(scaledViewport.height);

  await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
  const dataUrl = canvas.toDataURL('image/png');

  // Cleanup básico
  canvas.width = 0;
  canvas.height = 0;

  return dataUrl;
}


