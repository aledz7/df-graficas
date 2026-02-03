import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, parse } from 'date-fns';
import { Printer, Wallet as Bank, Filter, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { lancamentoCaixaService } from '@/services/api';
import { contaBancariaService } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';

// Função helper para parsear datas em vários formatos
const parseFlexibleDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Se já é um objeto Date válido
    if (dateStr instanceof Date && isValid(dateStr)) {
        return dateStr;
    }
    
    // Converter para string se necessário
    const str = String(dateStr);
    
    // Tentar parseISO primeiro (formato ISO 8601: 2024-01-15T10:30:00.000000Z)
    let parsed = parseISO(str);
    if (isValid(parsed)) return parsed;
    
    // Tentar com new Date() nativo
    parsed = new Date(str);
    if (isValid(parsed)) return parsed;
    
    // Tentar formato brasileiro dd/mm/yyyy
    const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) {
        parsed = new Date(brMatch[3], brMatch[2] - 1, brMatch[1]);
        if (isValid(parsed)) return parsed;
    }
    
    // Tentar formato yyyy-mm-dd HH:mm:ss (MySQL)
    const mysqlMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (mysqlMatch) {
        parsed = new Date(mysqlMatch[1], mysqlMatch[2] - 1, mysqlMatch[3], mysqlMatch[4], mysqlMatch[5], mysqlMatch[6]);
        if (isValid(parsed)) return parsed;
    }
    
    return null;
};

