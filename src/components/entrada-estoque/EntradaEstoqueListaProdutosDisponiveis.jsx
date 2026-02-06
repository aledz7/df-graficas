import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, ChevronDown, ChevronRight, Palette } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const EntradaEstoqueListaProdutosDisponiveis = ({ filteredProdutos, handleAddItem }) => {
  const [expandedProducts, setExpandedProducts] = useState({});

  const toggleExpand = (produtoId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [produtoId]: !prev[produtoId]
    }));
  };

  const handleAddVariacao = (produto, variacao) => {
    // Adiciona o item com informações da variação
    handleAddItem(produto, variacao);
  };

  return (
    <ScrollArea className="h-64 border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="w-24 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProdutos.map(produto => {
            const temVariacoes = produto.variacoes_ativa && produto.variacoes && produto.variacoes.length > 0;
            const isExpanded = expandedProducts[produto.id];

            return (
              <React.Fragment key={produto.id}>
                <TableRow className={temVariacoes ? 'cursor-pointer hover:bg-muted/50' : ''}>
                  <TableCell onClick={() => temVariacoes && toggleExpand(produto.id)}>
                    <div className="flex items-center gap-2">
                      {temVariacoes && (
                        <span className="text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </span>
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {produto.nome}
                          {temVariacoes && (
                            <Badge variant="secondary" className="text-xs">
                              <Palette className="h-3 w-3 mr-1" />
                              {produto.variacoes.length} var.
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cód: {produto.codigo_produto} | Estoque: {produto.estoque || 0}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {!temVariacoes ? (
                      <Button size="sm" variant="outline" onClick={() => handleAddItem(produto)}>
                        <PlusCircle className="mr-1 h-4 w-4" /> Add
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => toggleExpand(produto.id)}>
                        {isExpanded ? 'Fechar' : 'Ver Variações'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Variações expandidas */}
                {temVariacoes && isExpanded && produto.variacoes.map((variacao, index) => (
                  <TableRow key={`${produto.id}-var-${variacao.id || index}`} className="bg-muted/30">
                    <TableCell className="pl-10">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border flex items-center justify-center bg-white">
                          {variacao.imagem_url ? (
                            <img 
                              src={variacao.imagem_url.startsWith('http') || variacao.imagem_url.startsWith('data:') 
                                ? variacao.imagem_url 
                                : `${import.meta.env.VITE_API_URL || ''}/storage/${variacao.imagem_url}`} 
                              alt="" 
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Palette className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {variacao.nome || `Variação ${index + 1}`}
                            {variacao.cor && <span className="text-muted-foreground ml-1">({variacao.cor})</span>}
                            {variacao.tamanho && <span className="text-muted-foreground ml-1">- {variacao.tamanho}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Estoque: {variacao.estoque_var || 0}
                            {variacao.codigo_barras && ` | Cód: ${variacao.codigo_barras}`}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleAddVariacao(produto, variacao)}>
                        <PlusCircle className="mr-1 h-4 w-4" /> Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            );
          })}
          {filteredProdutos.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center h-24">Nenhum produto encontrado.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default EntradaEstoqueListaProdutosDisponiveis;