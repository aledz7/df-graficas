import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ImagePlus, Eye, File as FileIcon } from 'lucide-react';
import { generatePdfThumbnail } from '@/lib/pdfThumbnail';

const OSEntregaAnexosDialog = ({ os }) => {
  const { toast } = useToast();
  // Anexos de entrega (somente visualização)
  const anexosEntrega = os.dados_entrega?.fotos_entrega || [];
  // Anexos de produção (somente visualização)
  const anexosProducao = os.dados_producao?.fotos_producao || [];
  // cache simples de thumbnails por id de anexo
  const [thumbs, setThumbs] = useState({});

  // Helper para garantir HTTPS quando a página está em HTTPS
  const ensureHttps = (url) => {
    if (!url) return url;
    // Se a página está em HTTPS, força HTTPS na URL
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  const buildUrl = (anexo) => {
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

  const isPdf = (anexo) => {
    const name = (anexo?.name || anexo?.filename || '').toLowerCase();
    const url = (anexo?.url || '').toLowerCase();
    const path = (anexo?.path || '').toLowerCase();
    return anexo?.type === 'application/pdf' || name.endsWith('.pdf') || url.includes('.pdf') || path.includes('.pdf');
  };

  useEffect(() => {
    let cancelled = false;
    async function loadThumbs(list) {
      const updates = {};
      for (const anexo of list) {
        if (isPdf(anexo) && !thumbs[anexo.id]) {
          try {
            const url = buildUrl(anexo);
            if (!url) continue;
            const dataUrl = await generatePdfThumbnail(url, 128);
            if (!cancelled) updates[anexo.id] = dataUrl;
          } catch (_) {}
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setThumbs(prev => ({ ...prev, ...updates }));
      }
    }
    loadThumbs([...(anexosProducao||[]), ...(anexosEntrega||[])]);
    return () => { cancelled = true; };
  }, [anexosProducao, anexosEntrega]);



  const handleViewImage = (anexo) => {
    try {
      
      // Helper para garantir HTTPS
      const ensureHttps = (url) => {
        if (!url) return url;
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
          return url.replace('http://', 'https://');
        }
        return url;
      };

      // Se tem URL do servidor, usar ela diretamente
      if (anexo.url && anexo.url.startsWith('http')) {
        window.open(ensureHttps(anexo.url), '_blank');
        return;
      }
      
      // Se tem path, construir URL completa
      if (anexo.path) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullUrl = ensureHttps(`${apiBaseUrl}/storage/${anexo.path}`);
        window.open(fullUrl, '_blank');
        return;
      }
      
      // Se tem URL relativa, construir URL completa
      if (anexo.url && anexo.url.startsWith('/storage/')) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullUrl = ensureHttps(`${apiBaseUrl}${anexo.url}`);
        window.open(fullUrl, '_blank');
        return;
      }
      
      // Fallback para data URL (caso ainda existam anexos antigos)
      if (anexo.url && anexo.url.startsWith('data:')) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${anexo.name}</title>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    background: #f5f5f5;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                  }
                  .image-container {
                    background: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    text-align: center;
                  }
                  img {
                    max-width: 100%;
                    max-height: 80vh;
                    object-fit: contain;
                    border-radius: 4px;
                  }
                  .filename {
                    margin-top: 10px;
                    font-size: 14px;
                    color: #666;
                  }
                </style>
              </head>
              <body>
                <div class="image-container">
                  <img src="${anexo.url}" alt="${anexo.name}" />
                  <div class="filename">${anexo.name}</div>
                </div>
              </body>
            </html>
          `);
          newWindow.document.close();
        } else {
          toast({ 
            title: "Erro", 
            description: "Não foi possível abrir a imagem. Verifique se o bloqueador de pop-ups está ativado.", 
            variant: "destructive" 
          });
        }
        return;
      }
      
      // Se não tem URL válida
      toast({ 
        title: "Erro", 
        description: "URL da imagem não encontrada ou inválida.", 
        variant: "destructive" 
      });
    } catch (error) {
      console.error('Erro ao abrir imagem:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível abrir a imagem.", 
        variant: "destructive" 
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus size={14} className="mr-1" /> 
          ({anexosProducao.length + anexosEntrega.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Anexos da OS: {os.id_os}</DialogTitle>
          <DialogDescription>
            Visualize todos os anexos relacionados a esta ordem de serviço.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {/* Seção de Anexos de Produção */}
          {anexosProducao.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="h-px bg-muted flex-1"></div>
                <h3 className="text-sm font-medium text-muted-foreground bg-background px-3">
                  Anexos de Produção ({anexosProducao.length})
                </h3>
                <div className="h-px bg-muted flex-1"></div>
              </div>
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                {anexosProducao.map(anexo => (
                  <div key={anexo.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/20 border-muted">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {(anexo.type?.startsWith('image/') || (anexo.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(anexo.name))) ? (
                        <div className="relative group flex-shrink-0">
                          <img 
                            src={buildUrl(anexo) || ''} 
                            alt={anexo.name} 
                            className="h-32 w-32 object-cover rounded-lg border shadow-md group-hover:shadow-lg transition-shadow" 
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', anexo);
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleViewImage(anexo)}
                            >
                              <Eye size={16} className="mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      ) : isPdf(anexo) && thumbs[anexo.id] ? (
                        <img src={thumbs[anexo.id]} alt={anexo.name} className="h-32 w-32 object-cover rounded-lg border bg-white"/>
                      ) : (
                        <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-lg border flex-shrink-0">
                          <FileIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium truncate" title={anexo.name}>
                          {anexo.name}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {(anexo.type?.startsWith('image/') || (anexo.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(anexo.name))) ? 'Imagem' : (isPdf(anexo) ? 'PDF' : 'Arquivo')} • Produção
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7"
                          onClick={() => handleViewImage(anexo)}
                        >
                          <Eye size={12} className="mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção de Anexos de Entrega */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="h-px bg-muted flex-1"></div>
              <h3 className="text-sm font-medium text-muted-foreground bg-background px-3">
                Anexos de Entrega ({anexosEntrega.length})
              </h3>
              <div className="h-px bg-muted flex-1"></div>
            </div>
            
            {anexosEntrega.length > 0 && (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {anexosEntrega.map(anexo => (
                  <div key={anexo.id} className="flex items-start justify-between p-3 border rounded-lg bg-muted/20 border-muted">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      {(anexo.type?.startsWith('image/') || (anexo.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(anexo.name))) ? (
                        <div className="relative group flex-shrink-0">
                          <img 
                            src={buildUrl(anexo) || ''} 
                            alt={anexo.name} 
                            className="h-32 w-32 object-cover rounded-lg border shadow-md group-hover:shadow-lg transition-shadow" 
                            onError={(e) => {
                              console.error('Erro ao carregar imagem:', anexo);
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleViewImage(anexo)}
                            >
                              <Eye size={16} className="mr-1" />
                              Ver
                            </Button>
                          </div>
                        </div>
                      ) : isPdf(anexo) && thumbs[anexo.id] ? (
                        <img src={thumbs[anexo.id]} alt={anexo.name} className="h-32 w-32 object-cover rounded-lg border bg-white"/>
                      ) : (
                        <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-lg border flex-shrink-0">
                          <FileIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm font-medium truncate" title={anexo.name}>
                          {anexo.name}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {(anexo.type?.startsWith('image/') || (anexo.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(anexo.name))) ? 'Imagem' : (isPdf(anexo) ? 'PDF' : 'Arquivo')} • Entrega
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7"
                          onClick={() => handleViewImage(anexo)}
                        >
                          <Eye size={12} className="mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSEntregaAnexosDialog;