const RelatorioMovimentacoesBancarias = () => {
    const { toast } = useToast();
    const { isAdmin } = usePermissions();
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [contasBancarias, setContasBancarias] = useState([]);
    const [filteredMovs, setFilteredMovs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [filtroConta, setFiltroConta] = useState('todos');
    const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' });
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                // Carregar configurações da empresa
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);

                // Carregar contas bancárias da API
                const responseContas = await contaBancariaService.getAll();
                console.log('Resposta de contas bancárias:', responseContas);
                
                let contasArray = [];
                if (responseContas && responseContas.data) {
                    if (responseContas.data.data?.data && Array.isArray(responseContas.data.data.data)) {
                        contasArray = responseContas.data.data.data;
                    } else if (responseContas.data.data && Array.isArray(responseContas.data.data)) {
                        contasArray = responseContas.data.data;
                    } else if (Array.isArray(responseContas.data)) {
                        contasArray = responseContas.data;
                    }
                } else if (Array.isArray(responseContas)) {
                    contasArray = responseContas;
                }
                
                console.log('Contas bancárias extraídas:', contasArray);
                setContasBancarias(contasArray);

                // Carregar movimentações bancárias da API
                // Buscar todas as páginas se necessário (máximo permitido pelo backend é 1000 por página)
                let movimentacoesDaAPI = [];
                let currentPage = 1;
                let hasMorePages = true;
                const perPage = 1000;
                const maxPages = 100; // Limite de segurança para evitar loops infinitos
                
                while (hasMorePages && currentPage <= maxPages) {
                    const responseMovimentacoes = await lancamentoCaixaService.getAll({ 
                        per_page: perPage, 
                        page: currentPage 
                    });
                    
                    console.log(`🔍 Resposta da API - Página ${currentPage}:`, responseMovimentacoes);
                    
                    // Extrair dados da resposta paginada do Laravel
                    // Estrutura esperada: { success: true, message: "...", data: { data: [...], current_page, total, last_page, ... } }
                    let pageData = [];
                    
                    if (responseMovimentacoes.data) {
                        // Estrutura 1: Resposta com wrapper do BaseController { success: true, data: { data: [...], ... } }
                        if (responseMovimentacoes.data.data && responseMovimentacoes.data.data.data && Array.isArray(responseMovimentacoes.data.data.data)) {
                            pageData = responseMovimentacoes.data.data.data;
                            const paginationInfo = responseMovimentacoes.data.data;
                            hasMorePages = paginationInfo.current_page && paginationInfo.last_page && 
                                         paginationInfo.current_page < paginationInfo.last_page;
                        }
                        // Estrutura 2: Resposta paginada direta { data: { data: [...], current_page, total, last_page, etc } }
                        else if (responseMovimentacoes.data.data && Array.isArray(responseMovimentacoes.data.data)) {
                            pageData = responseMovimentacoes.data.data;
                            const paginationInfo = responseMovimentacoes.data;
                            hasMorePages = paginationInfo.current_page && paginationInfo.last_page && 
                                         paginationInfo.current_page < paginationInfo.last_page;
                        }
                        // Estrutura 3: Array direto { data: [...] }
                        else if (Array.isArray(responseMovimentacoes.data)) {
                            pageData = responseMovimentacoes.data;
                            hasMorePages = false; // Se for array direto, assumir que é tudo
                        }
                    }
                    
                    // Se não conseguiu detectar paginação, verificar se há dados
                    // Se não há dados, não há mais páginas
                    if (pageData.length === 0) {
                        hasMorePages = false;
                    }
                    
                    // Garantir que pageData seja sempre um array
                    if (!Array.isArray(pageData)) {
                        console.warn(`⚠️ pageData não é um array na página ${currentPage}:`, pageData);
                        pageData = [];
                    }
                    
                    movimentacoesDaAPI = [...movimentacoesDaAPI, ...pageData];
                    
                    console.log(`✅ Página ${currentPage}: ${pageData.length} movimentações (Total acumulado: ${movimentacoesDaAPI.length})`);
                    
                    // Se não encontrou dados nesta página ou não há mais páginas, parar
                    if (pageData.length === 0 || !hasMorePages) {
                        hasMorePages = false;
                    } else {
                        currentPage++;
                    }
                }
                
                console.log('✅ Total de movimentações extraídas da API:', movimentacoesDaAPI.length);
                if (movimentacoesDaAPI.length > 0) {
                    console.log('📊 Primeira movimentação:', movimentacoesDaAPI[0]);
                    console.log('📅 Campo data_operacao:', movimentacoesDaAPI[0].data_operacao, typeof movimentacoesDaAPI[0].data_operacao);
                    console.log('📅 Campo data:', movimentacoesDaAPI[0].data, typeof movimentacoesDaAPI[0].data);
                } else {
                    console.warn('⚠️ Nenhuma movimentação encontrada após buscar todas as páginas');
                }
                
                // Transformar dados da API para o formato esperado pelo frontend
                const movimentacoesTransformadas = movimentacoesDaAPI.map(mov => {
                    // Buscar dados da conta bancária
                    const contaBancaria = contasArray.find(conta => {
                        const contaId = conta.id ? parseInt(conta.id) : null;
                        const movContaId = mov.conta_id ? parseInt(mov.conta_id) : null;
                        return contaId === movContaId;
                    });
                    
                    const contaId = mov.conta_id ? parseInt(mov.conta_id) : null;
                    const contaNome = mov.conta_nome || mov.conta?.nome || contaBancaria?.nome || contaBancaria?.nome_banco || 'Conta não encontrada';
                    // Priorizar nome_banco, depois nome da conta, depois metadados
                    const contaBanco = mov.conta?.nome_banco || 
                                     contaBancaria?.nome_banco || 
                                     contaBancaria?.nome || 
                                     mov.conta_nome ||
                                     mov.metadados?.conta_bancaria_banco || 
                                     mov.metadados?.conta_bancaria_nome ||
                                     'Banco não informado';
                    
                    // Parsear a data usando a função flexível - priorizar data_operacao
                    const dataOriginal = mov.data_operacao || mov.data;
                    const dataParsed = parseFlexibleDate(dataOriginal);
                    const dataISO = dataParsed ? dataParsed.toISOString() : new Date().toISOString();
                    
                    return {
                        id: mov.id,
                        data: dataISO,
                        dataOriginal: dataOriginal, // Guardar a data original para debug
                        descricao: mov.descricao || mov.observacoes || 'Movimentação bancária',
                        valor: parseFloat(mov.valor) || 0,
                        tipo: mov.tipo || 'entrada', // entrada, saida, transferencia
                        formaPagamento: mov.forma_pagamento || 'Não informado',
                        categoriaId: mov.categoria_id || null,
                        categoriaNome: mov.categoria?.nome || '',
                        contaId: contaId,
                        contaNome: contaNome,
                        contaBanco: contaBanco,
                        usuarioId: mov.usuario_id || null,
                        usuarioNome: mov.usuario?.name || mov.usuario_nome || 'Usuário não encontrado',
                        status: mov.status || 'concluido',
                        observacoes: mov.observacoes || '',
                    };
                });
                
        console.log('📊 Movimentações transformadas:', movimentacoesTransformadas.length);
        if (movimentacoesTransformadas.length > 0) {
            console.log('📊 Primeira movimentação transformada:', JSON.stringify(movimentacoesTransformadas[0], null, 2));
            console.log('📅 Data transformada (ISO):', movimentacoesTransformadas[0].data);
            console.log('📅 Data original guardada:', movimentacoesTransformadas[0].dataOriginal);
            
            // Mostrar range de datas das movimentações
            const datas = movimentacoesTransformadas.map(m => new Date(m.data)).filter(d => isValid(d));
            if (datas.length > 0) {
                const dataMin = new Date(Math.min(...datas));
                const dataMax = new Date(Math.max(...datas));
                console.log('📅 Range de datas das movimentações:', {
                    maisAntiga: dataMin.toISOString(),
                    maisRecente: dataMax.toISOString(),
                    totalComDataValida: datas.length
                });
            }
            
            // Verificar distribuição de contaId
            const contaIds = movimentacoesTransformadas
                .map(mov => mov.contaId)
                .filter(id => id !== null && id !== undefined);
            const contaIdsUnicos = [...new Set(contaIds)];
            console.log('📊 ContaIds únicos encontrados:', contaIdsUnicos);
            console.log('📊 Distribuição de contaIds:', contaIdsUnicos.map(id => ({
                contaId: id,
                quantidade: contaIds.filter(cid => cid === id).length
            })));
        }

                // Filtrar movimentações em dinheiro (relatório de movimentações bancárias não deve incluir dinheiro)
                // MAS manter saídas mesmo que sejam em dinheiro, pois são importantes para o relatório
                const movimentacoesSemDinheiro = movimentacoesTransformadas.filter(mov => {
                    const formaPagamento = String(mov.formaPagamento || '').toLowerCase();
                    const descricao = String(mov.descricao || '').toLowerCase();
                    const tipo = String(mov.tipo || '').toLowerCase();
                    
                    // Se for saída, sempre incluir (mesmo que seja dinheiro)
                    if (tipo === 'saida') {
                        return true;
                    }
                    
                    // Para entradas, excluir pagamentos em dinheiro
                    return formaPagamento !== 'dinheiro' && 
                           !descricao.includes('dinheiro') &&
                           formaPagamento !== 'cash';
                });
                
                console.log(`💰 Filtrado dinheiro: ${movimentacoesTransformadas.length} -> ${movimentacoesSemDinheiro.length} movimentações`);
                
                // Log de saídas para debug
                const saidas = movimentacoesSemDinheiro.filter(mov => mov.tipo === 'saida');
                console.log(`💰 Total de saídas após filtro: ${saidas.length}`);
                if (saidas.length > 0) {
                    console.log('💰 Primeiras 5 saídas:', saidas.slice(0, 5).map(s => ({
                        id: s.id,
                        descricao: s.descricao,
                        valor: s.valor,
                        contaId: s.contaId,
                        contaNome: s.contaNome,
                        formaPagamento: s.formaPagamento
                    })));
                }

                // Ordenar por data (mais recente primeiro)
                const movimentacoesOrdenadas = movimentacoesSemDinheiro.sort((a, b) => {
                    const dateA = new Date(a.data);
                    const dateB = new Date(b.data);
                    if (!isValid(dateA) && !isValid(dateB)) return 0;
                    if (!isValid(dateA)) return 1;
                    if (!isValid(dateB)) return -1;
                    return dateB - dateA;
                });

                setMovimentacoes(movimentacoesOrdenadas);
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Não foi possível carregar as movimentações bancárias da API.',
                    variant: 'destructive' 
                });
                // Garantir que os estados sejam sempre arrays
                setMovimentacoes([]);
                setContasBancarias([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [toast]);

    useEffect(() => {
        // Garantir que movimentacoes seja sempre um array antes de filtrar
        if (!Array.isArray(movimentacoes)) {
            console.log('⚠️ Movimentações não é um array:', movimentacoes);
            setFilteredMovs([]);
            return;
        }

        console.log('🔍 Aplicando filtros:', {
            totalMovimentacoes: movimentacoes.length,
            filtroConta,
            filtroPeriodo
        });

        let items = [...movimentacoes];
        
        // Filtro por conta bancária
        if (filtroConta !== 'todos') {
            const contaIdFiltro = parseInt(filtroConta);
            const antesFiltro = items.length;
            
            // Debug: verificar tipos e valores
            console.log('🔍 Aplicando filtro por conta:', {
                filtroConta,
                contaIdFiltro,
                tipoFiltro: typeof contaIdFiltro,
                antesFiltro
            });
            
            // Verificar algumas movimentações antes do filtro
            const amostras = items.slice(0, 5).map(mov => ({
                id: mov.id,
                contaId: mov.contaId,
                tipoContaId: typeof mov.contaId,
                contaIdParsed: mov.contaId !== null && mov.contaId !== undefined ? parseInt(String(mov.contaId)) : null,
                match: mov.contaId !== null && mov.contaId !== undefined ? parseInt(String(mov.contaId)) === contaIdFiltro : false
            }));
            console.log('🔍 Amostras de movimentações (primeiras 5):', amostras);
            
            items = items.filter(mov => {
                // Garantir que ambos sejam números para comparação
                const movContaId = mov.contaId !== null && mov.contaId !== undefined 
                    ? parseInt(String(mov.contaId)) 
                    : null;
                
                // Se a movimentação não tem conta_id, incluir apenas se for saída (importante para o relatório)
                if (movContaId === null && mov.tipo === 'saida') {
                    console.log('💰 Incluindo saída sem conta_id:', mov.id, mov.descricao);
                    return true;
                }
                
                return movContaId === contaIdFiltro;
            });
            console.log(`🔍 Filtro por conta ${contaIdFiltro}: ${antesFiltro} -> ${items.length}`);
        }
        
        // Filtro por período
        if (filtroPeriodo.inicio) {
            const inicioDate = parseFlexibleDate(filtroPeriodo.inicio);
            if (inicioDate && isValid(inicioDate)) {
                inicioDate.setHours(0, 0, 0, 0);
                const antesFiltro = items.length;
                
                // Debug: verificar formato das datas antes do filtro
                if (items.length > 0) {
                    const primeiraMov = items[0];
                    const movDateTest = parseFlexibleDate(primeiraMov.data);
                    console.log('🔍 Debug data início - primeira movimentação:', {
                        dataOriginal: primeiraMov.dataOriginal,
                        dataTransformada: primeiraMov.data,
                        movDateParsed: movDateTest ? movDateTest.toISOString() : 'PARSE FALHOU',
                        filtroInicio: filtroPeriodo.inicio,
                        filtroInicioDate: inicioDate.toISOString(),
                        comparacao: movDateTest ? `${movDateTest.toISOString()} >= ${inicioDate.toISOString()} = ${movDateTest >= inicioDate}` : 'N/A'
                    });
                    
                    // Log das primeiras 3 movimentações para debug
                    items.slice(0, 3).forEach((mov, idx) => {
                        const movD = parseFlexibleDate(mov.data);
                        console.log(`📅 Mov ${idx + 1}: data="${mov.data}", parsed=${movD ? movD.toISOString() : 'FALHOU'}, passaria=${movD ? movD >= inicioDate : false}`);
                    });
                }
                
                items = items.filter(mov => {
                    const movDate = parseFlexibleDate(mov.data);
                    if (!movDate || !isValid(movDate)) {
                        console.log('⚠️ Data inválida na movimentação:', mov.id, mov.data, mov.dataOriginal);
                        return false;
                    }
                    return movDate >= inicioDate;
                });
                console.log(`🔍 Filtro por data início: ${antesFiltro} -> ${items.length}`);
            }
        }
        if (filtroPeriodo.fim) {
            const fimDate = parseFlexibleDate(filtroPeriodo.fim);
            if (fimDate && isValid(fimDate)) {
                fimDate.setHours(23, 59, 59, 999);
                const antesFiltro = items.length;
                items = items.filter(mov => {
                    const movDate = parseFlexibleDate(mov.data);
                    return movDate && isValid(movDate) && movDate <= fimDate;
                });
                console.log(`🔍 Filtro por data fim: ${antesFiltro} -> ${items.length}`);
            }
        }
        
        console.log('✅ Movimentações filtradas:', items.length);
        if (items.length > 0) {
            console.log('📊 Primeira movimentação filtrada:', items[0]);
            console.log('📊 contaId da primeira movimentação:', items[0].contaId, 'tipo:', typeof items[0].contaId);
        } else if (filtroConta !== 'todos') {
            // Debug: verificar algumas movimentações para ver qual contaId elas têm
            console.log('🔍 Debug - Primeiras 5 movimentações (antes do filtro):');
            movimentacoes.slice(0, 5).forEach((mov, idx) => {
                console.log(`  ${idx + 1}. ID: ${mov.id}, contaId: ${mov.contaId} (tipo: ${typeof mov.contaId}), contaNome: ${mov.contaNome}`);
            });
        }
        
        setFilteredMovs(items);
    }, [movimentacoes, filtroPeriodo, filtroConta]);
    
    const totalMovimentado = useMemo(() => {
        if (!Array.isArray(filteredMovs)) return 0;
        return filteredMovs.reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
    }, [filteredMovs]);

    // Agrupar movimentações por banco
    const movimentacoesPorBanco = useMemo(() => {
        if (!Array.isArray(filteredMovs)) {
            console.log('⚠️ filteredMovs não é um array no agrupamento');
            return {};
        }
        
        console.log('🔍 Agrupando movimentações por banco. Total:', filteredMovs.length);
        
        const grupos = {};
        filteredMovs.forEach(mov => {
            const banco = mov.contaBanco || mov.contaNome || 'Banco não informado';
            if (!grupos[banco]) {
                grupos[banco] = [];
            }
            grupos[banco].push(mov);
        });
        
        console.log('📊 Grupos por banco:', Object.keys(grupos));
        console.log('📊 Quantidade de grupos:', Object.keys(grupos).length);
        Object.entries(grupos).forEach(([banco, movs]) => {
            console.log(`  - ${banco}: ${movs.length} movimentações`);
        });
        
        return grupos;
    }, [filteredMovs]);

    // Calcular totais por conta bancária
    const totaisPorConta = useMemo(() => {
        if (!Array.isArray(filteredMovs)) return {};
        
        const totais = {};
        filteredMovs.forEach(mov => {
            const contaId = mov.contaId;
            const contaNome = mov.contaNome || 'Conta não encontrada';
            const contaBanco = mov.contaBanco || 'Banco não informado';
            const valor = parseFloat(mov.valor || 0);
            
            if (!totais[contaId]) {
                totais[contaId] = {
                    nome: contaNome,
                    banco: contaBanco,
                    total: 0,
                    entradas: 0,
                    saidas: 0
                };
            }
            
            totais[contaId].total += valor;
            if (mov.tipo === 'entrada') {
                totais[contaId].entradas += valor;
            } else if (mov.tipo === 'saida') {
                totais[contaId].saidas += valor;
            }
        });
        
        return totais;
    }, [filteredMovs]);

    const getTipoIcon = (tipo) => {
        if (tipo === 'entrada') return <ArrowUpRight size={14} className="text-green-600" />;
        if (tipo === 'saida') return <ArrowDownRight size={14} className="text-red-600" />;
        return <Bank size={14} className="text-blue-600" />;
    };

    const getTipoLabel = (tipo) => {
        if (tipo === 'entrada') return 'Entrada';
        if (tipo === 'saida') return 'Saída';
        if (tipo === 'transferencia') return 'Transferência';
        return 'Movimentação';
    };

    const handleExportPDF = () => {
        const headers = [['Data', 'Descrição', 'Tipo', 'Forma de Pagamento', 'Banco', 'Valor (R$)']];
        const data = filteredMovs.map(m => {
            const dateParsed = parseFlexibleDate(m.data);
            return [
                dateParsed && isValid(dateParsed) ? format(dateParsed, 'dd/MM/yyyy HH:mm') : 'N/A',
                m.descricao,
                getTipoLabel(m.tipo),
                m.formaPagamento,
                m.contaBanco,
                formatCurrency(parseFloat(m.valor || 0))
            ];
        });
        
        // Criar resumo com totais por conta
        const summary = [
            { label: 'Total Geral Movimentado', value: formatCurrency(totalMovimentado) },
            ...Object.entries(totaisPorConta).map(([contaId, dados]) => [
                { label: `${dados.banco} - Total`, value: formatCurrency(dados.total) },
                { label: `${dados.banco} - Entradas`, value: formatCurrency(dados.entradas) },
                { label: `${dados.banco} - Saídas`, value: formatCurrency(dados.saidas) }
            ]).flat()
        ];
        
        exportToPdf('Relatório de Movimentações Bancárias', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de movimentações bancárias foi exportado." });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Relatório de Movimentações Bancárias</CardTitle>
                    <CardDescription>Carregando dados...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Carregando movimentações bancárias...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Relatório de Movimentações Bancárias</CardTitle>
                <CardDescription>Movimentações em contas bancárias e caixa.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded-lg mb-4 space-y-4">
                    <h3 className="font-semibold flex items-center"><Filter size={16} className="mr-2"/>Filtros</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={filtroConta} onValueChange={setFiltroConta}>
                            <SelectTrigger><SelectValue placeholder="Conta Bancária"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todas as Contas</SelectItem>
                                {Array.isArray(contasBancarias) && contasBancarias.length > 0 && (
                                    contasBancarias.map(conta => (
                                        <SelectItem key={conta.id} value={String(conta.id)}>
                                            {conta.nome_banco || conta.nome || 'Conta sem nome'}
                                        </SelectItem>
                                    ))
                                )}
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

                {isAdmin && (
                    <Card className="mb-4">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Geral Movimentado</CardTitle>
                            <Bank className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalMovimentado)}</div>
                        </CardContent>
                    </Card>
                )}

                {/* Layout Mobile - Cards */}
                <div className="md:hidden">
                    <ScrollArea className="h-[400px]">
                        {filteredMovs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Bank size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma movimentação encontrada para os filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(movimentacoesPorBanco).map(([banco, movimentacoes]) => {
                                    const totalBanco = movimentacoes.reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                    const totalEntradas = movimentacoes
                                        .filter(mov => mov.tipo === 'entrada')
                                        .reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                    const totalSaidas = movimentacoes
                                        .filter(mov => mov.tipo === 'saida')
                                        .reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                    
                                    return (
                                        <div key={banco}>
                                            <div className="bg-primary/10 px-3 py-2 mb-2 rounded-md sticky top-0 z-10">
                                                <h3 className="font-bold text-primary flex items-center gap-2 text-sm mb-2">
                                                    <Bank size={16} />
                                                    {banco}
                                                </h3>
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div className="text-green-600 font-semibold">
                                                        Entradas<br/>{formatCurrency(totalEntradas)}
                                                    </div>
                                                    <div className="text-red-600 font-semibold">
                                                        Saídas<br/>{formatCurrency(totalSaidas)}
                                                    </div>
                                                    <div className="text-blue-600 font-bold">
                                                        Total<br/>{formatCurrency(totalBanco)}
                                                    </div>
                                                </div>
                                            </div>
                                        <div className="space-y-3">
                                            {movimentacoes.map(mov => (
                                                <motion.div
                                                    key={mov.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm break-words">{mov.descricao}</h3>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge variant="outline" className={`text-xs ${
                                                                    mov.tipo === 'entrada' ? 'text-green-600 border-green-200 bg-green-50' : 
                                                                    mov.tipo === 'saida' ? 'text-red-600 border-red-200 bg-red-50' : 
                                                                    'text-blue-600 border-blue-200 bg-blue-50'
                                                                }`}>
                                                                    {getTipoIcon(mov.tipo)}
                                                                    {getTipoLabel(mov.tipo)}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-right ml-3">
                                                            <p className={`text-lg font-bold ${
                                                                mov.tipo === 'entrada' ? 'text-green-600' : 
                                                                mov.tipo === 'saida' ? 'text-red-600' : 'text-blue-600'
                                                            }`}>
                                                                {mov.tipo === 'saida' ? '- ' : '+ '}{formatCurrency(parseFloat(mov.valor || 0))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-2">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Data</p>
                                                                <p className="text-sm">
                                                                    {parseFlexibleDate(mov.data) && isValid(parseFlexibleDate(mov.data)) ? format(parseFlexibleDate(mov.data), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Forma Pagamento</p>
                                                                <p className="text-sm">{mov.formaPagamento}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Layout Desktop - Tabela */}
                <div className="hidden md:block">
                    <ScrollArea className="h-[400px]">
                        {filteredMovs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Bank size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhuma movimentação encontrada para os filtros aplicados.</p>
                                {filtroConta !== 'todos' && (
                                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                            ℹ️ Nenhuma movimentação encontrada para esta conta bancária.
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                                            As movimentações podem ter sido criadas antes da seleção de conta bancária estar disponível, 
                                            ou podem estar associadas a outras contas. Total de movimentações no sistema: {movimentacoes.length}
                                        </p>
                                        {movimentacoes.length > 0 && (
                                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                                Contas com movimentações: {[...new Set(movimentacoes.map(m => m.contaId).filter(id => id))].join(', ')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : Object.keys(movimentacoesPorBanco).length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Bank size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhum grupo de banco encontrado.</p>
                                <p className="text-xs mt-2">Total de movimentações filtradas: {filteredMovs.length}</p>
                            </div>
                        ) : (
                            Object.entries(movimentacoesPorBanco).map(([banco, movimentacoes]) => {
                                const totalBanco = movimentacoes.reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                const totalEntradas = movimentacoes
                                    .filter(mov => mov.tipo === 'entrada')
                                    .reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                const totalSaidas = movimentacoes
                                    .filter(mov => mov.tipo === 'saida')
                                    .reduce((acc, mov) => acc + parseFloat(mov.valor || 0), 0);
                                
                                return (
                                    <div key={banco} className="mb-6">
                                        <div className="bg-primary/10 px-4 py-3 mb-2 rounded-md">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-bold text-primary flex items-center gap-2">
                                                    <Bank size={18} />
                                                    {banco}
                                                </h3>
                                                <div className="flex gap-4 text-sm">
                                                    <div className="text-green-600 font-semibold">
                                                        Entradas: {formatCurrency(totalEntradas)}
                                                    </div>
                                                    <div className="text-red-600 font-semibold">
                                                        Saídas: {formatCurrency(totalSaidas)}
                                                    </div>
                                                    <div className="text-blue-600 font-bold">
                                                        Total: {formatCurrency(totalBanco)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Descrição</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Forma Pgto.</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {movimentacoes.map(mov => (
                                                <TableRow key={mov.id}>
                                                    <TableCell>
                                                        {parseFlexibleDate(mov.data) && isValid(parseFlexibleDate(mov.data)) ? format(parseFlexibleDate(mov.data), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="font-medium">{mov.descricao}</TableCell>
                                                    <TableCell className="flex items-center gap-1">
                                                        {getTipoIcon(mov.tipo)}
                                                        {getTipoLabel(mov.tipo)}
                                                    </TableCell>
                                                    <TableCell>{mov.formaPagamento}</TableCell>
                                                    <TableCell className={`text-right font-semibold ${
                                                        mov.tipo === 'entrada' ? 'text-green-600' : 
                                                        mov.tipo === 'saida' ? 'text-red-600' : 'text-blue-600'
                                                    }`}>
                                                        {mov.tipo === 'saida' ? '- ' : '+ '}{formatCurrency(parseFloat(mov.valor || 0))}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                );
                            })
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={handleExportPDF} disabled={filteredMovs.length === 0}>
                    <Printer size={16} className="mr-2"/> Exportar PDF
                </Button>
            </CardFooter>
        </Card>
    );
};

export default RelatorioMovimentacoesBancarias;