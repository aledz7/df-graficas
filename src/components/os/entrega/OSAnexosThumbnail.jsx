import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, Eye, File as FileIcon } from 'lucide-react';
import OSEntregaAnexosDialog from './OSEntregaAnexosDialog';
import { generatePdfThumbnail } from '@/lib/pdfThumbnail';

const OSAnexosThumbnail = ({ os }) => {
  const [imageError, setImageError] = useState(false);
  
  // Anexos de entrega e produção
  const anexosEntrega = os.dados_entrega?.fotos_entrega || [];
  const anexosProducao = os.dados_producao?.fotos_producao || [];
  const totalAnexos = anexosProducao.length + anexosEntrega.length;
  
  // Helpers de tipo por extensão (quando o backend não envia type)
  const isPdf = (anexo) => {
    const name = (anexo?.name || anexo?.filename || '').toLowerCase();
    const url = (anexo?.url || '').toLowerCase();
    const path = (anexo?.path || '').toLowerCase();
    return anexo?.type === 'application/pdf' || name.endsWith('.pdf') || url.includes('.pdf') || path.includes('.pdf');
  };
  const isImage = (anexo) => {
    if (!anexo) return false;
    if (anexo?.type?.startsWith?.('image/')) return true;
    const name = (anexo?.name || anexo?.filename || '').toLowerCase();
    const url = (anexo?.url || '').toLowerCase();
    const path = (anexo?.path || '').toLowerCase();
    return ['.png','.jpg','.jpeg','.webp','.gif'].some(ext => name.endsWith(ext) || url.endsWith(ext) || path.endsWith(ext));
  };

  // Encontrar primeiro anexo preferindo imagem, depois PDF
  const anexosOrdenados = useMemo(() => [...anexosProducao, ...anexosEntrega], [anexosEntrega, anexosProducao]);
  const primeiraImagem = anexosOrdenados.find(isImage);
  const primeiroPdf = !primeiraImagem ? anexosOrdenados.find(isPdf) : null;

  // Helper para garantir HTTPS quando a página está em HTTPS
  const ensureHttps = (url) => {
    if (!url) return url;
    // Se a página está em HTTPS, força HTTPS na URL
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  // Função para construir URL da imagem
  const getImageUrl = (anexo) => {
    if (!anexo) return null;
    
    // Se tem URL do servidor, usar ela diretamente
    if (anexo.url && anexo.url.startsWith('http')) {
      return ensureHttps(anexo.url);
    }
    
    // Se tem path, construir URL completa
    if (anexo.path) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/storage/${anexo.path}`;
      return ensureHttps(url);
    }
    
    // Se tem URL relativa, construir URL completa
    if (anexo.url && anexo.url.startsWith('/storage/')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}${anexo.url}`;
      return ensureHttps(url);
    }
    
    // Fallback para data URL
    if (anexo.url && anexo.url.startsWith('data:')) {
      return anexo.url;
    }
    
    return null;
  };

  const imageUrl = getImageUrl(primeiraImagem);
  const [pdfThumb, setPdfThumb] = useState(null);

  // Construir URL absoluta para arquivo (imagem/PDF)
  const getFileUrl = (anexo) => {
    if (!anexo) return null;
    if (anexo.url && anexo.url.startsWith('http')) {
      return ensureHttps(anexo.url);
    }
    if (anexo.path) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/storage/${anexo.path}`;
      return ensureHttps(url);
    }
    if (anexo.url && anexo.url.startsWith('/storage/')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}${anexo.url}`;
      return ensureHttps(url);
    }
    return null;
  };

  // Gerar thumbnail do PDF quando não houver imagem
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!primeiraImagem && primeiroPdf) {
        try {
          const url = getFileUrl(primeiroPdf);
          if (!url) return;
          const thumb = await generatePdfThumbnail(url, 32 * 2); // qualidade melhor, exibimos menor
          if (!cancelled) setPdfThumb(thumb);
        } catch (e) {
          if (!cancelled) setPdfThumb(null);
        }
      } else {
        setPdfThumb(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [primeiraImagem, primeiroPdf]);

  if (totalAnexos === 0) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Sem anexos</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Miniatura da primeira imagem */}
      {primeiraImagem && imageUrl && !imageError && (
        <div className="relative">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-8 h-8 object-cover rounded border"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        </div>
      )}
      
      {/* Se não há imagem, tentar mostrar miniatura do PDF; se falhar, ícone */}
      {(!primeiraImagem || imageError) && (
        pdfThumb ? (
          <img
            src={pdfThumb}
            alt="PDF"
            className="w-8 h-8 object-cover rounded border bg-white"
          />
        ) : (
          <div className="w-8 h-8 flex items-center justify-center bg-muted rounded border">
            <FileIcon size={14} className="text-muted-foreground" />
          </div>
        )
      )}
      
      {/* Botão de anexos */}
      <OSEntregaAnexosDialog os={os} />
    </div>
  );
};

export default OSAnexosThumbnail;
