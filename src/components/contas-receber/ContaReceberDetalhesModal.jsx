import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, isValid, addDays } from 'date-fns';
import { Printer, FileText, Percent, DollarSign, ShoppingCart, CalendarDays, User, AlarmClock as ClockIcon, Edit, DivideCircle, Download, Wallet, CheckCircle2, Tag, ImageIcon, CreditCard, Eye } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contaReceberService, vendaService, clienteService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { printElementDirect, generatePdfFromElement } from '@/lib/osDocumentGenerator';

const ContaReceberDetalhesModal = ({ isOpen, onClose, conta, logoUrl, nomeEmpresa, onAplicarJuros, onSalvarConfigJuros }) => {
  const { toast } = useToast();
  const contentRef = useRef(null);
  const [isEdicaoJurosOpen, setIsEdicaoJurosOpen] = useState(false);
  const [dadosCompletos, setDadosCompletos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [configJuros, setConfigJuros] = useState({
    tipo: dadosCompletos?.config_juros?.tipo || 'percentual',
    valor: dadosCompletos?.config_juros?.valor || '',
    data_inicio_cobranca: dadosCompletos?.config_juros?.data_inicio_cobranca ? format(parseISO(dadosCompletos.config_juros.data_inicio_cobranca), 'yyyy-MM-dd') : '',
    frequencia: dadosCompletos?.config_juros?.frequencia || 'unica',
  });
  
  // Estados para o recibo
  const [isReciboOpen, setIsReciboOpen] = useState(false);
  const [documentoRecibo, setDocumentoRecibo] = useState(null);
  const reciboRef = useRef(null);
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [dadosVendaVinculada, setDadosVendaVinculada] = useState(null);
  const [dadosCliente, setDadosCliente] = useState(null);
  
  // Estados para observações dos itens
  const [observacaoModalOpen, setObservacaoModalOpen] = useState(false);
  const [observacaoSelecionada, setObservacaoSelecionada] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // Carregar dados completos da conta
  useEffect(() => {
    if (isOpen && conta) {
      console.log('🔍 [ContaReceberDetalhesModal] Conta recebida no useEffect:', conta);
      console.log('🔍 [ContaReceberDetalhesModal] Observações:', conta.observacoes);
      console.log('🔍 [ContaReceberDetalhesModal] Todas as chaves da conta:', Object.keys(conta || {}));
      console.log('🔍 [ContaReceberDetalhesModal] Valores das chaves relacionadas a observações:');
      console.log('  - observacoes:', conta.observacoes);
      console.log('  - observacao:', conta.observacao);
      console.log('  - obs:', conta.obs);
      console.log('  - descricao:', conta.descricao);
      console.log('  - comentarios:', conta.comentarios);
      console.log('  - nota:', conta.nota);
      carregarDadosCompletos();
      carregarConfiguracoesEmpresa();
      carregarDadosCliente();
      carregarDadosVendaVinculada();
    }
  }, [isOpen, conta]);

  const carregarConfiguracoesEmpresa = async () => {
    try {
      const settingsStr = await apiDataManager.getItem('empresaSettings');
      const settings = settingsStr ? JSON.parse(settingsStr) : {};
      setEmpresaSettings(settings || {});
    } catch (error) {
      console.error('Erro ao carregar configurações da empresa:', error);
      setEmpresaSettings({});
    }
  };

  const carregarDadosCliente = async () => {
    console.log('🔍 [ContaReceberDetalhesModal] Conta recebida:', conta);
    console.log('🔍 [ContaReceberDetalhesModal] Cliente ID:', conta?.cliente_id);
    console.log('🔍 [ContaReceberDetalhesModal] Todas as chaves da conta:', Object.keys(conta || {}));
    
    // Tentar diferentes possíveis chaves para o ID do cliente
    const clienteId = conta?.cliente_id || conta?.clienteId || conta?.cliente?.id;
    console.log('🔍 [ContaReceberDetalhesModal] Cliente ID encontrado:', clienteId);
    
    if (!clienteId) {
      console.log('❌ [ContaReceberDetalhesModal] Nenhum cliente_id encontrado na conta');
      return;
    }
    
    try {
      console.log('🔄 [ContaReceberDetalhesModal] Carregando cliente com ID:', clienteId);
      const response = await clienteService.getById(clienteId);
      console.log('🔍 [ContaReceberDetalhesModal] Resposta da API do cliente:', response);
      
      // A API retorna os dados em response.data conforme visto nos outros componentes
      const cliente = response?.data || response;
      console.log('👤 [ContaReceberDetalhesModal] Dados do cliente extraídos:', cliente);
      setDadosCliente(cliente);
      console.log('✅ [ContaReceberDetalhesModal] Dados do cliente carregados com sucesso');
    } catch (error) {
      console.error('❌ [ContaReceberDetalhesModal] Erro ao carregar dados do cliente:', error);
      setDadosCliente(null);
    }
  };

  const carregarDadosVendaVinculada = async () => {
    const linkedVendaId = conta?.venda_id ?? conta?.vendaId ?? conta?.venda?.id;
    if (!linkedVendaId) return;
    
    try {
      console.log('🔍 [ContaReceberDetalhesModal] Buscando venda com ID:', linkedVendaId);
      const resp = await vendaService.getById(linkedVendaId);
      console.log('📡 [ContaReceberDetalhesModal] Resposta da API:', resp);
      
      // Usar a mesma lógica do PDV histórico
      const raw = resp?.data ?? resp;
      const vendaDetalhada = raw?.data?.data || raw?.data || (raw?.success ? raw?.data : null) || null;
      
      console.log('📋 [ContaReceberDetalhesModal] Venda detalhada:', vendaDetalhada);
      setDadosVendaVinculada(vendaDetalhada);
    } catch (error) {
      console.error('Erro ao carregar dados da venda vinculada:', error);
    }
  };

  const handleImpressaoRecibo = () => {
    if (reciboRef.current) {
      printElementDirect(reciboRef.current, 'Recibo de Conta a Receber');
    }
  };

  const handleGerarPdfRecibo = async () => {
    if (reciboRef.current) {
      try {
        await generatePdfFromElement(reciboRef.current, `recibo-conta-${conta.id}.pdf`);
        toast({
          title: "Sucesso",
          description: "PDF gerado com sucesso!",
        });
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        toast({
          title: "Erro",
          description: "Erro ao gerar PDF. Tente novamente.",
          variant: "destructive"
        });
      }
    }
  };

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
      console.log('🔍 [ContaReceberDetalhesModal] Resposta completa da API:', response);
      console.log('🔍 [ContaReceberDetalhesModal] response.data:', response?.data);
      console.log('🔍 [ContaReceberDetalhesModal] response.data.data:', response?.data?.data);
      
      if (response?.data) {
        // A API retorna { success: true, message: "...", data: {...} }
        // Então os dados estão em response.data.data
        const dados = response.data.data;
        console.log('🔍 [ContaReceberDetalhesModal] Dados extraídos:', dados);
        setDadosCompletos(dados);
        
        // Atualizar configuração de juros com os dados carregados
        if (dados.config_juros) {
        setConfigJuros({
            tipo: dados.config_juros.tipo || 'percentual',
            valor: dados.config_juros.valor || '',
            data_inicio_cobranca: dados.config_juros.data_inicio_cobranca ? 
              format(parseISO(dados.config_juros.data_inicio_cobranca), 'yyyy-MM-dd') : '',
            frequencia: dados.config_juros.frequencia || 'unica',
          });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados completos da conta:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados completos da conta.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerRecibo = () => {
    setIsReciboOpen(true);
  };

  if (!conta) return null;

  // Dados para o recibo
  const historicoPagamentos = Array.isArray(conta.historico_pagamentos) ? conta.historico_pagamentos : [];
  const valorOriginal = parseFloat(conta.valor_original_divida || conta.valor_pendente || 0);
  const jurosAplicados = parseFloat(conta.juros_aplicados || 0);
  const valorTotalDevido = valorOriginal + jurosAplicados;
  const valorPendente = parseFloat(conta.valor_pendente || 0);
  const valorRecebido = valorTotalDevido - valorPendente;

  const settings = empresaSettings || {};
  const nomeEmpresaParaExibir = nomeEmpresa || settings.nomeFantasia || 'JET-IMPRE GESTÃO';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center"><FileText size={24} className="mr-2 text-primary"/>Recibo de Conta a Receber</DialogTitle>
          <DialogDescription>Cliente: {conta.clienteNome}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6">
          <div ref={reciboRef} className="p-4 sm:p-8 bg-card text-card-foreground printable-content w-full sm:w-[794px] mx-auto font-sans text-[10px] sm:text-sm">
            
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6 pb-4 border-b border-border space-y-4 sm:space-y-0">
              <div className="flex-1 sm:max-w-[60%]">
                {logoUrl ? (
                  <img src={getImageUrl(logoUrl)} alt="Logo Empresa" className="h-10 sm:h-12 md:h-16 mb-2 object-contain" />
                ) : (
                  nomeEmpresaParaExibir && <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-2">{nomeEmpresaParaExibir}</h1>
                )}
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-xs text-muted-foreground">{settings.razaoSocial || ''}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground break-words">{settings.enderecoCompleto || ''}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">
                    {settings.cnpj && `CNPJ: ${settings.cnpj}`}
                    {settings.telefone && ` | Tel: ${settings.telefone}`}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground uppercase tracking-wider leading-tight">RECIBO DE CONTA A RECEBER</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">Nº: <span className="font-mono">{conta.id}</span></p>
              </div>
            </header>

            <section className="mb-4 sm:mb-6">
              <h2 className="text-sm sm:text-base font-semibold text-primary mb-1">CLIENTE:</h2>
              <div className="bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                <p className="text-base sm:text-lg font-medium text-foreground">{conta.clienteNome}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">ID da OS: {conta.venda_id || conta.vendaId || conta.venda?.id || conta.os_id || conta.osId || 'N/A'}</p>
                {dadosCliente ? (
                  <div className="mt-2 space-y-1">
                    {dadosCliente.cpf_cnpj && (
                      <p className="text-[9px] sm:text-xs text-muted-foreground">
                        CPF/CNPJ: {dadosCliente.cpf_cnpj}
                      </p>
                    )}
                    {dadosCliente.telefone_principal && (
                      <p className="text-[9px] sm:text-xs text-muted-foreground">
                        Telefone: {dadosCliente.telefone_principal}
                      </p>
                    )}
                    {dadosCliente.email_principal && (
                      <p className="text-[9px] sm:text-xs text-muted-foreground">
                        Email: {dadosCliente.email_principal}
                      </p>
                    )}
                  </div>
                ) : conta?.cliente_id ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] sm:text-xs text-muted-foreground">
                      Carregando dados do cliente... (ID: {conta.cliente_id})
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <p className="text-[9px] sm:text-xs text-muted-foreground">
                      Cliente ID não encontrado na conta
                    </p>
                  </div>
                )}
              </div>
            </section>

            <hr className="my-3 sm:my-4 border-border" />

            {/* OBSERVAÇÕES */}
            {(() => {
              // Buscar observações gerais da OS (não dos itens)
              const observacoesOS = dadosCompletos?.info_adicional?.observacoes;
              const observacoesConta = conta.observacoes || conta.observacao || conta.obs || conta.descricao || conta.comentarios || conta.nota;
              
              console.log('🔍 [ContaReceberDetalhesModal] Debug observações:');
              console.log('  - dadosCompletos:', dadosCompletos);
              console.log('  - dadosCompletos.info_adicional:', dadosCompletos?.info_adicional);
              console.log('  - observacoesOS:', observacoesOS);
              console.log('  - observacoesConta:', observacoesConta);
              
              // Priorizar observações gerais da OS, senão usar as da conta
              const observacoesParaExibir = observacoesOS || observacoesConta;
              
              return observacoesParaExibir ? (
                <>
                  <section className="mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                      <FileText size={18} className="mr-2"/> OBSERVAÇÕES
                    </h2>
                    <div className="bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                      <p className="text-[10px] sm:text-sm text-foreground whitespace-pre-wrap">
                        {observacoesParaExibir}
                      </p>
                    </div>
                  </section>
                  <hr className="my-3 sm:my-4 border-border" />
                </>
              ) : null;
            })()}


            <section className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                <CalendarDays size={18} className="mr-2"/> INFORMAÇÕES DA CONTA
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] sm:text-sm">
                <div className="bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                  <p><strong>Data de Lançamento:</strong> {format(parseISO(conta.dataLancamento), 'dd/MM/yyyy')}</p>
                  <p><strong>Vencimento:</strong> {format(parseISO(conta.vencimento), 'dd/MM/yyyy')}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-1 font-semibold ${
                      conta.status === 'recebido' ? 'text-green-600' : 
                      conta.status === 'vencido' ? 'text-red-600' : 
                      'text-yellow-600'
                    }`}>
                      {conta.status?.toUpperCase() || 'PENDENTE'}
                    </span>
                  </p>
                </div>
                <div className="bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                  <p><strong>Valor Original:</strong> {formatCurrency(valorOriginal)}</p>
                  <p><strong>Juros Aplicados:</strong> {formatCurrency(jurosAplicados)}</p>
                  <p><strong>Valor Total Devido:</strong> {formatCurrency(valorTotalDevido)}</p>
                </div>
              </div>
            </section>

            {(() => {
              // Usar os itens retornados diretamente pelo backend
              const itensFonte = dadosCompletos?.itens_venda || [];
              console.log('🔍 [ContaReceberDetalhesModal] dadosCompletos:', dadosCompletos);
              console.log('🔍 [ContaReceberDetalhesModal] dadosCompletos.itens_venda:', dadosCompletos?.itens_venda);
              console.log('🔍 [ContaReceberDetalhesModal] itensFonte:', itensFonte);
              console.log('🔍 [ContaReceberDetalhesModal] itensFonte.length:', itensFonte.length);
              console.log('🔍 [ContaReceberDetalhesModal] Estrutura completa dos dados:', JSON.stringify(dadosCompletos, null, 2));
              
              const itens = itensFonte.map((item, index) => {
                console.log(`🔍 [DEBUG] Item ${index}:`, {
                  item: item,
                  observacoes: item.observacoes,
                  observacao_item: item.observacao_item,
                  detalhes: item.detalhes,
                  detalhes_observacao: item.detalhes?.observacao_item
                });
                
                const observacoes = item.observacoes || item.observacao_item || item.observacao || item.obs || item.dados_adicionais?.observacoes || item.detalhes?.observacao_item || '';
                
                console.log(`🔍 [DEBUG] Observações finais para item ${index}:`, observacoes);
                
                return {
                  id_produto: item.produto_id || item.id_produto,
                  nome: item.produto_nome || item.nome || 'Produto/Serviço não especificado',
                  preco_venda_unitario: parseFloat(item.valor_unitario || item.preco_venda_unitario || 0),
                  preco_unitario: parseFloat(item.valor_unitario || item.preco_unitario || 0),
                  quantidade: parseFloat(item.quantidade || 1),
                  variacao: item.dados_adicionais?.variacao || item.variacao || null,
                  imagem_principal: item.dados_adicionais?.imagem_principal || item.imagem_principal || item?.produto?.imagem_principal || null,
                  observacoes: observacoes, // Observações do item
                  tipo_item: item.tipo_item || 'produto', // Tipo do item (produto/serviço)
                  largura: item.largura || null,
                  altura: item.altura || null,
                  acabamentos: item.acabamentos || null,
                  detalhes: item.detalhes || item.produto_descricao || null,
                };
              });
              
              // Debug: Mostrar informações sobre os dados
              console.log('🔍 [ContaReceberDetalhesModal] itens processados:', itens);
              console.log('🔍 [ContaReceberDetalhesModal] itens.length:', itens.length);
              
              return itens.length > 0 ? (
              <>
                <hr className="my-3 sm:my-4 border-border" />
                <section className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                    <ShoppingCart size={18} className="mr-2"/> PRODUTOS E SERVIÇOS
                  </h2>
                  
                  {/* Layout Mobile - Cards */}
                  <div className="md:hidden space-y-3">
                    {itens.map((item, index) => (
                      <div key={`prod-${index}`} className="border rounded-lg p-3 bg-card">
                        <div className="flex items-start space-x-3 mb-3">
                          <div className="w-12 h-12 flex items-center justify-center border border-border rounded-md bg-muted/20 flex-shrink-0">
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                item.tipo_item === 'servico' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {item.tipo_item === 'servico' ? 'SERVIÇO' : 'PRODUTO'}
                              </span>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatCurrency(item.preco_venda_unitario * item.quantidade)}</p>
                                <p className="text-xs text-muted-foreground">Subtotal</p>
                              </div>
                            </div>
                            <h3 className="font-medium text-sm mb-1 break-words">{item.nome || 'Produto/Serviço não especificado'}</h3>
                            {item.variacao?.nome && (
                              <p className="text-xs text-muted-foreground mb-1">({item.variacao.nome})</p>
                            )}
                            {item.detalhes && (
                              <p className="text-xs text-muted-foreground italic mb-1">{item.detalhes}</p>
                            )}
                            {item.acabamentos && (
                              <p className="text-xs text-muted-foreground mb-1">Acabamentos: {item.acabamentos}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Dimensões</p>
                            <p className="text-sm">
                              {item.largura && item.altura ? (
                                <span>{item.largura} x {item.altura} cm</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Quantidade</p>
                            <p className="text-sm font-medium">{item.quantidade}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Preço Unitário</p>
                            <p className="text-sm">{formatCurrency(item.preco_venda_unitario)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Observações</p>
                            <div className="flex items-center">
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Layout Desktop - Tabela */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30">
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 px-2 font-semibold w-[40px] text-xs">Imagem</th>
                          <th className="text-left py-1.5 px-2 font-semibold text-xs">Tipo</th>
                          <th className="text-left py-1.5 px-2 font-semibold text-xs">Descrição</th>
                          <th className="text-left py-1.5 px-2 font-semibold text-xs">Dimensões</th>
                          <th className="text-left py-1.5 px-2 font-semibold text-xs">Observações</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-xs">Preço Un.</th>
                          <th className="text-center py-1.5 px-2 font-semibold text-xs">Qtd.</th>
                          <th className="text-right py-1.5 px-2 font-semibold text-xs">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card">
                        {itens.map((item, index) => (
                          <tr key={`prod-${index}`} className="border-b border-border last:border-b-0 hover:bg-muted/10">
                            <td className="py-1.5 px-2">
                              <div className="w-8 h-8 flex items-center justify-center border border-border rounded-md bg-muted/20">
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
                                        <ImageIcon size={16} className="text-gray-400 fallback-icon" style={{ display: 'none' }} />
                                      </>
                                    );
                                  } else {
                                    return <ImageIcon size={16} className="text-gray-400" />;
                                  }
                                })()}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-foreground">
                              <div className="flex items-center">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  item.tipo_item === 'servico' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {item.tipo_item === 'servico' ? 'SERVIÇO' : 'PRODUTO'}
                                </span>
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-foreground">
                              <div className="flex flex-col gap-1 whitespace-normal break-words max-w-[200px]">
                                <span className="text-xs font-medium">{item.nome || 'Produto/Serviço não especificado'}</span>
                                {item.variacao?.nome && (
                                  <span className="text-muted-foreground text-xs">({item.variacao.nome})</span>
                                )}
                                {item.detalhes && (
                                  <span className="text-muted-foreground text-xs italic">{item.detalhes}</span>
                                )}
                                {item.acabamentos && (
                                  <span className="text-muted-foreground text-xs">Acabamentos: {item.acabamentos}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-foreground">
                              <div className="text-xs">
                                {item.largura && item.altura ? (
                                  <span>{item.largura} x {item.altura} cm</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-foreground">
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
                            </td>
                            <td className="text-right py-1.5 px-2 text-foreground text-xs">
                              {formatCurrency(item.preco_venda_unitario)}
                            </td>
                            <td className="text-center py-1.5 px-2 text-foreground text-xs">
                              {item.quantidade}
                            </td>
                            <td className="text-right py-1.5 px-2 font-medium text-foreground text-xs">
                              {formatCurrency(item.preco_venda_unitario * item.quantidade)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
              ) : null;
            })()}

            {conta.observacoes && (
              <>
                <hr className="my-3 sm:my-4 border-border" />
                <section className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-primary mb-2">OBSERVAÇÕES:</h2>
                  <div className="bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                    <p className="text-[10px] sm:text-sm text-foreground">{conta.observacoes}</p>
                  </div>
                </section>
              </>
            )}

            {historicoPagamentos.length > 0 && (
              <>
                <hr className="my-3 sm:my-4 border-border" />
                <section className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                    <Wallet size={18} className="mr-2"/> HISTÓRICO DE PAGAMENTOS
                  </h2>
                  <div className="space-y-2">
                    {historicoPagamentos.map((pagamento, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 p-2 sm:p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle2 size={16} className="mr-2 text-green-500" />
                            <span className="text-[10px] sm:text-sm font-medium text-green-700">
                              {pagamento.forma_pagamento || 'Pagamento'}
                            </span>
                        </div>
                          <span className="text-[10px] sm:text-sm font-semibold text-green-700">
                            {formatCurrency(parseFloat(pagamento.valor || 0))}
                          </span>
                        </div>
                        {pagamento.data && (
                          <p className="text-[9px] sm:text-xs text-green-600 ml-6">
                            Data: {format(parseISO(pagamento.data), 'dd/MM/yyyy HH:mm')}
                          </p>
                        )}
                        {pagamento.observacoes && (
                          <p className="text-[9px] sm:text-xs text-green-600 ml-6">
                            Obs: {pagamento.observacoes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            {(() => {
              // Usar a mesma lógica do PDV histórico para pagamentos
              const base = dadosVendaVinculada;
              if (!base) return null;
              
              const pagamentosFonte = Array.isArray(base.dados_pagamento)
                ? base.dados_pagamento
                : (Array.isArray(base?.data?.dados_pagamento) ? base.data.dados_pagamento : []);
              const pagamentos = Array.isArray(pagamentosFonte)
                ? pagamentosFonte.map((p) => ({
                    metodo: p.forma_pagamento || p.metodo || 'Outro',
                    valor: parseFloat(p.valor || 0),
                    valorFinal: parseFloat(p.valor_final || p.valor || 0),
                    valorOriginal: parseFloat(p.valor_original || p.valor || 0),
                    parcelas: p.parcelas || null,
                    maquinaInfo: p.maquina_info || null,
                    taxaInfo: p.taxa_info || null,
                  }))
                : (Array.isArray(base.pagamentos) ? base.pagamentos : []);
              
              return pagamentos.length > 0 ? (
              <>
                <hr className="my-3 sm:my-4 border-border" />
                <section className="mb-4 sm:mb-6">
                  <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                    <CreditCard size={18} className="mr-2"/> DETALHES DO PAGAMENTO
                  </h2>
                  <div className="space-y-2">
                    {pagamentos.map((pagamento, index) => (
                      <div key={index} className="bg-blue-50 border border-blue-200 p-2 sm:p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CreditCard size={16} className="mr-2 text-blue-500" />
                            <span className="text-[10px] sm:text-sm font-medium text-blue-700">
                              {pagamento.metodo}
                              {pagamento.parcelas && ` (${pagamento.parcelas}x)`}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-sm font-semibold text-blue-700">
                            {formatCurrency(pagamento.valorFinal || pagamento.valor)}
                          </span>
                        </div>
                        {pagamento.maquinaInfo?.nome && (
                          <p className="text-[9px] sm:text-xs text-blue-600 ml-6">
                            Máquina: {pagamento.maquinaInfo.nome}
                          </p>
                        )}
                        {pagamento.taxaInfo?.valor && parseFloat(pagamento.taxaInfo.valor) > 0 && (
                          <p className="text-[9px] sm:text-xs text-blue-600 ml-6">
                            Taxa: {parseFloat(pagamento.taxaInfo.valor).toFixed(2).replace('.',',')}%
                          </p>
                        )}
                        </div>
                      ))}
                  </div>
                </section>
              </>
              ) : (
                // Debug: Mostrar informações quando não há itens
                <>
                  <hr className="my-3 sm:my-4 border-border" />
                  <section className="mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                      <ShoppingCart size={18} className="mr-2"/> PRODUTOS E SERVIÇOS
                    </h2>
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                      <p className="text-sm text-yellow-800 font-medium mb-2">Debug - Informações dos Dados:</p>
                      <div className="text-xs text-yellow-700 space-y-1">
                        <p>• dadosCompletos existe: {dadosCompletos ? 'Sim' : 'Não'}</p>
                        <p>• itens_venda existe: {dadosCompletos?.itens_venda ? 'Sim' : 'Não'}</p>
                        <p>• itens_venda.length: {dadosCompletos?.itens_venda?.length || 0}</p>
                        <p>• Tipo da conta: {dadosCompletos?.tipo_conta || 'N/A'}</p>
                        <p>• OS ID: {dadosCompletos?.os_id || 'N/A'}</p>
                        <p>• Venda ID: {dadosCompletos?.venda_id || 'N/A'}</p>
                        <p>• Envelopamento ID: {dadosCompletos?.envelopamento_id || 'N/A'}</p>
                        <p>• Chaves de dadosCompletos: {dadosCompletos ? Object.keys(dadosCompletos).join(', ') : 'N/A'}</p>
                        <p>• itens_venda é array: {Array.isArray(dadosCompletos?.itens_venda) ? 'Sim' : 'Não'}</p>
                        <p>• itens_venda conteúdo: {dadosCompletos?.itens_venda ? JSON.stringify(dadosCompletos.itens_venda) : 'N/A'}</p>
                      </div>
                      <p className="text-sm text-yellow-800 mt-2">
                        Nenhum produto ou serviço encontrado para esta conta.
                      </p>
                    </div>
                  </section>
                </>
              );
            })()}

            <hr className="my-3 sm:my-4 border-border" />

            <section className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-primary mb-2 flex items-center">
                  <DollarSign size={18} className="mr-2"/> RESUMO FINANCEIRO
                </h2>
                <div className="space-y-1.5 bg-muted/20 p-2 sm:p-3 rounded-md border border-border">
                  <div className="flex justify-between py-1 text-foreground">
                    <span>Valor Original da Dívida:</span>
                    <span>{formatCurrency(valorOriginal)}</span>
                          </div>
                  {jurosAplicados > 0 && (
                    <div className="flex justify-between py-1 text-orange-600">
                      <span>Juros Aplicados:</span>
                      <span>+ {formatCurrency(jurosAplicados)}</span>
                                </div>
                              )}
                  <hr className="border-dashed border-border" />
                  <div className="flex justify-between py-1.5 sm:py-2 bg-primary/10 text-primary rounded-md px-2 font-bold text-base sm:text-lg">
                    <span>VALOR TOTAL DEVIDO:</span>
                    <span>{formatCurrency(valorTotalDevido)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-green-600 font-medium">
                    <span>Valor Recebido:</span>
                    <span>{formatCurrency(valorRecebido)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-red-600 font-semibold">
                    <span>Valor Pendente:</span>
                    <span>{formatCurrency(valorPendente)}</span>
                  </div>
                </div>
                                </div>
            </section>

            <footer className="text-center text-[9px] sm:text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
              <p>Recibo gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              <p>JET-IMPRE GESTÃO - Sistema de Gestão Empresarial</p>
            </footer>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t bg-background">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto order-3 sm:order-1">
              Fechar
            </Button>
            <Button variant="outline" onClick={handleImpressaoRecibo} className="w-full sm:w-auto order-1 sm:order-2">
              <Printer size={16} className="mr-2"/> Imprimir
            </Button>
            <Button variant="outline" onClick={handleGerarPdfRecibo} className="w-full sm:w-auto order-2 sm:order-3">
              <Download size={16} className="mr-2"/> Baixar PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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

export default ContaReceberDetalhesModal;