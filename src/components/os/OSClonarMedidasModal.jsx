import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ruler, Check } from 'lucide-react';
import { safeParseFloat } from '@/lib/utils';

const OSClonarMedidasModal = ({ 
  open, 
  onClose, 
  itens, 
  itemOrigem, 
  onConfirmarClonagem 
}) => {
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Filtrar apenas itens do tipo m² que tenham medidas válidas
  const itensComMedidas = useMemo(() => {
    return itens.filter(item => {
      // Apenas itens m²
      if (item.tipo_item !== 'm2') return false;
      
      // Não incluir o item de origem
      if (item.id_item_os === itemOrigem?.id_item_os) return false;
      
      // Verificar se tem medidas válidas
      const largura = safeParseFloat(item.largura, 0);
      const altura = safeParseFloat(item.altura, 0);
      
      return largura > 0 && altura > 0;
    });
  }, [itens, itemOrigem]);

  const handleConfirmar = () => {
    if (itemSelecionado && itemOrigem) {
      onConfirmarClonagem(itemOrigem, itemSelecionado);
      setItemSelecionado(null);
      onClose();
    }
  };

  const handleCancelar = () => {
    setItemSelecionado(null);
    onClose();
  };

  const getItemNome = (item) => {
    if (!item) return 'Item não selecionado';
    return item.nome_servico_produto || item.nome_produto || 'Item sem nome';
  };

  const formatarMedidas = (item) => {
    if (!item) return 'N/A';
    const largura = safeParseFloat(item.largura, 0);
    const altura = safeParseFloat(item.altura, 0);
    const larguraCm = Math.round(largura * 100);
    const alturaCm = Math.round(altura * 100);
    return `${larguraCm}cm x ${alturaCm}cm`;
  };

  // Não renderizar se não houver item de origem
  if (!itemOrigem) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleCancelar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-500" />
            Clonar Medidas
          </DialogTitle>
          <DialogDescription>
            Selecione o item que terá as medidas clonadas do item "{getItemNome(itemOrigem)}".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do item origem */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Medidas a serem clonadas:
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {getItemNome(itemOrigem)} - {formatarMedidas(itemOrigem)}
            </p>
          </div>

          {/* Lista de itens disponíveis */}
          {itensComMedidas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum item disponível para clonagem.</p>
              <p className="text-xs mt-2">
                Adicione mais itens do tipo m² com medidas válidas.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Selecione o item que receberá as medidas:</p>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {itensComMedidas.map((item) => {
                      const isSelected = itemSelecionado?.id_item_os === item.id_item_os;
                      return (
                        <button
                          key={item.id_item_os}
                          onClick={() => setItemSelecionado(item)}
                          className={`w-full p-3 text-left border rounded-lg transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{getItemNome(item)}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Medidas atuais: {formatarMedidas(item)}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-blue-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={handleCancelar}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleConfirmar} 
                  disabled={!itemSelecionado}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Clonar Medidas
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OSClonarMedidasModal;

