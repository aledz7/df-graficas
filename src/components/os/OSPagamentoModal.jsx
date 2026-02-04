import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, PlusCircle, AlertTriangle, CreditCard, Smartphone, Coins, Landmark, Tag, CheckCircle2, Calendar, QrCode, Star, Gift, Info, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, safeJsonParse } from '@/lib/utils';
import { contaBancariaService, vendaService, clienteService } from '@/services/api';
import { configuracaoPontosService } from '@/services/configuracaoPontosService';
import { pontosClienteService } from '@/services/pontosClienteService';
import { addDays, format } from 'date-fns';
import PixQrCodeModal from '@/components/utils/PixQrCodeModal';
import { getImageUrl } from '@/lib/imageUtils';
import { generatePixPayload } from '@/lib/pixGenerator';
import { apiDataManager } from '@/lib/apiDataManager';

const OSPagamentoModal = ({ open, onOpenChange, totalOS, totaisOS, onConfirmPagamento, osId, clienteId, vendedorAtual, pagamentosExistentes }) => {
  const { toast } = useToast();
  
  const [pagamentosAdicionados, setPagamentosAdicionados] = useState([]);
  const [isFinalizandoPagamento, setIsFinalizandoPagamento] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState('Dinheiro');
  const [valorPagamento, setValorPagamento] = useState('');
  const [isValorFocused, setIsValorFocused] = useState(false);
  const [hasPrefilledValor, setHasPrefilledValor] = useState(false);
  const [parcelas, setParcelas] = useState(1);
  const [maquinasCartao, setMaquinasCartao] = useState([]);
  const [maquinaSelecionadaId, setMaquinaSelecionadaId] = useState('');
  const [taxaAplicada, setTaxaAplicada] = useState(null);
  const [valorOriginalSemTaxa, setValorOriginalSemTaxa] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [contaDestinoId, setContaDestinoId] = useState('');
  const [dataVencimentoCrediario, setDataVencimentoCrediario] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Estados para o modal do QR code do Pix
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedContaPix, setSelectedContaPix] = useState(null);
  const [empresaSettings, setEmpresaSettings] = useState({});

  // Estados para informações do cliente
  const [clienteInfo, setClienteInfo] = useState(null);
  const [isClienteAutorizadoCrediario, setIsClienteAutorizadoCrediario] = useState(false);
  const [descontoTerceirizadoInfo, setDescontoTerceirizadoInfo] = useState(null);

  // Estados para o sistema de pontos
  const [configPontos, setConfigPontos] = useState({
    ativo: true,
    pontosPorReais: 50,
    validadeMeses: 12,
    resgateMinimo: 50,
  });
  const [clientePontos, setClientePontos] = useState({
    saldo_atual: 0,
    total_ganhos: 0,
    utilizados: 0,
    expirados: 0
  });
  const [pontosParaUsar, setPontosParaUsar] = useState('');
  const [pontosParaAcumular, setPontosParaAcumular] = useState('');
  const [isPrimeiraVenda, setIsPrimeiraVenda] = useState(true);
  const [historicoVendas, setHistoricoVendas] = useState([]);
  const [pontosAcumuladosAutomaticamente, setPontosAcumuladosAutomaticamente] = useState(0);
  const [descontoPontosAplicado, setDescontoPontosAplicado] = useState(0);
  // Pagamento parcial: opção de evoluir para produção (só aparece quando há valor restante)
  const [evoluirParaProducao, setEvoluirParaProducao] = useState(true);

  const calcularTotalPago = useCallback(() => {
    return pagamentosAdicionados.reduce((acc, p) => acc + parseFloat(p.valorFinal || p.valor || 0), 0);
  }, [pagamentosAdicionados]);

  // Total usado para abater o total da OS (NÃO considera taxas de cartão)
  const calcularTotalParaAbatimento = useCallback(() => {
    return pagamentosAdicionados.reduce((acc, p) => {
      const valorAbatimento = p.valorOriginal ?? p.valor ?? 0;
      return acc + parseFloat(valorAbatimento);
    }, 0);
  }, [pagamentosAdicionados]);

  const [totalPago, setTotalPago] = useState(0);
  const [troco, setTroco] = useState(0);
  const [restante, setRestante] = useState(totalOS);
  
  // Valor total com desconto de pontos (para exibição clara no resumo)
  const totalComDescontoUI = Math.max(0, totalOS - (parseFloat(descontoPontosAplicado) || 0));

  // Carregar informações do cliente quando o modal abrir
  useEffect(() => {
    // Função auxiliar para verificar se cliente está autorizado para crediário
    const verificarAutorizacaoCrediario = (cliente) => {
      if (!cliente || cliente.autorizado_prazo === undefined || cliente.autorizado_prazo === null) {
        return false;
      }
      
      // Tratar diferentes tipos de valores possíveis
      const valor = cliente.autorizado_prazo;
      
      // Casos: true, 1, "1", "true", "True"
      if (valor === true || valor === 1) {
        return true;
      }
      
      // Casos de string
      if (typeof valor === 'string') {
        const valorLower = valor.toLowerCase().trim();
        return valorLower === 'true' || valorLower === '1' || valorLower === 'sim';
      }
      
      return false;
    };
    
    if (open && clienteId && clienteId !== 'null' && clienteId !== null) {
      let cancelled = false; // Flag para evitar race conditions
      
      const carregarClienteInfo = async () => {
        try {
          // Verificar se é um funcionário (ID começa com "funcionario_")
          const isFuncionario = clienteId.toString().startsWith('funcionario_');
          
          if (isFuncionario) {
            // Para funcionários, não precisamos buscar na API de clientes
            // Funcionários sempre podem usar crediário independentemente
            if (!cancelled) {
              setClienteInfo({
                id: clienteId,
                nome: 'Funcionário',
                tipo_pessoa: 'funcionario',
                isFuncionario: true,
                autorizado_prazo: true // Forçar autorização para funcionários
              });
              setIsClienteAutorizadoCrediario(true);
              setDescontoTerceirizadoInfo(null);
            }
            return;
          }
          
          // Para clientes normais, buscar na API
          const response = await clienteService.getById(clienteId);
          
          // Verificar se foi cancelado durante a requisição
          if (cancelled) return;
          
          // A API pode retornar os dados em diferentes estruturas
          let cliente = null;
          if (response) {
            // Tentar diferentes estruturas de resposta
            if (response.data) {
              // Caso 1: response.data é o objeto cliente diretamente
              if (response.data.id || response.data.nome || response.data.nome_completo) {
                cliente = response.data;
              }
              // Caso 2: response.data.data contém o cliente
              else if (response.data.data && (response.data.data.id || response.data.data.nome || response.data.data.nome_completo)) {
                cliente = response.data.data;
              }
            }
            // Caso 3: response.success e response.data
            if (!cliente && response.success && response.data) {
              if (response.data.id || response.data.nome || response.data.nome_completo) {
                cliente = response.data;
              } else if (response.data.data && (response.data.data.id || response.data.data.nome || response.data.data.nome_completo)) {
                cliente = response.data.data;
              }
            }
          }
          
          if (cancelled) return;
          
          if (cliente) {
            console.log('✅ OSPagamentoModal - Cliente carregado:', {
              id: cliente.id,
              nome: cliente.nome || cliente.nome_completo,
              autorizado_prazo: cliente.autorizado_prazo,
              tipo_autorizado_prazo: typeof cliente.autorizado_prazo
            });
            
            setClienteInfo(cliente);
            
            // Verificar autorização com função auxiliar robusta
            const isAutorizado = verificarAutorizacaoCrediario(cliente);
            
            console.log('🔐 OSPagamentoModal - Cliente autorizado para crediário:', isAutorizado);
            
            if (!cancelled) {
              setIsClienteAutorizadoCrediario(isAutorizado);
            }
            
            // Verificar se é cliente terceirizado e tem desconto configurado
            if (cliente.classificacao_cliente === 'Terceirizado' && cliente.desconto_fixo_os_terceirizado) {
              const percentual = parseFloat(cliente.desconto_fixo_os_terceirizado);
              if (percentual > 0 && !cancelled) {
                setDescontoTerceirizadoInfo({
                  percentual: percentual,
                  valor: (totalOS * percentual) / 100
                });
              }
            }
          } else {
            console.error('❌ OSPagamentoModal - Resposta da API não contém dados do cliente:', response);
            if (!cancelled) {
              setIsClienteAutorizadoCrediario(false);
            }
          }
        } catch (error) {
          console.error('❌ OSPagamentoModal - Erro ao carregar informações do cliente:', error);
          
          if (cancelled) return;
          
          // Se der erro e for funcionário, ainda assim autorizar crediário
          const isFuncionario = clienteId.toString().startsWith('funcionario_');
          if (isFuncionario) {
            setClienteInfo({
              id: clienteId,
              nome: 'Funcionário',
              tipo_pessoa: 'funcionario',
              isFuncionario: true,
              autorizado_prazo: true // Forçar autorização para funcionários
            });
            setIsClienteAutorizadoCrediario(true);
            setDescontoTerceirizadoInfo(null);
          } else {
            // Em caso de erro, não autorizar por padrão
            setIsClienteAutorizadoCrediario(false);
          }
        }
      };
      
      carregarClienteInfo();
      
      // Cleanup function para evitar race conditions
      return () => {
        cancelled = true;
      };
    } else {
      // Reset quando não há cliente válido
      setClienteInfo(null);
      setIsClienteAutorizadoCrediario(false);
      setDescontoTerceirizadoInfo(null);
      
      if (open) {
        console.warn('⚠️ OSPagamentoModal - Modal aberto sem cliente válido. clienteId:', clienteId);
      }
    }
  }, [open, clienteId, totalOS]);

  // Carregar pagamentos já registrados (ex.: OS finalizada com pagamento parcial reaberta para complementar)
  useEffect(() => {
    if (open && pagamentosExistentes && Array.isArray(pagamentosExistentes) && pagamentosExistentes.length > 0) {
      setPagamentosAdicionados(pagamentosExistentes.map(p => ({
        ...p,
        valorFinal: p.valorFinal ?? p.valor,
        valorOriginal: p.valorOriginal ?? p.valor,
      })));
    }
  }, [open, pagamentosExistentes]);

  useEffect(() => {
    if (contasBancarias.length > 0) {
    }
  }, [contasBancarias, contaDestinoId]);

  useEffect(() => {
        const loadData = async () => {
    // Tentar buscar as máquinas por múltiplas fontes para maior robustez
    let maquinasArray = [];

    // 1) Tentar via getData (API/cache estruturado)
    try {
      const data = await apiDataManager.getData('maquinasCartao', []);
      if (Array.isArray(data)) {
        maquinasArray = data;
      } else if (data && Array.isArray(data.data)) {
        maquinasArray = data.data;
      } else if (data && data.data && Array.isArray(data.data.data)) {
        maquinasArray = data.data.data;
      }
    } catch (e) {
      // ignora, tenta outras fontes
    }

    // 2) Fallback via getItem (string JSON ou cache interno)
    if (maquinasArray.length === 0) {
      const loadedMaquinas = safeJsonParse(await apiDataManager.getItem('maquinasCartao'), []);
      if (Array.isArray(loadedMaquinas)) {
        maquinasArray = loadedMaquinas;
      } else if (loadedMaquinas && Array.isArray(loadedMaquinas.data)) {
        maquinasArray = loadedMaquinas.data;
      } else if (loadedMaquinas && loadedMaquinas.data && Array.isArray(loadedMaquinas.data.data)) {
        maquinasArray = loadedMaquinas.data.data;
      }
    }

    // 3) Fallback direto ao localStorage (último recurso)
    if (maquinasArray.length === 0) {
      try {
        const ls = localStorage.getItem('maquinasCartao');
        const parsed = safeJsonParse(ls, []);
        if (Array.isArray(parsed)) {
          maquinasArray = parsed;
        }
      } catch (e) {}
    }
    setMaquinasCartao(maquinasArray);
    if (maquinasArray.length > 0 && !maquinaSelecionadaId) {
      setMaquinaSelecionadaId(String(maquinasArray[0].id));
    }
    
    try {
      const response = await contaBancariaService.getAll();
      
      // Tentar diferentes estruturas de resposta
      let contasArray = [];
      if (response && response.data) {
        if (response.data.data && Array.isArray(response.data.data)) {
          contasArray = response.data.data;
        } else if (response.data.data && response.data.data.data && Array.isArray(response.data.data.data)) {
          contasArray = response.data.data.data;
        } else if (Array.isArray(response.data)) {
          contasArray = response.data;
        }
      }
      
      
      if (contasArray.length > 0) {
        // Processar metadados de cada conta se necessário
        const contasProcessadas = contasArray.map(conta => {
          
          if (conta.metadados && typeof conta.metadados === 'string') {
            try {
              conta.metadados = JSON.parse(conta.metadados);
            } catch (error) {
              console.error('❌ Erro ao processar metadados da conta:', conta.id, error);
            }
          }
          return conta;
        });
        
        setContasBancarias(contasProcessadas);
        if (!contaDestinoId) {
          setContaDestinoId(contasProcessadas[0].id);
        }
      } else {
        setContasBancarias([]);
        setContaDestinoId('');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar contas bancárias da API:', error);
      setContasBancarias([]);
      setContaDestinoId('');
    }

    // Carregar configurações da empresa
    try {
      const settings = await apiDataManager.getItem('empresaSettings');
      setEmpresaSettings(safeJsonParse(settings, {}));
    } catch (error) {
      console.error('Erro ao carregar configurações da empresa:', error);
      setEmpresaSettings({});
    }

    // Carregar configurações de pontos
    try {
      const config = await configuracaoPontosService.getConfiguracaoComFallback();
      setConfigPontos({
        ativo: config.ativo !== undefined ? config.ativo : true,
        pontosPorReais: config.pontos_por_reais || 50,
        validadeMeses: config.validade_meses || 12,
        resgateMinimo: config.resgate_minimo || 50,
      });
    } catch (error) {
      console.error('Erro ao carregar configuração de pontos:', error);
    }

    // Carregar pontos do cliente e verificar histórico de vendas (apenas se não for funcionário)
    if (clienteId && clienteId !== 'null' && clienteId !== null) {
      // Verificar se é um funcionário (ID começa com "funcionario_")
      const isFuncionario = clienteId.toString().startsWith('funcionario_');
      
      if (isFuncionario) {
        // Funcionários não participam do programa de pontos
        setClientePontos({
          saldo_atual: 0,
          total_ganhos: 0,
          utilizados: 0,
          expirados: 0
        });
        setIsPrimeiraVenda(false); // Funcionários não são considerados primeira venda
        setHistoricoVendas([]);
      } else {
        // Para clientes normais, carregar pontos e histórico
        try {
          // Carregar pontos do cliente via API
          const pontosResponse = await pontosClienteService.getPontosCliente(clienteId);
          if (pontosResponse.success && pontosResponse.data) {
            setClientePontos({
              saldo_atual: pontosResponse.data.saldo_pontos_atual || 0,
              total_ganhos: pontosResponse.data.total_pontos_ganhos || 0,
              utilizados: pontosResponse.data.pontos_utilizados || 0,
              expirados: pontosResponse.data.pontos_expirados || 0
            });
          } else {
            // Fallback para dados locais se API falhar
            const clienteData = await apiDataManager.getItem(`cliente_${clienteId}`);
            const cliente = safeJsonParse(clienteData, {});
            if (cliente && cliente.pontos) {
              setClientePontos({
                saldo_atual: cliente.pontos.saldo_atual || 0,
                total_ganhos: cliente.pontos.total_ganhos || 0,
                utilizados: cliente.pontos.utilizados || 0,
                expirados: cliente.pontos.expirados || 0
              });
            }
          }

          // Verificar se é a primeira venda do cliente
          try {
            const vendasResponse = await vendaService.getByCliente(clienteId);
            const todasVendas = vendasResponse.data?.data?.data || vendasResponse.data?.data || [];
            const vendasConfirmadas = Array.isArray(todasVendas) ? todasVendas.filter(v => 
              (v.status_pagamento === 'Concluído' || v.status_pagamento === 'Pago' || v.tipo_documento === 'venda')
            ) : [];
            
            setHistoricoVendas(vendasConfirmadas);
            setIsPrimeiraVenda(vendasConfirmadas.length === 0);
          } catch (error) {
            console.error('Erro ao carregar histórico de vendas:', error);
            setIsPrimeiraVenda(true);
          }
        } catch (error) {
          console.error('Erro ao carregar pontos do cliente:', error);
        }
      }
    } else {
      setClientePontos({
        saldo_atual: 0,
        total_ganhos: 0,
        utilizados: 0,
        expirados: 0
      });
      setIsPrimeiraVenda(true);
      setHistoricoVendas([]);
    }
  
        };
        
        loadData();
    }, [open, maquinaSelecionadaId, contaDestinoId]);



  useEffect(() => {
    if (open) {
      setHasPrefilledValor(false);
      // Reset do valor quando abrir o modal para evitar inconsistências
      setValorPagamento('');
    }
  }, [open]);

  // useEffect separado para cálculos de pontos (não afeta o valor de pagamento)
  useEffect(() => {
    if (configPontos.ativo && clienteId && clienteId !== 'null' && clienteId !== null && totalOS > 0) {
      const pontosAutomaticos = Math.floor(totalOS / configPontos.pontosPorReais);
      setPontosAcumuladosAutomaticamente(pontosAutomaticos);
    } else {
      setPontosAcumuladosAutomaticamente(0);
    }
  }, [configPontos.ativo, clienteId, totalOS, configPontos.pontosPorReais]);

  // useEffect separado para cálculos de totais e restante
  useEffect(() => {
    const totalComDesconto = Math.max(0, totalOS - descontoPontosAplicado);
    // Total pago para comparação com o pedido (sem taxas de cartão)
    const totalAbatimento = calcularTotalParaAbatimento();
    setTotalPago(totalAbatimento);

    // Restante para quitar o pedido deve considerar o valor ORIGINAL (sem taxas)
    const novoRestante = Math.max(0, totalComDesconto - totalAbatimento);
    setRestante(novoRestante);

    // Troco só faz sentido sobre pagamentos em dinheiro e apenas sobre o excedente do que faltava após outros métodos
    const totalAbatimentoSemDinheiro = pagamentosAdicionados
      .filter(p => p.metodo !== 'Dinheiro')
      .reduce((acc, p) => acc + parseFloat(p.valorOriginal ?? p.valor ?? 0), 0);
    const necessarioEmDinheiro = Math.max(0, totalComDesconto - totalAbatimentoSemDinheiro);
    const totalDinheiro = pagamentosAdicionados
      .filter(p => p.metodo === 'Dinheiro')
      .reduce((acc, p) => acc + parseFloat(p.valorFinal || p.valor || 0), 0);
    const trocoCalculado = Math.max(0, totalDinheiro - necessarioEmDinheiro);
    setTroco(trocoCalculado);
  }, [pagamentosAdicionados, totalOS, calcularTotalParaAbatimento, descontoPontosAplicado]);

  // useEffect separado para preenchimento automático do valor (executa apenas quando necessário)
  useEffect(() => {
    // Auto-preencher quando:
    // 1. Modal abrir e não estiver focado
    // 2. Pagamento for removido (hasPrefilledValor foi resetado)
    if (open && !hasPrefilledValor && !isValorFocused) {
      const valorNum = parseFloat(valorPagamento);
      
      if ((!valorPagamento || isNaN(valorNum) || valorNum <= 0) && restante > 0) {
        setValorPagamento(restante.toFixed(2));
        setHasPrefilledValor(true);
      }
    }
  }, [open, hasPrefilledValor, isValorFocused, valorPagamento, restante]);

  useEffect(() => {
    if (metodoPagamento === 'Cartão Débito' || metodoPagamento === 'Cartão Crédito') {
      const valorNum = parseFloat(valorPagamento);
      if (isNaN(valorNum) || valorNum <= 0) {
        setTaxaAplicada(null);
        setValorOriginalSemTaxa(null);
        return;
      }

      // Verificar se maquinasCartao é um array antes de usar find()
      if (!Array.isArray(maquinasCartao)) {
        console.warn('maquinasCartao não é um array:', maquinasCartao);
        setTaxaAplicada(null);
        setValorOriginalSemTaxa(null);
        return;
      }

      const maquina = maquinasCartao.find(m => String(m.id) === String(maquinaSelecionadaId));
      
      if (maquina && maquina.taxas && Array.isArray(maquina.taxas)) {
        const taxaInfo = maquina.taxas.find(t => {
          const tipoTaxa = metodoPagamento === 'Cartão Débito' ? 'Débito' : 'Crédito';
          const tipo = String(t?.tipo || '').trim();
          const parcelasTaxa = parseInt(t?.parcelas ?? 1);
          
          if (tipoTaxa === 'Débito') {
            const isDebito = tipo.toLowerCase().includes('débito') || tipo.toLowerCase().includes('debito');
            return isDebito;
          }
          
          // Crédito: lógica mais flexível
          const isCredito = tipo.toLowerCase().includes('crédito') || tipo.toLowerCase().includes('credito');
          if (!isCredito) {
            return false;
          }
          
          // Para crédito à vista (1 parcela)
          if (parseInt(parcelas) === 1) {
            const isAVista = tipo.toLowerCase().includes('vista') || tipo.toLowerCase().includes('à vista') || parcelasTaxa === 1;
            return isAVista;
          }
          
          // Para crédito parcelado
          const isParcelado = parcelasTaxa === parseInt(parcelas);
          return isParcelado;
        });
        
        if (taxaInfo && parseFloat(taxaInfo.valor) > 0) {
          const taxaPercentual = parseFloat(taxaInfo.valor);
          const valorComTaxa = valorNum * (1 + taxaPercentual / 100);
          const taxaCalculada = { ...taxaInfo, valorCalculado: valorComTaxa - valorNum };
          setTaxaAplicada(taxaCalculada);
          setValorOriginalSemTaxa(valorNum);
        } else {
          setTaxaAplicada(null);
          setValorOriginalSemTaxa(null);
        }
      } else {
        setTaxaAplicada(null);
        setValorOriginalSemTaxa(null);
      }
    } else {
      setTaxaAplicada(null);
      setValorOriginalSemTaxa(null);
    }
  }, [valorPagamento, metodoPagamento, parcelas, maquinaSelecionadaId, maquinasCartao]);

  // Função para obter as opções de parcelas da máquina selecionada
  const getParcelasDisponiveis = useCallback(() => {
    if (metodoPagamento !== 'Cartão Crédito') {
      return [];
    }

    // Se não há máquinas ou máquina selecionada, retornar parcelas padrão
    if (!Array.isArray(maquinasCartao) || !maquinaSelecionadaId) {
      // Parcelas padrão quando não há máquina configurada
      return [
        { parcelas: 1, taxa: 0, tipo: 'Crédito à Vista' },
        { parcelas: 2, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 3, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 4, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 5, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 6, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 7, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 8, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 9, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 10, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 11, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 12, taxa: 0, tipo: 'Crédito Parcelado' }
      ];
    }

    const maquina = maquinasCartao.find(m => String(m.id) === String(maquinaSelecionadaId));
    
    if (!maquina || !maquina.taxas || !Array.isArray(maquina.taxas)) {
      // Parcelas padrão quando a máquina não tem taxas configuradas
      return [
        { parcelas: 1, taxa: 0, tipo: 'Crédito à Vista' },
        { parcelas: 2, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 3, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 4, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 5, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 6, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 7, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 8, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 9, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 10, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 11, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 12, taxa: 0, tipo: 'Crédito Parcelado' }
      ];
    }

    // Filtrar apenas taxas de crédito e ordenar por número de parcelas
    const removeDiacritics = (s) => String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const taxasCredito = maquina.taxas
      .filter(t => {
        const tipo = String(t?.tipo || '').trim();
        const tipoNormalizado = removeDiacritics(tipo).toLowerCase();
        return tipoNormalizado.includes('credito') || tipoNormalizado.includes('crédito');
      })
      .map(t => ({ 
        parcelas: parseInt(t.parcelas || 1), 
        taxa: parseFloat(t.valor || 0), 
        tipo: t.tipo 
      }))
      .filter(t => !isNaN(t.parcelas) && !isNaN(t.taxa))
      .sort((a, b) => a.parcelas - b.parcelas);
    
    // Se não encontrou taxas de crédito na máquina, usar parcelas padrão
    if (taxasCredito.length === 0) {
      return [
        { parcelas: 1, taxa: 0, tipo: 'Crédito à Vista' },
        { parcelas: 2, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 3, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 4, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 5, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 6, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 7, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 8, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 9, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 10, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 11, taxa: 0, tipo: 'Crédito Parcelado' },
        { parcelas: 12, taxa: 0, tipo: 'Crédito Parcelado' }
      ];
    }

    return taxasCredito;
  }, [metodoPagamento, maquinasCartao, maquinaSelecionadaId]);

  // Função para obter o número máximo de parcelas permitido
  const getMaxParcelas = useCallback(() => {
    const parcelasDisponiveis = getParcelasDisponiveis();
    if (parcelasDisponiveis.length === 0) return 1;
    return Math.max(...parcelasDisponiveis.map(p => p.parcelas));
  }, [getParcelasDisponiveis]);

  // Efeito para ajustar parcelas quando máquina muda
  useEffect(() => {
    if (metodoPagamento === 'Cartão Crédito') {
      const maxParcelas = getMaxParcelas();
      if (parcelas > maxParcelas) {
        setParcelas(Math.max(1, maxParcelas));
      }
    } else if (metodoPagamento !== 'Crediário') {
      // Reset parcelas para 1 se não for cartão crédito nem crediário
      setParcelas(1);
    }
  }, [metodoPagamento, maquinaSelecionadaId, maquinasCartao, parcelas, getMaxParcelas]);

  // useEffect para ajustar data de vencimento do crediário para o dia atual
  useEffect(() => {
    if (metodoPagamento === 'Crediário') {
      setDataVencimentoCrediario(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [metodoPagamento]);

  // Funções para o sistema de pontos
  const calcularDescontoEmPontos = (pontos) => {
    if (!configPontos.ativo || !pontos || pontos <= 0) return 0;
    // Cada ponto vale 1 real de desconto
    return Math.min(pontos, totalOS);
  };

  const calcularPontosParaAcumular = (valor) => {
    if (!configPontos.ativo || !valor || valor <= 0) return 0;
    return Math.floor(valor / configPontos.pontosPorReais);
  };


  const handleOpenPixModal = async () => {
    
    if (!contaDestinoId || contaDestinoId === 'none') {
      toast({ title: "Selecione uma conta PIX", description: "Escolha uma conta bancária para gerar o QR Code.", variant: "destructive" });
      return;
    }

    const valorNum = parseFloat(valorPagamento);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast({ title: "Valor Inválido", description: "Por favor, insira um valor de pagamento válido.", variant: "destructive" });
      return;
    }

    // Verificar se contasBancarias é um array antes de usar find()
    if (!Array.isArray(contasBancarias)) {
      console.warn('contasBancarias não é um array em handleOpenPixModal:', contasBancarias);
      toast({ title: "Erro", description: "Erro ao carregar contas bancárias.", variant: "destructive" });
      return;
    }

    const conta = contasBancarias.find(c => c.id === contaDestinoId);
    if (!conta) {
      toast({ title: "Conta não encontrada", description: "A conta selecionada não foi encontrada.", variant: "destructive" });
      return;
    }

    // Extrair dados do Pix dos metadados
    let metadados = conta.metadados || {};
    
    // Se metadados for string, tentar fazer parse
    if (typeof metadados === 'string') {
      try {
        metadados = JSON.parse(metadados);
      } catch (error) {
        console.error('❌ Erro ao fazer parse dos metadados:', error);
        metadados = {};
      }
    }
    
    // Verificar se tem chavePix ou qrCodeUrl nos metadados
    let chavePix = '';
    let qrCodeUrl = '';
    let hasChavePix = false;
    let hasQrCodeUrl = false;
    
    // Buscar chavePix em metadados primeiro
    if (metadados.chavePix) {
      chavePix = metadados.chavePix;
      hasChavePix = true;
    } else if (metadados.chave_pix) {
      chavePix = metadados.chave_pix;
      hasChavePix = true;
    }
    
    // Buscar qrCodeUrl em metadados
    if (metadados.qrCodeUrl) {
      qrCodeUrl = metadados.qrCodeUrl;
      hasQrCodeUrl = true;
    } else if (metadados.qr_code_url) {
      qrCodeUrl = metadados.qr_code_url;
      hasQrCodeUrl = true;
    }
    
    // Se não encontrou nos metadados, buscar em campos diretos da conta
    if (!hasChavePix && conta.chavePix) {
      chavePix = conta.chavePix;
      hasChavePix = true;
    }
    if (!hasChavePix && conta.chave_pix) {
      chavePix = conta.chave_pix;
      hasChavePix = true;
    }
    
    if (!hasQrCodeUrl && conta.qrCodeUrl) {
      qrCodeUrl = conta.qrCodeUrl;
      hasQrCodeUrl = true;
    }
    if (!hasQrCodeUrl && conta.qr_code_url) {
      qrCodeUrl = conta.qr_code_url;
      hasQrCodeUrl = true;
    }

    // Verificar se tem pelo menos uma das opções
    if (!hasChavePix && !hasQrCodeUrl) {
      toast({ 
        title: "PIX não configurado", 
        description: "Esta conta não possui chave PIX ou QR Code configurado nos metadados.", 
        variant: "destructive" 
      });
      return;
    }

    // Se tem qrCodeUrl nos metadados, usar a imagem do banco
    // Se tem chavePix nos metadados, gerar QR code dinamicamente
    let finalQrCodeUrl = null;
    let shouldGenerateQr = false;
    
    if (hasQrCodeUrl) {
      // Usar imagem do banco de dados
      finalQrCodeUrl = getImageUrl(qrCodeUrl);
    } else if (hasChavePix) {
      // Gerar QR code dinamicamente
      shouldGenerateQr = true;
    }

    setSelectedContaPix({
      ...conta,
      chavePix,
      qrCodeUrl: finalQrCodeUrl,
      shouldGenerateQr,
      hasChavePix,
      hasQrCodeUrl
    });
    setIsPixModalOpen(true);
  };

  const handleAdicionarPagamento = () => {
    let valorNum = parseFloat(valorPagamento);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast({ title: "Valor Inválido", description: "Por favor, insira um valor de pagamento válido.", variant: "destructive" });
      return;
    }

    // Validar seleção de conta bancária para todas as formas de pagamento exceto dinheiro e crediário
    if (metodoPagamento !== 'Dinheiro' && metodoPagamento !== 'Crediário' && (!contaDestinoId || contaDestinoId === 'none')) {
      toast({ 
        title: "Conta Bancária Necessária", 
        description: `Selecione uma conta bancária para o pagamento via ${metodoPagamento}.`, 
        variant: "destructive" 
      });
      return;
    }

    // Impedir adicionar pagamentos maiores que o restante a pagar
    // Considera pequeno epsilon para evitar problemas de ponto flutuante
    if (valorNum - (restante || 0) > 0.009) {
      // Clamp no ato de adicionar
      valorNum = Math.max(0, restante || 0);
      toast({ 
        title: "Valor acima do restante",
        description: `Valor ajustado para o restante (${formatCurrency(valorNum)}).`,
        variant: "destructive"
      });
    }

    // Verificar se está tentando adicionar crediário sem autorização
    if (metodoPagamento === 'Crediário' && !isClienteAutorizadoCrediario) {
      toast({ 
        title: "Crediário Não Autorizado", 
        description: "Este cliente não está autorizado a comprar a prazo/crediário. Verifique as configurações do cliente.", 
        variant: "destructive" 
      });
      return;
    }

    // Crediário nunca deve ter taxa aplicada
    const temTaxa = metodoPagamento !== 'Crediário' && taxaAplicada && valorOriginalSemTaxa !== null;
    
    let pagamentoFinal = {
      metodo: metodoPagamento,
      valor: valorNum,
      valorOriginal: valorOriginalSemTaxa !== null ? valorOriginalSemTaxa : valorNum,
      valorFinal: temTaxa ? valorOriginalSemTaxa * (1 + parseFloat(taxaAplicada.valor)/100) : valorNum,
      parcelas: (metodoPagamento === 'Cartão Crédito' || metodoPagamento === 'Crediário') ? parcelas : 1,
      maquinaInfo: null,
      taxaInfo: null,
      // Para dinheiro e crediário, não enviar conta_bancaria_id (será usado caixa padrão)
      // Para outros métodos, sempre enviar a conta selecionada
      conta_bancaria_id: (metodoPagamento !== 'Dinheiro' && metodoPagamento !== 'Crediário' && contaDestinoId) ? contaDestinoId : null,
      conta_destino_id: (metodoPagamento !== 'Dinheiro' && metodoPagamento !== 'Crediário' && contaDestinoId) ? contaDestinoId : null, // Mantido para compatibilidade
      dataVencimento: metodoPagamento === 'Crediário' ? dataVencimentoCrediario : null,
    };

    if (temTaxa) {
      // Verificar se maquinasCartao é um array antes de usar find()
      if (!Array.isArray(maquinasCartao)) {
        console.warn('maquinasCartao não é um array em handleAdicionarPagamento:', maquinasCartao);
        pagamentoFinal.maquinaInfo = null;
      } else {
        const maquina = maquinasCartao.find(m => m.id === maquinaSelecionadaId);
        pagamentoFinal.maquinaInfo = maquina ? { id: maquina.id, nome: maquina.nome } : null;
      }
      pagamentoFinal.taxaInfo = { tipo: taxaAplicada.tipo, valor: taxaAplicada.valor, parcelas: taxaAplicada.parcelas };
    }
    
    setPagamentosAdicionados([...pagamentosAdicionados, pagamentoFinal]);
    setValorPagamento('');
    setParcelas(1);
    setTaxaAplicada(null);
    setValorOriginalSemTaxa(null);
  };

  const handleRemoverPagamento = (index) => {
    setPagamentosAdicionados(pagamentosAdicionados.filter((_, i) => i !== index));
    // Resetar o estado de preenchimento para permitir novo preenchimento automático
    setHasPrefilledValor(false);
    // Limpar o campo de valor para permitir preenchimento automático
    setValorPagamento('');
  };

  const handleConfirmarEFinalizar = async () => {
    if (isFinalizandoPagamento) return;

    if (totalOS > 0 && pagamentosAdicionados.length === 0) {
      toast({ title: "Nenhum Pagamento", description: "Adicione pelo menos uma forma de pagamento.", variant: "destructive" });
      return;
    }
    
    const isCrediarioPresente = pagamentosAdicionados.some(p => p.metodo === 'Crediário');
    // Permite pagamento parcial: não exige mais 100% ou Crediário; apenas exige pelo menos um pagamento
    // (o restante será registrado como conta a receber no backend quando parcial)
    
    // Verificar se há pagamentos com Crediário e se o cliente está selecionado
    // Permitir clientes avulsos (IDs que começam com 'avulso-')
    if (isCrediarioPresente && (!clienteId || clienteId === 'null' || clienteId === null)) {
      toast({ 
        title: "Cliente Obrigatório", 
        description: "Para pagamentos em Crediário, é necessário selecionar um cliente (cadastrado ou avulso).", 
        variant: "destructive" 
      });
      return;
    }

    // Preparar dados de pontos para envio
    const dadosPontos = {
      pontosAcumuladosAutomaticamente,
      descontoPontosAplicado,
      isPrimeiraVenda
    };
    
    const pagamentoParcial = restante > 0.009 && !isCrediarioPresente;
      const opcoes = { evoluirParaProducao: pagamentoParcial ? evoluirParaProducao : true };
    try {
      setIsFinalizandoPagamento(true);
      const resultado = await onConfirmPagamento(pagamentosAdicionados, dadosPontos, opcoes);

      if (resultado) {
        setPagamentosAdicionados([]);
        setPontosAcumuladosAutomaticamente(0);
        setDescontoPontosAplicado(0);
      }
    } catch (error) {
      console.error('❌ Erro ao confirmar pagamento e finalizar:', error);
      toast({
        title: "Erro ao finalizar",
        description: "Não foi possível concluir a finalização. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizandoPagamento(false);
    }
  };

  const isConfirmButtonDisabled = () => {
    if (totalOS === 0) return false; // Se o total é zero, pode finalizar
    if (pagamentosAdicionados.length === 0) return true; // Se tem total e nenhum pagamento, desabilita
    // Permite pagamento parcial: não exige mais 100% ou Crediário
    
    // Para Crediário, verificar se tem cliente (incluindo clientes avulsos)
    const isCrediarioPresente = pagamentosAdicionados.some(p => p.metodo === 'Crediário');
    if (isCrediarioPresente && (!clienteId || clienteId === 'null' || clienteId === null)) {
      return true; // Desabilita se tem crediário sem cliente válido
    }
    
    return false; // Caso contrário, habilita
  };

  const formaPagamentoIcones = {
    Pix: <Smartphone size={16} className="mr-2 text-green-500" />,
    Dinheiro: <Coins size={16} className="mr-2 text-yellow-500" />,
    'Cartão Débito': <CreditCard size={16} className="mr-2 text-blue-500" />,
    'Cartão Crédito': <CreditCard size={16} className="mr-2 text-purple-500" />,
    Crediário: <CreditCard size={16} className="mr-2 text-orange-500" />,
    'Transferência Bancária': <Landmark size={16} className="mr-2 text-indigo-500" />,
    'Pontos (Desconto)': <Star size={16} className="mr-2 text-red-500" />,
    'Pontos (Acumular)': <Gift size={16} className="mr-2 text-pink-500" />,
    Outro: <Tag size={16} className="mr-2 text-gray-500" />
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setPagamentosAdicionados([]);
          setValorPagamento('');
          setMetodoPagamento('Dinheiro');
          setParcelas(1);
          setTaxaAplicada(null);
          setValorOriginalSemTaxa(null);
          setDataVencimentoCrediario(format(new Date(), 'yyyy-MM-dd'));
          setPontosParaUsar('');
          setPontosParaAcumular('');
          setIsPrimeiraVenda(true);
          setHistoricoVendas([]);
          setPontosAcumuladosAutomaticamente(0);
          setDescontoPontosAplicado(0);
          setEvoluirParaProducao(true);
          setIsFinalizandoPagamento(false);
        }
        onOpenChange(isOpen);
      }}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Total do Pedido: <span className="font-bold text-primary">{formatCurrency(totalOS)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start py-4">
          <div className="space-y-3 pr-0 md:pr-4 md:border-r border-gray-200 dark:border-gray-700">
            <div>
              <Label htmlFor="metodoPagamento" className="text-sm font-medium">Método de Pagamento</Label>
              <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                <SelectTrigger id="metodoPagamento"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão Débito">Cartão Débito</SelectItem>
                  <SelectItem value="Cartão Crédito">Cartão Crédito</SelectItem>
                  <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                  {isClienteAutorizadoCrediario ? (
                    <SelectItem value="Crediário">Crediário</SelectItem>
                  ) : (
                    <SelectItem value="Crediário" disabled className="text-gray-400">
                      Crediário (Cliente não autorizado)
                    </SelectItem>
                  )}
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo de seleção de conta bancária - obrigatório para formas de pagamento não-dinheiro */}
            {metodoPagamento !== 'Dinheiro' && metodoPagamento !== 'Crediário' && (
              <div>
                <Label htmlFor="contaDestino" className="text-sm font-medium">
                  Conta de Destino <span className="text-red-500">*</span>
                </Label>
                <Select value={contaDestinoId} onValueChange={setContaDestinoId}>
                  <SelectTrigger id="contaDestino"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                  <SelectContent>
                    {contasBancarias.length > 0 ? (
                      contasBancarias.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome_banco || conta.nome} ({conta.agencia ? `Ag: ${conta.agencia}` : 'Sem agência'})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>Nenhuma conta disponível</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {metodoPagamento === 'Pix' && contaDestinoId && (
              <div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={handleOpenPixModal}
                  disabled={!valorPagamento || parseFloat(valorPagamento) <= 0}
                >
                  <QrCode size={16} className="mr-2"/> Gerar QR Code para Pagamento
                </Button>
              </div>
            )}



            {(metodoPagamento === 'Cartão Débito' || metodoPagamento === 'Cartão Crédito') && maquinasCartao.length > 0 && (
              <div>
                <Label htmlFor="maquinaCartao" className="text-sm font-medium">Máquina de Cartão</Label>
            <Select value={String(maquinaSelecionadaId || '')} onValueChange={setMaquinaSelecionadaId}>
                  <SelectTrigger id="maquinaCartao"><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                  <SelectContent>
                {maquinasCartao.map(maq => (
                  <SelectItem key={maq.id} value={String(maq.id)}>{maq.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="valorPagamento" className="text-sm font-medium">Valor (R$)</Label>
              <Input 
                id="valorPagamento" 
                type="number" 
                step="0.01"
                min="0"
                max={(restante || 0).toFixed(2)}
                placeholder="0.00" 
                value={valorPagamento} 
                onFocus={() => setIsValorFocused(true)}
                onBlur={() => setIsValorFocused(false)}
                onChange={(e) => {
                  const raw = e.target.value;
                  // permitir digitação livre; clamp acontece ao adicionar
                  setValorPagamento(raw);
                }} 
              />
            </div>

            {/* Seção de Pontos - Aparece apenas quando há cliente selecionado e sistema ativo */}
            {configPontos.ativo && clienteId && clienteId !== 'null' && clienteId !== null && (
              <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                    <Star size={16} className="mr-2 text-yellow-500" />
                    Sistema de Pontos
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isPrimeiraVenda ? 'Primeira compra' : `${clientePontos.saldo_atual} pontos disponíveis`}
                  </div>
                </div>

                {/* Informações do cliente */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                    <div className="font-medium text-gray-700 dark:text-gray-300">Pontos Atuais</div>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{clientePontos.saldo_atual}</div>
                  </div>
                  <div className="text-center p-2 bg-white dark:bg-gray-700 rounded border">
                    <div className="font-medium text-gray-700 dark:text-gray-300">Valor Equivalente</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(clientePontos.saldo_atual)}</div>
                  </div>
                </div>

                {/* Informações de pontos automáticos */}
                {pontosAcumuladosAutomaticamente > 0 && (
                  <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 rounded text-xs">
                    <div className="text-green-700 dark:text-green-300 font-medium">
                      ⭐ Pontos serão acumulados automaticamente: +{pontosAcumuladosAutomaticamente} pontos
                    </div>
                  </div>
                )}

                {descontoPontosAplicado > 0 && (
                  <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 rounded text-xs">
                    <div className="text-red-700 dark:text-red-300 font-medium">
                      💎 Desconto aplicado: -{descontoPontosAplicado} pontos (R$ {formatCurrency(descontoPontosAplicado)})
                    </div>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="space-y-1">
                  {/* Botão para usar pontos como desconto - apenas se não for primeira venda e tiver pontos */}
                  {!isPrimeiraVenda && clientePontos.saldo_atual > 0 && (
                    <Button 
                      onClick={() => {
                        const desconto = Math.min(clientePontos.saldo_atual, totalOS);
                        if (desconto > 0) {
                          setDescontoPontosAplicado(desconto);
                          toast({ 
                            title: "Desconto Aplicado", 
                            description: `${desconto} pontos utilizados (R$ ${formatCurrency(desconto)} de desconto).`, 
                            variant: "default" 
                          });
                        }
                      }}
                      className="w-full bg-red-500 hover:bg-red-600 text-white"
                      disabled={clientePontos.saldo_atual <= 0}
                    >
                      <Star size={16} className="mr-2" />
                      Usar {Math.min(clientePontos.saldo_atual, totalOS)} Pontos para Desconto
                    </Button>
                  )}

                  {/* Botão para remover desconto de pontos */}
                  {descontoPontosAplicado > 0 && (
                    <Button 
                      onClick={() => {
                        setDescontoPontosAplicado(0);
                        toast({ 
                          title: "Desconto Removido", 
                          description: "Desconto em pontos foi removido.", 
                          variant: "default" 
                        });
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Trash2 size={16} className="mr-2" />
                      Remover Desconto em Pontos
                    </Button>
                  )}
                </div>

                {/* Informações adicionais */}
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>Taxa: R$ {configPontos.pontosPorReais} = 1 ponto</div>
                  {isPrimeiraVenda && (
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      ⭐ Primeira compra - pontos serão acumulados automaticamente
                    </div>
                  )}
                  {!isPrimeiraVenda && (
                    <div className="text-green-600 dark:text-green-400 font-medium">
                      💎 Cliente recorrente - pode usar pontos para desconto
                    </div>
                  )}
                </div>
              </div>
            )}



            {(metodoPagamento === 'Cartão Crédito' || metodoPagamento === 'Crediário') && (
              <div>
                <Label htmlFor="parcelas" className="text-sm font-medium">Parcelas</Label>
            {metodoPagamento === 'Cartão Crédito' && getParcelasDisponiveis().length > 0 ? (
              <Select value={String(parcelas)} onValueChange={(value) => setParcelas(parseInt(value))}>
                <SelectTrigger id="parcelas">
                  <SelectValue placeholder="Selecione as parcelas" />
                </SelectTrigger>
                <SelectContent>
                  {getParcelasDisponiveis().map((opcao) => (
                    <SelectItem key={opcao.parcelas} value={String(opcao.parcelas)}>
                      {opcao.parcelas === 1 ? '1x à vista' : `${opcao.parcelas}x`} 
                      {opcao.taxa > 0 && ` (${Number(opcao.taxa).toFixed(2)}%)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                id="parcelas" 
                type="number" 
                min="1" 
                max={metodoPagamento === 'Cartão Crédito' ? getMaxParcelas() : undefined}
                value={parcelas} 
                onChange={(e) => setParcelas(Math.max(1, Math.min(metodoPagamento === 'Cartão Crédito' ? getMaxParcelas() : Infinity, parseInt(e.target.value) || 1)))} 
              />
            )}
                {metodoPagamento === 'Cartão Crédito' && !Array.isArray(maquinasCartao) && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Usando parcelas padrão - nenhuma máquina de cartão cadastrada
                  </p>
                )}
                {metodoPagamento === 'Cartão Crédito' && Array.isArray(maquinasCartao) && maquinasCartao.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    ℹ️ Usando parcelas padrão - nenhuma máquina de cartão cadastrada
                  </p>
                )}
                {metodoPagamento === 'Cartão Crédito' && Array.isArray(maquinasCartao) && maquinasCartao.length > 0 && maquinaSelecionadaId && (
                  (() => {
                    const maquina = maquinasCartao.find(m => String(m.id) === String(maquinaSelecionadaId));
                    const temTaxasCredito = maquina?.taxas?.some(t => 
                      String(t?.tipo || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().includes('credito')
                    );
                    
                    if (maquina && !temTaxasCredito) {
                      return (
                        <p className="text-xs text-amber-600 mt-1">
                          ℹ️ Usando parcelas padrão - máquina "{maquina.nome}" não possui taxas de crédito configuradas
                        </p>
                      );
                    }
                    return null;
                  })()
                )}
                {metodoPagamento === 'Cartão Crédito' && getMaxParcelas() > 1 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Máquina permite parcelar até {getMaxParcelas()}x
                  </p>
                )}
              </div>
            )}

            {metodoPagamento === 'Crediário' && (
              <div>
                <Label htmlFor="dataVencimento" className="text-sm font-medium flex items-center">
                  <Calendar size={16} className="mr-2" />
                  Data de Vencimento
                </Label>
                <Input 
                  id="dataVencimento" 
                  type="date" 
                  value={dataVencimentoCrediario} 
                  onChange={(e) => setDataVencimentoCrediario(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Data para vencimento da conta a receber
                </p>
              </div>
            )}
            
            {taxaAplicada && valorOriginalSemTaxa !== null && (
              <div className="mt-2 p-2 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 rounded-md text-xs">
                <p className="font-semibold text-yellow-700 dark:text-yellow-300">Taxa da Máquina Aplicada:</p>
                <p>Valor Original: {formatCurrency(valorOriginalSemTaxa)}</p>
                <p>Taxa ({taxaAplicada.valor}%): {formatCurrency(taxaAplicada.valorCalculado)}</p>
                <p className="font-medium">Valor Final com Taxa: {formatCurrency(valorOriginalSemTaxa + taxaAplicada.valorCalculado)}</p>
              </div>
            )}

            <Button 
              onClick={handleAdicionarPagamento} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!valorPagamento || parseFloat(valorPagamento) <= 0 || (parseFloat(valorPagamento) - (restante || 0) > 0.009)}
            >
              <PlusCircle size={18} className="mr-2" /> Adicionar Pagamento
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Pagamentos Adicionados</h3>
            <ScrollArea className="h-40 border rounded-md bg-gray-50 dark:bg-gray-700/30 p-2">
              {pagamentosAdicionados.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhum pagamento adicionado.</p>
              ) : (
                pagamentosAdicionados.map((p, index) => (
                  <div key={index} className="flex justify-between items-center p-2 mb-1.5 bg-white dark:bg-gray-800 rounded shadow-sm text-sm">
                    <div className="flex items-center">
                      {formaPagamentoIcones[p.metodo] || <Tag size={16} className="mr-2 text-gray-500" />}
                      <div>
                        <span>{p.metodo} {p.parcelas > 1 ? `(${p.parcelas}x)` : ''}</span>
                        {p.metodo === 'Pontos (Desconto)' && p.pontosUtilizados && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {p.pontosUtilizados} pontos utilizados
                          </div>
                        )}
                        {p.metodo === 'Pontos (Acumular)' && p.pontosAcumulados && (
                          <div className="text-xs text-pink-600 dark:text-pink-400">
                            +{p.pontosAcumulados} pontos a ganhar
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium mr-2">{formatCurrency(p.valorFinal || p.valor)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => handleRemoverPagamento(index)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1 text-sm">
              {totaisOS ? (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal dos Itens:</span>
                    <span>{formatCurrency(totaisOS.subtotalGeral || 0)}</span>
                  </div>
                  {totaisOS.descontoTerceirizado > 0 && (
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>Desconto Terceirizado:</span>
                      <span>- {formatCurrency(totaisOS.descontoTerceirizado)}</span>
                    </div>
                  )}
                  {totaisOS.descontoGeral > 0 && (
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Desconto Geral:</span>
                      <span>- {formatCurrency(totaisOS.descontoGeral)}</span>
                    </div>
                  )}
                  {totaisOS.frete > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>🚚 Frete:</span>
                      <span>+ {formatCurrency(totaisOS.frete)}</span>
                    </div>
                  )}
                </>
              ) : null}
              <div className="flex justify-between font-semibold">
                <span>Total do Pedido:</span>
                <span>{formatCurrency(totalOS)}</span>
              </div>
              {descontoPontosAplicado > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Desconto em Pontos:</span>
                  <span>- {formatCurrency(descontoPontosAplicado)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total com Desconto:</span>
                <span>{formatCurrency(totalComDescontoUI)}</span>
              </div>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <div className="flex justify-between">
                <span>Total Pago:</span>
                <span>{formatCurrency(totalPago)}</span>
              </div>
              {(() => {
                const totalTaxasCartao = pagamentosAdicionados.reduce((acc, p) => {
                  // Crediário nunca tem taxa, ignorar
                  if (p.metodo === 'Crediário') return acc;
                  if (p.valorFinal && p.valorOriginal && p.valorFinal > p.valorOriginal) {
                    return acc + (p.valorFinal - p.valorOriginal);
                  }
                  return acc;
                }, 0);
                if (totalTaxasCartao > 0.009) {
                  return (
                    <>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400 text-xs">
                        <span>Taxas de Cartão:</span>
                        <span>+ {formatCurrency(totalTaxasCartao)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700 dark:text-gray-300 font-medium">
                        <span>Total Real Pago:</span>
                        <span>{formatCurrency(totalPago + totalTaxasCartao)}</span>
                      </div>
                    </>
                  );
                }
                return null;
              })()}
              {restante > 0.009 && (
                <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold">
                  <span>Valor a Pagar:</span>
                  <span>{formatCurrency(restante)}</span>
                </div>
              )}
              {troco > 0.009 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                  <span>Troco:</span>
                  <span>{formatCurrency(troco)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {restante > 0.009 && !pagamentosAdicionados.some(p => p.metodo === 'Crediário') && (
            <>
            <div className="mt-2 p-3 border border-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-md text-sm text-orange-700 dark:text-orange-300 flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0"/>
                <span>O valor total dos pagamentos ainda não cobre o total do pedido. Uma conta a receber será criada para o saldo restante de {formatCurrency(restante)}.</span>
            </div>
            <div className="mt-3 p-3 border border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="evoluirProducao"
                  checked={evoluirParaProducao}
                  onCheckedChange={(checked) => setEvoluirParaProducao(checked)}
                />
                <label 
                  htmlFor="evoluirProducao" 
                  className="flex items-center cursor-pointer text-sm text-blue-800 dark:text-blue-200"
                >
                  <Package size={18} className="mr-2" />
                  Evoluir esta O.S para produção agora?
                </label>
              </div>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-300 ml-6">
                Se desmarcado, a O.S ficará como "Aguardando" até o pagamento ser concluído ou você avançar manualmente.
              </p>
            </div>
            </>
        )}

        {metodoPagamento === 'Crediário' && (
            <div className="mt-2 p-3 border border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-center">
                <CreditCard size={20} className="mr-2 flex-shrink-0"/>
                <span>Uma conta a receber será criada automaticamente com vencimento em {format(new Date(dataVencimentoCrediario), 'dd/MM/yyyy')}.</span>
            </div>
        )}

        {metodoPagamento === 'Crediário' && (!clienteId || clienteId === 'null' || clienteId === null) && (
            <div className="mt-2 p-3 border border-red-400 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0"/>
                <span>⚠️ Cliente obrigatório para pagamentos em Crediário. Selecione um cliente (cadastrado ou avulso) antes de finalizar. (ID: {clienteId})</span>
            </div>
        )}

        {metodoPagamento === 'Crediário' && clienteId && clienteId !== 'null' && clienteId !== null && !isClienteAutorizadoCrediario && (
            <div className="mt-2 p-3 border border-red-400 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300 flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0"/>
                <span>⚠️ Este cliente não está autorizado a comprar a prazo/crediário. Verifique as configurações do cliente.</span>
            </div>
        )}

        {!configPontos.ativo && (
            <div className="mt-2 p-3 border border-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded-md text-sm text-orange-700 dark:text-orange-300 flex items-center">
                <AlertTriangle size={20} className="mr-2 flex-shrink-0"/>
                <span>⚠️ Sistema de pontos está desativado. Ative nas configurações para usar pontos.</span>
            </div>
        )}

        {configPontos.ativo && (!clienteId || clienteId === 'null' || clienteId === null) && (
            <div className="mt-2 p-3 border border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-center">
                <Star size={20} className="mr-2 flex-shrink-0"/>
                <span>💡 Selecione um cliente para usar o sistema de pontos.</span>
            </div>
        )}

        {configPontos.ativo && clienteId && clienteId !== 'null' && clienteId !== null && isPrimeiraVenda && (
            <div className="mt-2 p-3 border border-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-md text-sm text-blue-700 dark:text-blue-300 flex items-center">
                <Star size={20} className="mr-2 flex-shrink-0"/>
                <span>🎉 Primeira compra! Pontos serão acumulados automaticamente.</span>
            </div>
        )}

        {configPontos.ativo && clienteId && clienteId !== 'null' && clienteId !== null && !isPrimeiraVenda && clientePontos.saldo_atual > 0 && (
            <div className="mt-2 p-3 border border-green-400 bg-green-50 dark:bg-green-900/30 rounded-md text-sm text-green-700 dark:text-green-300 flex items-center">
                <Star size={20} className="mr-2 flex-shrink-0"/>
                <span>⭐ Cliente possui {clientePontos.saldo_atual} pontos disponíveis para desconto.</span>
            </div>
        )}

        {clienteInfo && (
          <div className="mt-2 p-3 border border-purple-400 bg-purple-50 dark:bg-purple-900/30 rounded-md text-sm text-purple-700 dark:text-purple-300 flex items-center">
            <Info size={20} className="mr-2 flex-shrink-0" />
            <span>
              {clienteInfo.classificacao_cliente === 'Terceirizado' && clienteInfo.desconto_fixo_os_terceirizado ? (
                <>
                  Cliente {clienteInfo.nome} é terceirizado. Desconto fixo de {clienteInfo.desconto_fixo_os_terceirizado}% aplicado.
                </>
              ) : (
                <>
                  Cliente {clienteInfo.nome} não é terceirizado.
                </>
              )}
            </span>
          </div>
        )}
          </div>

        <DialogFooter className="mt-6 flex-shrink-0">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button 
            onClick={handleConfirmarEFinalizar} 
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isConfirmButtonDisabled() || isFinalizandoPagamento}
          >
            <CheckCircle2 size={18} className="mr-2"/>
            {isFinalizandoPagamento ? 'Processando...' : (restante > 0.009 && !pagamentosAdicionados.some(p => p.metodo === 'Crediário') ? 'Registrar pagamento parcial' : 'Confirmar Pagamento e Finalizar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal do QR Code do Pix */}
    {selectedContaPix && (
      <PixQrCodeModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        valor={valorPagamento}
        chavePix={selectedContaPix.chavePix}
        nomeEmpresa={empresaSettings.nomeFantasia || empresaSettings.nome_fantasia || 'Sua Empresa'}
        cidadeEmpresa={empresaSettings.cidade || 'Sua Cidade'}
        qrCodeUrl={selectedContaPix.qrCodeUrl}
        shouldGenerateQr={selectedContaPix.shouldGenerateQr}
        hasChavePix={selectedContaPix.hasChavePix}
        hasQrCodeUrl={selectedContaPix.hasQrCodeUrl}
      />
    )}
  </>
  );
};

export default OSPagamentoModal;