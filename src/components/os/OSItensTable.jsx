import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, ImageOff, FileText, Copy } from 'lucide-react';
import { getImageUrl } from '@/lib/imageUtils';
import { Badge } from '@/components/ui/badge';
import { safeParseFloat } from '@/lib/utils';

// Função auxiliar para garantir que um item tenha um id_item_os único
const garantirIdItemOS = (item) => {
  if (!item.id_item_os || item.id_item_os === null || item.id_item_os === undefined) {
    const novoId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.warn('⚠️ [OSItensTable] Item sem id_item_os, gerando novo:', {
      itemNome: item.nome_servico_produto || item.nome_produto,
      novoId
    });
    return { ...item, id_item_os: novoId };
  }
  return item;
};

// Função otimizada movida para fora do componente para evitar recriações
const getItemDisplayInfo = (item, produtosCadastrados) => {
  let nome = 'Item não especificado';
  // Prioridade: arte final anexada > imagem do produto/variação
  let imagemUrl = null;
  let isPdf = false;

  // 1) Arte final anexada no item (pode ser imagem ou PDF)
  if (item.arquivo_item_url) {
    imagemUrl = item.arquivo_item_url;
    isPdf = (item.arquivo_item_nome || '').toLowerCase().endsWith('.pdf');
  }

  // 2) Fallback para imagem do produto/variação vinculados
  // Tentar extrair do próprio item ou do produto/variação presente no item
  let imagemProdutoFallback = item.imagem_url
    || item.imagem_principal
    || (item.variacao_selecionada && item.variacao_selecionada.imagem_url)
    || (item.produto && (item.produto.imagem_principal || item.produto.imagem_url));

  // Se ainda não houver imagem e temos a lista de produtos cadastrados, buscar por produto_id
  if (!imagemProdutoFallback && Array.isArray(produtosCadastrados) && item.produto_id) {
    const prod = produtosCadastrados.find(p => String(p.id) === String(item.produto_id));
    if (prod) {
      // Priorizar imagem da variação se item possui variacao_selecionada
      let variacaoImg = null;
      if (item.variacao_selecionada?.id_variacao && Array.isArray(prod.variacoes)) {
        const varMatch = prod.variacoes.find(v => String(v.id_variacao) === String(item.variacao_selecionada.id_variacao));
        variacaoImg = varMatch?.imagem_url || varMatch?.imagem || null;
      }
      imagemProdutoFallback = variacaoImg || prod.imagem_principal || prod.imagem_url || prod.imagem;
    }
  }

  if (!imagemUrl && imagemProdutoFallback) {
    imagemUrl = imagemProdutoFallback;
    isPdf = false;
  }

  if (item.tipo_item === 'm2') {
    nome = item.nome_servico_produto || 'Serviço M²';
  } else if (item.tipo_item === 'unidade') {
    nome = item.nome_produto || item.nome_servico_produto || 'Produto Unidade';
  }

  return { nome, imagemUrl, isPdf };
};

