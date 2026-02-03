import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Printer, DollarSign, Filter, Clock, CheckCircle, AlertCircle, FileText, CalendarIcon } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { contasReceberService } from '@/services/contasReceberService';
import { clienteService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { usePermissions } from '@/hooks/usePermissions';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

const RelatorioContasReceber = () => {
    const { toast } = useToast();
    const { isAdmin } = usePermissions();
    const [contas, setContas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [filteredContas, setFilteredContas] = useState([]);
    
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [filtroCliente, setFiltroCliente] = useState('todos');
    const [buscaCliente, setBuscaCliente] = useState('');
    const [clienteSelecionado, setClienteSelecionado] = useState(null);
    const [sugestoesClientes, setSugestoesClientes] = useState([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
    const [tipoFiltroData, setTipoFiltroData] = useState('vencimento'); // 'vencimento' ou 'pagamento'
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar configurações da empresa
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);

                // Carregar contas a receber da API
                const responseContas = await contasReceberService.getContasReceber();
                let contasDaAPI = responseContas.data || [];
                
                // Função para obter a data do último pagamento
                const getDataUltimoPagamento = (conta) => {
                    if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos) && conta.historico_pagamentos.length > 0) {
                        const pagamentosOrdenados = conta.historico_pagamentos
                            .filter(pag => pag.data)
                            .sort((p1, p2) => new Date(p2.data) - new Date(p1.data));
                        if (pagamentosOrdenados.length > 0) {
                            return pagamentosOrdenados[0].data;
                        }
                    }
                    return conta.data_quitacao || null;
                };

                // Transformar dados da API para o formato esperado pelo frontend
                const contasTransformadas = contasDaAPI.map(conta => {
                    return {
                        id: conta.id,
                        vendaId: conta.venda_id || null,
                        osId: conta.os_id || null,
                        envelopamentoId: conta.envelopamento_id || null,
                        clienteId: conta.cliente_id,
                        clienteNome: conta.cliente?.nome_completo || conta.cliente?.apelido_fantasia || 'Cliente não encontrado',
                        valor_pendente: parseFloat(conta.valor_pendente) || 0,
                        valor_original: parseFloat(conta.valor_original) || 0,
                        juros_aplicados: parseFloat(conta.juros_aplicados) || 0,
                        descricao: conta.descricao || 'Conta a receber',
                        dataLancamento: conta.data_emissao || new Date().toISOString(),
                        vencimento: conta.data_vencimento || new Date().toISOString(),
                        status: conta.status_calculado || conta.status || 'pendente', // Usar status_calculado primeiro
                        observacoes: conta.observacoes || '',
                        observacao_venda: conta.observacoes || '',
                        pagamentos: conta.historico_pagamentos || [],
                        data_quitacao: conta.data_quitacao || null,
                        dataPagamento: getDataUltimoPagamento(conta),
                        info_adicional: conta.info_adicional || null,
                    };
                });

                // Atualizar status para vencido se necessário
                const contasComStatusAtualizado = contasTransformadas.map(conta => {
                    if (conta.status === 'pendente' && isValid(parseISO(conta.vencimento)) && differenceInDays(new Date(), parseISO(conta.vencimento)) > 0) {
                        return { ...conta, status: 'vencido' };
                    }
                    return conta;
                });

                setContas(contasComStatusAtualizado);

                // Carregar clientes da API
                const responseClientes = await clienteService.getAll();
                const clientesData = responseClientes.data?.data?.data || responseClientes.data?.data || responseClientes.data || [];
                const clientesArray = Array.isArray(clientesData) ? clientesData : [];
                setClientes(clientesArray);

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: "Erro ao carregar dados", 
                    description: "Não foi possível carregar as contas a receber da API.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    // Função para buscar clientes
    const buscarClientes = (termo) => {
        if (!termo || termo.length < 2) {
            setSugestoesClientes([]);
            setMostrarSugestoes(false);
            return;
        }
        
        const clientesFiltrados = clientes.filter(cliente => {
            const nomeCompleto = cliente.nome_completo || '';
            const apelidoFantasia = cliente.apelido_fantasia || '';
            const nome = cliente.nome || '';
            const termoLower = termo.toLowerCase();
            
            return nomeCompleto.toLowerCase().includes(termoLower) ||
                   apelidoFantasia.toLowerCase().includes(termoLower) ||
                   nome.toLowerCase().includes(termoLower);
        });
        
        setSugestoesClientes(clientesFiltrados.slice(0, 10)); // Limitar a 10 sugestões
        setMostrarSugestoes(true);
    };

    // Função para selecionar cliente
    const selecionarCliente = (cliente) => {
        setClienteSelecionado(cliente);
        setBuscaCliente(cliente.nome_completo || cliente.apelido_fantasia || cliente.nome || 'Cliente sem nome');
        setFiltroCliente(cliente.id);
        setMostrarSugestoes(false);
    };

    // Função para limpar busca
    const limparBuscaCliente = () => {
        setBuscaCliente('');
        setClienteSelecionado(null);
        setFiltroCliente('todos');
        setSugestoesClientes([]);
        setMostrarSugestoes(false);
    };

    useEffect(() => {
        let items = [...contas];
        if (filtroStatus !== 'todos') {
            // Quando filtrar por "quitada", também incluir "recebido" pois o backend converte quitada para recebido
            if (filtroStatus === 'quitada') {
                items = items.filter(c => c.status === 'recebido' || c.status === 'quitada');
            } else {
                items = items.filter(c => c.status === filtroStatus);
            }
        }
        if (filtroCliente !== 'todos') items = items.filter(c => c.clienteId === filtroCliente);
        
        // Filtro por data - usar data de pagamento ou vencimento baseado no tipo selecionado
        if (filtroPeriodo.inicio) {
            const dataInicio = new Date(filtroPeriodo.inicio);
            items = items.filter(c => {
                let dataParaFiltrar;
                if (tipoFiltroData === 'pagamento') {
                    // Filtrar por data de pagamento
                    if (c.pagamentos && Array.isArray(c.pagamentos) && c.pagamentos.length > 0) {
                        // Pegar a data do último pagamento
                        const ultimoPagamento = c.pagamentos
                            .filter(pag => pag.data)
                            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
                        dataParaFiltrar = ultimoPagamento ? new Date(ultimoPagamento.data) : null;
                    } else {
                        dataParaFiltrar = null;
                    }
                    // Se não tem data de pagamento, não incluir no filtro
                    if (!dataParaFiltrar) return false;
                } else {
                    // Filtrar por data de vencimento (padrão)
                    dataParaFiltrar = new Date(c.vencimento);
                }
                return dataParaFiltrar >= dataInicio;
            });
        }
        
        if (filtroPeriodo.fim) {
            const fim = new Date(filtroPeriodo.fim);
            fim.setHours(23, 59, 59, 999);
            items = items.filter(c => {
                let dataParaFiltrar;
                if (tipoFiltroData === 'pagamento') {
                    // Filtrar por data de pagamento
                    if (c.pagamentos && Array.isArray(c.pagamentos) && c.pagamentos.length > 0) {
                        // Pegar a data do último pagamento
                        const ultimoPagamento = c.pagamentos
                            .filter(pag => pag.data)
                            .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
                        dataParaFiltrar = ultimoPagamento ? new Date(ultimoPagamento.data) : null;
                    } else {
                        dataParaFiltrar = null;
                    }
                    // Se não tem data de pagamento, não incluir no filtro
                    if (!dataParaFiltrar) return false;
                } else {
                    // Filtrar por data de vencimento (padrão)
                    dataParaFiltrar = new Date(c.vencimento);
                }
                return dataParaFiltrar <= fim;
            });
        }
        
        setFilteredContas(items);
    }, [contas, filtroStatus, filtroCliente, filtroPeriodo, tipoFiltroData]);

    // Fechar sugestões quando clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.relative')) {
                setMostrarSugestoes(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const totais = useMemo(() => {
        // Total pendente: contas com status pendente, vencido ou parcialmente pago
        const pendente = filteredContas
            .filter(c => c.status === 'pendente' || c.status === 'vencido' || c.status === 'parcialmente_pago')
            .reduce((acc, c) => {
                // Para contas vencidas, usar valor original se valor pendente for 0
                if (c.status === 'vencido' && parseFloat(c.valor_pendente) === 0) {
                    return acc + (parseFloat(c.valor_original) || 0);
                }
                return acc + (parseFloat(c.valor_pendente) || 0);
            }, 0);
        
        // Total recebido: APENAS contas com status recebido ou quitada (parceladas não são totalmente recebidas)
        const recebido = filteredContas
            .filter(c => c.status === 'recebido' || c.status === 'quitada')
            .reduce((acc, c) => {
                // Usar valor original + juros para calcular o que foi recebido
                const valorOriginal = parseFloat(c.valor_original) || 0;
                const juros = parseFloat(c.juros_aplicados) || 0;
                return acc + valorOriginal + juros;
            }, 0);
        
        return { pendente, recebido };
    }, [filteredContas]);

    const getStatusBadge = (status) => {
        if (status === 'recebido' || status === 'quitada') return <span className="flex items-center text-green-600"><CheckCircle size={14} className="mr-1"/> Recebido</span>;
        if (status === 'vencido') return <span className="flex items-center text-red-600"><AlertCircle size={14} className="mr-1"/> Vencido</span>;
        if (status === 'parcial' || status === 'parcialmente_pago') return <span className="flex items-center text-blue-600"><Clock size={14} className="mr-1"/> Parcial</span>;
        return <span className="flex items-center text-yellow-600"><Clock size={14} className="mr-1"/> Pendente</span>;
    };

    const getOrigemBadge = (conta) => {
        // Verificar se é uma venda PDV
        if (conta.vendaId) {
            if (conta.observacao_venda && conta.observacao_venda.includes('PDV')) {
                return <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>PDV</span>;
            }
            if (conta.observacao_venda && conta.observacao_venda.includes('VEN')) {
                return <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full dark:bg-green-900 dark:text-green-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Venda</span>;
            }
            return <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full dark:bg-purple-900 dark:text-purple-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Venda</span>;
        }
        
        // Verificar se é uma OS (Ordem de Serviço)
        if (conta.osId || (conta.observacao_venda && (conta.observacao_venda.includes('OS') || conta.observacao_venda.includes('Ordem de Serviço')))) {
            return <span className="px-2 py-1 text-xs font-medium text-orange-800 bg-orange-100 rounded-full dark:bg-orange-900 dark:text-orange-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>OS</span>;
        }
        
        // Verificar se é um Envelopamento
        if (conta.envelopamentoId || (conta.observacao_venda && (conta.observacao_venda.includes('ENV') || conta.observacao_venda.includes('Envelopamento')))) {
            return <span className="px-2 py-1 text-xs font-medium text-indigo-800 bg-indigo-100 rounded-full dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Envelopamento</span>;
        }
        
        // Verificar se é um orçamento
        if (conta.observacao_venda && (conta.observacao_venda.includes('Orçamento') || conta.observacao_venda.includes('ORC'))) {
            return <span className="px-2 py-1 text-xs font-medium text-teal-800 bg-teal-100 rounded-full dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Orçamento</span>;
        }
        
        // Verificar se é crediário
        if (conta.observacao_venda && conta.observacao_venda.includes('Crediário')) {
            return <span className="px-2 py-1 text-xs font-medium text-amber-800 bg-amber-100 rounded-full dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center"><FileText size={12} className="mr-1"/>Crediário</span>;
        }
        
        // Padrão para lançamentos manuais
        return <span className="px-2 py-1 text-xs font-medium text-gray-800 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-300 flex items-center justify-center"><CalendarIcon size={12} className="mr-1"/>Lançamento</span>;
    };

    const getCodigoReferencia = (conta) => {
        // Para OS (Ordem de Serviço), usar os_id se disponível
        if (conta.osId) {
            return `OS-${conta.osId}`;
        }
        
        // Fallback: Para OS sem os_id, mostrar "OS-" + ID da conta
        if (conta.observacao_venda && (conta.observacao_venda.includes('OS') || conta.observacao_venda.includes('Ordem de Serviço'))) {
            return `OS-${conta.id}`;
        }
        
        // Para envelopamentos, usar envelopamentoId se disponível, senão usar ID da conta
        if (conta.envelopamentoId) {
            return `ENV-${conta.envelopamentoId}`;
        }
        
        // Fallback: Para Envelopamento sem envelopamentoId, mostrar "ENV-" + ID da conta
        if (conta.observacao_venda && (conta.observacao_venda.includes('ENV') || conta.observacao_venda.includes('Envelopamento'))) {
            return `ENV-${conta.id}`;
        }
        
        // Para vendas, usar vendaId se disponível
        if (conta.vendaId) {
            return `VEN-${conta.vendaId}`;
        }
        
        // Fallback: usar ID da conta
        return `#${conta.id}`;
    };

    const renderContasRecebidasPorFormaPagamento = () => {
        // Filtrar apenas contas recebidas/quitadas
        const contasRecebidas = filteredContas.filter(c => c.status === 'recebido' || c.status === 'quitada');
        
        if (contasRecebidas.length === 0) {
            return (
                <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                    <p>Nenhuma conta recebida encontrada no período selecionado.</p>
                </div>
            );
        }

        // Agrupar por forma de pagamento e data
        const agrupamento = {};
        
        contasRecebidas.forEach(conta => {
            if (conta.pagamentos && Array.isArray(conta.pagamentos) && conta.pagamentos.length > 0) {
                // Se tem histórico de pagamentos, usar a data do último pagamento
                const ultimoPagamento = conta.pagamentos
                    .filter(pag => pag.data)
                    .sort((a, b) => new Date(b.data) - new Date(a.data))[0];
                
                if (ultimoPagamento) {
                    const dataPagamento = ultimoPagamento.data.split('T')[0]; // Apenas a data
                    const formaPagamento = ultimoPagamento.forma_pagamento || 'Não informado';
                    const chave = `${dataPagamento}_${formaPagamento}`;
                    
                    if (!agrupamento[chave]) {
                        agrupamento[chave] = {
                            data: dataPagamento,
                            formaPagamento: formaPagamento,
                            contas: [],
                            total: 0
                        };
                    }
                    
                    agrupamento[chave].contas.push(conta);
                    agrupamento[chave].total += (parseFloat(conta.valor_original) || 0) + (parseFloat(conta.juros_aplicados) || 0);
                }
            } else {
                // Fallback: usar data de lançamento se não tem histórico de pagamentos
                const dataLancamento = conta.dataLancamento.split('T')[0];
                const formaPagamento = 'Não informado';
                const chave = `${dataLancamento}_${formaPagamento}`;
                
                if (!agrupamento[chave]) {
                    agrupamento[chave] = {
                        data: dataLancamento,
                        formaPagamento: formaPagamento,
                        contas: [],
                        total: 0
                    };
                }
                
                agrupamento[chave].contas.push(conta);
                agrupamento[chave].total += (parseFloat(conta.valor_original) || 0) + (parseFloat(conta.juros_aplicados) || 0);
            }
        });

        // Converter para array e ordenar por data (mais recente primeiro)
        const grupos = Object.values(agrupamento).sort((a, b) => new Date(b.data) - new Date(a.data));

        return (
            <div className="space-y-4">
                {grupos.map((grupo, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="font-semibold text-green-800 dark:text-green-300">
                                    {format(new Date(grupo.data), 'dd/MM/yyyy')}
                                </h4>
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    {grupo.formaPagamento} • {grupo.contas.length} conta{grupo.contas.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                    {formatCurrency(grupo.total)}
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {grupo.contas.map(conta => (
                                <div key={conta.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 rounded p-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{conta.clienteNome}</p>
                                        <p className="text-muted-foreground text-xs truncate">{conta.descricao}</p>
                                    </div>
                                    <div className="text-right ml-2">
                                        <p className="font-semibold">
                                            {formatCurrency((parseFloat(conta.valor_original) || 0) + (parseFloat(conta.juros_aplicados) || 0))}
                                        </p>
                                        {parseFloat(conta.juros_aplicados) > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                + {formatCurrency(parseFloat(conta.juros_aplicados))} juros
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {/* Resumo Total */}
                <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Total Recebido no Período</h3>
                        <p className="text-xl font-bold text-green-600">
                            {formatCurrency(grupos.reduce((acc, grupo) => acc + grupo.total, 0))}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    const handleExportPDF = () => {
        // Simplificar colunas para o PDF - encurtar nomes para caber na página
        const headers = [
            ['Cliente', 'V. Original', 'V. Pendente', 'Juros', 'Status', 'Emissão', 'Vencimento', 'Pagamento', 'Origem', 'Descrição']
        ];
        
        const data = filteredContas.map(c => {
            // Limitar tamanho dos textos para evitar problemas no PDF - mais restritivo
            const truncateText = (text, maxLength = 20) => {
                if (!text) return '-';
                const str = String(text);
                return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
            };
            
            // Combinar origem e código de referência
            const origemRef = (() => {
                let origem = '';
                if (c.vendaId) origem = 'Venda';
                else if (c.osId) origem = 'OS';
                else if (c.envelopamentoId) origem = 'Envelopamento';
                else origem = 'Lançamento';
                return `${origem} - ${getCodigoReferencia(c)}`;
            })();
            
            // Observações simplificadas
            const observacoes = (() => {
                if (c.osId && c.info_adicional) {
                    const observacoesOS = c.info_adicional?.observacoes || c.observacoes || '';
                    const observacoesItens = c.info_adicional?.observacoes_itens || '';
                    let todasObservacoes = [];
                    if (observacoesOS.trim()) {
                        todasObservacoes.push(observacoesOS.trim());
                    }
                    if (observacoesItens.trim()) {
                        todasObservacoes.push(observacoesItens.trim());
                    }
                    return todasObservacoes.join(' | ') || c.observacoes || '-';
                } else if (c.envelopamentoId && c.info_adicional) {
                    return c.info_adicional?.observacoes || c.observacoes || '-';
                } else {
                    return c.observacoes || '-';
                }
            })();
            
            return [
                truncateText(c.clienteNome, 18),
                formatCurrency(parseFloat(c.valor_original) || 0),
                formatCurrency(parseFloat(c.valor_pendente) || 0),
                parseFloat(c.juros_aplicados) > 0 ? formatCurrency(parseFloat(c.juros_aplicados)) : '-',
                c.status === 'recebido' || c.status === 'quitada' ? 'Rec.' : 
                c.status === 'vencido' ? 'Venc.' : 
                c.status === 'parcial' || c.status === 'parcialmente_pago' ? 'Parc.' : 'Pend.',
                isValid(parseISO(c.dataLancamento)) ? format(parseISO(c.dataLancamento), 'dd/MM/yy') : 'N/A',
                isValid(parseISO(c.vencimento)) ? format(parseISO(c.vencimento), 'dd/MM/yy') : 'N/A',
                c.dataPagamento && isValid(parseISO(c.dataPagamento)) ? format(parseISO(c.dataPagamento), 'dd/MM/yy') : '-',
                truncateText(origemRef, 15),
                truncateText(c.descricao || observacoes, 20)
            ];
        });
        
        const summary = [
            { label: 'Total Pendente/Vencido (Filtrado)', value: formatCurrency(totais.pendente) },
            { label: 'Total Recebido (Filtrado)', value: formatCurrency(totais.recebido) },
            { label: 'Total de Contas', value: filteredContas.length.toString() }
        ];
        
        exportToPdf('Relatório de Contas a Receber', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de contas a receber foi exportado." });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Contas a Receber</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando contas a receber...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Contas a Receber</CardTitle>
                <CardDescription>Análise detalhada de seus recebíveis.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos Status</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                    <SelectItem value="parcial">Parcial</SelectItem>
                                    <SelectItem value="quitada">Quitada</SelectItem>
                                    <SelectItem value="vencido">Vencido</SelectItem>
                                </SelectContent>
                            </Select>
                            <div className="relative">
                                <Input
                                    type="text"
                                    placeholder="Buscar cliente..."
                                    value={buscaCliente}
                                    onChange={(e) => {
                                        setBuscaCliente(e.target.value);
                                        buscarClientes(e.target.value);
                                    }}
                                    onFocus={() => {
                                        if (sugestoesClientes.length > 0) {
                                            setMostrarSugestoes(true);
                                        }
                                    }}
                                    className="pr-8"
                                />
                                {buscaCliente && (
                                    <button
                                        type="button"
                                        onClick={limparBuscaCliente}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                )}
                                {mostrarSugestoes && sugestoesClientes.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {sugestoesClientes.map((cliente) => (
                                            <div
                                                key={cliente.id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                                onClick={() => selecionarCliente(cliente)}
                                            >
                                                <div className="font-medium">
                                                    {cliente.nome_completo || cliente.apelido_fantasia || cliente.nome || 'Cliente sem nome'}
                                                </div>
                                                {(cliente.apelido_fantasia && cliente.nome_completo) && (
                                                    <div className="text-sm text-gray-500">
                                                        {cliente.apelido_fantasia}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select value={tipoFiltroData} onValueChange={setTipoFiltroData}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vencimento">Data de Vencimento</SelectItem>
                                    <SelectItem value="pagamento">Data de Pagamento</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input 
                                type="date" 
                                value={filtroPeriodo.inicio} 
                                onChange={e => setFiltroPeriodo(p => ({...p, inicio: e.target.value}))} 
                                placeholder="Data Início"
                            />
                            <Input 
                                type="date" 
                                value={filtroPeriodo.fim} 
                                onChange={e => setFiltroPeriodo(p => ({...p, fim: e.target.value}))} 
                                placeholder="Data Fim"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {tipoFiltroData === 'vencimento' 
                            ? 'Filtrando por data de vencimento das contas' 
                            : 'Filtrando por data de pagamento (apenas contas pagas)'}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Pendente/Vencido</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(totais.pendente)}</div>
                        </CardContent>
                    </Card>
                    {isAdmin && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Recebido (no Período)</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.recebido)}</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Seção de Contas Recebidas por Forma de Pagamento */}
                {isAdmin && (
                    <Card className="mb-4">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <CheckCircle className="h-5 w-5 mr-2 text-green-600"/>
                                Contas Recebidas
                            </CardTitle>
                            <CardDescription>
                                Mostra valores recebidos de crediário por forma de pagamento na data em que foram marcados como recebidos
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderContasRecebidasPorFormaPagamento()}
                        </CardContent>
                    </Card>
                )}

                {/* Layout Mobile - Cards */}
                <div className="md:hidden">
                    <ScrollArea className="h-[500px]">
                        {filteredContas.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <DollarSign size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma conta a receber encontrada com os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredContas.map(conta => (
                                    <motion.div
                                        key={conta.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm break-words">{conta.clienteNome}</h3>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    {getStatusBadge(conta.status)}
                                                    {getOrigemBadge(conta)}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 font-mono">
                                                    {getCodigoReferencia(conta)}
                                                </p>
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-sm text-muted-foreground">Pendente</p>
                                                <p className="text-lg font-bold text-primary">
                                                    {formatCurrency(parseFloat(conta.valor_pendente))}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 border-t pt-2 mt-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Valor Original</p>
                                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                                        {formatCurrency(parseFloat(conta.valor_original) || 0)}
                                                    </p>
                                                </div>
                                                {parseFloat(conta.juros_aplicados) > 0 && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Juros</p>
                                                        <p className="text-sm font-semibold text-red-600">
                                                            {formatCurrency(parseFloat(conta.juros_aplicados))}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Emissão</p>
                                                    <p className="text-sm">
                                                        {isValid(parseISO(conta.dataLancamento)) ? format(parseISO(conta.dataLancamento), 'dd/MM/yyyy') : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Vencimento</p>
                                                    <p className="text-sm">
                                                        {isValid(parseISO(conta.vencimento)) ? format(parseISO(conta.vencimento), 'dd/MM/yyyy') : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            {conta.dataPagamento && isValid(parseISO(conta.dataPagamento)) && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Pagamento</p>
                                                    <p className="text-sm text-green-600 font-semibold">
                                                        {format(parseISO(conta.dataPagamento), 'dd/MM/yyyy')}
                                                    </p>
                                                </div>
                                            )}
                                            {conta.descricao && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Descrição</p>
                                                    <p className="text-sm break-words">{conta.descricao}</p>
                                                </div>
                                            )}
                                            {conta.observacoes && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Observações</p>
                                                    <p className="text-xs break-words whitespace-pre-wrap text-muted-foreground">
                                                        {(() => {
                                                            if (conta.osId && conta.info_adicional) {
                                                                const observacoesOS = conta.info_adicional?.observacoes || conta.observacoes || '';
                                                                const observacoesItens = conta.info_adicional?.observacoes_itens || '';
                                                                let todasObservacoes = [];
                                                                if (observacoesOS.trim()) {
                                                                    todasObservacoes.push(observacoesOS.trim());
                                                                }
                                                                if (observacoesItens.trim()) {
                                                                    todasObservacoes.push(observacoesItens.trim());
                                                                }
                                                                return todasObservacoes.join('\n') || conta.observacoes;
                                                            } else if (conta.envelopamentoId && conta.info_adicional) {
                                                                return conta.info_adicional?.observacoes || conta.observacoes || '';
                                                            } else {
                                                                return conta.observacoes;
                                                            }
                                                        })()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Layout Desktop - Tabela */}
                <div className="hidden md:block">
                    <div className="overflow-x-auto overflow-y-auto max-h-[500px] border rounded-md">
                        <div className="min-w-full inline-block">
                            <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                                    <TableHead className="text-right min-w-[120px]">Valor Original</TableHead>
                                    <TableHead className="text-right min-w-[120px]">Valor Pendente</TableHead>
                                    <TableHead className="text-right min-w-[100px]">Juros</TableHead>
                                    <TableHead className="text-center min-w-[100px]">Status</TableHead>
                                    <TableHead className="text-center min-w-[100px]">Emissão</TableHead>
                                    <TableHead className="text-center min-w-[100px]">Vencimento</TableHead>
                                    <TableHead className="text-center min-w-[100px]">Pagamento</TableHead>
                                    <TableHead className="text-center min-w-[100px]">Origem</TableHead>
                                    <TableHead className="text-center min-w-[120px]">Código Ref.</TableHead>
                                    <TableHead className="min-w-[200px]">Descrição</TableHead>
                                    <TableHead className="min-w-[200px]">Observações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredContas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                                            Nenhuma conta a receber encontrada com os filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredContas.map(conta => (
                                        <TableRow key={conta.id} className="hover:bg-accent/50">
                                            <TableCell className="font-medium min-w-[150px]">{conta.clienteNome}</TableCell>
                                            <TableCell className="text-right font-semibold text-gray-600 dark:text-gray-400 min-w-[120px]">
                                                {formatCurrency(parseFloat(conta.valor_original) || 0)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-primary min-w-[120px]">
                                                {formatCurrency(parseFloat(conta.valor_pendente) || 0)}
                                            </TableCell>
                                            <TableCell className="text-right min-w-[100px]">
                                                {parseFloat(conta.juros_aplicados) > 0 ? (
                                                    <span className="text-red-600 font-medium">
                                                        {formatCurrency(parseFloat(conta.juros_aplicados))}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">{getStatusBadge(conta.status)}</TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                {isValid(parseISO(conta.dataLancamento)) ? format(parseISO(conta.dataLancamento), 'dd/MM/yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                {isValid(parseISO(conta.vencimento)) ? format(parseISO(conta.vencimento), 'dd/MM/yyyy') : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                {conta.dataPagamento && isValid(parseISO(conta.dataPagamento)) ? 
                                                    format(parseISO(conta.dataPagamento), 'dd/MM/yyyy') : '-'}
                                            </TableCell>
                                            <TableCell className="text-center min-w-[100px]">
                                                {getOrigemBadge(conta)}
                                            </TableCell>
                                            <TableCell className="text-center text-sm font-mono min-w-[120px]">
                                                {getCodigoReferencia(conta)}
                                            </TableCell>
                                            <TableCell className="min-w-[200px]">
                                                <div className="text-sm break-words">{conta.descricao || '-'}</div>
                                            </TableCell>
                                            <TableCell className="min-w-[200px]">
                                                <div className="text-xs text-muted-foreground break-words whitespace-pre-wrap max-h-20 overflow-y-auto">
                                                    {(() => {
                                                        if (conta.osId && conta.info_adicional) {
                                                            const observacoesOS = conta.info_adicional?.observacoes || conta.observacoes || '';
                                                            const observacoesItens = conta.info_adicional?.observacoes_itens || '';
                                                            let todasObservacoes = [];
                                                            if (observacoesOS.trim()) {
                                                                todasObservacoes.push(observacoesOS.trim());
                                                            }
                                                            if (observacoesItens.trim()) {
                                                                todasObservacoes.push(observacoesItens.trim());
                                                            }
                                                            return todasObservacoes.join('\n') || '-';
                                                        } else if (conta.envelopamentoId && conta.info_adicional) {
                                                            return conta.info_adicional?.observacoes || conta.observacoes || '-';
                                                        } else {
                                                            return conta.observacoes || conta.descricao || '-';
                                                        }
                                                    })()}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF} disabled={filteredContas.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioContasReceber;