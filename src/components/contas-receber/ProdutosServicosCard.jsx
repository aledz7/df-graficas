import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ShoppingCart, Package, Wrench, ImageIcon, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { contaReceberService } from '@/services/api';

const ProdutosServicosCard = ({ conta, isOpen, onClose }) => {
  const [dadosCompletos, setDadosCompletos] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estados para observações dos itens
  const [observacaoModalOpen, setObservacaoModalOpen] = useState(false);
  const [observacaoSelecionada, setObservacaoSelecionada] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState(null);

  useEffect(() => {
    if (isOpen && conta?.id) {
      carregarDadosCompletos();
    }
  }, [isOpen, conta]);

  // Função para abrir modal de observações
  const abrirModalObservacao = (item) => {
    const observacao = item.observacoes || item.observacao_item || item.observacao || item.obs || '';
    setObservacaoSelecionada(observacao);
    setItemSelecionado(item);
    setObservacaoModalOpen(true);
  };

  const carregarDadosCompletos = async () => {
    if (!conta?.id) return;
    
    setLoading(true);
    try {
      const response = await contaReceberService.getById(conta.id);
      if (response?.data) {
        setDadosCompletos(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados completos da conta:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !conta) return null;

  // Usar a mesma lógica do recibo para mapear os itens
  const mapItensParaExibicao = (dadosCompletos) => {
    if (!dadosCompletos) return [];
    
    // Normalizar estrutura da resposta da API (mesma lógica do recibo)
    const base = dadosCompletos?.data ? dadosCompletos.data : dadosCompletos;
    
    // Itens - buscar na estrutura correta (mesma lógica do recibo)
    const itensFonte = Array.isArray(base.itens_venda) ? base.itens_venda : [];
    
    return itensFonte.map(item => {
      const observacoes = item.observacoes || item.observacao_item || item.observacao || item.obs || item.dados_adicionais?.observacoes || item.detalhes?.observacao_item || '';
      
      return {
        id_produto: item.produto_id || item.id_produto,
        nome: item.produto_nome || item.nome || item?.produto?.nome || 'Produto não especificado',
        preco_venda_unitario: parseFloat(item.valor_unitario || item.preco_venda_unitario || 0),
        preco_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
        quantidade: parseFloat(item.quantidade || 1),
        variacao: item.dados_adicionais?.variacao || item.variacao || null,
        imagem_principal: item.dados_adicionais?.imagem_principal || item.imagem_principal || item?.produto?.imagem_principal || null,
        observacoes: observacoes,
        tipo_item: item.tipo_item || 'produto',
        largura: item.largura || null,
        altura: item.altura || null,
        acabamentos: item.acabamentos || null,
        detalhes: item.detalhes || item.produto_descricao || null,
      };
    });
  };
  
  const itens = mapItensParaExibicao(dadosCompletos);

  if (loading) {
    return (
      <Card className="mb-6"> 
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart size={20} className="mr-2" />
            Produtos e Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Carregando produtos e serviços...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (itens.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart size={20} className="mr-2" />
            Produtos e Serviços
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package size={48} className="mx-auto mb-4 text-muted-foreground/50" />
            <p>Nenhum produto ou serviço encontrado para esta conta.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart size={20} className="mr-2" />
            Produtos e Serviços ({itens.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Imagem</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[120px]">Dimensões</TableHead>
                  <TableHead className="w-[150px]">Observações</TableHead>
                  <TableHead className="w-[100px]">Qtd.</TableHead>
                  <TableHead className="w-[100px] text-right">Preço Un.</TableHead>
                  <TableHead className="w-[100px] text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item, index) => (
                  <TableRow key={`prod-${index}`} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="w-12 h-12 flex items-center justify-center border border-border rounded-md bg-muted/20">
                        {(() => {
                          const imageUrl = getImageUrl(item.imagem_principal);
                          
                          if (imageUrl) {
                            return (
                              <>
                                <img 
                                  src={imageUrl} 
                                  alt={item.nome || 'Produto'} 
                                  className="w-full h-full object-contain rounded-md"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallbackIcon = e.target.parentElement.querySelector('.fallback-icon');
                                    if (fallbackIcon) {
                                      fallbackIcon.style.display = 'flex';
                                    }
                                  }}
                                />
                                <ImageIcon size={20} className="text-gray-400 fallback-icon" style={{ display: 'none' }} />
                              </>
                            );
                          } else {
                            return <ImageIcon size={20} className="text-gray-400" />;
                          }
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.tipo_item === 'servico' ? 'default' : 'secondary'}
                        className={item.tipo_item === 'servico' 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }
                      >
                        {item.tipo_item === 'servico' ? (
                          <><Wrench size={12} className="mr-1" />SERVIÇO</>
                        ) : (
                          <><Package size={12} className="mr-1" />PRODUTO</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{item.nome}</div>
                        {item.variacao?.nome && (
                          <div className="text-xs text-muted-foreground">
                            Variação: {item.variacao.nome}
                          </div>
                        )}
                        {item.detalhes && (
                          <div className="text-xs text-muted-foreground italic">
                            {item.detalhes}
                          </div>
                        )}
                        {item.acabamentos && (
                          <div className="text-xs text-muted-foreground">
                            Acabamentos: {item.acabamentos}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.largura && item.altura ? (
                          <span>{item.largura} x {item.altura} cm</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {item.observacoes && item.observacoes.trim() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalObservacao(item)}
                          className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                          <Eye size={14} className="text-blue-600 dark:text-blue-400" />
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{item.quantidade}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(item.preco_venda_unitario)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-semibold text-primary">
                        {formatCurrency(item.preco_venda_unitario * item.quantidade)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Resumo total */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total dos Itens:</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(itens.reduce((acc, item) => acc + (item.preco_venda_unitario * item.quantidade), 0))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Observações do Item */}
      <Dialog open={observacaoModalOpen} onOpenChange={setObservacaoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye size={18} className="mr-2 text-blue-600" />
              Observações do Item
            </DialogTitle>
            <DialogDescription>
              {itemSelecionado?.nome || 'Item sem nome'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {observacaoSelecionada ? (
              <div className="bg-muted/20 p-4 rounded-md border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {observacaoSelecionada}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Eye size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                <p>Nenhuma observação encontrada para este item.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObservacaoModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProdutosServicosCard;
