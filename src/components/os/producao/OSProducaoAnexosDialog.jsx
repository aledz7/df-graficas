import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ImagePlus, Loader2, Trash2, Eye, File as FileIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { uploadService } from '@/services/api';

const OSProducaoAnexosDialog = ({ os, onUpdate }) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [anexos, setAnexos] = useState(os.dados_producao.fotos_producao || []);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    let novosAnexos = [...anexos];

    for (const file of files) {
      try {
        let compressedFile = file;
        const originalName = file.name; // Guardar o nome original
        
        if (file.type.startsWith('image/')) {
          compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });
          
          // Criar um novo arquivo com o nome original
          const compressedBlob = compressedFile;
          compressedFile = new File([compressedBlob], originalName, {
            type: compressedFile.type,
            lastModified: Date.now(),
          });
        }
        
        // Fazer upload do arquivo para o servidor
        const response = await uploadService.uploadAnexoProducao(compressedFile, os.id_os || os.id);
        
        if (response.data.success) {
          const novoAnexo = {
            id: `anexo-${Date.now()}-${Math.random()}`,
            name: response.data.original_name || originalName, // Usar o nome original do arquivo
            url: response.data.url,
            path: response.data.path,
            type: response.data.type || compressedFile.type,
            size: response.data.size || compressedFile.size,
          };
          
          novosAnexos.push(novoAnexo);
        } else {
          throw new Error(response.data.message || 'Erro no upload');
        }
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({ 
          title: "Erro no Upload", 
          description: `Não foi possível processar o arquivo ${file.name}: ${error.message}`, 
          variant: "destructive" 
        });
      }
    }
    
    // Atualizar anexos e salvar no banco
    setAnexos(novosAnexos);
    onUpdate(os.id, { fotos_producao: novosAnexos }, true);
    setIsUploading(false);
    toast({ title: "Anexos atualizados!" });
  };

  const handleRemoveAnexo = (anexoId) => {
    const novosAnexos = anexos.filter(a => a.id !== anexoId);
    setAnexos(novosAnexos);
    onUpdate(os.id, { fotos_producao: novosAnexos }, true);
    toast({ title: "Anexo removido." });
  };

  const handleViewImage = (anexo) => {
    try {
      
      // Se tem URL do servidor, usar ela diretamente
      if (anexo.url && anexo.url.startsWith('http')) {
        window.open(anexo.url, '_blank');
        return;
      }
      
      // Se tem path, construir URL completa
      if (anexo.path) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullUrl = `${apiBaseUrl}/storage/${anexo.path}`;
        window.open(fullUrl, '_blank');
        return;
      }
      
      // Se tem URL relativa, construir URL completa
      if (anexo.url && anexo.url.startsWith('/storage/')) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const fullUrl = `${apiBaseUrl}${anexo.url}`;
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
          <ImagePlus size={14} className="mr-2" /> 
          Anexos ({anexos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Anexos de Produção da OS: {os.id}</DialogTitle>
          <DialogDescription>
            Adicione ou remova arquivos e fotos relacionados à produção desta OS.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {anexos.length > 0 && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {anexos.map(anexo => (
                <div key={anexo.id} className="flex items-start justify-between p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    {anexo.type.startsWith('image/') ? (
                      <div className="relative group flex-shrink-0">
                        <img 
                          src={anexo.url || (anexo.path ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${anexo.path}` : '')} 
                          alt={anexo.name} 
                          className="h-48 w-48 object-cover rounded-lg border shadow-md group-hover:shadow-lg transition-shadow" 
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
                    ) : (
                      <div className="h-48 w-48 flex items-center justify-center bg-muted rounded-lg border flex-shrink-0">
                        <FileIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-2">
                      <p className="text-sm font-medium truncate" title={anexo.name}>
                        {anexo.name}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {anexo.type.startsWith('image/') ? 'Imagem' : 'Arquivo'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8"
                          onClick={() => handleViewImage(anexo)}
                        >
                          <Eye size={14} className="mr-1" />
                          Ver
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleRemoveAnexo(anexo.id)} 
                          className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-center w-full">
            <label htmlFor={`upload-anexo-${os.id_os}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploading ? (
                  <>
                    <Loader2 className="w-8 h-8 mb-4 text-primary animate-spin" />
                    <p className="mb-2 text-sm text-muted-foreground">Enviando e comprimindo...</p>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Clique para enviar</span> ou arraste</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Imagens (JPG, PNG) ou PDF</p>
                  </>
                )}
              </div>
              <input id={`upload-anexo-${os.id_os}`} type="file" className="hidden" onChange={handleFileChange} multiple disabled={isUploading} />
            </label>
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

export default OSProducaoAnexosDialog;