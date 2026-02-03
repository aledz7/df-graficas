import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';

const EnvelopamentoVariationsModal = ({ 
  isOpen, 
  onClose, 
  produto, 
  onSelectVariacao,
  getNomeVariacao = (id, tipo) => `${tipo} ${id}` // Função padrão para nomes de variação
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrar variações baseado no termo de busca
  const filteredVariacoes = useMemo(() => {
    if (!produto?.variacoes || !Array.isArray(produto.variacoes)) {
      return [];
    }
    
    // Mostrar todas as variações (incluindo as sem estoque para permitir visualização)
    const variacoesParaMostrar = produto.variacoes;
    
    if (!searchTerm.trim()) return variacoesParaMostrar;
    
    return variacoesParaMostrar.filter(variacao => {
      const nomeVariacao = variacao.nome || '';
      const nomeCor = getNomeVariacao(variacao.cor, 'cor') || '';
      const nomeTamanho = getNomeVariacao(variacao.tamanho, 'tamanho') || '';
      const codigoBarras = variacao.codigo_barras || '';
      const sku = variacao.sku || '';
      
      // Busca mais abrangente: nome, cor, tamanho, código de barras, SKU
      const textoCompleto = `${nomeVariacao} ${nomeCor} ${nomeTamanho} ${codigoBarras} ${sku}`.toLowerCase();
      const termoBusca = searchTerm.toLowerCase().trim();
      
      return textoCompleto.includes(termoBusca);
    });
  }, [produto?.variacoes, searchTerm, getNomeVariacao]);

  const handleSelectVariacao = (variacao) => {
    const estoqueVariacao = parseFloat(variacao.estoque_var || 0);
    
    // Verificar se há estoque para a variação
    if (estoqueVariacao <= 0) {
      // Ainda permitir seleção, mas com aviso
      console.warn('Variação sem estoque selecionada:', variacao);
    }

    // Preparar dados da variação para o envelopamento
    const variacaoParaEnvelopamento = {
      ...produto,
      variacaoSelecionada: {
        id: variacao.id,
        nome: variacao.nome || `${getNomeVariacao(variacao.cor, 'cor')} / ${getNomeVariacao(variacao.tamanho, 'tamanho')}`,
        cor: variacao.cor,
        tamanho: variacao.tamanho,
        estoque_var: estoqueVariacao,
        preco_var: variacao.preco_var,
        sku: variacao.sku,
        codigo_barras: variacao.codigo_barras,
        imagem: variacao.imagem_url || variacao.imagem,
        imagem_url: variacao.imagem_url || variacao.imagem
      },
      // Sobrescrever estoque e preço com os da variação
      estoque: estoqueVariacao,
      estoqueDisponivel: estoqueVariacao,
      preco_venda: parseFloat(variacao.preco_var || produto.preco_venda || 0),
      preco_m2: parseFloat(variacao.preco_var || produto.preco_m2 || 0)
    };

    onSelectVariacao(variacaoParaEnvelopamento);
    onClose();
  };

  if (!produto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Variação - {produto.nome}</DialogTitle>
          <DialogDescription>
            Escolha uma variação específica deste produto para o envelopamento.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar variação por nome, cor, tamanho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <ScrollArea className="flex-grow mt-4">
          {filteredVariacoes.length > 0 ? (
            <div className="space-y-3">
              {filteredVariacoes.map((variacao, index) => {
                const estoqueVariacao = parseFloat(variacao.estoque_var || 0);
                const precoVariacao = parseFloat(variacao.preco_var || produto.preco_venda || 0);
                const semEstoque = estoqueVariacao <= 0;
                
                return (
                  <Card 
                    key={variacao.id || index} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      semEstoque ? 'opacity-60 border-red-200' : 'hover:border-blue-300'
                    }`}
                    onClick={() => handleSelectVariacao(variacao)}
                  >
                    <div className="p-4 flex items-center space-x-4">
                      {/* Imagem da variação ou do produto */}
                      <div className="flex-shrink-0">
                        {(variacao.imagem_url || variacao.imagem || produto.imagem_principal) ? (
                          <img
                            src={getImageUrl(variacao.imagem_url || variacao.imagem || produto.imagem_principal)}
                            alt={variacao.nome || produto.nome}
                            className="w-16 h-16 object-contain rounded border bg-gray-50"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-16 h-16 flex items-center justify-center bg-gray-100 rounded border';
                              fallback.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"></path></svg>';
                              e.target.parentElement.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      
                      {/* Informações da variação */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {variacao.nome || `${getNomeVariacao(variacao.cor, 'cor')} / ${getNomeVariacao(variacao.tamanho, 'tamanho')}`}
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p className={semEstoque ? 'text-red-500 font-medium' : ''}>
                            Estoque: {estoqueVariacao} {produto.unidade_medida}
                            {semEstoque && ' (SEM ESTOQUE)'}
                          </p>
                          {variacao.cor && (
                            <p>Cor: {getNomeVariacao(variacao.cor, 'cor')}</p>
                          )}
                          {variacao.tamanho && (
                            <p>Tamanho: {getNomeVariacao(variacao.tamanho, 'tamanho')}</p>
                          )}
                          {variacao.sku && (
                            <p>SKU: {variacao.sku}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Preço */}
                      <div className="flex-shrink-0 text-right">
                        <p className="font-semibold text-green-600">
                          R$ {precoVariacao.toFixed(2)}
                        </p>
                        {semEstoque && (
                          <p className="text-xs text-red-500 font-medium">Sem estoque</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
              <Package size={48} className="mb-4" />
              <p>
                {searchTerm.trim() 
                  ? 'Nenhuma variação encontrada para sua busca.' 
                  : 'Nenhuma variação disponível para este produto.'
                }
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnvelopamentoVariationsModal;
