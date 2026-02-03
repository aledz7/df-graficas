import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Hook de debounce customizado
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Trash2, Search, FileText, Printer, CircleDollarSign, CheckCircle2, Palette, CalendarDays, CalendarClock, Edit3 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse, cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import EnvelopamentoDocumentModal from '@/components/envelopamento/EnvelopamentoDocumentModal';
import { generatePdfFromElement, printElement } from '@/lib/osDocumentGenerator';
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal.jsx';
import SenhaMasterModal from '@/components/SenhaMasterModal';
import { envelopamentoService } from '@/services/envelopamentoApi';
import { apiDataManager } from '@/lib/apiDataManager';

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, startOfDay, endOfDay, isBefore, isValid, startOfToday, endOfToday } from 'date-fns';

const OrcamentosEnvelopamentoPage = ({ logoUrl, nomeEmpresa, vendedorAtual }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [orcamentos, setOrcamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 1000); // 1 segundo de delay 
  const [filteredOrcamentos, setFilteredOrcamentos] = useState([]);
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const documentRef = React.useRef(null);
  const [orcamentoToDelete, setOrcamentoToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: startOfToday(), to: endOfToday() });
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [orcamentoParaEditar, setOrcamentoParaEditar] = useState(null);
  const [isSenhaMasterModalOpen, setIsSenhaMasterModalOpen] = useState(false);

  const loadOrcamentos = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      
      // Preparar parâmetros para a API
      const params = {};
      
      if (filters.searchTerm) {
        params.search = filters.searchTerm;
      }
      
      // Processar filtro de data
      if (filters.dateRange) {
        if (filters.dateRange.from && isValid(filters.dateRange.from)) {
          params.data_inicio = format(startOfDay(filters.dateRange.from), 'yyyy-MM-dd HH:mm:ss');
        }
        
        if (filters.dateRange.to && isValid(filters.dateRange.to)) {
          params.data_fim = format(endOfDay(filters.dateRange.to), 'yyyy-MM-dd HH:mm:ss');
        } else if (filters.dateRange.from && isValid(filters.dateRange.from)) {
          // Se só tem data inicial, usar a mesma data como final
          params.data_fim = format(endOfDay(filters.dateRange.from), 'yyyy-MM-dd HH:mm:ss');
        }
      }
      
      // Garantir que status finalizados/salvos também sejam buscados caso necessário
      const response = await envelopamentoService.getAll(params);
      
      // A API retorna {success: true, message: "...", data: {...}}
      // O data pode ser um objeto de paginação ou array direto
      let orcamentosArray = [];
      
      if (response) {
        // O envelopamentoService.getAll retorna response.data diretamente
        // que pode ser {success: true, data: {...}} ou o objeto de paginação
        const payload = response.data ?? response;
        
        // Se data tem propriedades de paginação (current_page, data, etc.)
        if (payload?.data && Array.isArray(payload.data)) {
          orcamentosArray = payload.data; // Dados paginados
        } else if (Array.isArray(payload)) {
          orcamentosArray = payload; // Array direto
        } else if (payload && typeof payload === 'object' && !payload.current_page) {
          // Se for um objeto único (não paginado), colocar em array
          orcamentosArray = [payload];
        }
      }
      
      // Ordenar por data de criação (mais recente primeiro)
      const orcamentosOrdenados = orcamentosArray.sort((a, b) => {
        const dateA = new Date(a.data_criacao || 0);
        const dateB = new Date(b.data_criacao || 0);
        return dateB - dateA;
      });
      
      setOrcamentos(orcamentosOrdenados);
    } catch (error) {
      console.error('Erro ao carregar orçamentos da API:', error);
      
      // Fallback para dados locais em caso de erro
      const data = safeJsonParse(await apiDataManager.getItem('envelopamentosOrcamentos'), []);
      const orcamentosArray = Array.isArray(data) ? data : [];
      
      // Aplicar filtros localmente quando usando fallback
      let orcamentosFiltrados = orcamentosArray;
      
      // Filtrar por data localmente
      if (filters.dateRange?.from && isValid(filters.dateRange.from)) {
        const dataInicio = startOfDay(filters.dateRange.from);
        orcamentosFiltrados = orcamentosFiltrados.filter(orc => {
          const dataOrc = parseISO(orc.data_criacao);
          return isValid(dataOrc) && dataOrc >= dataInicio;
        });
      }
      
      if (filters.dateRange?.to && isValid(filters.dateRange.to)) {
        const dataFim = endOfDay(filters.dateRange.to);
        orcamentosFiltrados = orcamentosFiltrados.filter(orc => {
          const dataOrc = parseISO(orc.data_criacao);
          return isValid(dataOrc) && dataOrc <= dataFim;
        });
      }
      
      // Filtrar por termo de busca localmente
      if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase();
        orcamentosFiltrados = orcamentosFiltrados.filter(orc =>
          (orc.cliente?.nome?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (orc.id?.toString().toLowerCase() || '').includes(lowerSearchTerm) ||
          (orc.codigo_orcamento?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (orc.status?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (orc.nome_orcamento?.toLowerCase() || '').includes(lowerSearchTerm) ||
          (orc.selected_pecas?.some(peca => peca.parte?.nome?.toLowerCase().includes(lowerSearchTerm)) || false)
        );
      }
      
      // Ordenar por data de criação (mais recente primeiro)
      const orcamentosOrdenados = orcamentosFiltrados.sort((a, b) => {
        const dateA = new Date(a.data_criacao || 0);
        const dateB = new Date(b.data_criacao || 0);
        return dateB - dateA;
      });
      
      setOrcamentos(orcamentosOrdenados);
      
      toast({
        title: 'Aviso',
        description: 'Usando dados locais. Conexão com o servidor não disponível.',
        variant: 'warning'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      await loadOrcamentos({ searchTerm: debouncedSearchTerm, dateRange });
      const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings'), {});
      setEmpresaSettings(settings);
    };
    
    loadData();
  }, [loadOrcamentos, debouncedSearchTerm, dateRange.from, dateRange.to]);

  useEffect(() => {
    // Como a filtragem agora é feita na API, apenas definimos os dados filtrados
    // igual aos dados carregados da API
    setFilteredOrcamentos(orcamentos);
  }, [orcamentos]);

  const handleViewOrcamento = (orc) => {
    setOrcamentoSelecionado(orc);
    setIsDocumentModalOpen(true);
  };

  const handleEditOrcamento = (orc) => {
    setOrcamentoParaEditar(orc);
    setIsSenhaMasterModalOpen(true);
  };

  const handleConfirmEditOrcamento = () => {
    if (orcamentoParaEditar) {
      navigate(`/operacional/envelopamento/editar/${orcamentoParaEditar.id}`, { state: { orcamento: orcamentoParaEditar } });
      setOrcamentoParaEditar(null);
    }
  };

  const handleFinalizeOrcamento = (orcId) => {
    // Navega para a página de edição com instrução para abrir o modal de finalização
    navigate(`/operacional/envelopamento/editar/${orcId}`, { replace: true, state: { orcamentoId: orcId, openFinalizeModal: true } });
  };

  const handleDeleteOrcamento = (orc) => {
    setOrcamentoToDelete(orc);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteOrcamento = async (justificativa) => {
    if (!orcamentoToDelete) {
      setIsDeleteModalOpen(false);
      return;
    }
    try {
      // Devolver estoque e excluir via dataService para padronizar
      // A API já tem rota moverParaLixeira; manteremos feedback claro
      await envelopamentoService.moverParaLixeira(orcamentoToDelete.id, justificativa);
      toast({ 
        title: 'Orçamento excluído', 
        description: `Orçamento ${orcamentoToDelete.id || 'N/A'} removido e estoque devolvido.` 
      });
      await loadOrcamentos();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Falha ao excluir o orçamento na API. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteModalOpen(false);
      setOrcamentoToDelete(null);
    }
  };

  const handleGerarPdfDocumento = async () => {
    if (!orcamentoSelecionado || !documentRef.current) return;
    await generatePdfFromElement(documentRef.current, `orcamento_env_${orcamentoSelecionado.id}.pdf`);
  };
  
  const handleImpressaoDocumento = async () => {
    if (!orcamentoSelecionado || !documentRef.current) return;
    await printElement(documentRef.current, `Orçamento Envelopamento ${orcamentoSelecionado.id}`);
  };

  const handleNavigateToNewOrcamento = async () => {
    await apiDataManager.removeItem('envelopamentoOrcamentoAtual'); // Limpa o rascunho
    navigate('/operacional/envelopamento');
  };

  const getStatusBadge = (status, dataValidade) => {
    let isExpirado = false;
    if (dataValidade) {
        try {
            const validadeDate = parseISO(dataValidade);
            if (isValid(validadeDate)) {
                isExpirado = isBefore(validadeDate, startOfDay(new Date()));
            }
        } catch (e) {
            console.error("Erro ao parsear data de validade:", dataValidade, e);
        }
    }

    if (isExpirado && status !== 'Finalizado') {
        return <Badge variant="destructive" className="bg-red-700 hover:bg-red-800"><CalendarClock className="mr-1 h-3 w-3" /> Expirado</Badge>;
    }

    switch (status) {
      case 'Finalizado':
        return <Badge variant="success" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Finalizado</Badge>;
      case 'Orçamento Salvo':
      case 'Rascunho':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Histórico de Orçamentos de Envelopamento</h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 md:mt-0 w-full md:w-auto">
          <Input
            type="search"
            placeholder="Buscar por ID, código, cliente ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-white dark:bg-gray-700"
          />
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                  <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                          "w-full md:w-[260px] justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground"
                      )}
                  >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange.from && isValid(dateRange.from) ? (
                          dateRange.to && isValid(dateRange.to) ? (
                              <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>
                          ) : (
                              format(dateRange.from, "dd/MM/yy")
                          )
                      ) : (
                          <span>Selecione o período</span>
                      )}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={(range) => {
                          if (range?.from && !isValid(range.from)) {
                              range.from = undefined;
                          }
                          if (range?.to && !isValid(range.to)) {
                              range.to = undefined;
                          }
                          const newRange = range || { from: undefined, to: undefined };
                          setDateRange(newRange);
                      }}
                      numberOfMonths={2}
                  />
              </PopoverContent>
            </Popover>
            <Button 
              variant="outline" 
              onClick={() => setDateRange({ from: startOfToday(), to: endOfToday() })}
              title="Buscar por hoje"
              className="px-3 w-full sm:w-auto"
            >
              Hoje
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDateRange({ from: undefined, to: undefined })}
              title="Limpar filtro de data"
              className="px-3 w-full sm:w-auto"
            >
              Limpar
            </Button>
          </div>
          <Button onClick={handleNavigateToNewOrcamento} className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white w-full md:w-auto">
            <Palette className="mr-2 h-5 w-5" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Visualização em Cards para Mobile */}
      <div className="md:hidden">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {filteredOrcamentos.length > 0 ? (
              filteredOrcamentos.map((orc) => (
                <motion.div
                  key={orc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-3">
                    {/* Código e Status */}
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                        <p className="font-semibold text-lg">{orc.id || orc.codigo_orcamento || 'N/A'}</p>
                      </div>
                      <div>
                        {getStatusBadge(orc.status, orc.data_validade)}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                      <p className="font-medium">{orc.cliente?.nome || 'N/A'}</p>
                    </div>

                    {/* Nome do Orçamento */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Nome Orçamento</p>
                      <p className="font-medium">{orc.nome_orcamento || 'N/A'}</p>
                    </div>

                    {/* Datas */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        {/* <p className="text-xs text-gray-500 dark:text-gray-400">Data</p> */}
                        {/* <p className="text-sm">{isValid(parseISO(orc.data_criacao)) ? format(parseISO(orc.data_criacao), 'dd/MM/yyyy') : 'Data inválida'}</p> */}
                        <p className="text-sm">{isValid(parseISO(orc.data_criacao)) ? format(parseISO(orc.data_criacao), 'dd/MM/yyyy') : 'Data inválida'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Data/Hora</p>
                        <p className="text-sm">{orc.data_criacao ? 
                            (() => {
                              try {
                                return isValid(parseISO(orc.data_criacao)) ? format(parseISO(orc.data_criacao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
                              } catch (e) {
                                return 'Data inválida';
                              }
                            })() 
                            : 'Data não informada'
                          }</p>
                      </div>
                    </div>

                    {/* Total */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        R$ {parseFloat(orc.orcamento_total || 0).toFixed(2)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditOrcamento(orc)} 
                          className="flex-1 text-blue-500 hover:text-blue-600 border-blue-300 hover:border-blue-400"
                        >
                          <Edit3 className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewOrcamento(orc)} 
                          className="flex-1"
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Visualizar
                        </Button>
                        {(orc.status === 'Orçamento Salvo' || orc.status === 'Rascunho') && !(orc.data_validade && isBefore(parseISO(orc.data_validade), startOfDay(new Date()))) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleFinalizeOrcamento(orc.id)} 
                            className="flex-1 text-green-500 hover:text-green-600 border-green-300 hover:border-green-400"
                          >
                            <CircleDollarSign className="mr-1 h-4 w-4" />
                            Finalizar
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteOrcamento(orc)} 
                          className="flex-1 text-red-500 hover:text-red-600 border-red-300 hover:border-red-400"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum orçamento encontrado.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block">
        <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100vh-220px)]">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
              <TableRow>
                <TableHead>Código</TableHead>
                {/* <TableHead>Data</TableHead> */}
                <TableHead>Cliente</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Nome Orçamento</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrcamentos.length > 0 ? (
                filteredOrcamentos.map((orc) => (
                  <TableRow key={orc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium">{orc.id || orc.codigo_orcamento || 'N/A'}</TableCell>
                    {/* <TableCell>{isValid(parseISO(orc.data_criacao)) ? format(parseISO(orc.data_criacao), 'dd/MM/yyyy') : 'Data inválida'}</TableCell> */}
                    <TableCell>{orc.cliente?.nome || 'N/A'}</TableCell>
                    <TableCell>{orc.data_criacao ? 
                        (() => {
                          try {
                            return isValid(parseISO(orc.data_criacao)) ? format(parseISO(orc.data_criacao), 'dd/MM/yyyy HH:mm') : 'Data inválida';
                          } catch (e) {
                            return 'Data inválida';
                          }
                        })() 
                        : 'Data não informada'
                      }</TableCell>
                    <TableCell>{orc.nome_orcamento || 'N/A'}</TableCell>
                    <TableCell>R$ {parseFloat(orc.orcamento_total || 0).toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(orc.status, orc.data_validade)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditOrcamento(orc)} 
                          title="Editar Orçamento"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewOrcamento(orc)} title="Visualizar Orçamento">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(orc.status === 'Orçamento Salvo' || orc.status === 'Rascunho') && !(orc.data_validade && isBefore(parseISO(orc.data_validade), startOfDay(new Date()))) && (
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleFinalizeOrcamento(orc.id)} 
                              title="Finalizar Orçamento" 
                              className="text-green-500 hover:text-green-600"
                          >
                             <CircleDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteOrcamento(orc)} title="Excluir" className="text-red-500 hover:text-red-600">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-500 dark:text-gray-400">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      {orcamentoSelecionado && (
        <EnvelopamentoDocumentModal
          isOpen={isDocumentModalOpen}
          setIsOpen={setIsDocumentModalOpen}
          documentRef={documentRef}
          documento={orcamentoSelecionado}
          logoUrl={logoUrl || empresaSettings.logoUrl}
          nomeEmpresa={empresaSettings.nomeFantasia || nomeEmpresa}
          handleGerarPdf={handleGerarPdfDocumento}
          handleImpressao={handleImpressaoDocumento}
          handleNovoOrcamento={() => {
            setIsDocumentModalOpen(false);
            handleNavigateToNewOrcamento(); // Usa a função que limpa o localStorage
          }}
        />
      )}
      <SenhaMasterModal
        isOpen={isSenhaMasterModalOpen}
        onClose={() => {
          setIsSenhaMasterModalOpen(false);
          setOrcamentoParaEditar(null);
        }}
        onSuccess={handleConfirmEditOrcamento}
        title="Senha Master Necessária para Edição"
        description="Para editar este orçamento de envelopamento, é necessário fornecer a senha master do sistema."
      />
      <DeleteWithJustificationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteOrcamento}
        title="Excluir Orçamento de Envelopamento"
        description="Tem certeza que deseja mover este orçamento para a lixeira? Esta ação requer uma justificativa e sua senha."
        requirePassword={true} // Defina como true se a senha for obrigatória
        vendedorAtual={vendedorAtual}
      />
    </motion.div>
  );
};

export default OrcamentosEnvelopamentoPage;