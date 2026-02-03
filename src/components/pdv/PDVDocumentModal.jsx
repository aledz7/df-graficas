import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText, RotateCcw, Download, MessageSquare, ShoppingBag, Wrench as Tool, Layers, ImageIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { getImageUrl } from '@/lib/imageUtils';
import { apiDataManager } from '@/lib/apiDataManager';

const PDVDocumentModal = ({ 
  isOpen, 
  setIsOpen, 
  documentRef, 
  documentData, 
  logoUrl, 
  nomeEmpresa, 
  handleGerarPdfDocumento, 
  handleImpressaoDocumento, 
  handleNovoPedido 
}) => {
  if (!documentData) return null;

  const theme = {
    fontFamily: "Inter, sans-serif",
    primaryColor: "#F97316",
    secondaryColor: "#4B5563",
    borderColor: "#D1D5DB",
    textColor: "#1F2937",
    backgroundColor: "#FFFFFF", 
    highlightColor: "#F3F4F6",
  };

  const formaPagamentoIcones = {
    Pix: '📱', Dinheiro: '💵', 'Cartão Débito': '💳', 'Cartão Crédito': '💳', Crediário: '🗓️',
  };

  const tipoDocumentoDisplay = documentData.tipo === 'orcamento' ? 'ORÇAMENTO' : 'RECIBO DE SERVIÇO';
  const validadeOrcamento = documentData.tipo === 'orcamento' ? format(addDays(new Date(documentData.data), 5), 'dd/MM/yyyy') : null;
  const clienteNomeDisplay = documentData.clienteNome || 'Cliente Avulso';

  const formatCurrency = (value) => {
    const val = parseFloat(value);
    return isNaN(val) ? 'R$ 0,00' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  // Função para formatar quantidade removendo zeros desnecessários
  const formatarQuantidade = (quantidade) => {
    if (quantidade === null || quantidade === undefined) return '1';
    const num = parseFloat(quantidade);
    if (isNaN(num)) return '1';
    
    // Se for inteiro, retornar sem decimais (preserva números grandes como 2000)
    if (num % 1 === 0) {
      return num.toString();
    }
    
    // Para decimais, remover apenas zeros à direita desnecessários
    // Ex: 2.5 → "2.5", 2.50 → "2.5", 2.500 → "2.5"
    return num.toString().replace(/\.?0+$/, '');
  };
  
  const getSubtotalItem = (item) => {
    const preco = parseFloat(item.preco_unitario || 0);
    const qtd = parseInt(item.quantidade || 0);
    return preco * qtd;
  };

  const getDescontoAplicado = () => {
    const subtotal = parseFloat(documentData.subtotal || 0);
    const tipoDesconto = documentData.descontoTipo;
    const valorDesconto = parseFloat(documentData.descontoValor || 0);

    if (tipoDesconto === 'percent') {
      return subtotal * (valorDesconto / 100);
    }
    return valorDesconto;
  };

  const inferItemType = (item) => {
    if (item.tipo) return item.tipo;
    if (item.peça && item.medidas) return "envelopamento";
    if (item.altura && item.largura && item.valor_unitario_m2) return "os";
    return "produto";
  };

  const itensProdutos = documentData.itens.filter(item => inferItemType(item) === 'produto');
  const itensOS = documentData.itens.filter(item => inferItemType(item) === 'os');
  const itensEnvelopamento = documentData.itens.filter(item => inferItemType(item) === 'envelopamento');

  const renderSectionTitle = (title, icon) => (
    <div className="flex items-center text-xl font-semibold mb-3 pb-1" style={{ borderBottom: `1px solid ${theme.borderColor}`, color: theme.primaryColor }}>
      {icon}
      <h2 className="ml-2">{title}</h2>
    </div>
  );

  const [dadosEmpresa, setDadosEmpresa] = React.useState({});
  
  React.useEffect(() => {
    const loadEmpresaData = async () => {
      try {
        const data = await apiDataManager.getItem('empresaSettings');
        setDadosEmpresa(JSON.parse(data || '{}'));
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
        setDadosEmpresa({});
      }
    };
    loadEmpresaData();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0" style={{ fontFamily: theme.fontFamily }}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle style={{ color: theme.primaryColor }} className="text-2xl font-bold">
            {tipoDocumentoDisplay} - {dadosEmpresa.nome_fantasia || dadosEmpresa.nomeFantasia || nomeEmpresa}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div ref={documentRef} className="p-8 printable-content min-w-[794px]" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
            
            <header className="flex justify-between items-start pb-6 mb-6" style={{ borderBottom: `2px solid ${theme.borderColor}` }}>
              <div className="max-w-[60%]">
                {logoUrl ? (
                  <img  src={logoUrl} alt="Logo Empresa" className="h-20 mb-2 object-contain" />
                ) : (
                  (dadosEmpresa.nome_fantasia || dadosEmpresa.nomeFantasia) && <h1 className="text-2xl font-bold mb-2" style={{ color: theme.primaryColor }}>{dadosEmpresa.nome_fantasia || dadosEmpresa.nomeFantasia}</h1>
                )}
                <h1 className="text-2xl font-bold" style={{ color: theme.primaryColor }}>{dadosEmpresa.nome_fantasia || dadosEmpresa.nomeFantasia || nomeEmpresa}</h1>
                <p className="text-xs" style={{color: theme.secondaryColor}}>{dadosEmpresa.enderecoCompleto}</p>
                <p className="text-xs" style={{color: theme.secondaryColor}}>CNPJ: {dadosEmpresa.cnpj} | Tel: {dadosEmpresa.telefone}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold" style={{ color: theme.primaryColor }}>{tipoDocumentoDisplay} Nº: {documentData.id}</p>
                <p className="text-sm">Data: {format(new Date(documentData.data), 'dd/MM/yyyy HH:mm')}</p>
                {documentData.vendedor_nome && <p className="text-sm mt-1">Vendedor(a): <span className="font-medium">{documentData.vendedor_nome}</span></p>}
                {documentData.tipo === 'orcamento' && validadeOrcamento && (
                    <p className="text-sm font-medium">Validade: {validadeOrcamento}</p>
                )}
              </div>
            </header>

            <section className="mb-6 p-3 rounded" style={{border: `1px solid ${theme.borderColor}`, backgroundColor: theme.highlightColor}}>
                <h3 className="text-md font-semibold mb-1" style={{color: theme.primaryColor}}>CLIENTE</h3>
                <p className="text-sm">{clienteNomeDisplay}</p>
            </section>

            {itensProdutos.length > 0 && (
              <section className="mb-6">
                {renderSectionTitle("PRODUTOS", <ShoppingBag size={20} />)}
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: theme.highlightColor }}>
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold w-16">Imagem</th>
                      <th className="text-left py-2 px-3 font-semibold">Nome</th>
                      <th className="text-center py-2 px-3 font-semibold">Qtd</th>
                      <th className="text-right py-2 px-3 font-semibold">Valor Unit.</th>
                      <th className="text-right py-2 px-3 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensProdutos.map((item, index) => (
                      <tr key={`prod-${index}`} className="border-b" style={{ borderColor: theme.borderColor }}>
                        <td className="py-2 px-3">
                          <div className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded bg-gray-50">
                            {getImageUrl(item.imagem_principal) ? (
                              <img 
                                src={getImageUrl(item.imagem_principal)} 
                                alt={item.nome || 'Produto'} 
                                className="w-full h-full object-contain rounded"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <ImageIcon size={16} className="text-gray-400" style={getImageUrl(item.imagem_principal) ? { display: 'none' } : {}} />
                          </div>
                        </td>
                        <td className="py-2 px-3">{item.nome || 'Produto não especificado'} {item.variacao?.nome ? `(${item.variacao.nome})` : ''}</td>
                        <td className="text-center py-2 px-3">{formatarQuantidade(item.quantidade)}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(item.preco_unitario)}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(getSubtotalItem(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {itensOS.length > 0 && (
              <section className="mb-6">
                {renderSectionTitle("SERVIÇOS / ORDEM DE SERVIÇO", <Tool size={20} />)}
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: theme.highlightColor }}>
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold">Nome Serviço</th>
                      <th className="text-center py-2 px-3 font-semibold">Área (m²)</th>
                      <th className="text-right py-2 px-3 font-semibold">Valor/m²</th>
                      <th className="text-center py-2 px-3 font-semibold">Qtd</th>
                      <th className="text-right py-2 px-3 font-semibold">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensOS.map((item, index) => {
                      const area = (parseFloat(item.altura || 0) * parseFloat(item.largura || 0)).toFixed(2);
                      return (
                        <tr key={`os-${index}`} className="border-b" style={{ borderColor: theme.borderColor }}>
                          <td className="py-2 px-3">{item.servico_manual || item.nome || 'Serviço OS'}</td>
                          <td className="text-center py-2 px-3">{area}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(item.valor_unitario_m2)}</td>
                          <td className="text-center py-2 px-3">{formatarQuantidade(item.quantidade)}</td>
                          <td className="text-right py-2 px-3">{formatCurrency(getSubtotalItem(item))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {itensEnvelopamento.length > 0 && (
              <section className="mb-6">
                {renderSectionTitle("ENVELOPAMENTO", <Layers size={20} />)}
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: theme.highlightColor }}>
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold">Peça</th>
                      <th className="text-left py-2 px-3 font-semibold">Medidas</th>
                      <th className="text-center py-2 px-3 font-semibold">Área</th>
                      <th className="text-left py-2 px-3 font-semibold">Acabamento</th>
                      <th className="text-right py-2 px-3 font-semibold">Total Item</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensEnvelopamento.map((item, index) => (
                      <tr key={`env-${index}`} className="border-b" style={{ borderColor: theme.borderColor }}>
                        <td className="py-2 px-3">{item.peça || 'Peça não especificada'}</td>
                        <td className="py-2 px-3">{item.medidas || '-'}</td>
                        <td className="text-center py-2 px-3">{item.area ? `${item.area} m²` : '-'}</td>
                        <td className="py-2 px-3">{item.acabamento || '-'}</td>
                        <td className="text-right py-2 px-3">{formatCurrency(item.total_item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            
            {documentData.obs_pedido && (
              <section className="mb-6">
                <h3 className="text-md font-semibold mb-1" style={{ color: theme.primaryColor }}>Observações Gerais</h3>
                <p className="text-sm p-3 rounded" style={{ backgroundColor: theme.highlightColor, border: `1px solid ${theme.borderColor}` }}>{documentData.obs_pedido}</p>
              </section>
            )}

            <section className="mb-6">
              <h3 className="text-xl font-semibold mb-3 pb-1" style={{ borderBottom: `1px solid ${theme.borderColor}`, color: theme.primaryColor }}>Resumo Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {documentData.pagamentos && documentData.pagamentos.length > 0 && (
                    <>
                      <h4 className="font-medium mb-1 text-sm">Formas de Pagamento:</h4>
                      <ul className="list-none pl-0 space-y-1 text-xs">
                        {documentData.pagamentos.map((p, i) => (
                          <li key={i} className="flex items-center">
                            <span className="mr-1">{formaPagamentoIcones[p.metodo]}</span> {p.metodo}: {formatCurrency(p.valorFinal || p.valor)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
                <div className="space-y-1 text-sm p-3 rounded" style={{ backgroundColor: theme.highlightColor, border: `1px solid ${theme.borderColor}` }}>
                  <div className="flex justify-between"><span>Subtotal Geral:</span><span className="font-medium">{formatCurrency(documentData.subtotal)}</span></div>
                  {parseFloat(documentData.descontoValor || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Desconto Aplicado:</span>
                      <span className="font-medium" style={{color: theme.primaryColor}}>- {formatCurrency(getDescontoAplicado())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1" style={{ borderTop: `1px dashed ${theme.borderColor}`, color: theme.primaryColor }}>
                    <span>TOTAL FINAL:</span><span>{formatCurrency(documentData.total)}</span>
                  </div>
                  <div className="flex justify-between"><span>Total Pago:</span><span className="font-medium">{formatCurrency(documentData.pagamentos.reduce((acc, p) => acc + parseFloat(p.valorFinal || p.valor || 0), 0))}</span></div>
                  {parseFloat(documentData.saldo_pendente || 0) > 0 && (
                    <div className="flex justify-between font-bold" style={{ color: theme.primaryColor }}>
                      <span>Saldo Pendente:</span><span>{formatCurrency(documentData.saldo_pendente)}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <footer className="pt-6 mt-6 text-xs" style={{ borderTop: `2px solid ${theme.borderColor}` }}>
              <div className="mt-12 mb-6">
                <div className="w-3/4 md:w-1/2 mx-auto" style={{ borderTop: `1px solid ${theme.textColor}` }}></div>
                <p className="text-center mt-1 text-sm">Assinatura do Cliente</p>
              </div>
              <p className="text-center text-gray-500">{dadosEmpresa.mensagemPersonalizadaRodape || `Obrigado pela preferência! | ${dadosEmpresa.nome_fantasia || dadosEmpresa.nomeFantasia || nomeEmpresa} - ${new Date().getFullYear()}`}</p>
            </footer>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-3 border-t gap-2 sm:justify-end" style={{ backgroundColor: theme.highlightColor }}>
          <Button variant="outline" onClick={handleGerarPdfDocumento} style={{borderColor: theme.primaryColor, color: theme.primaryColor}} className="hover:bg-orange-50">
            <Download size={16} className="mr-2"/> Baixar PDF
          </Button>
          <Button variant="outline" onClick={handleImpressaoDocumento} style={{borderColor: theme.primaryColor, color: theme.primaryColor}} className="hover:bg-orange-50">
            <Printer size={16} className="mr-2"/> Imprimir
          </Button>
          <Button variant="outline" disabled style={{borderColor: theme.primaryColor, color: theme.primaryColor, opacity: 0.7}} className="hover:bg-orange-50">
            <MessageSquare size={16} className="mr-2"/> WhatsApp
          </Button>
          <DialogClose asChild>
            <Button onClick={handleNovoPedido} style={{ backgroundColor: theme.primaryColor }} className="text-white hover:opacity-90">
                <RotateCcw size={16} className="mr-2"/> Novo Pedido
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDVDocumentModal;