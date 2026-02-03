import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { format, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, PlusCircle, Filter, CheckCircle, TrendingUp, Wallet, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { vendaService } from '@/services/api';

const RecebimentoGeralPage = () => {
  const { toast } = useToast();
  const [recebimentos, setRecebimentos] = useState([]);
  const [filteredRecebimentos, setFilteredRecebimentos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState('todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);
  const [currentMonthInicio, setCurrentMonthInicio] = useState(new Date());
  const [currentMonthFim, setCurrentMonthFim] = useState(new Date());

  // Inicializar datas com a data atual
  useEffect(() => {
    const hoje = new Date();
    const dataFormatada = formatarDataParaDDMMAAAA(hoje);
    setFiltroDataInicio(dataFormatada);
    setFiltroDataFim(dataFormatada);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Verificar se as datas foram inicializadas antes de carregar
        if (!filtroDataInicio || !filtroDataFim) {
          setIsLoading(false);
          return;
        }
        
        // Converter filtroDataInicio e filtroDataFim para formato yyyy-MM-dd
        let dataInicio = null;
        let dataFim = null;
        
        if (filtroDataInicio) {
          try {
            const [dia, mes, ano] = filtroDataInicio.split('/');
            if (dia && mes && ano) {
              dataInicio = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
          } catch (error) {
            console.warn('Erro ao converter data de início:', filtroDataInicio, error);
          }
        }
        
        if (filtroDataFim) {
          try {
            const [dia, mes, ano] = filtroDataFim.split('/');
            if (dia && mes && ano) {
              dataFim = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
            }
          } catch (error) {
            console.warn('Erro ao converter data de fim:', filtroDataFim, error);
          }
        }
        
        // Buscar recebimentos gerais da API COM FILTRO DE DATA DE RECEBIMENTO
        const response = await vendaService.getRelatorioGeralRecebimentos({
          data_inicio: dataInicio,
          data_fim: dataFim,
          filtrar_por_data_recebimento: true // Mostrar apenas recebimentos efetivamente recebidos no dia
        });
        
        if (response.success || response.data?.success) {
          const data = response.data?.data || response.data || {};
          const recebimentosDaAPI = data.recebimentos || [];
          
          console.log('🔍 DEBUG - Recebimentos da API:', recebimentosDaAPI.length);
          console.log('🔍 DEBUG - Dados da API:', data);
          
          // Transformar dados da API para o formato esperado
          const recebimentosTransformados = recebimentosDaAPI.map((recebimento, index) => {
            const normalizarData = (dataString) => {
              if (!dataString) return new Date().toISOString();
              
              try {
                const data = new Date(dataString);
                if (!isValid(data)) {
                  console.warn('Data inválida encontrada:', dataString);
                  return new Date().toISOString();
                }
                // Manter a data e hora originais, apenas garantir que seja válida
                return data.toISOString();
              } catch (error) {
                console.warn('Erro ao processar data:', dataString, error);
                return new Date().toISOString();
              }
            };

            return {
              id: recebimento.id || `receb-${index}`,
              cliente: recebimento.cliente || 'Cliente não identificado',
              valor: parseFloat(recebimento.valor) || 0,
              dataRecebimento: normalizarData(recebimento.data),
              formaPagamento: recebimento.formaPagamento || 'Dinheiro',
              origem: recebimento.origem || 'Serviço',
              observacoes: `${recebimento.origem} - ${recebimento.formaPagamento}`,
              status: 'recebido',
              tipo: recebimento.tipo || 'geral'
            };
          });
          
          console.log('🔍 DEBUG - Recebimentos transformados:', recebimentosTransformados.length);
          console.log('🔍 DEBUG - Primeiros 3 transformados:', recebimentosTransformados.slice(0, 3));
          
          setRecebimentos(recebimentosTransformados);
          setFilteredRecebimentos(recebimentosTransformados);
        }
      } catch (error) {
        console.error('Erro ao carregar recebimentos:', error);
        toast({ 
          title: 'Erro ao carregar dados', 
          description: 'Não foi possível carregar os recebimentos. Tente novamente.', 
          variant: 'destructive' 
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast, filtroDataInicio, filtroDataFim]);

  useEffect(() => {
    let items = [...recebimentos];
    
    // Filtro por forma de pagamento (aplicado localmente)
    // O filtro de data já é aplicado na busca da API
    if (filtroFormaPagamento !== 'todos') {
      items = items.filter(r => r.formaPagamento === filtroFormaPagamento);
    }
    
    setFilteredRecebimentos(items);
  }, [recebimentos, filtroFormaPagamento]);

  const getOrigemBadge = (origem) => {
    switch (origem) {
      case 'PDV': return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">PDV</span>;
      case 'OS': return <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full dark:bg-orange-900 dark:text-orange-300">OS</span>;
      case 'Envelopamento': return <span className="px-2 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full dark:bg-indigo-900 dark:text-indigo-300">Envelopamento</span>;
      case 'Manual': return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-300">Manual</span>;
      default: return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300">{origem}</span>;
    }
  };

  const totalRecebido = filteredRecebimentos.reduce((acc, r) => acc + parseFloat(r.valor), 0);

  // Extrair formas de pagamento únicas dos dados
  const formasPagamentoDisponiveis = [...new Set(recebimentos.map(r => r.formaPagamento).filter(Boolean))];

  // Funções para gerenciar o calendário
  const formatarDataParaDDMMAAAA = (data) => {
    if (!data) return '';
    const d = new Date(data);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${dia}/${mes}/${ano}`;
  };

  const formatarDataParaYYYYMMDD = (dataDDMMAAAA) => {
    if (!dataDDMMAAAA) return '';
    const partes = dataDDMMAAAA.split('/');
    if (partes.length === 3) {
      return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return '';
  };

  const handleDataInicioSelect = (data) => {
    const dataFormatada = formatarDataParaDDMMAAAA(data);
    setFiltroDataInicio(dataFormatada);
    setShowDataInicioPicker(false);
  };

  const handleDataFimSelect = (data) => {
    const dataFormatada = formatarDataParaDDMMAAAA(data);
    setFiltroDataFim(dataFormatada);
    setShowDataFimPicker(false);
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltroFormaPagamento('todos');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setShowDataInicioPicker(false);
    setShowDataFimPicker(false);
  };

  // Componente de calendário
  const CalendarPicker = ({ isOpen, onClose, onSelect, currentMonth, setCurrentMonth, selectedDate }) => {
    if (!isOpen) return null;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                className={`
                  p-2 text-sm rounded hover:bg-blue-100
                  ${isSameMonth(day, currentMonth) ? 'text-gray-900' : 'text-gray-400'}
                  ${selectedDate && isSameDay(day, selectedDate) ? 'bg-blue-500 text-white' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            ))}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
      <div className="p-4 md:p-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center">
                      <TrendingUp size={28} className="mr-3 text-primary"/>
                      Recebimento Geral
                    </CardTitle>
                    <CardDescription>Gerencie todos os recebimentos e entradas de valores.</CardDescription>
                  </div>
                  <Button onClick={() => setIsModalOpen(true)}>
                    <PlusCircle size={18} className="mr-2"/> 
                    Adicionar Recebimento
                  </Button>
                </CardHeader>
                <CardContent>
                    <div className="p-4 border rounded-lg mb-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold flex items-center">
                            <Filter size={16} className="mr-2"/>
                            Filtros
                          </h3>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={limparFiltros}
                            className="text-xs"
                          >
                            <X size={14} className="mr-1"/>
                            Limpar Filtros
                          </Button>
                        </div>
                        <div className="space-y-4">
                            <div>
                              <Label htmlFor="filtro-forma-pagamento" className="text-sm font-medium mb-2 block">
                                Forma de Pagamento
                              </Label>
                              <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a forma de pagamento"/>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="todos">Todas Formas</SelectItem>
                                  {formasPagamentoDisponiveis.map(forma => (
                                    <SelectItem key={forma} value={forma}>
                                      {forma}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="filtro-data-inicio" className="text-sm font-medium mb-2 block">
                                  Data (Início)
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="filtro-data-inicio"
                                    type="text"
                                    placeholder="dd/mm/aaaa"
                                    value={filtroDataInicio}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(/\D/g, '');
                                      if (value.length >= 2) {
                                        value = value.substring(0, 2) + '/' + value.substring(2);
                                      }
                                      if (value.length >= 5) {
                                        value = value.substring(0, 5) + '/' + value.substring(5, 9);
                                      }
                                      setFiltroDataInicio(value);
                                    }}
                                    maxLength={10}
                                    className="pr-8"
                                  />
                                  <Calendar 
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" 
                                    onClick={() => setShowDataInicioPicker(true)}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Para contas pagas: data de pagamento | Para outras: data de emissão
                                </p>
                              </div>
                              
                              <div>
                                <Label htmlFor="filtro-data-fim" className="text-sm font-medium mb-2 block">
                                  Data (Fim)
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="filtro-data-fim"
                                    type="text"
                                    placeholder="dd/mm/aaaa"
                                    value={filtroDataFim}
                                    onChange={(e) => {
                                      let value = e.target.value.replace(/\D/g, '');
                                      if (value.length >= 2) {
                                        value = value.substring(0, 2) + '/' + value.substring(2);
                                      }
                                      if (value.length >= 5) {
                                        value = value.substring(0, 5) + '/' + value.substring(5, 9);
                                      }
                                      setFiltroDataFim(value);
                                    }}
                                    maxLength={10}
                                    className="pr-8"
                                  />
                                  <Calendar 
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer hover:text-blue-500" 
                                    onClick={() => setShowDataFimPicker(true)}
                                  />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Para contas pagas: data de pagamento | Para outras: data de emissão
                                </p>
                              </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-3 mb-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground"/>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-green-600">R$ {totalRecebido.toFixed(2)}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Registros</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{filteredRecebimentos.length}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Média por Recebimento</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground"/>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                              R$ {filteredRecebimentos.length > 0 ? (totalRecebido / filteredRecebimentos.length).toFixed(2) : '0.00'}
                            </div>
                          </CardContent>
                        </Card>
                    </div>
                    
                    {/* Layout Mobile - Cards */}
                    <div className="md:hidden">
                        <ScrollArea className="h-[calc(100vh-20rem)]">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-24">
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                        Carregando recebimentos...
                                    </div>
                                </div>
                            ) : filteredRecebimentos.length > 0 ? (
                                <div className="space-y-3">
                                    {filteredRecebimentos.map(recebimento => (
                                        <motion.div
                                            key={recebimento.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm break-words">{recebimento.cliente}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {getOrigemBadge(recebimento.origem)}
                                                        <Badge variant="outline" className="text-xs">
                                                            {recebimento.formaPagamento}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className="text-lg font-bold text-green-600">
                                                        R$ {parseFloat(recebimento.valor).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Data do Recebimento</p>
                                                    <p className="text-sm">
                                                        {recebimento.dataRecebimento && isValid(parseISO(recebimento.dataRecebimento)) 
                                                            ? format(parseISO(recebimento.dataRecebimento), 'dd/MM/yyyy HH:mm')
                                                            : 'Data inválida'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Wallet size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                    <p>Nenhum recebimento encontrado.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Layout Desktop - Tabela */}
                    <div className="hidden md:block">
                        <ScrollArea className="h-[calc(100vh-20rem)]">
                            <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Origem</TableHead>
                                    <TableHead>Data Recebimento</TableHead>
                                    <TableHead>Forma Pagamento</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                {isLoading ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                      <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                        Carregando recebimentos...
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : filteredRecebimentos.length > 0 ? filteredRecebimentos.map(recebimento => (
                                    <TableRow key={recebimento.id}>
                                        <TableCell className="font-medium">{recebimento.cliente}</TableCell>
                                        <TableCell>{getOrigemBadge(recebimento.origem)}</TableCell>
                                        <TableCell>
                                          {recebimento.dataRecebimento && isValid(parseISO(recebimento.dataRecebimento)) 
                                            ? format(parseISO(recebimento.dataRecebimento), 'dd/MM/yyyy HH:mm')
                                            : 'Data inválida'
                                          }
                                        </TableCell>
                                        <TableCell>{recebimento.formaPagamento}</TableCell>
                                        <TableCell className="text-right font-semibold">R$ {parseFloat(recebimento.valor).toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                  <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                      Nenhum recebimento encontrado.
                                    </TableCell>
                                  </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Recebimento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="cliente">Cliente</Label>
                    <Input 
                      id="cliente" 
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="valor">Valor (R$)</Label>
                    <Input 
                      id="valor" 
                      type="number" 
                      placeholder="0.00"
                    />
                  </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={() => setIsModalOpen(false)}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Calendários */}
        <CalendarPicker
          isOpen={showDataInicioPicker}
          onClose={() => setShowDataInicioPicker(false)}
          onSelect={handleDataInicioSelect}
          currentMonth={currentMonthInicio}
          setCurrentMonth={setCurrentMonthInicio}
          selectedDate={filtroDataInicio ? new Date(formatarDataParaYYYYMMDD(filtroDataInicio)) : null}
        />
        
        <CalendarPicker
          isOpen={showDataFimPicker}
          onClose={() => setShowDataFimPicker(false)}
          onSelect={handleDataFimSelect}
          currentMonth={currentMonthFim}
          setCurrentMonth={setCurrentMonthFim}
          selectedDate={filtroDataFim ? new Date(formatarDataParaYYYYMMDD(filtroDataFim)) : null}
        />
      </div>
  );
};

export default RecebimentoGeralPage;


