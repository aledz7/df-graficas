import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Link2, ThumbsUp } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const PartesModalForm = ({
  currentParte,
  setCurrentParte,
  imagemPreview,
  handleImageUpload,
  handleUrlExternaChange,
  handleSaveParte,
  setView,
  manageModeOnly,
  initialParteState,
  setImagemPreview,
  loading
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{currentParte.id ? 'Editar Parte do Catálogo' : 'Nova Parte para Catálogo'}</DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[calc(100vh-250px)] p-1 pr-3">
        <div className="space-y-4">
          <div>
            <Label htmlFor="parte-nome">Nome da Parte</Label>
            <Input
              id="parte-nome"
              value={currentParte.nome}
              onChange={(e) => setCurrentParte(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Lateral Esquerda"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parte-altura">Altura (m)</Label>
              <Input
                id="parte-altura"
                type="number"
                step="0.01"
                min="0"
                value={currentParte.altura}
                onChange={(e) => setCurrentParte(prev => ({ ...prev, altura: e.target.value }))}
                placeholder="Ex: 1.5"
              />
            </div>
            <div>
              <Label htmlFor="parte-largura">Largura (m)</Label>
              <Input
                id="parte-largura"
                type="number"
                step="0.01"
                min="0"
                value={currentParte.largura}
                onChange={(e) => setCurrentParte(prev => ({ ...prev, largura: e.target.value }))}
                placeholder="Ex: 2.0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="parte-imagem">Imagem da Parte</Label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative">
                <Input
                  id="parte-imagem"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('parte-imagem').click()}
                  className="relative"
                  disabled={!!currentParte.imagem_url_externa}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Local
                </Button>
              </div>
              {imagemPreview && (
                <div className="relative w-20 h-20">
                  <img
                    src={imagemPreview.startsWith('blob:') ? imagemPreview : getImageUrl(imagemPreview)}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="parte-imagem-url">Ou URL da Imagem Externa</Label>
            <div className="relative mt-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input 
                id="parte-imagem-url" 
                type="url" 
                placeholder="https://exemplo.com/imagem.jpg" 
                value={currentParte.imagem_url_externa} 
                onChange={handleUrlExternaChange}
                className="pl-10"
                disabled={!!currentParte.imagem} 
              />
            </div>
            {currentParte.imagem && <p className="text-xs text-orange-500 mt-1">Upload local tem prioridade sobre URL externa.</p>}
          </div>
        </div>
      </ScrollArea>
      <DialogFooter className="pt-4 border-t mt-4">
        <Button 
          variant="outline" 
          onClick={() => { 
            setView(manageModeOnly ? 'manage' : 'search'); 
            setCurrentParte(initialParteState); 
            setImagemPreview(null); 
          }}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSaveParte} 
          className="bg-orange-500 hover:bg-orange-600 text-white"
          disabled={loading}
        >
          <ThumbsUp size={18} className="mr-2" /> 
          {loading ? 'Salvando...' : 'Salvar Parte no Catálogo'}
        </Button>
      </DialogFooter>
    </>
  );
};

export default PartesModalForm;