const OSItensTable = ({ itens, onRemoveItem, onEditItem, onDuplicateItem, isOSFinalizada, viewOnly, produtosCadastrados }) => {
  const isDisabled = isOSFinalizada || viewOnly;


  // Memoizar os itens processados para evitar recálculos desnecessários
  const itensProcessados = useMemo(() => {
    return itens.map((item, index) => {
      // Garantir que o item tenha um id_item_os antes de processar
      const itemComId = garantirIdItemOS(item);
      const { nome, imagemUrl, isPdf } = getItemDisplayInfo(itemComId, produtosCadastrados);
      const alturaNum = safeParseFloat(itemComId.altura, 0);
      const larguraNum = safeParseFloat(itemComId.largura, 0);
      const alturaEmCm = Math.round(alturaNum * 100).toString();
      const larguraEmCm = Math.round(larguraNum * 100).toString();
      const itemAcabamentosSelecionados = Array.isArray(itemComId.acabamentos_selecionados) ? itemComId.acabamentos_selecionados : [];
      const subtotalExibir = safeParseFloat(itemComId.subtotal_item, 0);
      const consumoPecasPorChapa = Math.max(0, Math.floor(safeParseFloat(itemComId.consumo_pecas_por_chapa, 0)));
      const consumoChapasNecessarias = Math.max(0, Math.ceil(safeParseFloat(itemComId.consumo_chapas_necessarias, 0)));
      const consumoCustoTotal = safeParseFloat(itemComId.consumo_custo_total, 0);
      const consumoCustoUnitario = safeParseFloat(itemComId.consumo_custo_unitario, 0);
      const consumoAproveitamento = safeParseFloat(itemComId.consumo_aproveitamento_percentual, 0);

      const consumoPecasPorChapaDisplay = consumoPecasPorChapa > 0 ? consumoPecasPorChapa.toLocaleString('pt-BR') : null;
      const consumoChapasNecessariasDisplay = consumoChapasNecessarias > 0 ? consumoChapasNecessarias.toLocaleString('pt-BR') : null;
      const consumoCustoTotalDisplay = consumoCustoTotal > 0 ? consumoCustoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
      const consumoCustoUnitarioDisplay = consumoCustoUnitario > 0 ? consumoCustoUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
      const consumoAproveitamentoDisplay = consumoAproveitamento > 0 ? `${consumoAproveitamento.toFixed(2)}%` : null;
      
      return {
        ...itemComId,
        nome,
        imagemUrl,
        isPdf,
        alturaNum,
        larguraNum,
        alturaEmCm,
        larguraEmCm,
        itemAcabamentosSelecionados,
        subtotalExibir,
        consumoPecasPorChapa,
        consumoChapasNecessarias,
        consumoCustoTotal,
        consumoCustoUnitario,
        consumoAproveitamento,
        consumoPecasPorChapaDisplay,
        consumoChapasNecessariasDisplay,
        consumoCustoTotalDisplay,
        consumoCustoUnitarioDisplay,
        consumoAproveitamentoDisplay,
      };
    });
  }, [itens, produtosCadastrados]);

  return (
    <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Itens da Ordem ({itens.length})</CardTitle>
          <CardDescription className="text-xs">Lista de serviços e produtos adicionados.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
            <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[50px] px-2 py-2">Arte</TableHead>
                <TableHead className="px-2 py-2">Descrição</TableHead>
                <TableHead className="px-2 py-2 text-center">Qtd</TableHead>
                <TableHead className="px-2 py-2 text-right">Subtotal</TableHead>
                {!isDisabled && (
                  <TableHead className="w-[100px] px-2 py-2 text-right">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isDisabled ? 5 : 6} className="text-center h-24 text-muted-foreground">
                    Nenhum item adicionado a esta OS.
                  </TableCell>
                </TableRow>
              ) : (
                itensProcessados.map((item, index) => (
                  <TableRow key={item.id_item_os || index}>
                    <TableCell className="px-2 py-1.5">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="cursor-pointer hover:opacity-80 w-10 h-10 flex items-center justify-center border rounded bg-muted/30">
                            {item.imagemUrl && !item.isPdf ? (
                              <img alt={item.nome} src={getImageUrl(item.imagemUrl)} className="w-full h-full object-cover rounded-sm"/>
                            ) : item.imagemUrl && item.isPdf ? (
                              <FileText size={20} className="text-primary" />
                            ) : (
                              <ImageOff size={20} className="text-gray-400 dark:text-gray-500"/>
                            )}
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader><DialogTitle>{item.nome}</DialogTitle></DialogHeader>
                          {item.imagemUrl && !item.isPdf ? (
                              <img alt={item.nome} src={getImageUrl(item.imagemUrl)} className="max-w-full max-h-[60vh] object-contain mx-auto"/>
                          ) : item.imagemUrl && item.isPdf ? (
                              <div className="text-center p-4">
                                  <FileText size={48} className="text-primary mx-auto mb-2" />
                                  <p>Arquivo PDF: {item.arquivo_item_nome || 'arte_final.pdf'}</p>
                                  <a href={item.imagemUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-2 inline-block">Abrir PDF</a>
                              </div>
                          ) : (
                              <p className="text-center p-4">Nenhuma imagem ou arte para este item.</p>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell className="font-medium px-2 py-1.5 text-xs">
                      {item.nome}
                      {item.tipo_item === 'm2' && <p className="text-muted-foreground text-[11px]">{item.larguraEmCm}cm x {item.alturaEmCm}cm (Área: {((item.larguraNum * item.alturaNum) || 0).toFixed(3)}m²)</p>}
                      {item.itemAcabamentosSelecionados.length > 0 && (
                          <p className="text-muted-foreground text-[11px] truncate max-w-[150px]">Acabs: {item.itemAcabamentosSelecionados.map(a => a.nome).join(', ')}</p>
                      )}
                      {item.detalhes && Array.isArray(item.detalhes) && item.detalhes.length > 0 && (
                        <p className="text-muted-foreground text-[11px] truncate max-w-[150px]">
                          Detalhes: {item.detalhes.join(', ')}
                        </p>
                      )}
                      {(item.consumo_material_utilizado || item.consumoChapasNecessariasDisplay || item.consumoCustoTotalDisplay) && (
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {item.consumo_material_utilizado && (
                            <p>Material: {item.consumo_material_utilizado}</p>
                          )}
                          {item.consumoChapasNecessariasDisplay && (
                            <p>
                              Consumo: {item.consumoChapasNecessariasDisplay} chapa(s)
                              {item.consumoPecasPorChapaDisplay ? ` • ${item.consumoPecasPorChapaDisplay} peça(s)/chapa` : ''}
                              {item.consumoAproveitamentoDisplay ? ` • Aproveitamento ${item.consumoAproveitamentoDisplay}` : ''}
                            </p>
                          )}
                          {item.consumoCustoTotalDisplay && (
                            <p>
                              Custo material: {item.consumoCustoTotalDisplay}
                              {item.consumoCustoUnitarioDisplay ? ` (${item.consumoCustoUnitarioDisplay}/peça)` : ''}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center px-2 py-1.5 text-xs">{item.quantidade || 1}</TableCell>
                    <TableCell className="text-right font-semibold px-2 py-1.5 text-xs">R$ {item.subtotalExibir.toFixed(2)}</TableCell>
                    {!isDisabled && (
                      <TableCell className="text-right px-2 py-1.5">
                        <Button variant="ghost" size="icon" onClick={() => onDuplicateItem(item)} className="text-green-500 hover:text-green-600 h-7 w-7 mr-1" title="Duplicar item">
                          <Copy size={14}/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditItem(item)} className="text-blue-500 hover:text-blue-600 h-7 w-7 mr-1" title="Editar item">
                          <Edit size={14}/>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItem(item.id_item_os)} className="text-red-500 hover:text-red-600 h-7 w-7" title="Remover item">
                          <Trash2 size={14}/>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
          {/* Indicador visual de scroll quando há muitos itens */}
          {itens.length > 6 && (
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-background/90 to-transparent pointer-events-none z-20 rounded-b-lg" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OSItensTable;