import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, ImagePlus, X } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const ProdutoTabImagens = ({
  currentProduto,
  imagemPreview,
  handleImageUpload,
  galeriaPreviews,
  handleGaleriaImageUpload,
  removeGaleriaImage,
}) => {
  const [isMainDragOver, setIsMainDragOver] = useState(false);
  const [isGalleryDragOver, setIsGalleryDragOver] = useState(false);

  const isImageFile = useCallback((file) => {
    if (!file) return false;
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name || '');
  }, []);

  const readEntryFiles = useCallback(async (entry) => {
    if (!entry) return [];

    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file(
          (file) => resolve(file ? [file] : []),
          () => resolve([])
        );
      });
    }

    if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = [];

      return new Promise((resolve) => {
        const readBatch = () => {
          reader.readEntries(
            async (batch) => {
              if (!batch.length) {
                const nestedFiles = await Promise.all(entries.map((nestedEntry) => readEntryFiles(nestedEntry)));
                resolve(nestedFiles.flat());
                return;
              }
              entries.push(...batch);
              readBatch();
            },
            () => resolve([])
          );
        };

        readBatch();
      });
    }

    return [];
  }, []);

  const getDroppedFiles = useCallback(async (dataTransfer) => {
    const items = Array.from(dataTransfer?.items || []);

    if (items.length > 0 && items.some((item) => typeof item.webkitGetAsEntry === 'function')) {
      const entries = items
        .map((item) => item.webkitGetAsEntry?.())
        .filter(Boolean);

      if (entries.length > 0) {
        const filesFromEntries = await Promise.all(entries.map((entry) => readEntryFiles(entry)));
        const flattenedFiles = filesFromEntries.flat();
        if (flattenedFiles.length > 0) return flattenedFiles;
      }
    }

    return Array.from(dataTransfer?.files || []);
  }, [readEntryFiles]);

  const preventDragDefaults = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onMainDrop = async (event) => {
    preventDragDefaults(event);
    setIsMainDragOver(false);

    const droppedFiles = await getDroppedFiles(event.dataTransfer);
    const imageFiles = droppedFiles.filter(isImageFile);
    if (!imageFiles.length) return;

    handleImageUpload({ target: { files: [imageFiles[0]] } });
  };

  const onGalleryDrop = async (event) => {
    preventDragDefaults(event);
    setIsGalleryDragOver(false);

    const droppedFiles = await getDroppedFiles(event.dataTransfer);
    const imageFiles = droppedFiles.filter(isImageFile);
    if (!imageFiles.length) return;

    handleGaleriaImageUpload({ target: { files: imageFiles } });
  };
  
  // Determinar a fonte da imagem principal
  const mainImageSrc = useMemo(() => {
    // Se tiver um preview local, usar ele
    if (imagemPreview) {
      // Aplicar getImageUrl também para o preview local se não for uma URL completa ou base64
      if (!imagemPreview.startsWith('data:') && !imagemPreview.startsWith('blob:')) {
        return getImageUrl(imagemPreview);
      }
      return imagemPreview;
    }
    // Se tiver um caminho no produto, construir a URL
    if (currentProduto?.imagem_principal) {
      return getImageUrl(currentProduto.imagem_principal);
    }
    return null;
  }, [imagemPreview, currentProduto?.imagem_principal]);

  // Combinar imagens existentes da galeria com previews locais
  const todasImagensGaleria = useMemo(() => {
    const imagensExistentes = currentProduto?.galeria_urls || [];
    const imagensExistentesComUrls = imagensExistentes.map(url => getImageUrl(url));
    
    // Combinar imagens existentes com previews locais
    return [...imagensExistentesComUrls, ...galeriaPreviews];
  }, [currentProduto?.galeria_urls, galeriaPreviews]);

  return (
    <Card>
        <CardHeader>
            <CardTitle>Imagens do Produto</CardTitle>
            <CardDescription>Adicione uma imagem principal e uma galeria de imagens extras para seu produto.</CardDescription>
        </CardHeader>
        <CardContent>
            <div>
                <Label htmlFor="imagem_principalUpload">Imagem Principal <span className="text-red-500">*</span></Label>
                <div
                    className={`mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                        isMainDragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-300 dark:border-gray-600'
                    }`}
                    onDragEnter={(event) => {
                        preventDragDefaults(event);
                        setIsMainDragOver(true);
                    }}
                    onDragOver={(event) => {
                        preventDragDefaults(event);
                        setIsMainDragOver(true);
                    }}
                    onDragLeave={(event) => {
                        preventDragDefaults(event);
                        setIsMainDragOver(false);
                    }}
                    onDrop={onMainDrop}
                >
                    {mainImageSrc ? (
                        <img src={mainImageSrc} alt="Preview Principal" className="mx-auto h-40 w-auto object-contain rounded-md mb-4" />
                    ) : (
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    )}
                    <div className="space-y-1 text-center">
                        <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                        <label
                            htmlFor="imagem_principalUpload"
                            className="relative cursor-pointer bg-card rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                        >
                            <span>Carregar imagem principal</span>
                            <input id="imagem_principalUpload" name="imagem_principalUpload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                        </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF ou arraste aqui</p>
                    </div>
                </div>
            </div>
            <div className="mt-6">
                <Label htmlFor="galeria_imagensUpload">Galeria de Imagens Extras (Opcional)</Label>
                <div className="mt-1">
                    <label
                        htmlFor="galeria_imagensUpload"
                        className={`flex justify-center w-full px-6 py-3 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                            isGalleryDragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary'
                        }`}
                        onDragEnter={(event) => {
                            preventDragDefaults(event);
                            setIsGalleryDragOver(true);
                        }}
                        onDragOver={(event) => {
                            preventDragDefaults(event);
                            setIsGalleryDragOver(true);
                        }}
                        onDragLeave={(event) => {
                            preventDragDefaults(event);
                            setIsGalleryDragOver(false);
                        }}
                        onDrop={onGalleryDrop}
                    >
                        <ImagePlus className="h-8 w-8 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 self-center">Adicionar imagens à galeria ou arrastar aqui</span>
                        <input id="galeria_imagensUpload" name="galeria_imagensUpload" type="file" className="sr-only" onChange={handleGaleriaImageUpload} accept="image/*" multiple />
                    </label>
                </div>
                {todasImagensGaleria.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {todasImagensGaleria.map((src, index) => {
                            // Determinar a fonte da imagem da galeria
                            const galeriaSrc = src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http') 
                                ? src 
                                : getImageUrl(src);
                                
                            return (
                                <div key={index} className="relative group">
                                    <img src={galeriaSrc} alt={`Galeria ${index+1}`} className="h-24 w-full object-cover rounded-md border"/>
                                    <Button type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeGaleriaImage(index)}>
                                        <X size={14}/>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
  );
};

export default ProdutoTabImagens;