import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Upload, File, X, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const FileUpload = ({ 
  onFileSelect, 
  onFileRemove,
  acceptedTypes = "image/*,application/pdf",
  maxSize = 5 * 1024 * 1024, // 5MB
  multiple = false,
  disabled = false,
  placeholder = "Clique para selecionar arquivo",
  description = "Imagens (JPG, PNG) ou PDF",
  className = "",
  existingFiles = []
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (const file of files) {
        // Validar tamanho do arquivo
        if (file.size > maxSize) {
          toast({
            title: 'Arquivo muito grande',
            description: `O arquivo ${file.name} excede o tamanho máximo de ${Math.round(maxSize / 1024 / 1024)}MB`,
            variant: 'destructive'
          });
          continue;
        }

        // Validar tipo do arquivo
        const fileType = file.type;
        const acceptedTypesArray = acceptedTypes.split(',').map(type => type.trim());
        const isAccepted = acceptedTypesArray.some(type => {
          if (type.endsWith('/*')) {
            return fileType.startsWith(type.replace('/*', '/'));
          }
          return fileType === type;
        });

        if (!isAccepted) {
          toast({
            title: 'Tipo de arquivo não permitido',
            description: `O arquivo ${file.name} não é do tipo permitido`,
            variant: 'destructive'
          });
          continue;
        }

        // Criar URL de preview para imagens
        let previewUrl = null;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        const fileData = {
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl
        };

        onFileSelect(fileData);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: 'Erro ao processar arquivo',
        description: 'Ocorreu um erro ao processar o arquivo selecionado',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Limpar o input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const event = {
        target: { files }
      };
      handleFileChange(event);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return '🖼️';
    } else if (fileType === 'application/pdf') {
      return '📄';
    }
    return '📁';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Área de Upload */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          "bg-muted/50 hover:bg-muted/80"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isUploading ? (
            <>
              <Loader2 className="w-8 h-8 mb-4 text-primary animate-spin" />
              <p className="mb-2 text-sm text-muted-foreground">Processando arquivo...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">{placeholder}</span>
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={acceptedTypes}
          multiple={multiple}
          disabled={disabled || isUploading}
        />
      </div>

      {/* Lista de Arquivos */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Arquivos anexados:</Label>
          <div className="space-y-2">
            {existingFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file.type || 'application/octet-stream')}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name || file.original_name || `Arquivo ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size || 0)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {file.url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {onFileRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
