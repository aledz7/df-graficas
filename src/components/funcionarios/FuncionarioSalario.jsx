import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2, Printer, ShoppingCart, Lock, KeyRound, TrendingUp, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import FuncionarioHoleriteModal from './FuncionarioHoleriteModal';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { funcionarioService } from '@/services/funcionarioService';
import { osService, vendaService, envelopamentoService } from '@/services/api';

import AlterarSalarioModal from './AlterarSalarioModal';
import HistoricoSalarioModal from './HistoricoSalarioModal';
import ValeImpressaoModal from './ValeImpressaoModal';
import FaltaDescontoImpressaoModal from './FaltaDescontoImpressaoModal';

// Função auxiliar para obter o nome do mês
const getMesNome = (mes) => {
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1] || 'Mês inválido';
};

// Interpreta "yyyy-mm-dd" como data local (evita deslocar 1 dia em fusos como Brasil)
const parseDateLocal = (str) => {
    if (!str) return null;
    const parts = String(str).split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    return new Date(y, m - 1, d);
};

const FuncionarioSalario = ({ formData, setFormData, onSalarioSaved }) => {
    const { toast } = useToast();
    const [vale, setVale] = useState({ data: '', valor: '', motivo: '' });
    const [falta, setFalta] = useState({ data: '', valorDesconto: '', motivo: '' });
    // Estado para controlar se o salário foi efetivamente salvo no banco
    const [salarioSalvoNoBanco, setSalarioSalvoNoBanco] = useState(false);
    // Estado para rastrear se estamos em modo de edição do salário
    const [isEditingNewSalary, setIsEditingNewSalary] = useState(false);
    // Controle de competência (dia/mês/ano) para organizar vales e faltas por período
    const [competencia, setCompetencia] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // yyyy-MM-dd
    });
    
    // Estados separados para dia, mês e ano
    const [diaCompetencia, setDiaCompetencia] = useState(() => {
        const d = new Date();
        return String(d.getDate()).padStart(2, '0');
    });
    const [mesCompetencia, setMesCompetencia] = useState(() => {
        const d = new Date();
        return String(d.getMonth() + 1).padStart(2, '0');
    });
    const [anoCompetencia, setAnoCompetencia] = useState(() => {
        const d = new Date();
        return String(d.getFullYear());
    });

    // Ao montar o componente, usar sempre o mês e dia atuais para exibir do dia aberto até hoje (ou até o fechamento)
    // Ex.: fechou no dia 24/01 → mostra de 24/01 até o dia atual; não avança para o mês seguinte
    useEffect(() => {
        const inicializarCompetencia = async () => {
            try {
                const d = new Date();
                const diaAtual = d.getDate();
                const mes = d.getMonth() + 1; // 1-12
                const ano = d.getFullYear();
                const dia = String(diaAtual).padStart(2, '0');
                const mesStr = String(mes).padStart(2, '0');
                const anoStr = String(ano);
                const atual = `${anoStr}-${mesStr}-${dia}`;
                setDiaCompetencia(dia);
                setMesCompetencia(mesStr);
                setAnoCompetencia(anoStr);
                setCompetencia(atual);
            } catch (error) {
                console.error('Erro ao inicializar competência:', error);
                const d = new Date();
                const dia = String(d.getDate()).padStart(2, '0');
                const mes = String(d.getMonth() + 1).padStart(2, '0');
                const ano = String(d.getFullYear());
                const atual = `${ano}-${mes}-${dia}`;
                setDiaCompetencia(dia);
                setMesCompetencia(mes);
                setAnoCompetencia(ano);
                setCompetencia(atual);
            }
        };
        inicializarCompetencia();
    }, []);

    // Funções para atualizar competência quando campos individuais mudarem
    const atualizarCompetencia = (novoDia, novoMes, novoAno) => {
        const competenciaAtualizada = `${novoAno}-${novoMes.padStart(2, '0')}-${novoDia.padStart(2, '0')}`;
        setCompetencia(competenciaAtualizada);
    };

    const handleDiaChange = (novoDia) => {
        setDiaCompetencia(novoDia);
        atualizarCompetencia(novoDia, mesCompetencia, anoCompetencia);
    };

    const handleMesChange = (novoMes) => {
        setMesCompetencia(novoMes);
        atualizarCompetencia(diaCompetencia, novoMes, anoCompetencia);
    };

    const handleAnoChange = (novoAno) => {
        setAnoCompetencia(novoAno);
        atualizarCompetencia(diaCompetencia, mesCompetencia, novoAno);
    };

    // Função para avançar para o próximo mês
    const avancarParaProximoMes = () => {
        console.log('🔄 Avançando para o próximo mês...');
        console.log('🔄 Competência atual:', competencia);
        
        const [ano, mes] = competencia.split('-');
        const dataAtual = new Date(parseInt(ano), parseInt(mes) - 1, 1);
        const proximoMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1);
        const proximaCompetencia = `${proximoMes.getFullYear()}-${String(proximoMes.getMonth() + 1).padStart(2, '0')}`;
        
        console.log('🔄 Nova competência:', proximaCompetencia);
        setCompetencia(proximaCompetencia);
        
        // Forçar atualização dos dados
        setTimeout(() => {
            loadData();
            loadHolerites();
        }, 100);
    };

    // Verificar se o funcionário existe e tem salário salvo no banco
    useEffect(() => {
        const salarioValor = parseFloat(formData.salario_base || 0);
        
        // Só considerar como "salvo no banco" se:
        // 1. O funcionário tem ID (existe no banco)
        // 2. O salário tem valor > 0 (não é vazio ou zero)
        // 3. Não estamos em modo de edição
        if (formData.id && salarioValor > 0 && !isEditingNewSalary) {
            setSalarioSalvoNoBanco(true);
        } else {
            setSalarioSalvoNoBanco(false);
        }
    }, [formData.id, isEditingNewSalary]);

    // Expor função para marcar salário como salvo para o componente pai
    useEffect(() => {
        if (onSalarioSaved) {
            onSalarioSaved(() => {
                // Só marcar como salvo se há um valor válido no salário (maior que 0)
                const salarioValor = parseFloat(formData.salario_base || 0);
                if (salarioValor > 0) {
                    setSalarioSalvoNoBanco(true);
                    setIsEditingNewSalary(false); // Resetar estado de edição
                }
            });
        }
    }, [onSalarioSaved]);
    const [isHoleriteModalOpen, setIsHoleriteModalOpen] = useState(false);
    const [holeriteSelecionado, setHoleriteSelecionado] = useState(null);
    const [consumoInterno, setConsumoInterno] = useState([]);
    const [dataAberturaMes, setDataAberturaMes] = useState(null);
    const [dataFechamentoMes, setDataFechamentoMes] = useState(null);
    // Quando o mês selecionado está fechado, carregamos o período aberto (próximo mês: dia do fechamento até hoje)
    const [dadosPeriodoAberto, setDadosPeriodoAberto] = useState(null);

    const [isAlterarSalarioModalOpen, setIsAlterarSalarioModalOpen] = useState(false);
    const [isHistoricoSalarioModalOpen, setIsHistoricoSalarioModalOpen] = useState(false);
    const [isValeImpressaoModalOpen, setIsValeImpressaoModalOpen] = useState(false);
    const [isFaltaImpressaoModalOpen, setIsFaltaImpressaoModalOpen] = useState(false);
    const [selectedVale, setSelectedVale] = useState(null);
    const [selectedFalta, setSelectedFalta] = useState(null);
    const [holerites, setHolerites] = useState([]);
    const [isLoadingHolerites, setIsLoadingHolerites] = useState(false);
    // Vales/faltas do período retornados pela API (já filtrados por data abertura/fechamento)
    const [valesPeriodo, setValesPeriodo] = useState(null);
    const [faltasPeriodo, setFaltasPeriodo] = useState(null);

    const loadData = async () => {
        if (formData && formData.id) {
            try {
                console.log('🔄 Carregando dados de consumo interno da API...');
                console.log('🔄 Funcionário ID:', formData.id);
                console.log('🔄 Competência:', competencia);
                
                // Extrair mês e ano da competência atual
                // Competência está no formato yyyy-MM-dd
                const partes = competencia.split('-');
                const ano = partes[0];
                const mes = partes[1]; // Mês está sempre na segunda posição
                
                console.log('🔄 Buscando dados para:', { mes: parseInt(mes), ano: parseInt(ano) });
                
                // Usar o endpoint gerarRelatorioMensal que retorna todos os dados incluindo consumo interno
                const response = await funcionarioService.gerarRelatorioMensal(formData.id, parseInt(mes), parseInt(ano));
                
                console.log('📊 Dados do endpoint gerarRelatorioMensal:', response);
                console.log('📊 Estrutura completa da resposta:', JSON.stringify(response, null, 2));
                
                // O endpoint retorna os dados filtrados por Crediário
                // A resposta vem como { success, message, data: { ... } }
                // O serviço já extrai o 'data', então response já é o objeto data
                const consumoInterno = response?.consumo_interno || [];
                const dataAbertura = response?.data_abertura_mes || null;
                const dataFechamento = response?.data_fechamento_mes || null;
                
                console.log('✅ Consumo interno carregado da API (apenas Crediário):', {
                    total: consumoInterno.length,
                    tipos: consumoInterno.map(item => ({ tipo: item.tipo, valor: item.valor, data: item.data })),
                    dataAbertura: dataAbertura,
                    dataFechamento: dataFechamento,
                    todasChaves: Object.keys(response || {})
                });
                
                setConsumoInterno(consumoInterno);
                setDataAberturaMes(dataAbertura);
                setDataFechamentoMes(dataFechamento);
                setValesPeriodo(response?.vales ?? null);
                setFaltasPeriodo(response?.faltas ?? null);

                // Se o mês selecionado está fechado, carregar o período aberto (próximo mês: dia do fechamento até hoje)
                if (dataFechamento) {
                    let proxMes = parseInt(mes) + 1;
                    let proxAno = parseInt(ano);
                    if (proxMes > 12) {
                        proxMes = 1;
                        proxAno += 1;
                    }
                    try {
                        const resPeriodoAberto = await funcionarioService.gerarRelatorioMensal(formData.id, proxMes, proxAno);
                        setDadosPeriodoAberto({
                            consumo_interno: resPeriodoAberto?.consumo_interno || [],
                            data_abertura_mes: resPeriodoAberto?.data_abertura_mes || null,
                            data_fechamento_mes: resPeriodoAberto?.data_fechamento_mes || null,
                            vales: resPeriodoAberto?.vales ?? [],
                            faltas: resPeriodoAberto?.faltas ?? [],
                        });
                    } catch (e) {
                        console.error('Erro ao carregar período aberto:', e);
                        setDadosPeriodoAberto(null);
                    }
                } else {
                    setDadosPeriodoAberto(null);
                }
            } catch (error) {
                console.error('Erro ao carregar dados da API:', error);
                console.error('Detalhes do erro:', error.message);
                setConsumoInterno([]);
                setDadosPeriodoAberto(null);
                setValesPeriodo(null);
                setFaltasPeriodo(null);
            }
        }
    };

    const loadHolerites = async () => {
        if (formData && formData.id) {
            try {
                setIsLoadingHolerites(true);
                const [ano, mes] = competencia.split('-');
                const response = await funcionarioService.getHolerites(formData.id, { mes: parseInt(mes), ano: parseInt(ano) });
                const holeritesData = response.data || [];
                console.log('📋 Holerites carregados:', holeritesData.map(h => ({
                    id: h.id,
                    mes: h.mes,
                    ano: h.ano,
                    mes_nome: h.mes_nome,
                    periodo: h.periodo,
                    total_consumo_interno: h.total_consumo_interno,
                    consumo_interno_itens: h.consumo_interno_itens
                })));
                setHolerites(holeritesData);
            } catch (error) {
                console.error('Erro ao carregar holerites:', error);
                setHolerites([]);
            } finally {
                setIsLoadingHolerites(false);
            }
        }
    };

    useEffect(() => {
        loadData();
        loadHolerites();
    }, [formData, competencia]);

    // Listener para evento de fechamento de mês: manter o mês fechado na tela (dia aberto até dia atual/fechamento)
    useEffect(() => {
        const handleMesFechado = (event) => {
            const { mes, ano } = event.detail;
            const competenciaFechada = `${ano}-${String(mes).padStart(2, '0')}`;
            // competencia é yyyy-MM-dd; verificar se o mês/ano visualizado é o que foi fechado
            const estaVisualizandoMesFechado = competencia.startsWith(competenciaFechada);
            if (estaVisualizandoMesFechado) {
                // Recarregar dados do mês fechado para exibir do dia aberto até o fechamento (não avançar para o próximo mês)
                loadData();
                loadHolerites();
                toast({
                    title: 'Mês fechado',
                    description: 'Os dados do período fechado foram atualizados (dia aberto até o dia do fechamento).',
                    variant: 'default'
                });
            }
        };
        window.addEventListener('mesFechado', handleMesFechado);
        return () => window.removeEventListener('mesFechado', handleMesFechado);
    }, [competencia]);

    const handleRefreshData = async () => {
        await loadData();
        await loadHolerites();
        toast({ 
            title: "Dados Atualizados", 
            description: "Consumo interno foi atualizado com sucesso.", 
            variant: "default" 
        });
    };




    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Se estamos editando o campo salário
        if (name === 'salario_base') {
            // Sempre permitir edição se o valor é vazio/zero
            if (parseFloat(value || 0) === 0) {
                setIsEditingNewSalary(true);
            }
            // Se há salário salvo no banco, só permitir edição se já estamos editando
            else if (salarioSalvoNoBanco && !isEditingNewSalary) {
                // Não permitir alteração sem senha master
                return;
            }
        }
        
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSalarioClick = () => {
        // Só abrir modal de alteração se já existe salário cadastrado E o valor atual é > 0
        if (salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0) {
            setIsAlterarSalarioModalOpen(true);
        }
    };

    const handleAlterarSalarioSuccess = async (novoSalario, motivo) => {
        // Se a senha master foi validada, aplicar a mudança
        const salarioAnterior = parseFloat(formData.salario_base || 0);
        const novoSalarioNumerico = parseFloat(novoSalario);
        
        if (!formData.id) {
            toast({ 
                title: "Erro", 
                description: "Funcionário não encontrado. Não é possível atualizar o salário.", 
                variant: "destructive" 
            });
            return;
        }
        
        try {
            console.log('💾 Atualizando salário no banco de dados:', {
                funcionarioId: formData.id,
                salarioAnterior: salarioAnterior,
                novoSalario: novoSalarioNumerico,
                motivo: motivo
            });
            
            // Atualizar o funcionário no banco de dados com o novo salário
            const response = await funcionarioService.update(formData.id, {
                salario_base: novoSalarioNumerico,
                motivo_salario: motivo || 'Alteração de salário',
                data_alteracao: new Date().toISOString()
            });
            
            console.log('✅ Resposta da atualização:', response);
            
            // Recarregar dados do funcionário do banco para garantir que temos os dados atualizados
            const funcionarioAtualizado = await funcionarioService.getById(formData.id);
            const dadosAtualizados = funcionarioAtualizado.data || funcionarioAtualizado;
            
            console.log('📥 Dados recarregados do banco:', {
                salario_base: dadosAtualizados.salario_base,
                salarioBase: dadosAtualizados.salarioBase,
                dadosCompletos: dadosAtualizados
            });
            
            // Atualizar o estado local com os dados recarregados do banco
            const salarioFinal = dadosAtualizados.salario_base || dadosAtualizados.salarioBase || novoSalario;
            setFormData(prev => ({ 
                ...prev, 
                salario_base: salarioFinal
            }));
            setIsAlterarSalarioModalOpen(false);
            setSalarioSalvoNoBanco(true); // Marcar como salvo após alteração bem-sucedida
            setIsEditingNewSalary(false); // Resetar estado de edição
            
            console.log('✅ Estado atualizado com salário:', salarioFinal);
            
            // O histórico já é registrado automaticamente pelo backend quando salario_base é atualizado
            // Não precisamos registrar manualmente, o backend já faz isso
            
            toast({ 
                title: "Salário Atualizado", 
                description: `O salário base foi alterado com sucesso para R$ ${parseFloat(salarioFinal).toFixed(2)} e salvo no banco de dados.`, 
                variant: "default" 
            });
        } catch (error) {
            console.error('❌ Erro ao atualizar salário:', error);
            console.error('❌ Detalhes do erro:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast({ 
                title: "Erro", 
                description: error.response?.data?.message || "Erro ao atualizar o salário. Tente novamente.", 
                variant: "destructive" 
            });
        }
    };

    const handleAlterarSalarioCancel = () => {
        setIsAlterarSalarioModalOpen(false);
    };

    const addVale = async () => {
        if (!vale.valor || !vale.data) {
            toast({ title: 'Dados incompletos', description: 'Data e valor do vale são obrigatórios.', variant: 'destructive' });
            return;
        }
        
        const valorNumerico = parseFloat(vale.valor);
        if (isNaN(valorNumerico)) {
            toast({ title: 'Valor inválido', description: 'O valor deve ser um número válido.', variant: 'destructive' });
            return;
        }

        // Só salvar no banco se o funcionário já existe (tem ID)
        if (formData.id) {
            try {
                // Enviar data como yyyy-MM-dd ou meio-dia UTC para não deslocar o dia no fuso (ex.: 30/01 não virar 29/01)
                const dataParaEnvio = /^\d{4}-\d{2}-\d{2}$/.test(vale.data)
                    ? `${vale.data}T12:00:00.000Z`
                    : vale.data;
                await funcionarioService.addVale(formData.id, {
                    data: dataParaEnvio,
                    valor: valorNumerico,
                    motivo: vale.motivo
                });
                
                // Atualizar o estado local com os dados do servidor
                const response = await funcionarioService.getById(formData.id);
                
                // A API retorna { success: true, message: "...", data: {...} }
                const funcionarioData = response.data?.data || response.data;
                if (funcionarioData) {
                    // Forçar atualização do estado
                    setFormData(prev => ({ ...prev, vales: funcionarioData.vales || [] }));
                    
                    // Forçar re-render do componente
                    setTimeout(() => {
                        setFormData(prev => ({ ...prev }));
                    }, 100);
                }
                
                toast({ 
                    title: 'Vale adicionado', 
                    description: 'Vale salvo com sucesso no banco de dados.', 
                    variant: 'default' 
                });
                
                // Recarregar holerites para atualizar os valores
                await loadHolerites();
            } catch (error) {
                console.error('Erro ao salvar vale:', error);
                toast({ 
                    title: 'Erro ao salvar', 
                    description: 'Não foi possível salvar o vale. Tente novamente.', 
                    variant: 'destructive' 
                });
                return;
            }
        } else {
            // Se o funcionário ainda não foi salvo, apenas adicionar ao estado local
            const novoVale = { 
                ...vale, 
                id: `v-${Date.now()}`, 
                valor: valorNumerico,
                created_at: new Date().toISOString()
            };
            
            setFormData(prev => {
                const newVales = [...(prev.vales || []), novoVale];
                return { ...prev, vales: newVales };
            });
        }
        
        setVale({ data: '', valor: '', motivo: '' });
    };

    const addFalta = async () => {
        if (!falta.valorDesconto || !falta.data) {
            toast({ title: 'Dados incompletos', description: 'Data e valor do desconto da falta são obrigatórios.', variant: 'destructive' });
            return;
        }
        
        const valorNumerico = parseFloat(falta.valorDesconto);
        if (isNaN(valorNumerico)) {
            toast({ title: 'Valor inválido', description: 'O valor deve ser um número válido.', variant: 'destructive' });
            return;
        }

        // Só salvar no banco se o funcionário já existe (tem ID)
        if (formData.id) {
            try {
                // Enviar data como meio-dia UTC para não deslocar o dia no fuso (ex.: 30/01 não virar 29/01)
                const dataParaEnvio = /^\d{4}-\d{2}-\d{2}$/.test(falta.data)
                    ? `${falta.data}T12:00:00.000Z`
                    : falta.data;
                await funcionarioService.addFalta(formData.id, {
                    data: dataParaEnvio,
                    valorDesconto: valorNumerico,
                    motivo: falta.motivo
                });
                
                // Atualizar o estado local com os dados do servidor
                const response = await funcionarioService.getById(formData.id);
                
                // A API retorna { success: true, message: "...", data: {...} }
                const funcionarioData = response.data?.data || response.data;
                if (funcionarioData) {
                    // Forçar atualização do estado
                    setFormData(prev => ({ ...prev, faltas: funcionarioData.faltas || [] }));
                    
                    // Forçar re-render do componente
                    setTimeout(() => {
                        setFormData(prev => ({ ...prev }));
                    }, 100);
                }
                
                toast({ 
                    title: 'Falta adicionada', 
                    description: 'Falta salva com sucesso no banco de dados.', 
                    variant: 'default' 
                });
                
                // Recarregar holerites para atualizar os valores
                await loadHolerites();
            } catch (error) {
                console.error('Erro ao salvar falta:', error);
                toast({ 
                    title: 'Erro ao salvar', 
                    description: 'Não foi possível salvar a falta. Tente novamente.', 
                    variant: 'destructive' 
                });
                return;
            }
        } else {
            // Se o funcionário ainda não foi salvo, apenas adicionar ao estado local
            const novaFalta = { 
                ...falta, 
                id: `f-${Date.now()}`, 
                valorDesconto: valorNumerico 
            };
            setFormData(prev => ({ ...prev, faltas: [...(prev.faltas || []), novaFalta] }));
        }
        
        setFalta({ data: '', valorDesconto: '', motivo: '' });
    };

    const removeGeneric = async (id, type) => {
        // Só remover do banco se o funcionário já existe (tem ID)
        if (formData.id) {
            try {
                if (type === 'vales') {
                    await funcionarioService.removeVale(formData.id, id);
                } else if (type === 'faltas') {
                    await funcionarioService.removeFalta(formData.id, id);
                }
                
                // Atualizar o estado local com os dados do servidor
                const response = await funcionarioService.getById(formData.id);
                // A API retorna { success: true, message: "...", data: {...} }
                const funcionarioData = response.data?.data || response.data;
                if (funcionarioData) {
                    setFormData(prev => ({ 
                        ...prev, 
                        [type]: funcionarioData[type] || [] 
                    }));
                }
                
                toast({ 
                    title: `${type === 'vales' ? 'Vale' : 'Falta'} removido`, 
                    description: `${type === 'vales' ? 'Vale' : 'Falta'} removido com sucesso.`, 
                    variant: 'default' 
                });
                
                // Recarregar holerites para atualizar os valores
                await loadHolerites();
            } catch (error) {
                console.error(`Erro ao remover ${type}:`, error);
                toast({ 
                    title: 'Erro ao remover', 
                    description: `Não foi possível remover o ${type === 'vales' ? 'vale' : 'falta'}. Tente novamente.`, 
                    variant: 'destructive' 
                });
                return;
            }
        } else {
            // Se o funcionário ainda não foi salvo, apenas remover do estado local
            setFormData(prev => ({ ...prev, [type]: prev[type].filter(item => item.id !== id) }));
        }
    };
    


    const handleOpenValeImpressao = (vale) => {
        setSelectedVale(vale);
        setIsValeImpressaoModalOpen(true);
    };

    const handleOpenFaltaImpressao = (falta) => {
        setSelectedFalta(falta);
        setIsFaltaImpressaoModalOpen(true);
    };

    // Helpers de filtro por competência (mês/ano)
    const isSameYearMonth = (dateStr, ymStr) => {
        if (!dateStr || !ymStr) return false;
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return false;
        const [y, m] = ymStr.split('-').map((n) => parseInt(n, 10));
        return d.getFullYear() === y && d.getMonth() + 1 === m;
    };

    // Converte string de data (yyyy-mm-dd ou dd/mm/yyyy) para Date local para comparação
    const parseDataItem = (str) => {
        if (!str) return null;
        const s = String(str).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            return parseDateLocal(s.slice(0, 10));
        }
        const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
            const [, d, m, y] = ddmmyyyy.map(Number);
            return new Date(y, m - 1, d);
        }
        const d = new Date(s);
        return !Number.isNaN(d.getTime()) ? d : null;
    };

    // Retorna true se a data do item está entre dataInicioYmd (ex.: 24/01) e hoje (inclusive)
    const isDataNoPeriodoAberto = (dateStr, dataInicioYmd) => {
        if (!dateStr || !dataInicioYmd) return false;
        const inicio = parseDateLocal(String(dataInicioYmd).slice(0, 10));
        if (!inicio || Number.isNaN(inicio.getTime())) return false;
        const d = parseDataItem(dateStr);
        if (!d || Number.isNaN(d.getTime())) return false;
        const hoje = new Date();
        const inicioMs = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).getTime();
        const hojeMs = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
        const itemMs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return itemMs >= inicioMs && itemMs <= hojeMs;
    };

    // Dia do fechamento para filtro: do relatório (loadData) ou do holerite fechado do mês atual
    const diaFechamentoParaFiltro = useMemo(() => {
        if (dataFechamentoMes) return String(dataFechamentoMes).slice(0, 10);
        const [anoC, mesC] = competencia.split('-');
        const holeriteFechado = holerites.find(h => h.mes === parseInt(mesC, 10) && h.ano === parseInt(anoC, 10) && h.fechado === true);
        if (holeriteFechado?.data_fechamento) return String(holeriteFechado.data_fechamento).slice(0, 10);
        return null;
    }, [dataFechamentoMes, competencia, holerites]);

    // Mês fechado: exibir vales/faltas do PERÍODO ABERTO (24/01 até hoje = resposta do próximo mês). Mês aberto: exibir do mês atual.
    const valesDoMes = useMemo(() => {
        if (dataFechamentoMes && Array.isArray(dadosPeriodoAberto?.vales)) return dadosPeriodoAberto.vales;
        if (Array.isArray(valesPeriodo)) return valesPeriodo;
        const lista = Array.isArray(formData.vales) ? formData.vales : [];
        if (diaFechamentoParaFiltro) {
            return lista.filter((v) => isDataNoPeriodoAberto(v.data, diaFechamentoParaFiltro));
        }
        return lista.filter((v) => isSameYearMonth(v.data, competencia));
    }, [dataFechamentoMes, dadosPeriodoAberto, valesPeriodo, formData.vales, competencia, diaFechamentoParaFiltro]);

    const faltasDoMes = useMemo(() => {
        if (dataFechamentoMes && Array.isArray(dadosPeriodoAberto?.faltas)) return dadosPeriodoAberto.faltas;
        if (Array.isArray(faltasPeriodo)) return faltasPeriodo;
        const lista = Array.isArray(formData.faltas) ? formData.faltas : [];
        if (diaFechamentoParaFiltro) {
            return lista.filter((f) => isDataNoPeriodoAberto(f.data, diaFechamentoParaFiltro));
        }
        return lista.filter((f) => isSameYearMonth(f.data, competencia));
    }, [dataFechamentoMes, dadosPeriodoAberto, faltasPeriodo, formData.faltas, competencia, diaFechamentoParaFiltro]);

    const totalVales = useMemo(() => valesDoMes.reduce((acc, v) => acc + parseFloat(v.valor || 0), 0), [valesDoMes]);
    const totalFaltas = useMemo(() => faltasDoMes.reduce((acc, f) => acc + parseFloat(f.valorDesconto || 0), 0), [faltasDoMes]);
    
    // Quando o mês está fechado, exibir dados do período aberto (dia do fechamento até hoje)
    const consumoInternoDoMes = useMemo(() => {
        if (dataFechamentoMes && dadosPeriodoAberto?.consumo_interno) {
            return dadosPeriodoAberto.consumo_interno;
        }
        return consumoInterno;
    }, [consumoInterno, dataFechamentoMes, dadosPeriodoAberto]);
    
    const totalConsumoInterno = useMemo(() => consumoInternoDoMes.reduce((acc, c) => acc + parseFloat(c.valor || 0), 0) || 0, [consumoInternoDoMes]);
    
    // Formatar período para exibição. Se mês fechado, mostrar período aberto (dia do fechamento até hoje)
    const periodoConsumoInterno = useMemo(() => {
        const formatarData = (data) => {
            return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        const hoje = new Date();

        // Mês fechado: exibir período aberto (dia do fechamento até hoje)
        if (dataFechamentoMes && dadosPeriodoAberto?.data_abertura_mes) {
            const dataAbertura = parseDateLocal(dadosPeriodoAberto.data_abertura_mes);
            if (dataAbertura && !isNaN(dataAbertura.getTime())) {
                return `${formatarData(dataAbertura)} até ${formatarData(hoje)}`;
            }
        }

        if (dataAberturaMes) {
            const dataAbertura = parseDateLocal(dataAberturaMes);
            const dataFim = dataFechamentoMes ? parseDateLocal(dataFechamentoMes) : null;
            if (!dataAbertura) return competencia;
            if (dataFechamentoMes && dataFim && !isNaN(dataFim.getTime())) {
                return `${formatarData(dataAbertura)} até ${formatarData(dataFim)}`;
            }
            return `${formatarData(dataAbertura)} até ${formatarData(hoje)}`;
        }
        return competencia;
    }, [dataAberturaMes, dataFechamentoMes, dadosPeriodoAberto, competencia]);
    
    const salarioLiquido = useMemo(() => {
        return parseFloat(formData.salario_base || 0) - totalVales - totalFaltas - totalConsumoInterno;
    }, [formData.salario_base, totalVales, totalFaltas, totalConsumoInterno]);

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Salário Base
                            {salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0 && (
                                <Lock className="h-4 w-4 text-orange-500" title="Alteração protegida por senha master" />
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="salario_base">Valor Mensal (R$)</Label>
                        <div className="relative">
                            <Input 
                                id="salario_base" 
                                name="salario_base" 
                                type="number" 
                                value={formData.salario_base && parseFloat(formData.salario_base) > 0 ? formData.salario_base : ''} 
                                onChange={handleInputChange}
                                readOnly={salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0 && !isEditingNewSalary}
                                onClick={handleSalarioClick}
                                onFocus={() => { 
                                    // Só permitir edição se não há salário salvo OU se o valor atual é vazio/zero
                                    if (!salarioSalvoNoBanco || parseFloat(formData.salario_base || 0) === 0 || isEditingNewSalary) { 
                                        setIsEditingNewSalary(true); 
                                    } 
                                }}
                                placeholder="Digite o salário mensal"
                                className={salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0 && !isEditingNewSalary ? "pr-10 cursor-pointer bg-gray-50 dark:bg-gray-800" : ""}
                            />
                            {salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0 && (
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                        {salarioSalvoNoBanco && parseFloat(formData.salario_base || 0) > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Clique no campo para alterar (requer senha master)
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Card de Competência (período) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Competência (período)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <Label>Selecione o período</Label>
                                <div className="grid grid-cols-3 gap-4 mt-2">
                                    <div>
                                        <Label htmlFor="dia-competencia">Dia</Label>
                                        <Input
                                            id="dia-competencia"
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={diaCompetencia}
                                            onChange={(e) => handleDiaChange(e.target.value)}
                                            placeholder="DD"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="mes-competencia">Mês</Label>
                                        <Input
                                            id="mes-competencia"
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={mesCompetencia}
                                            onChange={(e) => handleMesChange(e.target.value)}
                                            placeholder="MM"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="ano-competencia">Ano</Label>
                                        <Input
                                            id="ano-competencia"
                                            type="number"
                                            min="2020"
                                            max="2030"
                                            value={anoCompetencia}
                                            onChange={(e) => handleAnoChange(e.target.value)}
                                            placeholder="AAAA"
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Selecione o dia, mês e ano para visualizar a movimentação (vales e faltas) de cada período.</p>
                                {(() => {
                                    // Verifica apenas o holerite do mês/ano específico selecionado
                                    const mesSelecionado = parseInt(mesCompetencia);
                                    const anoSelecionado = parseInt(anoCompetencia);
                                    const holeriteMesAtual = holerites.find(h => h.mes === mesSelecionado && h.ano === anoSelecionado);
                                    
                                    if (holeriteMesAtual && holeriteMesAtual.fechado === true) {
                                        return (
                                            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                    <strong>Período fechado:</strong> Este período já foi fechado e possui holerites gerados.
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card de Holerites */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Holerites do Período
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingHolerites ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                <span>Carregando holerites...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Resumo do Período Atual (Aberto) */}
                                {(() => {
                                    const [ano, mes] = competencia.split('-');
                                    const mesNome = getMesNome(parseInt(mes));
                                    const periodoAtual = `${mesNome} de ${ano}`;
                                    const totalDescontos = totalVales + totalFaltas + totalConsumoInterno;
                                    const holeriteFechadoAtual = holerites.find(h => h.mes === parseInt(mes) && h.ano === parseInt(ano) && h.fechado === true);
                                    
                                    // Se o mês está fechado, mostrar data de fechamento (usar dia como data local)
                                    // Se está aberto, mostrar data de abertura
                                    let dataExibicao = null;
                                    if (holeriteFechadoAtual?.data_fechamento) {
                                        const str = String(holeriteFechadoAtual.data_fechamento).slice(0, 10);
                                        const dataFechamento = parseDateLocal(str);
                                        if (dataFechamento && !isNaN(dataFechamento.getTime())) {
                                            dataExibicao = dataFechamento.toLocaleDateString('pt-BR');
                                        }
                                    } else if (dataAberturaMes) {
                                        const dataAbertura = parseDateLocal(dataAberturaMes);
                                        if (dataAbertura && !isNaN(dataAbertura.getTime())) {
                                            dataExibicao = dataAbertura.toLocaleDateString('pt-BR');
                                        }
                                    }
                                    
                                    return (
                                        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-lg">
                                                        Período Atual - {periodoAtual}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        {holeriteFechadoAtual ? (
                                                            <>Fechado em: {dataExibicao}</>
                                                        ) : (
                                                            dataExibicao ? (
                                                                <>Período aberto desde: {dataExibicao} - Valores em tempo real</>
                                                            ) : (
                                                                <>Período aberto - Valores em tempo real</>
                                                            )
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                        R$ {Number(salarioLiquido).toFixed(2)}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">Salário Líquido</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Salário Base</p>
                                                    <p className="font-semibold">R$ {Number(formData.salario_base || 0).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Vales</p>
                                                    <p className="font-semibold text-orange-500">- R$ {Number(totalVales).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Desconto Faltas</p>
                                                    <p className="font-semibold text-red-500">- R$ {Number(totalFaltas).toFixed(2)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Descontos</p>
                                                    <p className="font-semibold text-red-500">- R$ {Number(totalDescontos).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            
                                            {totalConsumoInterno > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-sm text-muted-foreground">Consumo Interno</p>
                                                    <p className="font-semibold text-purple-500">- R$ {Number(totalConsumoInterno).toFixed(2)}</p>
                                                </div>
                                            )}
                                            
                                            <div className="mt-4">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => {
                                                        setIsHoleriteModalOpen(true);
                                                    }}
                                                >
                                                    <FileText className="mr-2 h-4 w-4"/> Visualizar Holerite Completo
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* Holerites Fechados de Outros Períodos */}
                                {holerites.filter(h => {
                                    const [ano, mes] = competencia.split('-');
                                    return !(h.mes === parseInt(mes) && h.ano === parseInt(ano));
                                }).map((holerite) => (
                                    <div key={holerite.id} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-800">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-semibold text-lg">
                                                    Holerite - {holerite.periodo || (holerite.mes_nome ? `${holerite.mes_nome} de ${holerite.ano}` : (holerite.mes && holerite.ano ? `${getMesNome(holerite.mes)} de ${holerite.ano}` : 'Período não informado'))}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Fechado em: {holerite.data_fechamento ? (() => {
                                                        const str = String(holerite.data_fechamento).slice(0, 10);
                                                        const d = parseDateLocal(str);
                                                        return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—';
                                                    })() : '—'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                    R$ {Number(holerite.salario_liquido || 0).toFixed(2)}
                                                </p>
                                                <p className="text-sm text-muted-foreground">Salário Líquido</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Salário Base</p>
                                                <p className="font-semibold">R$ {Number(holerite.salario_base || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Total Vales</p>
                                                <p className="font-semibold text-orange-500">- R$ {Number(holerite.total_vales || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Desconto Faltas</p>
                                                <p className="font-semibold text-red-500">- R$ {Number(holerite.desconto_faltas || 0).toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Total Descontos</p>
                                                <p className="font-semibold text-red-500">- R$ {Number(holerite.total_descontos || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        
                                        {holerite.total_consumo_interno > 0 && (
                                            <div className="mt-2">
                                                <p className="text-sm text-muted-foreground">Consumo Interno</p>
                                                <p className="font-semibold text-purple-500">- R$ {Number(holerite.total_consumo_interno || 0).toFixed(2)}</p>
                                            </div>
                                        )}
                                        
                                        {holerite.observacoes && (
                                            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                                                    <strong>Observações:</strong> {holerite.observacoes}
                                                </p>
                                            </div>
                                        )}
                                        
                                        <div className="mt-4">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => {
                                                    setHoleriteSelecionado(holerite);
                                                    setIsHoleriteModalOpen(true);
                                                }}
                                            >
                                                <FileText className="mr-2 h-4 w-4"/> Visualizar Holerite Completo
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader><CardTitle>Vales (Adiantamentos)</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input type="date" value={vale.data} onChange={(e) => setVale({ ...vale, data: e.target.value })} />
                                <Input type="number" placeholder="Valor" value={vale.valor} onChange={(e) => setVale({ ...vale, valor: e.target.value })} />
                            </div>
                            <Input placeholder="Motivo (opcional)" value={vale.motivo} onChange={(e) => setVale({ ...vale, motivo: e.target.value })} />
                            <Button onClick={addVale} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Vale</Button>
                            <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Valor</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {valesDoMes.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell>{v.data ? (() => { const d = parseDataItem(v.data); return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : String(v.data); })() : 'Data não informada'}</TableCell>
                                            <TableCell>R$ {Number(v.valor || 0).toFixed(2)}</TableCell>
                                            <TableCell className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenValeImpressao(v)} title="Imprimir Vale">
                                                    <Printer className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => removeGeneric(v.id, 'vales')} title="Remover Vale">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Faltas e Descontos</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input type="date" value={falta.data} onChange={(e) => setFalta({ ...falta, data: e.target.value })} />
                                <Input type="number" placeholder="Desconto" value={falta.valorDesconto} onChange={(e) => setFalta({ ...falta, valorDesconto: e.target.value })} />
                            </div>
                            <Input placeholder="Motivo (opcional)" value={falta.motivo} onChange={(e) => setFalta({ ...falta, motivo: e.target.value })} />
                            <Button onClick={addFalta} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Falta/Desconto</Button>
                             <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Desconto</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {faltasDoMes.map(f => (
                                        <TableRow key={f.id}>
                                            <TableCell>{f.data ? (() => { const d = parseDataItem(f.data); return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : String(f.data); })() : 'Data não informada'}</TableCell>
                                            <TableCell>R$ {Number(f.valorDesconto || 0).toFixed(2)}</TableCell>
                                            <TableCell className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleOpenFaltaImpressao(f)} title="Imprimir Comprovante">
                                                    <Printer className="h-4 w-4 text-blue-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => removeGeneric(f.id, 'faltas')} title="Remover Falta/Desconto">
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle className="flex items-center">
                            <ShoppingCart className="mr-2 h-5 w-5 text-blue-500" /> Consumo Interno - Pagos por Crediário ({periodoConsumoInterno})
                        </CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleRefreshData}
                            title="Atualizar dados de consumo interno"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Atualizar
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {dataFechamentoMes && dadosPeriodoAberto && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <p className="text-sm text-green-800 dark:text-green-200">
                                    <strong>Período aberto:</strong> do dia do último fechamento até hoje (consumos em tempo real).
                                </p>
                            </div>
                        )}
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>ℹ️ Informação:</strong> Esta seção exibe apenas os consumos internos que foram pagos por meio de crediário. 
                                Outros tipos de pagamento não são contabilizados como consumo interno.
                            </p>
                        </div>
                        {consumoInternoDoMes.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Tipo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {consumoInternoDoMes.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.data ? (() => { const d = parseDataItem(c.data); return d && !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : String(c.data); })() : 'Data não informada'}</TableCell>
                                            <TableCell>{c.descricao}</TableCell>
                                            <TableCell>R$ {Number(c.valor || 0).toFixed(2)}</TableCell>
                                            <TableCell>{c.tipo}</TableCell>

                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">
                                Nenhum consumo interno pago por crediário registrado para {periodoConsumoInterno}.
                            </p>
                        )}
                    </CardContent>
                </Card>

                 <Card className="bg-slate-50 dark:bg-slate-800">
                    <CardHeader className="flex-row items-center justify-between">
                        <CardTitle>Cálculo Final</CardTitle>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsHistoricoSalarioModalOpen(true)}
                                disabled={!formData.id}
                            >
                                <TrendingUp className="mr-2 h-4 w-4"/> Histórico e Relatórios
                            </Button>
                            <Button onClick={() => setIsHoleriteModalOpen(true)}>
                                <Printer className="mr-2 h-4 w-4"/> Gerar Holerite
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        <div><p className="text-sm text-muted-foreground">Salário Base</p><p className="font-bold text-lg">R$ {Number(formData.salario_base || 0).toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Total Vales ({competencia})</p><p className="font-bold text-lg text-orange-500">- R$ {Number(totalVales).toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Total Descontos (Faltas) ({competencia})</p><p className="font-bold text-lg text-red-500">- R$ {Number(totalFaltas).toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Total Consumo Interno - Crediário ({competencia})</p><p className="font-bold text-lg text-purple-500">- R$ {Number(totalConsumoInterno).toFixed(2)}</p></div>
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg"><p className="text-sm text-green-700 dark:text-green-300">Salário Líquido</p><p className="font-extrabold text-2xl text-green-600 dark:text-green-400">R$ {Number(salarioLiquido).toFixed(2)}</p></div>
                    </CardContent>
                </Card>
            </div>
            <FuncionarioHoleriteModal
                isOpen={isHoleriteModalOpen}
                onClose={() => {
                    setIsHoleriteModalOpen(false);
                    setHoleriteSelecionado(null);
                }}
                holeriteData={holeriteSelecionado ? {
                    ...formData,
                    name: formData.name,
                    cpf: formData.cpf,
                    cargo: formData.cargo,
                    salario_base: holeriteSelecionado.salario_base,
                    vales: holeriteSelecionado.vales || [],
                    faltas: holeriteSelecionado.faltas || [],
                    totalVales: holeriteSelecionado.total_vales || 0,
                    totalFaltas: holeriteSelecionado.total_faltas || 0,
                    descontoFaltas: holeriteSelecionado.desconto_faltas || 0,
                    totalConsumoInterno: holeriteSelecionado.total_consumo_interno || 0,
                    salarioLiquido: holeriteSelecionado.salario_liquido || 0,
                    consumoInternoItens: Array.isArray(holeriteSelecionado.consumo_interno_itens) ? holeriteSelecionado.consumo_interno_itens : (holeriteSelecionado.consumo_interno_itens ? JSON.parse(holeriteSelecionado.consumo_interno_itens) : []),
                    periodo: holeriteSelecionado.periodo || (holeriteSelecionado.mes_nome ? `${holeriteSelecionado.mes_nome} de ${holeriteSelecionado.ano}` : (holeriteSelecionado.mes && holeriteSelecionado.ano ? `${getMesNome(holeriteSelecionado.mes)} de ${holeriteSelecionado.ano}` : 'Período não informado')),
                    mesNome: holeriteSelecionado.mes_nome || (holeriteSelecionado.mes ? getMesNome(holeriteSelecionado.mes) : null),
                    mes: holeriteSelecionado.mes,
                    ano: holeriteSelecionado.ano
                } : {
                    ...formData, 
                    totalVales, 
                    totalFaltas, 
                    totalConsumoInterno, 
                    salarioLiquido, 
                    consumoInternoItens: consumoInternoDoMes
                }}
             />

             <AlterarSalarioModal
                isOpen={isAlterarSalarioModalOpen}
                onClose={handleAlterarSalarioCancel}
                onSuccess={handleAlterarSalarioSuccess}
                salarioAtual={formData.salario_base}
                title="Alterar Salário Base"
                description="Para alterar o salário base de um funcionário que já possui valor cadastrado, informe o novo valor e a senha master."
            />
            <HistoricoSalarioModal
                isOpen={isHistoricoSalarioModalOpen}
                onClose={() => setIsHistoricoSalarioModalOpen(false)}
                funcionarioId={formData.id}
                funcionarioNome={formData.name}
            />
            <ValeImpressaoModal
                isOpen={isValeImpressaoModalOpen}
                onClose={() => setIsValeImpressaoModalOpen(false)}
                vale={selectedVale}
                funcionario={formData}
            />
            <FaltaDescontoImpressaoModal
                isOpen={isFaltaImpressaoModalOpen}
                onClose={() => setIsFaltaImpressaoModalOpen(false)}
                falta={selectedFalta}
                funcionario={formData}
            />
        </>
    );
};

export default FuncionarioSalario;