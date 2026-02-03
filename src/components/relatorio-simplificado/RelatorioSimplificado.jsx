import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, DollarSign, ArrowDownCircle, ArrowUpCircle, Download, ShoppingCart, ClipboardList, Layers } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format, parseISO, startOfDay, endOfDay, isValid, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';

const initialEntradasState = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, total: 0 };

const RelatorioSimplificado = () => {
  const { toast } = useToast();
  const [dataRelatorio, setDataRelatorio] = useState(new Date());
  
  const [entradasPDV, setEntradasPDV] = useState(initialEntradasState);
  const [entradasOS, setEntradasOS] = useState(initialEntradasState);
  const [entradasEnvelopamento, setEntradasEnvelopamento] = useState(initialEntradasState);
  const [entradasContasReceber, setEntradasContasReceber] = useState(initialEntradasState);
  const [contasRecebidasAgregadas, setContasRecebidasAgregadas] = useState(initialEntradasState);

  const [saidas, setSaidas] = useState({ sangria: 0, suprimento: 0 });
  const [faltaReceber, setFaltaReceber] = useState(0);

  const [empresaSettings, setEmpresaSettings] = useState({});
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let isMounted = true; // Flag para evitar execução dupla
    
    const loadData = async () => {
      if (!isMounted) return; // Evitar execução se componente foi desmontado
      
      try {
      
      const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings') || '{}', {});
      const logo = await apiDataManager.getItem('logoUrl') || '';
      setEmpresaSettings(settings);
      setLogoUrl(logo);

      const inicioDia = startOfDay(dataRelatorio);
      const fimDia = endOfDay(dataRelatorio);
      

    // Buscar vendas PDV da API
    let historicoVendasPDV = [];
    try {
      const { pdvService } = await import('@/services/pdvService');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando vendas PDV para o período:', { dataInicio, dataFim });
      
      // Buscar vendas com filtro de data (sem relacionamentos para otimizar performance)
      const vendasAPI = await pdvService.getHistoricoVendas({
        data_inicio: dataInicio,
        data_fim: dataFim,
        with: '' // Remove relacionamentos desnecessários para o relatório
      });
      
      historicoVendasPDV = Array.isArray(vendasAPI) ? vendasAPI : [];
      console.log('✅ Vendas PDV carregadas da API com filtro:', historicoVendasPDV.length);
    } catch (apiError) {
      console.error('❌ Erro ao carregar vendas PDV da API:', apiError);
      historicoVendasPDV = [];
    }

    // Buscar vendas Marketplace da API
    let vendasMarketplace = [];
    try {
      const { marketplaceService } = await import('@/services/marketplaceService');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando vendas Marketplace para o período:', { dataInicio, dataFim });
      
      // Buscar vendas com filtro de data
      const vendasMarketplaceAPI = await marketplaceService.getVendas({
        data_inicio: dataInicio,
        data_fim: dataFim
      });
      
      vendasMarketplace = Array.isArray(vendasMarketplaceAPI) ? vendasMarketplaceAPI : [];
      console.log('✅ Vendas Marketplace carregadas da API com filtro:', vendasMarketplace.length);
    } catch (apiError) {
      console.error('❌ Erro ao carregar vendas marketplace da API:', apiError);
      vendasMarketplace = [];
    }

    // Buscar Ordens de Serviço da API
    let ordensServicoSalvas = [];
    try {
      const { osService } = await import('@/services/api');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando O.S. para o período:', { dataInicio, dataFim });
      
      // Buscar O.S. com filtro de data e status (sem relacionamentos para otimizar performance)
      const osResponse = await osService.getAll({
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: 'Finalizada,Entregue',
        with: '' // Remove relacionamentos desnecessários para o relatório
      });
      
      ordensServicoSalvas = Array.isArray(osResponse.data) ? osResponse.data : [];
      console.log('✅ Ordens de Serviço carregadas da API com filtro:', ordensServicoSalvas.length);
      
      // Log das primeiras O.S. para debug
      if (ordensServicoSalvas.length > 0) {
        console.log('📋 Primeira O.S. filtrada:', ordensServicoSalvas[0]);
      }
    } catch (apiError) {
      console.error('❌ Erro ao carregar ordens de serviço da API:', apiError);
      ordensServicoSalvas = [];
    }

    // Buscar Envelopamentos da API
    let envelopamentosData = [];
    try {
      const envelopamentoService = (await import('@/services/envelopamentoApi')).default;
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando envelopamentos para o período:', { dataInicio, dataFim });
      
      // Buscar envelopamentos com filtro de data (sem relacionamentos para otimizar performance)
      const envResponse = await envelopamentoService.getAll({
        data_inicio: dataInicio,
        data_fim: dataFim,
        with: '' // Remove relacionamentos desnecessários para o relatório
      });
      
      // Suporta múltiplos formatos de resposta (paginado e não paginado)
      const envPayload = Array.isArray(envResponse)
        ? envResponse
        : (Array.isArray(envResponse?.data?.data)
            ? envResponse.data.data
            : (Array.isArray(envResponse?.data) ? envResponse.data : []));
      envelopamentosData = envPayload;
      
      console.log('✅ Envelopamentos carregados:', envelopamentosData.length);
    } catch (apiError) {
      console.error('❌ Erro ao carregar envelopamentos da API:', apiError);
      toast({
        title: "Erro ao carregar envelopamentos",
        description: "Não foi possível carregar os dados de envelopamentos.",
        variant: "destructive",
      });
    }
    
    const envelopamentosFinalizados = Array.isArray(envelopamentosData)
      ? envelopamentosData.filter(env => String(env.status || '').toLowerCase().startsWith('finaliz'))
      : [];

    // Buscar Movimentações de Caixa da API
    let movimentacoesCaixa = [];
    try {
      const { lancamentoCaixaService } = await import('@/services/api');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando movimentações de caixa para o período:', { dataInicio, dataFim });
      
      // Buscar movimentações com filtro de data
      const movResponse = await lancamentoCaixaService.getAll({
        data_inicio: dataInicio,
        data_fim: dataFim
      });
      
      console.log('🔍 Resposta completa da API de movimentações:', movResponse);
      
      // Verificar diferentes estruturas de resposta
      if (movResponse.data) {
        if (Array.isArray(movResponse.data)) {
          movimentacoesCaixa = movResponse.data;
        } else if (movResponse.data.data && Array.isArray(movResponse.data.data)) {
          movimentacoesCaixa = movResponse.data.data;
        } else if (movResponse.data.data && Array.isArray(movResponse.data.data.data)) {
          movimentacoesCaixa = movResponse.data.data.data;
        }
      }
      
      console.log('✅ Movimentações de Caixa carregadas da API com filtro:', movimentacoesCaixa.length);
      console.log('📊 Dados das movimentações:', movimentacoesCaixa);
    } catch (apiError) {
      console.error('❌ Erro ao carregar movimentações de caixa da API:', apiError);
      movimentacoesCaixa = [];
    }

    // Buscar Pagamentos Recebidos das Contas a Receber da API
    let pagamentosRecebidos = [];
    try {
      const { lancamentoCaixaService } = await import('@/services/api');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando pagamentos recebidos para o período:', { dataInicio, dataFim });
      
      // Buscar lançamentos de caixa do tipo entrada com operacao_tipo 'conta_receber_recebida'
      const pagamentosResponse = await lancamentoCaixaService.getAll({
        data_inicio: dataInicio,
        data_fim: dataFim,
        tipo: 'entrada'
      });
      
      console.log('🔍 Resposta completa da API de pagamentos recebidos:', pagamentosResponse);
      console.log('🔍 Parâmetros da busca:', { dataInicio, dataFim, tipo: 'entrada' });
      
      // Verificar diferentes estruturas de resposta e filtrar apenas pagamentos de contas a receber
      let lancamentos = [];
      if (pagamentosResponse.data) {
        if (Array.isArray(pagamentosResponse.data)) {
          lancamentos = pagamentosResponse.data;
        } else if (pagamentosResponse.data.data && Array.isArray(pagamentosResponse.data.data)) {
          lancamentos = pagamentosResponse.data.data;
        } else if (pagamentosResponse.data.data && Array.isArray(pagamentosResponse.data.data.data)) {
          lancamentos = pagamentosResponse.data.data.data;
        }
      }
      
      console.log('📊 Total de lançamentos encontrados:', lancamentos.length);
      console.log('📋 Todos os lançamentos:', lancamentos.map(l => ({
        id: l.id,
        operacao_tipo: l.operacao_tipo,
        descricao: l.descricao,
        valor: l.valor,
        data_operacao: l.data_operacao
      })));
      
      // Filtrar apenas lançamentos de pagamentos de contas a receber
      pagamentosRecebidos = lancamentos.filter(lancamento => 
        lancamento.operacao_tipo === 'conta_receber_recebida'
      );
      
      console.log('✅ Pagamentos recebidos carregados da API:', pagamentosRecebidos.length);
      console.log('📊 Dados dos pagamentos recebidos:', pagamentosRecebidos);
    } catch (apiError) {
      console.error('❌ Erro ao carregar pagamentos recebidos da API:', apiError);
      pagamentosRecebidos = [];
    }

    // Buscar Contas a Receber da API - filtrar por data para calcular "Falta Receber" corretamente
    let contasReceberGeral = [];
    let recebimentosGerais = [];
    let todasContasReceber = []; // Declarar aqui para estar disponível em todo o escopo
    
    try {
      const { contasReceberService } = await import('@/services/contasReceberService');
      const { vendaService } = await import('@/services/api');
      
      // Formatar datas para o formato esperado pela API
      const dataInicio = format(inicioDia, 'yyyy-MM-dd');
      const dataFim = format(fimDia, 'yyyy-MM-dd');
      
      console.log('📅 Buscando contas a receber que vencem no dia selecionado (pendentes e vencidas)');
      
      // Buscar contas a receber que VENCEM no dia filtrado (pendentes e vencidas)
      // Usar filtro por data de vencimento para mostrar apenas o que deve ser recebido no dia
      const contasResponse = await contasReceberService.getContasReceber({
        vencimento_de: dataInicio,
        vencimento_ate: dataFim
      });
      contasReceberGeral = Array.isArray(contasResponse.data) ? contasResponse.data : [];
      
      // IMPORTANTE: Também buscar TODAS as contas a receber para processar histórico de pagamentos
      // Isso garante que pagamentos feitos no dia apareçam, mesmo que a conta não vença hoje
      console.log('📅 Buscando TODAS as contas a receber para processar histórico de pagamentos');
      try {
        const todasContasResponse = await contasReceberService.getContasReceber({});
        todasContasReceber = Array.isArray(todasContasResponse.data) ? todasContasResponse.data : [];
        console.log('✅ Total de contas a receber carregadas:', todasContasReceber.length);
      } catch (error) {
        console.warn('Erro ao carregar todas as contas a receber:', error);
      }
      
      // Buscar recebimentos gerais (vendas PDV, OS, envelopamentos, crediários pagos) para o dia
      // Isso garante que todas as entradas do dia sejam consideradas
      
      try {
        const responseRecebimentos = await vendaService.getRelatorioGeralRecebimentos({
          data_inicio: dataInicio,
          data_fim: dataFim,
          filtrar_por_data_recebimento: true // Mostrar apenas recebimentos efetivamente recebidos no dia
        });
        
        if (responseRecebimentos.success || responseRecebimentos.data?.success) {
          const data = responseRecebimentos.data?.data || responseRecebimentos.data || {};
          recebimentosGerais = data.recebimentos || [];
          
          // PROCESSAR RECEBIMENTOS DA API PARA OS CARDS
          console.log('🔍 PROCESSANDO RECEBIMENTOS DA API PARA OS CARDS:');
          
          let pdvAgregado = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, total: 0 };
          let osAgregado = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, total: 0 };
          let envAgregado = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, total: 0 };
          let crediariosAgregado = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, total: 0 };
          
          recebimentosGerais.forEach(recebimento => {
            const valor = parseFloat(recebimento.valor || 0);
            const formaPagamento = (recebimento.formaPagamento || '').toLowerCase();
            const tipo = recebimento.tipo || '';
            
            // Categorizar por forma de pagamento
            let pix = 0, cartaoCredito = 0, cartaoDebito = 0, dinheiro = 0;
            
            if (formaPagamento.includes('pix')) {
              pix = valor;
            } else if (formaPagamento.includes('crédito') || formaPagamento.includes('credito')) {
              cartaoCredito = valor;
            } else if (formaPagamento.includes('débito') || formaPagamento.includes('debito')) {
              cartaoDebito = valor;
            } else if (formaPagamento.includes('dinheiro')) {
              dinheiro = valor;
            } else {
              // Para marketplace e outros, categorizar como dinheiro
              dinheiro = valor;
            }
            
            // Agregar por tipo de origem - PRIORIZAR crediários pagos primeiro
            if (tipo === 'conta_receber_paga' || recebimento.origem?.includes('Crediário Pago')) {
              crediariosAgregado.pix += pix;
              crediariosAgregado.cartaoCredito += cartaoCredito;
              crediariosAgregado.cartaoDebito += cartaoDebito;
              crediariosAgregado.dinheiro += dinheiro;
              crediariosAgregado.total += valor;
            } else if (tipo === 'venda_pdv' || (recebimento.origem?.includes('Venda PDV') && !recebimento.origem?.includes('Crediário Pago'))) {
              pdvAgregado.pix += pix;
              pdvAgregado.cartaoCredito += cartaoCredito;
              pdvAgregado.cartaoDebito += cartaoDebito;
              pdvAgregado.dinheiro += dinheiro;
              pdvAgregado.total += valor;
            } else if (tipo === 'ordem_servico' || recebimento.origem?.includes('Ordem de Serviço')) {
              osAgregado.pix += pix;
              osAgregado.cartaoCredito += cartaoCredito;
              osAgregado.cartaoDebito += cartaoDebito;
              osAgregado.dinheiro += dinheiro;
              osAgregado.total += valor;
            } else if (tipo === 'envelopamento' || recebimento.origem?.includes('Envelopamento')) {
              envAgregado.pix += pix;
              envAgregado.cartaoCredito += cartaoCredito;
              envAgregado.cartaoDebito += cartaoDebito;
              envAgregado.dinheiro += dinheiro;
              envAgregado.total += valor;
            } else if (tipo === 'marketplace' || recebimento.origem?.includes('Marketplace')) {
              // Marketplace deve aparecer como uma categoria separada
              // Por enquanto, vamos incluí-lo nas entradas PDV para manter compatibilidade
              pdvAgregado.pix += pix;
              pdvAgregado.cartaoCredito += cartaoCredito;
              pdvAgregado.cartaoDebito += cartaoDebito;
              pdvAgregado.dinheiro += dinheiro;
              pdvAgregado.total += valor;
            }
            
            console.log(`  - ${recebimento.origem}: R$ ${valor.toFixed(2)} - ${recebimento.formaPagamento} - Tipo: ${tipo}`);
          });
          
          console.log('📊 VALORES AGREGADOS DA API:');
          console.log('  PDV:', pdvAgregado);
          console.log('  OS:', osAgregado);
          console.log('  Envelopamento:', envAgregado);
          console.log('  Crediários Pagos:', crediariosAgregado);
          
          // USAR OS DADOS DA API PARA OS CARDS
          setEntradasPDV(pdvAgregado);
          setEntradasOS(osAgregado);
          setEntradasEnvelopamento(envAgregado);
          
          // Para "Contas Recebidas", usar os crediários pagos
          setContasRecebidasAgregadas(crediariosAgregado);
        }
        
        console.log('✅ Recebimentos gerais carregados para o dia:', recebimentosGerais.length);
        console.log('📊 Dados dos recebimentos gerais:', recebimentosGerais);
      } catch (error) {
        console.warn('Erro ao carregar recebimentos gerais:', error);
      }
      
      console.log('✅ Contas a Receber pendentes carregadas da API (filtradas por vencimento do dia):', contasReceberGeral.length);
      console.log('📊 Dados das contas a receber pendentes que vencem no dia:', contasReceberGeral);
    } catch (apiError) {
      console.error('❌ Erro ao carregar contas a receber da API:', apiError);
      contasReceberGeral = [];
    }
    
    const calcularEntradasPorFonte = (pagamentos) => {
      let pix = 0, cartaoCredito = 0, cartaoDebito = 0, dinheiro = 0, total = 0;
      
      (pagamentos || []).forEach(pag => {
        const valor = parseFloat(pag.valorFinal || pag.valor || pag.valor_total || 0);
        const metodo = (pag.metodo || pag.forma_pagamento || pag.tipo_pagamento || '').toLowerCase();
        
        // CORREÇÃO: Não incluir crediário nas entradas, pois tem card específico
        const isCrediario = metodo.includes('crediário') || metodo.includes('crediario');
        
        if (isCrediario) {
          // Crediário não é incluído nas entradas, apenas no card específico
          return;
        }
        
        if (metodo.includes('pix')) {
          pix += valor;
        } else if (metodo.includes('crédito') || metodo.includes('credito') || metodo.includes('cartão crédito') || metodo.includes('cartao credito')) {
          cartaoCredito += valor;
        } else if (metodo.includes('débito') || metodo.includes('debito') || metodo.includes('cartão débito') || metodo.includes('cartao debito')) {
          cartaoDebito += valor;
        } else if (metodo.includes('dinheiro')) {
          dinheiro += valor;
        }
        // Para transferência e outros métodos, não categorizamos mas contamos no total
        
        total += valor;
      });
      
      return { pix, cartaoCredito, cartaoDebito, dinheiro, total };
    };

    // Função para processar recebimentos do histórico de pagamentos das contas a receber
    // FILTRAR APENAS CONTAS DE CREDIÁRIO
    const processarRecebimentosContasReceber = (contas) => {
      let recebimentosAgregados = { pix: 0, cartaoCredito: 0, cartaoDebito: 0, dinheiro: 0, crediario: 0, total: 0 };
      
      console.log(`🔍 Processando ${contas.length} contas a receber para recebimentos...`);
      
      // Filtrar apenas contas de crediário (envelopamentos, OS, ou vendas marcadas como crediário)
      const contasCrediario = contas.filter(conta => {
        const isEnvelopamento = conta.envelopamento_id != null;
        const isOS = conta.os_id != null;
        const isVendaCrediario = conta.venda_id != null && conta.observacoes && 
                                 (conta.observacoes.toLowerCase().includes('crediário') || 
                                  conta.observacoes.toLowerCase().includes('crediario'));
        return isEnvelopamento || isOS || isVendaCrediario;
      });
      
      console.log(`📊 Contas de crediário encontradas: ${contasCrediario.length} de ${contas.length} contas`);
      
      contasCrediario.forEach((conta, index) => {
        console.log(`📋 Conta ${index + 1}: ID ${conta.id}, Cliente: ${conta.cliente_nome}, Valor: R$ ${conta.valor_total}, Tipo: ${conta.envelopamento_id ? 'Envelopamento' : conta.os_id ? 'OS' : 'Venda'}`);
        
        if (conta.historico_pagamentos && Array.isArray(conta.historico_pagamentos)) {
          console.log(`  📝 Histórico de pagamentos: ${conta.historico_pagamentos.length} pagamentos`);
          
          conta.historico_pagamentos.forEach((pagamento, pagIndex) => {
            const dataPagamento = pagamento.data;
            const valor = parseFloat(pagamento.valor || 0);
            const formaPagamento = pagamento.forma_pagamento || '';
            
            console.log(`    💳 Pagamento ${pagIndex + 1}: R$ ${valor.toFixed(2)} - "${formaPagamento}" - Data: ${dataPagamento}`);
            
            if (dataPagamento && isValid(parseISO(dataPagamento))) {
              const dataPagamentoObj = parseISO(dataPagamento);
              
              // Verificar se o pagamento foi feito no período selecionado
              if (dataPagamentoObj >= inicioDia && dataPagamentoObj <= fimDia) {
                console.log(`    ✅ Pagamento dentro do período - Processando...`);
                
                const formaPagamentoLower = formaPagamento.toLowerCase();
                
                if (formaPagamentoLower.includes('pix')) {
                  recebimentosAgregados.pix += valor;
                  console.log(`      ➡️ Categorizado como PIX: R$ ${valor.toFixed(2)}`);
                } else if (formaPagamentoLower.includes('crédito') || formaPagamentoLower.includes('credito') || formaPagamentoLower.includes('cartão crédito') || formaPagamentoLower.includes('cartao credito')) {
                  recebimentosAgregados.cartaoCredito += valor;
                  console.log(`      ➡️ Categorizado como Cartão Crédito: R$ ${valor.toFixed(2)}`);
                } else if (formaPagamentoLower.includes('débito') || formaPagamentoLower.includes('debito') || formaPagamentoLower.includes('cartão débito') || formaPagamentoLower.includes('cartao debito')) {
                  recebimentosAgregados.cartaoDebito += valor;
                  console.log(`      ➡️ Categorizado como Cartão Débito: R$ ${valor.toFixed(2)}`);
                } else if (formaPagamentoLower.includes('dinheiro')) {
                  recebimentosAgregados.dinheiro += valor;
                  console.log(`      ➡️ Categorizado como Dinheiro: R$ ${valor.toFixed(2)}`);
                } else if (formaPagamentoLower.includes('crediário') || formaPagamentoLower.includes('crediario')) {
                  recebimentosAgregados.crediario += valor;
                  console.log(`      ➡️ Categorizado como Crediário: R$ ${valor.toFixed(2)}`);
                } else {
                  recebimentosAgregados.dinheiro += valor; // Fallback for unrecognized methods
                  console.log(`      ⚠️ Forma de pagamento não reconhecida: "${formaPagamento}" - Categorizado como Dinheiro: R$ ${valor.toFixed(2)}`);
                }
                
                recebimentosAgregados.total += valor;
              } else {
                console.log(`    ❌ Pagamento fora do período - Ignorado`);
              }
            } else {
              console.log(`    ❌ Data inválida - Ignorado`);
            }
          });
        } else {
          console.log(`  ❌ Sem histórico de pagamentos`);
        }
      });
      
      console.log(`📊 Total processado: R$ ${recebimentosAgregados.total.toFixed(2)}`);
      console.log(`  - PIX: R$ ${recebimentosAgregados.pix.toFixed(2)}`);
      console.log(`  - Cartão Crédito: R$ ${recebimentosAgregados.cartaoCredito.toFixed(2)}`);
      console.log(`  - Cartão Débito: R$ ${recebimentosAgregados.cartaoDebito.toFixed(2)}`);
      console.log(`  - Dinheiro: R$ ${recebimentosAgregados.dinheiro.toFixed(2)}`);
      console.log(`  - Crediário: R$ ${recebimentosAgregados.crediario.toFixed(2)}`);
      
      return recebimentosAgregados;
    };

    // REMOVIDO: Processamento antigo de PDV, OS e Envelopamentos
    // Os valores corretos já foram definidos pelo processamento da API acima (linhas 374-379)
    // TAMBÉM REMOVIDO: Processamento duplicado de pagamentos recebidos
    // A API getRelatorioGeralRecebimentos já retorna os crediários pagos corretamente

    // NOTA: As buscas de vendas PDV, Marketplace, OS e Envelopamentos acima ainda são necessárias
    // para mostrar os detalhes nas tabelas do relatório, mas NÃO devem ser usadas para calcular os totais
    
    // IMPORTANTE: NÃO processar os dados novamente aqui!
    // A API getRelatorioGeralRecebimentos já retornou os dados processados corretamente
    // e os estados já foram definidos nas linhas 374-379
    // Qualquer processamento adicional irá SOBRESCREVER os valores corretos
    
    // ========================================
    // PROCESSAMENTO DE SANGRIAS E SUPRIMENTOS
    // ========================================
    
    let totalSangria = 0;
    let totalSuprimento = 0;
    const movimentacoesArray = Array.isArray(movimentacoesCaixa) ? movimentacoesCaixa : [];
    
    console.log('🔍 Processando movimentações de caixa:', movimentacoesArray.length);
    console.log('📅 Período:', { inicio: inicioDia, fim: fimDia });
    
    movimentacoesArray.forEach((mov, index) => {
      console.log(`💰 Movimentação ${index}:`, mov);
      
      const dataMov = mov.data_operacao || mov.data;
      if (dataMov && isValid(parseISO(dataMov))) {
        const dataMovObj = parseISO(dataMov);
        console.log(`📅 Data da movimentação ${index}:`, dataMovObj);
        
        if (dataMovObj >= inicioDia && dataMovObj <= fimDia) {
          console.log(`✅ Movimentação ${index} está no período`);
          
          // Verificar se é sangria ou suprimento baseado no tipo ou metadados
          const tipoMovimentacao = mov.metadados?.tipo_movimentacao;
          const tipo = mov.tipo;
          const operacaoTipo = mov.operacao_tipo;
          const categoriaNome = mov.categoria_nome;
          const valor = parseFloat(mov.valor || 0);
          
          console.log(`💳 Tipo: ${tipo}, Tipo Movimentação: ${tipoMovimentacao}, Operação: ${operacaoTipo}, Categoria: ${categoriaNome}, Valor: ${valor}`);
          
          // Sangria: tipo 'saida' E (metadados com 'sangria' OU categoria contém 'sangria')
          if (tipo === 'saida' && (tipoMovimentacao === 'sangria' || categoriaNome?.toLowerCase().includes('sangria'))) {
            totalSangria += valor;
            console.log(`🔴 Sangria adicionada: ${valor}, Total: ${totalSangria}`);
          }
          
          // Suprimento: tipo 'entrada' E (metadados com 'suprimento' OU categoria contém 'suprimento')
          // EXCLUIR abertura de caixa e vendas das movimentações de caixa
          if (tipo === 'entrada' && 
              (tipoMovimentacao === 'suprimento' || categoriaNome?.toLowerCase().includes('suprimento')) &&
              operacaoTipo !== 'venda' && 
              operacaoTipo !== 'abertura_caixa') {
            totalSuprimento += valor;
            console.log(`🟢 Suprimento adicionado: ${valor}, Total: ${totalSuprimento}`);
          } else if (operacaoTipo === 'venda' || operacaoTipo === 'abertura_caixa') {
            console.log(`ℹ️ Movimentação de venda/abertura ignorada: ${valor} - ${operacaoTipo}`);
          }
        } else {
          console.log(`❌ Movimentação ${index} fora do período`);
        }
      } else {
        console.log(`❌ Data inválida para movimentação ${index}:`, dataMov);
      }
    });
    setSaidas({ sangria: totalSangria, suprimento: totalSuprimento });

    const contasReceberArray = Array.isArray(contasReceberGeral) ? contasReceberGeral : [];
    
    // DEBUG: Log da data do relatório
    console.log('🗓️ Data do relatório selecionada:', format(dataRelatorio, 'dd/MM/yyyy'));
    console.log('🗓️ Data atual do sistema:', format(new Date(), 'dd/MM/yyyy'));
    
    // Calcular "Falta Receber (Geral)" considerando contas que VENCEM HOJE (mesma data selecionada no relatório)
    const totalFaltaReceberGeral = contasReceberArray
      .filter(conta => {
        const status = conta.status || conta.status_conta || conta.status_calculado;
        
        // CORREÇÃO: Incluir apenas contas de CREDIÁRIO (como mostrado na imagem)
        // Verificar se é uma conta de crediário pela observação
        const observacao = conta.observacoes || conta.observacao_venda || '';
        const isCrediario = observacao.toLowerCase().includes('crediário') || observacao.toLowerCase().includes('crediario');
        
        // Verificar se a conta vence HOJE (mesma data selecionada no relatório)
        const dataVencimento = conta.data_vencimento;
        if (!dataVencimento) {
          console.log('❌ Conta sem data de vencimento:', conta.id);
          return false;
        }
        
        const dataVencimentoObj = new Date(dataVencimento);
        const dataRelatorioObj = new Date(dataRelatorio);
        
        // Comparar apenas ano, mês e dia (ignorar horário)
        const vencimentoNormalizado = new Date(dataVencimentoObj.getFullYear(), dataVencimentoObj.getMonth(), dataVencimentoObj.getDate());
        const relatorioNormalizado = new Date(dataRelatorioObj.getFullYear(), dataRelatorioObj.getMonth(), dataRelatorioObj.getDate());
        
        const venceHoje = vencimentoNormalizado.getTime() === relatorioNormalizado.getTime();
        
        // DEBUG: Log detalhado da comparação de datas
        console.log(`📅 Conta ${conta.id} - Comparação de datas:`, {
          dataVencimentoOriginal: dataVencimento,
          dataVencimentoNormalizada: format(vencimentoNormalizado, 'dd/MM/yyyy'),
          dataRelatorioOriginal: dataRelatorio,
          dataRelatorioNormalizada: format(relatorioNormalizado, 'dd/MM/yyyy'),
          venceHoje: venceHoje
        });
        
        // Verificar se é uma conta que deveria aparecer (pendente/vencida que vence hoje e NÃO foi paga)
        // IMPORTANTE: Verificar também se a conta não foi recebida hoje através dos recebimentos gerais
        const isPendenteOuVencida = (status === 'pendente' || status === 'vencido') && 
                                   status !== 'quitada' && status !== 'recebido';
        
        // Verificar se esta conta foi recebida hoje (mesmo que ainda esteja marcada como pendente)
        const tipoConta = conta.envelopamento_id ? 'envelopamento' : 
                         conta.os_id ? 'ordem_servico' : 
                         conta.venda_id ? 'venda' : 'conta_receber';
        
        const foiRecebidaHoje = recebimentosGerais.some(recebimento => {
          const valorRecebimento = parseFloat(recebimento.valor);
          const valorConta = parseFloat(conta.valor_pendente);
          const tipoRecebimento = recebimento.tipo;
          const dataRecebimento = recebimento.data_pagamento;
          
          const matchTipo = tipoRecebimento === tipoConta;
          const matchValor = valorRecebimento === valorConta;
          const matchData = dataRecebimento && 
                           format(parseISO(dataRecebimento), 'dd/MM/yyyy') === format(dataRelatorio, 'dd/MM/yyyy');
          
          
          return matchTipo && matchValor && matchData;
        });
        
        // DEBUG: Log de cada conta sendo verificada
        if (isCrediario) {
          console.log(`🔍 Conta ${conta.id} (CREDIÁRIO):`, {
            status: status,
            dataVencimento: format(dataVencimentoObj, 'dd/MM/yyyy'),
            dataRelatorio: format(dataRelatorioObj, 'dd/MM/yyyy'),
            venceHoje: venceHoje,
            isPendenteOuVencida: isPendenteOuVencida,
            foiRecebidaHoje: foiRecebidaHoje,
            valorPendente: conta.valor_pendente,
            valorOriginal: conta.valor_original,
            observacao: observacao,
            incluida: venceHoje && isPendenteOuVencida && isCrediario && !foiRecebidaHoje
          });
        }
        
        return venceHoje && isPendenteOuVencida && isCrediario && !foiRecebidaHoje;
      })
      .reduce((acc, conta) => {
        // Usar valor_pendente para contas pendentes e valor_original para contas vencidas
        const status = conta.status || conta.status_conta || conta.status_calculado;
        let valorConta = 0;
        
        if (status === 'vencido' || status === 'Vencido') {
          // Para contas vencidas, usar valor_pendente se > 0, senão valor_original
          valorConta = parseFloat(conta.valor_pendente) > 0 ? parseFloat(conta.valor_pendente) : parseFloat(conta.valor_original);
        } else {
          // Para contas pendentes, usar valor_pendente
          valorConta = parseFloat(conta.valor_pendente);
        }
        
        console.log(`💰 Conta ${conta.id} adicionada: R$ ${valorConta.toFixed(2)} (Status: ${status})`);
        
        return acc + valorConta;
      }, 0);
    
    // Contar contas de crediário que vencem hoje para debug
    const contasCrediarioQueVencemHoje = contasReceberArray.filter(conta => {
      const status = conta.status || conta.status_conta || conta.status_calculado;
      
      // Verificar se é crediário
      const observacao = conta.observacoes || conta.observacao_venda || '';
      const isCrediario = observacao.toLowerCase().includes('crediário') || observacao.toLowerCase().includes('crediario');
      
      const dataVencimento = conta.data_vencimento;
      if (!dataVencimento) return false;
      
      const dataVencimentoObj = new Date(dataVencimento);
      const dataRelatorioObj = new Date(dataRelatorio);
      
      const vencimentoNormalizado = new Date(dataVencimentoObj.getFullYear(), dataVencimentoObj.getMonth(), dataVencimentoObj.getDate());
      const relatorioNormalizado = new Date(dataRelatorioObj.getFullYear(), dataRelatorioObj.getMonth(), dataRelatorioObj.getDate());
      
      const venceHoje = vencimentoNormalizado.getTime() === relatorioNormalizado.getTime();
      const isPendenteOuVencida = (status === 'pendente' || status === 'vencido') && 
                                 status !== 'quitada' && status !== 'recebido';
      
      // Verificar se foi recebida hoje (mesmo filtro usado no cálculo principal)
      const foiRecebidaHoje = recebimentosGerais.some(recebimento => {
        const tipoConta = conta.envelopamento_id ? 'envelopamento' : 
                         conta.os_id ? 'ordem_servico' : 
                         conta.venda_id ? 'venda' : 'conta_receber';
        
        return recebimento.tipo === tipoConta && 
               parseFloat(recebimento.valor) === parseFloat(conta.valor_pendente) &&
               recebimento.data_pagamento && 
               format(parseISO(recebimento.data_pagamento), 'dd/MM/yyyy') === format(dataRelatorio, 'dd/MM/yyyy');
      });
      
      return isPendenteOuVencida && isCrediario && venceHoje && !foiRecebidaHoje;
    });
    
    // DEBUG: Log de todas as contas para investigação
    console.log('🔍 INVESTIGAÇÃO - Todas as contas carregadas:');
    contasReceberArray.forEach(conta => {
      const status = conta.status || conta.status_conta || conta.status_calculado;
      const observacao = conta.observacoes || conta.observacao_venda || '';
      const isCrediario = observacao.toLowerCase().includes('crediário') || observacao.toLowerCase().includes('crediario');
      
      console.log(`  Conta ${conta.id}: Status=${status}, Crediário=${isCrediario}, Observação="${observacao}", Valor=${conta.valor_pendente}`);
    });
    
    console.log('📊 Total de contas carregadas:', contasReceberArray.length);
    console.log('📊 Contas de CREDIÁRIO que vencem HOJE encontradas:', contasCrediarioQueVencemHoje.length);
    console.log('💰 Total Falta Receber (Geral) - contas de crediário que vencem hoje:', totalFaltaReceberGeral);
    
    setFaltaReceber(totalFaltaReceberGeral);
    
    } catch (error) {
      console.error('❌ Erro ao carregar dados do relatório simplificado:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do relatório. Tente novamente.",
        variant: "destructive",
      });
    }
  };
        
    loadData();
    
    return () => {
      isMounted = false; // Cleanup para evitar vazamentos
    };
  }, [dataRelatorio]);

  const totalEntradasValor = useMemo(() => 
    entradasPDV.total + 
    entradasOS.total + 
    entradasEnvelopamento.total + 
    contasRecebidasAgregadas.total + 
    saidas.suprimento, 
    [entradasPDV.total, entradasOS.total, entradasEnvelopamento.total, contasRecebidasAgregadas.total, saidas.suprimento]
  );
  const totalSaidasValor = useMemo(() => saidas.sangria, [saidas.sangria]);
  const saldoDia = useMemo(() => {
    const saldo = totalEntradasValor - totalSaidasValor;
    console.log('💰 CÁLCULO DO SALDO DO DIA:');
    console.log(`  📊 Total Entradas PDV: R$ ${entradasPDV.total.toFixed(2)}`);
    console.log(`  🔧 Total Entradas O.S.: R$ ${entradasOS.total.toFixed(2)}`);
    console.log(`  📦 Total Entradas Envelop.: R$ ${entradasEnvelopamento.total.toFixed(2)}`);
    console.log(`  💳 Total Contas Recebidas: R$ ${contasRecebidasAgregadas.total.toFixed(2)}`);
    console.log(`  💰 Suprimentos: R$ ${saidas.suprimento.toFixed(2)}`);
    console.log(`  📤 Total Entradas: R$ ${totalEntradasValor.toFixed(2)}`);
    console.log(`  🔴 Saídas (Sangria): R$ ${totalSaidasValor.toFixed(2)}`);
    console.log(`  ⚖️ SALDO DO DIA: R$ ${saldo.toFixed(2)}`);
    return saldo;
  }, [totalEntradasValor, totalSaidasValor, entradasPDV.total, entradasOS.total, entradasEnvelopamento.total, contasRecebidasAgregadas.total, saidas.suprimento]);

  const exportarPDF = () => {
    const input = document.getElementById('relatorio-simplificado-content');
    if (!input) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível encontrar o conteúdo do relatório para exportação.",
        variant: "destructive",
      });
      return;
    }

    const originalTitle = empresaSettings.nomeFantasia || "Relatório";
    const tempTitle = document.title;
    document.title = `${originalTitle} - Relatório Simplificado ${format(dataRelatorio, 'dd-MM-yyyy')}`;
    
    html2canvas(input, { 
      scale: 2,
      useCORS: true,
       onclone: (document) => {
        const printArea = document.getElementById('relatorio-simplificado-content');
        if (printArea) {
          // Ocultar botões e date picker
          const buttons = printArea.querySelectorAll('button');
          buttons.forEach(btn => btn.style.display = 'none');
          const datePicker = printArea.querySelector('input[type="date"]');
          if(datePicker) datePicker.style.display = 'none';
          
          // Forçar tema claro para o PDF
          printArea.style.backgroundColor = '#ffffff';
          printArea.style.color = '#000000';
          
          // Aplicar estilos claros em todos os cards
          const cards = printArea.querySelectorAll('[class*="card"], [class*="Card"]');
          cards.forEach(card => {
            card.style.backgroundColor = '#ffffff';
            card.style.color = '#000000';
            card.style.borderColor = '#e5e7eb';
          });
          
          // Aplicar estilos claros nos headers dos cards
          const cardHeaders = printArea.querySelectorAll('[class*="card-header"], [class*="CardHeader"]');
          cardHeaders.forEach(header => {
            header.style.backgroundColor = '#f8fafc';
            header.style.color = '#000000';
            header.style.borderColor = '#e5e7eb';
          });
          
          // Aplicar estilos claros no conteúdo dos cards
          const cardContents = printArea.querySelectorAll('[class*="card-content"], [class*="CardContent"]');
          cardContents.forEach(content => {
            content.style.backgroundColor = '#ffffff';
            content.style.color = '#000000';
          });
          
          // Aplicar estilos claros nas tabelas
          const tables = printArea.querySelectorAll('table');
          tables.forEach(table => {
            table.style.backgroundColor = '#ffffff';
            table.style.color = '#000000';
          });
          
          // Aplicar estilos claros nas células da tabela
          const tableCells = printArea.querySelectorAll('td, th');
          tableCells.forEach(cell => {
            cell.style.backgroundColor = '#ffffff';
            cell.style.color = '#000000';
            cell.style.borderColor = '#e5e7eb';
          });
          
          // Aplicar estilos claros nas linhas da tabela
          const tableRows = printArea.querySelectorAll('tr');
          tableRows.forEach(row => {
            row.style.backgroundColor = '#ffffff';
            row.style.color = '#000000';
          });
          
          // Aplicar estilos claros em todos os textos
          const allTextElements = printArea.querySelectorAll('*');
          allTextElements.forEach(element => {
            if (element.style) {
              element.style.color = '#000000';
            }
          });
          
          // Forçar fundo branco em elementos com classes dark
          const darkElements = printArea.querySelectorAll('[class*="dark:"]');
          darkElements.forEach(element => {
            element.style.backgroundColor = '#ffffff';
            element.style.color = '#000000';
          });
        }
      }
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / canvasHeight;
      let imgWidth = pdfWidth - 20; 
      let imgHeight = imgWidth / ratio;

      if (imgHeight > pdfHeight - 20) {
        imgHeight = pdfHeight - 20;
        imgWidth = imgHeight * ratio;
      }
      
      const x = (pdfWidth - imgWidth) / 2;
      const y = 10;

      if (logoUrl) {
         try {
            const img = new Image();
            img.onload = () => {
                pdf.addImage(img, 'PNG', x, y, 30, 10); 
                pdf.setFontSize(8);
                pdf.text(empresaSettings.nomeFantasia || 'Nome da Empresa', x + 32, y + 7);
                pdf.addImage(imgData, 'PNG', x, y + 15, imgWidth, imgHeight);
                pdf.save(`Relatorio_Simplificado_${format(dataRelatorio, 'dd-MM-yyyy')}.pdf`);
            }
            img.onerror = () => {
                 pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                 pdf.save(`Relatorio_Simplificado_${format(dataRelatorio, 'dd-MM-yyyy')}.pdf`);
            }
            img.src = logoUrl;
         } catch (e) {
            console.error("Erro ao carregar logo no PDF: ", e);
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`Relatorio_Simplificado_${format(dataRelatorio, 'dd-MM-yyyy')}.pdf`);
         }
      } else {
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`Relatorio_Simplificado_${format(dataRelatorio, 'dd-MM-yyyy')}.pdf`);
      }
      document.title = tempTitle; 
      toast({
        title: "Exportação Concluída",
        description: "O relatório simplificado foi exportado para PDF.",
      });
    }).catch(err => {
      console.error("Erro ao gerar PDF: ", err);
      document.title = tempTitle;
      toast({
        title: "Erro na Exportação",
        description: "Houve um problema ao gerar o PDF do relatório.",
        variant: "destructive",
      });
    });
  };

  const RenderEntradasCard = ({ title, entradasData, icon: Icon, cardClass, headerClass, showDateExplanation = false }) => (
    <Card className={`${cardClass} shadow-lg`}>
      <CardHeader className={`${headerClass}`}>
        <CardTitle className="flex items-center"><Icon size={20} className="mr-2" /> {title}</CardTitle>
        {showDateExplanation && (
          <CardDescription className="text-xs text-green-600 dark:text-green-300 mt-1">
            💡 Mostra valores recebidos de crediário por forma de pagamento na data em que foram marcados como recebidos
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableBody>
            <TableRow><TableCell>Pix</TableCell><TableCell className="text-right font-semibold">R$ {entradasData.pix.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell>Cartão Crédito</TableCell><TableCell className="text-right font-semibold">R$ {entradasData.cartaoCredito.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell>Cartão Débito</TableCell><TableCell className="text-right font-semibold">R$ {entradasData.cartaoDebito.toFixed(2)}</TableCell></TableRow>
            <TableRow><TableCell>Dinheiro</TableCell><TableCell className="text-right font-semibold">R$ {entradasData.dinheiro.toFixed(2)}</TableCell></TableRow>
            <TableRow className="bg-opacity-30"><TableHead>Total {title}</TableHead><TableHead className="text-right font-bold text-lg">R$ {entradasData.total.toFixed(2)}</TableHead></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div id="relatorio-simplificado-content" className="pb-10">
      <Card className="max-w-6xl mx-auto my-6 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <FileText size={32} />
              <CardTitle className="text-2xl">Relatório Simplificado</CardTitle>
            </div>
            <div className="flex items-center space-x-3">
              <input 
                type="date" 
                value={format(dataRelatorio, 'yyyy-MM-dd')}
                onChange={(e) => setDataRelatorio(new Date(e.target.value + 'T00:00:00'))}
                className="bg-primary-foreground text-primary p-2 rounded-md border border-border focus:ring-2 focus:ring-ring"
                aria-label="Selecionar data do relatório"
              />
              <Button variant="secondary" onClick={exportarPDF} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Download size={18} className="mr-2" /> Exportar PDF
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm text-primary-foreground/80 mt-1">
            Resumo financeiro do dia: {format(dataRelatorio, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RenderEntradasCard 
              title="Entradas PDV" 
              entradasData={entradasPDV} 
              icon={ShoppingCart}
              cardClass="border-blue-500 border-2"
              headerClass="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            />
            <RenderEntradasCard 
              title="Entradas O.S." 
              entradasData={entradasOS} 
              icon={ClipboardList}
              cardClass="border-purple-500 border-2"
              headerClass="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            />
            <RenderEntradasCard 
              title="Entradas Envelop." 
              entradasData={entradasEnvelopamento} 
              icon={Layers}
              cardClass="border-teal-500 border-2"
              headerClass="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RenderEntradasCard 
              title="Contas Recebidas" 
              entradasData={contasRecebidasAgregadas} 
              icon={DollarSign}
              cardClass="border-green-500 border-2"
              headerClass="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              showDateExplanation={true}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6 border-t">
            <Card className="border-green-500 border-2 shadow-lg">
              <CardHeader className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <CardTitle className="flex items-center"><ArrowUpCircle size={20} className="mr-2" /> Outras Entradas</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Suprimentos</TableCell><TableCell className="text-right text-green-600 font-semibold">R$ {saidas.suprimento.toFixed(2)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-red-500 border-2 shadow-lg">
              <CardHeader className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <CardTitle className="flex items-center"><ArrowDownCircle size={20} className="mr-2" /> Saídas</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <Table>
                  <TableBody>
                    <TableRow><TableCell>Sangria</TableCell><TableCell className="text-right text-red-600 font-semibold">R$ {saidas.sangria.toFixed(2)}</TableCell></TableRow>
                    <TableRow className="bg-red-50 dark:bg-red-900/30"><TableHead className="text-red-700 dark:text-red-300">Total Saídas</TableHead><TableHead className="text-right text-red-700 dark:text-red-300 font-bold text-lg">R$ {totalSaidasValor.toFixed(2)}</TableHead></TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="md:col-span-1 border-indigo-500 border-2 shadow-lg">
              <CardHeader className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                <CardTitle className="flex items-center"><DollarSign size={20} className="mr-2" /> Saldo do Dia</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">(Total Entradas de todos os canais - Saídas)</p>
                <p className={`text-3xl font-bold ${saldoDia >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}`}>R$ {saldoDia.toFixed(2)}</p>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-1 border-amber-500 border-2 shadow-lg">
              <CardHeader className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <CardTitle className="flex items-center"><DollarSign size={20} className="mr-2" /> Falta Receber (crediário)</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">R$ {faltaReceber.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">Contas de crediário que vencem hoje.</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioSimplificado;