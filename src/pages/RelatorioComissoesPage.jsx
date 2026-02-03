import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Percent, Users, Filter, Download, CalendarDays, DollarSign, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from "@/components/ui/use-toast";
import { safeJsonParse, formatCurrency, formatNumber, exportToExcel } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format as formatDateFn, parseISO, startOfDay, endOfDay, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userService } from '@/services/userService';
import { comissaoOSService } from '@/services/api';

// Função para buscar comissões da API
const buscarComissoesAPI = async (userId, dateRange) => {
  try {
    console.log('🔍 BUSCANDO COMISSÕES DA API:', { userId, dateRange });
    
    const dataInicio = dateRange?.from ? formatDateFn(dateRange.from, 'yyyy-MM-dd') : null;
    const dataFim = dateRange?.to ? formatDateFn(dateRange.to, 'yyyy-MM-dd') : null;
    
    const response = await comissaoOSService.getComissoesUsuario(userId, dataInicio, dataFim);
    
    console.log('🔍 RESPOSTA DA API:', response);
    
    if (response.success && response.data) {
      const comissoes = Array.isArray(response.data) ? response.data : response.data.data || [];
      
      // Transformar dados da API para o formato esperado pelo frontend
      const comissoesDetalhadas = comissoes.map(comissao => ({
        id_documento: `OS-${comissao.ordem_servico_id}`,
        data: comissao.data_os_finalizada,
        cliente_nome: comissao.ordem_servico?.cliente?.nome || 'Cliente não informado',
        valor_total_documento: parseFloat(comissao.valor_os || 0),
        itens: [{
          nome: 'Comissão de OS',
          quantidade: 1,
          valor_unitario: parseFloat(comissao.valor_os || 0),
          valor_total_item: parseFloat(comissao.valor_os || 0),
          percentual_comissao_aplicado: parseFloat(comissao.percentual_comissao || 0),
          valor_comissao_item: parseFloat(comissao.valor_comissao || 0),
        }],
        total_comissao_documento: parseFloat(comissao.valor_comissao || 0),
        tipo: 'OS',
        status_pagamento: comissao.status_pagamento
      }));
      
      const totalComissaoFuncionario = comissoes.reduce((total, comissao) => total + parseFloat(comissao.valor_comissao || 0), 0);
      const totalVendidoFuncionario = comissoes.reduce((total, comissao) => total + parseFloat(comissao.valor_os || 0), 0);
      
      return {
        comissoesDetalhadas: comissoesDetalhadas.sort((a,b) => parseISO(b.data) - parseISO(a.data)),
        totalComissaoFuncionario,
        totalVendidoFuncionario
      };
    }
    
    return { comissoesDetalhadas: [], totalComissaoFuncionario: 0, totalVendidoFuncionario: 0 };
  } catch (error) {
    console.error('❌ Erro ao buscar comissões da API:', error);
    return { comissoesDetalhadas: [], totalComissaoFuncionario: 0, totalVendidoFuncionario: 0 };
  }
};


const RelatorioComissoesPage = () => {
  const { toast } = useToast();
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('');
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [isLoading, setIsLoading] = useState(true);
  const [dadosComissao, setDadosComissao] = useState({ comissoesDetalhadas: [], totalComissaoFuncionario: 0, totalVendidoFuncionario: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('🔍 Carregando dados do relatório de comissões...');
        
        // Carregar todos os usuários ativos da API
        const response = await userService.getAll();
        console.log('🔍 Usuários carregados:', response);
        
        if (response.data && Array.isArray(response.data)) {
          setFuncionarios(response.data);
        } else {
          console.warn('⚠️ Nenhum usuário encontrado ou formato inválido');
          setFuncionarios([]);
        }
        
      } catch (error) {
        console.error('❌ Erro ao carregar dados do relatório de comissões:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados dos funcionários. Tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [toast]);
  
  useEffect(() => {
    const loadComissoes = async () => {
      console.log('🔍 DEBUG - useEffect executado:', {
        selectedFuncionarioId,
        dateRange
      });
      
      if (selectedFuncionarioId && (dateRange?.from || dateRange?.to)) {
        try {
          console.log('🔍 Buscando comissões para funcionário:', selectedFuncionarioId);
          const resultado = await buscarComissoesAPI(selectedFuncionarioId, dateRange);
          console.log('🔍 RESULTADO DA API:', resultado);
          setDadosComissao(resultado);
        } catch (error) {
          console.error('❌ Erro ao buscar comissões:', error);
          toast({
            title: "Erro ao buscar comissões",
            description: "Não foi possível carregar as comissões. Tente novamente.",
            variant: "destructive"
          });
          setDadosComissao({ comissoesDetalhadas: [], totalComissaoFuncionario: 0, totalVendidoFuncionario: 0 });
        }
      } else {
        setDadosComissao({ comissoesDetalhadas: [], totalComissaoFuncionario: 0, totalVendidoFuncionario: 0 });
      }
    };
    
    loadComissoes();
  }, [selectedFuncionarioId, dateRange, toast]);


  const handleExport = () => {
    if (dadosComissao.comissoesDetalhadas.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Selecione um funcionário e período com dados.", variant: "default" });
      return;
    }
    const funcionarioNome = funcionarios.find(f => f.id.toString() === selectedFuncionarioId)?.name || 'N/A';
    const dataToExport = [];
    
    dadosComissao.comissoesDetalhadas.forEach(doc => {
        doc.itens.forEach(item => {
            dataToExport.push({
                'ID Documento': doc.id_documento,
                'Tipo': doc.tipo,
                'Data': formatDateFn(parseISO(doc.data), 'dd/MM/yyyy'),
                'Cliente': doc.cliente_nome,
                'Produto/Serviço': item.nome,
                'Qtd.': item.quantidade,
                'Valor Unit. (R$)': formatNumber(item.valor_unitario),
                'Valor Total Item (R$)': formatNumber(item.valor_total_item),
                'Comissão Item (%)': formatNumber(item.percentual_comissao_aplicado),
                'Valor Comissão Item (R$)': formatNumber(item.valor_comissao_item),
            });
        });
         dataToExport.push({
            'ID Documento': `TOTAL DOC: ${doc.id_documento}`,
            'Valor Comissão Item (R$)': formatNumber(doc.total_comissao_documento)
        });
    });

    dataToExport.push({}); 
    dataToExport.push({
        'ID Documento': 'TOTAL GERAL VENDIDO',
        'Valor Comissão Item (R$)': formatCurrency(dadosComissao.totalVendidoFuncionario)
    });
    dataToExport.push({
        'ID Documento': 'TOTAL GERAL COMISSÃO',
        'Valor Comissão Item (R$)': formatCurrency(dadosComissao.totalComissaoFuncionario)
    });

    exportToExcel(dataToExport, `Comissao_${funcionarioNome.replace(/\s+/g, '_')}`, `Relatorio_Comissoes_${funcionarioNome.replace(/\s+/g, '_')}_${formatDateFn(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exportado!", description: "O relatório de comissões foi exportado para Excel." });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Users size={48} className="animate-pulse text-primary" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 md:p-6"
    >
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <Percent size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Relatório de Comissões por Funcionário</h1>
            <p className="text-muted-foreground">Analise as comissões geradas por cada vendedor em um período.</p>
          </div>
        </div>
      </header>

      <Card className="mb-6 shadow-lg border-border">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
            <div>
                <CardTitle className="text-xl">Filtros do Relatório</CardTitle>
                <CardDescription>Selecione o funcionário e o período para gerar o relatório.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto" disabled={dadosComissao.comissoesDetalhadas.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Exportar para Excel
              </Button>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="filtro-funcionario">Funcionário (Vendedor)</Label>
            <Select value={selectedFuncionarioId} onValueChange={setSelectedFuncionarioId}>
              <SelectTrigger id="filtro-funcionario">
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios.map((func, index) => (
                  <SelectItem key={func.id} value={func.id.toString()}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date-range-comissoes">Período das Vendas/OS</Label>
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date-range-comissoes"
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                    >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {dateRange?.from ? 
                            (dateRange?.to ? `${formatDateFn(dateRange.from, "dd/MM/yy")} - ${formatDateFn(dateRange.to, "dd/MM/yy")}` : formatDateFn(dateRange.from, "dd/MM/yy")) 
                            : "Selecione o período"
                        }
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>
      
      {selectedFuncionarioId && (dateRange?.from || dateRange?.to) && (
        <>
        <Card className="mb-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl">
            <CardContent className="p-4 flex flex-col sm:flex-row justify-around items-center text-center sm:text-left gap-4">
                <div>
                    <p className="text-sm uppercase tracking-wider opacity-90">Total Vendido (Filtrado)</p>
                    <p className="text-3xl font-bold">{formatCurrency(dadosComissao.totalVendidoFuncionario)}</p>
                </div>
                <div className="h-12 w-px bg-white/30 hidden sm:block"></div>
                <div>
                    <p className="text-sm uppercase tracking-wider opacity-90">Total Comissão (Filtrado)</p>
                    <p className="text-3xl font-bold">{formatCurrency(dadosComissao.totalComissaoFuncionario)}</p>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-xl">
            <CardHeader>
            <CardTitle>Detalhes da Comissão</CardTitle>
            <CardDescription>
                {dadosComissao.comissoesDetalhadas.length > 0 
                ? `Exibindo ${dadosComissao.comissoesDetalhadas.length} documento(s) comissionáveis para ${funcionarios.find(f => f.id.toString() === selectedFuncionarioId)?.name || ''}.`
                : "Nenhum documento comissionável encontrado para os filtros selecionados."}
            </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {/* Mobile Layout */}
                <div className="md:hidden">
                    <ScrollArea className="h-[600px] w-full">
                        <div className="space-y-4 p-4">
                            {dadosComissao.comissoesDetalhadas.map((doc, docIndex) => (
                                <motion.div
                                    key={doc.id_documento}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: docIndex * 0.1 }}
                                    className="border rounded-lg bg-muted/30 dark:bg-slate-800/50 p-4"
                                >
                                    <div className="space-y-4">
                                        {/* Header do Documento */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <FileText size={16} className="mr-2 text-primary"/>
                                                <div>
                                                    <h4 className="font-semibold text-sm">{doc.id_documento}</h4>
                                                    <p className="text-xs text-muted-foreground">{doc.tipo} - {formatDateFn(parseISO(doc.data), 'dd/MM/yy')}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {doc.itens.length} item(s)
                                            </Badge>
                                        </div>
                                        
                                        <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="text-sm font-medium">Cliente: {doc.cliente_nome}</span>
                                            <span className="text-sm font-bold text-green-600">{formatCurrency(doc.total_comissao_documento)}</span>
                                        </div>
                                        
                                        <div className="text-right text-sm font-semibold">
                                            Valor Doc: {formatCurrency(doc.valor_total_documento)}
                                        </div>
                                        
                                        {/* Itens do Documento */}
                                        <div className="space-y-2">
                                            {doc.itens.map((item, itemIndex) => (
                                                <motion.div
                                                    key={`${doc.id_documento}-${itemIndex}`}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.2, delay: (docIndex * 0.1) + (itemIndex * 0.05) }}
                                                    className="bg-card border rounded p-3 ml-4"
                                                >
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h5 className="font-medium text-sm break-words">{item.nome}</h5>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {formatNumber(item.percentual_comissao_aplicado, 1)}%
                                                            </Badge>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div>
                                                                <span className="text-muted-foreground">Qtd:</span>
                                                                <span className="ml-1 font-medium">{item.quantidade}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">Vlr. Unit:</span>
                                                                <span className="ml-1 font-medium">{formatNumber(item.valor_unitario)}</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-center pt-1 border-t">
                                                            <span className="text-sm font-medium">Total Item: {formatNumber(item.valor_total_item)}</span>
                                                            <span className="text-sm font-bold text-green-600">
                                                                Comissão: {formatNumber(item.valor_comissao_item)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Desktop Layout */}
                <div className="hidden md:block">
                    <ScrollArea className="h-[600px] w-full">
                        <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                            <TableHead className="w-[120px]">Doc. ID</TableHead>
                            <TableHead className="w-[80px]">Data</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="w-[150px]">Produto/Serviço</TableHead>
                            <TableHead className="text-right">Qtd.</TableHead>
                            <TableHead className="text-right">Vlr. Unit. (R$)</TableHead>
                            <TableHead className="text-right">Vlr. Total Item (R$)</TableHead>
                            <TableHead className="text-right">Comissão (%)</TableHead>
                            <TableHead className="text-right text-green-600 dark:text-green-400 font-semibold">Vlr. Comissão (R$)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dadosComissao.comissoesDetalhadas.map(doc => (
                                <React.Fragment key={doc.id_documento}>
                                    <TableRow className="bg-muted/30 dark:bg-slate-800/50">
                                        <TableCell colSpan={3} className="font-semibold">
                                            <div className="flex items-center">
                                            <FileText size={16} className="mr-2 text-primary"/> {doc.id_documento} ({doc.tipo}) - {formatDateFn(parseISO(doc.data), 'dd/MM/yy')} - {doc.cliente_nome}
                                            </div>
                                        </TableCell>
                                        <TableCell colSpan={5} className="text-right font-semibold">Valor Doc: {formatCurrency(doc.valor_total_documento)}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">{formatCurrency(doc.total_comissao_documento)}</TableCell>
                                    </TableRow>
                                    {doc.itens.map((item, index) => (
                                        <TableRow key={`${doc.id_documento}-${index}`}>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell></TableCell>
                                            <TableCell>{item.nome}</TableCell>
                                            <TableCell className="text-right">{item.quantidade}</TableCell>
                                            <TableCell className="text-right">{formatNumber(item.valor_unitario)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(item.valor_total_item)}</TableCell>
                                            <TableCell className="text-right">{formatNumber(item.percentual_comissao_aplicado, 1)}%</TableCell>
                                            <TableCell className="text-right text-green-600 dark:text-green-400">{formatNumber(item.valor_comissao_item)}</TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </CardContent>
            {dadosComissao.comissoesDetalhadas.length === 0 && (
                <CardFooter className="justify-center py-8">
                    <div className="text-center text-muted-foreground">
                        <Filter size={32} className="mx-auto mb-2 opacity-50"/>
                        <p>Não há dados para exibir com os filtros atuais.</p>
                        {!selectedFuncionarioId && <p>Por favor, selecione um funcionário.</p>}
                        {selectedFuncionarioId && (!dateRange?.from && !dateRange?.to) && <p>Por favor, selecione um período.</p>}
                    </div>
                </CardFooter>
            )}
        </Card>
        </>
      )}
      {!selectedFuncionarioId &&
        <div className="text-center py-10 text-muted-foreground">
            <Users size={48} className="mx-auto mb-4 opacity-50"/>
            <p>Selecione um funcionário e um período para visualizar as comissões.</p>
        </div>
      }
       {selectedFuncionarioId && (!dateRange?.from && !dateRange?.to) &&
        <div className="text-center py-10 text-muted-foreground">
            <CalendarDays size={48} className="mx-auto mb-4 opacity-50"/>
            <p>Por favor, selecione um período para visualizar as comissões.</p>
        </div>
      }
    </motion.div>
  );
};

export default RelatorioComissoesPage;