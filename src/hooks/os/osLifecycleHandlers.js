import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { addDays } from 'date-fns';
import { baixarEstoqueOS, saveOSToAPI as saveOSLogic, testValorTotalOS } from './osDataService';
import { initialOrdemServicoState, initialOrdemServicoStateSync, initialServicoM2State, initialProdutoUnidadeState } from './osConstants';
import { calcularSubtotalItem } from './osLogic';
import { createNewOSWithSequentialId } from './osIdService';
import { safeParseFloat } from '@/lib/utils';
import { pontosClienteService } from '@/services/pontosClienteService';
import { formatDateForBackend } from '@/utils/dateUtils';
import { formatarDadosConsumoMaterialParaDescricao, extrairDadosConsumoMaterial } from '@/utils/consumoMaterialUtils';
import { osService } from '@/services/api';

export const useOSLifecycleHandlers = (
  ordemServico, setOrdemServico,
  itemAtual, setItemAtual,
  clienteSelecionado, setClienteSelecionado, 
  setIsOSFinalizada, setIsEditingItem,
  setIsPagamentoModalOpen, setIsSaving, 
  vendedorAtual, totaisOSCallback,
  acabamentosConfigAtual = [],
  setIsDocumentModalOpen,
  maquinasDisponiveis = []
) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const normalizarItemParaPersistencia = (item) => {
    if (!item) return item;

    const subtotalCalculado = calcularSubtotalItem(item, Array.isArray(acabamentosConfigAtual) ? acabamentosConfigAtual : []);
    const subtotalOriginal = safeParseFloat(item.subtotal_item, 0);
    const subtotalFinal = Math.abs(subtotalOriginal - subtotalCalculado) > 0.009 ? subtotalCalculado : subtotalOriginal;

    const quantidadeNormalizada = (() => {
      const quantidade = safeParseFloat(item.quantidade, 1);
      return Number.isFinite(quantidade) ? quantidade : 1;
    })();

    const valorUnitarioBase = item.tipo_item === 'm2'
      ? safeParseFloat(item.valor_unitario_m2 ?? item.valor_unitario, 0)
      : safeParseFloat(item.valor_unitario, 0);

    const subtotalFormatado = Number.isFinite(subtotalFinal) ? parseFloat(subtotalFinal.toFixed(2)) : 0;

    // Lista de campos permitidos baseados no fillable do modelo OrdemServicoItem
    const camposPermitidos = [
      'produto_id',
      'nome_servico_produto',
      'tipo_item',
      'quantidade',
      'valor_unitario',
      'valor_total',
      'largura',
      'altura',
      'acabamentos',
      'detalhes',
      'id_item_os',
      'consumo_material_utilizado',
      'consumo_largura_peca',
      'consumo_altura_peca',
      'consumo_quantidade_solicitada',
      'consumo_largura_chapa',
      'consumo_altura_chapa',
      'consumo_valor_unitario_chapa',
      'consumo_pecas_por_chapa',
      'consumo_chapas_necessarias',
      'consumo_custo_total',
      'consumo_custo_unitario',
      'consumo_aproveitamento_percentual'
    ];

    // Criar objeto apenas com campos permitidos
    const itemNormalizado = {};
    camposPermitidos.forEach(campo => {
      if (item[campo] !== undefined) {
        itemNormalizado[campo] = item[campo];
      }
    });

    // Aplicar normalizações
    itemNormalizado.quantidade = quantidadeNormalizada;
    itemNormalizado.valor_unitario = valorUnitarioBase;
    itemNormalizado.subtotal_item = subtotalFormatado;
    itemNormalizado.valor_total = subtotalFormatado;
    
    // Mapear acabamentos_selecionados para acabamentos
    if (Array.isArray(item.acabamentos_selecionados) && item.acabamentos_selecionados.length > 0) {
      itemNormalizado.acabamentos = item.acabamentos_selecionados;
    } else if (Array.isArray(item.acabamentos) && item.acabamentos.length > 0) {
      itemNormalizado.acabamentos = item.acabamentos;
    }

    return itemNormalizado;
  };

  const handleSalvarOrcamento = async () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de salvar o orçamento.", variant: "destructive" });
      return;
    }
    if (!clienteSelecionado && !ordemServico.cliente_nome_manual) {
      toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso.", variant: "destructive" });
      return;
    }
    
    const totaisCalculados = totaisOSCallback();
    if (typeof totaisCalculados.totalGeral !== 'number' || isNaN(totaisCalculados.totalGeral)) {
        toast({ title: "Erro no Cálculo", description: "Não foi possível calcular o total da OS (NaN). Verifique os itens e seus valores.", variant: "destructive" });
        return;
    }
    if (totaisCalculados.totalGeral < 0) {
      toast({ title: "Valor Negativo", description: "O valor total da OS não pode ser negativo.", variant: "destructive" });
      return;
    }


    setIsSaving(true);
    try {
      const osOrcamento = {
        ...ordemServico,
        status_os: 'Orçamento Salvo',
        data_validade: formatDateForBackend(addDays(new Date(), 15)),
        // Se a OS já foi finalizada anteriormente, atualizar a data de finalização
        data_finalizacao_os: (ordemServico.status_os === 'Finalizada' || ordemServico.status_os === 'Entregue') ? formatDateForBackend() : ordemServico.data_finalizacao_os,
        cliente_info: clienteSelecionado || { nome: ordemServico.cliente_nome_manual || 'Cliente Avulso', id: ordemServico.cliente_id || null },
        vendedor_id: vendedorAtual?.id || null,
        vendedor_nome: vendedorAtual?.nome || '',
        valor_total_os: safeParseFloat(totaisCalculados.totalGeral),
        desconto_terceirizado_percentual: String(safeParseFloat(ordemServico.desconto_terceirizado_percentual, 0)),
        desconto_geral_tipo: ordemServico.desconto_geral_tipo || 'percentual',
        desconto_geral_valor: String(safeParseFloat(ordemServico.desconto_geral_valor, 0)),
        itens: itensDaOS.map(item => normalizarItemParaPersistencia(item)),
      };

      console.log('💾 OS - Salvando orçamento:', {
        id_os: osOrcamento.id_os,
        status_os: osOrcamento.status_os,
        valor_total: osOrcamento.valor_total_os
      });
      
      const osSalva = await saveOSLogic(osOrcamento);
      
      console.log('✅ OS - Orçamento salvo com sucesso:', {
        id_os: osSalva?.id_os,
        id: osSalva?.id,
        status_os: osSalva?.status_os
      });
      
      setOrdemServico(osSalva);
      
      // Disparar evento para atualizar histórico
      window.dispatchEvent(new CustomEvent('osSalva', { detail: osSalva }));
      
      toast({ 
        title: "Orçamento Salvo!", 
        description: osSalva && osSalva.id_os
                          ? `OS ${osSalva.id || 'N/A'} salva como orçamento.`
          : "Orçamento salvo com sucesso."
      });
      // Abrir modal de detalhes da OS salva
      if (setIsDocumentModalOpen) {
        setIsDocumentModalOpen(true);
      }
    } catch (error) {
      console.error("Erro ao salvar orçamento:", error);
      toast({ title: "Erro ao Salvar", description: error.message || "Ocorreu um problema ao salvar o orçamento. Verifique o console para mais detalhes.", variant: "destructive"});
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmarPagamentoOS = async (pagamentosRecebidos, dadosPontos = null, opcoes = {}) => {
    console.log('🔍 OS - Iniciando finalização:', {
      id_os: ordemServico.id_os,
      status_os: ordemServico.status_os,
      itens: ordemServico.itens?.length || 0,
      cliente: clienteSelecionado?.nome || ordemServico.cliente_nome_manual
    });
    
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
        toast({ title: "OS Vazia", description: "Adicione itens antes de finalizar.", variant: "destructive" });
        return;
    }
    if (!clienteSelecionado && !ordemServico.cliente_nome_manual) {
        toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso.", variant: "destructive" });
        return;
    }
    const totaisCalculados = totaisOSCallback();
    const totalCalculadoOS = safeParseFloat(totaisCalculados.totalGeral);
    
    if (typeof totalCalculadoOS !== 'number' || isNaN(totalCalculadoOS)) {
        toast({ title: "Erro no Cálculo", description: "Não foi possível calcular o total da OS para pagamento (NaN). Verifique os itens e seus valores.", variant: "destructive" });
        return;
    }
    if (totalCalculadoOS < 0) {
        toast({ title: "Valor Negativo", description: "O valor total da OS não pode ser negativo para pagamento.", variant: "destructive" });
        return;
    }

    const totalPago = pagamentosRecebidos.reduce((acc, p) => acc + safeParseFloat(p.valorFinal || p.valor), 0);
    const pagamentoTotal = totalPago >= totalCalculadoOS - 0.009;
    const evoluirParaProducao = pagamentoTotal ? true : (opcoes.evoluirParaProducao ?? true);

    // Permite pagamento parcial: não bloqueia mais quando totalPago < totalCalculadoOS
    // O backend criará conta a receber para o saldo pendente.
    
    setIsSaving(true);
    try {
      // Verificar se algum item tem dados de consumo de material
      // Se houver, extrair e salvar na OS principal
      let tipoOrigem = null;
      let dadosConsumoMaterial = null;
      
      const itemComConsumo = itensDaOS.find(item => 
        item.consumo_material_utilizado || 
        item.consumo_largura_peca || 
        item.consumo_quantidade_solicitada
      );
      
      if (itemComConsumo) {
        tipoOrigem = 'consumo_material';
        dadosConsumoMaterial = extrairDadosConsumoMaterial(itemComConsumo);
        console.log('📦 [handleConfirmarPagamentoOS] Dados de consumo de material encontrados:', {
          tipo_origem: tipoOrigem,
          dados_consumo_material: dadosConsumoMaterial
        });
      }
      
      const osFinalizada = {
        ...ordemServico,
        status_os: 'Finalizada',
        status_pagamento: pagamentoTotal ? 'Pago' : 'Parcial',
        data_finalizacao_os: formatDateForBackend(),
        data_ultima_modificacao: formatDateForBackend(),
        pagamentos: pagamentosRecebidos.map(p => ({
          ...p,
          valorOriginal: safeParseFloat(p.valorOriginal || p.valor),
          valorFinal: safeParseFloat(p.valorFinal || p.valor),
        })),
        cliente_info: clienteSelecionado || { nome: ordemServico.cliente_nome_manual || 'Cliente Avulso', id: ordemServico.cliente_id || null },
        vendedor_id: vendedorAtual?.id || null,
        vendedor_nome: vendedorAtual?.nome || '',
        valor_total_os: totalCalculadoOS,
        desconto_terceirizado_percentual: String(safeParseFloat(ordemServico.desconto_terceirizado_percentual, 0)),
        desconto_geral_tipo: ordemServico.desconto_geral_tipo || 'percentual',
        desconto_geral_valor: String(safeParseFloat(ordemServico.desconto_geral_valor, 0)),
        // Pagamento parcial: informar ao backend se deve evoluir para produção
        evoluir_para_producao: evoluirParaProducao,
        // Campos de consumo de material (se houver)
        tipo_origem: tipoOrigem,
        dados_consumo_material: dadosConsumoMaterial,
        // persistir dados de pontos para recibo/histórico
        metadados: {
          ...(ordemServico.metadados || {}),
          dados_pontos: dadosPontos || null,
        },
        itens: itensDaOS.map(item => normalizarItemParaPersistencia(item)),
      };
      
      testValorTotalOS(osFinalizada);
      
      console.log('💾 OS - Salvando OS finalizada:', {
        id_os: osFinalizada.id_os,
        status_os: osFinalizada.status_os,
        valor_total: osFinalizada.valor_total_os
      });
      
      const osSalva = await saveOSLogic(osFinalizada);
      
      console.log('✅ OS - OS salva com sucesso:', {
        id_os: osSalva?.id_os,
        id: osSalva?.id,
        status_os: osSalva?.status_os
      });
      
      setOrdemServico(osSalva);
      setIsOSFinalizada(true);
      setIsPagamentoModalOpen(false);
      
      // Disparar evento para atualizar histórico
      window.dispatchEvent(new CustomEvent('osFinalizada', { detail: osSalva }));

      const produtosParaBaixa = (osSalva.itens || []).map(item => ({
          id_produto: item.produto_id,
          quantidade: item.quantidade,
          tipo_item: item.tipo_item,
          largura_item_final: String(item.largura || '0').replace(',', '.'),
          altura_item_final: String(item.altura || '0').replace(',', '.'),
          variacao_selecionada: item.variacao_selecionada,
          acabamentos_selecionados: Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : [],
          id_produto_principal: item.id_produto_principal || item.produto_id 
      }));
      
      baixarEstoqueOS(produtosParaBaixa, false, null, osSalva.id || osSalva.id_os);

      // Conta a receber já é criada automaticamente na função saveOSToLocalStorage
      // Não precisamos criar novamente aqui para evitar duplicação
      let mensagemFinal = `Ordem de Serviço ${osSalva.id || 'N/A'} finalizada e pagamento registrado.`;
      
      // Verificar se há cliente válido para criar conta a receber
      const clienteId = clienteSelecionado?.id || ordemServico.cliente_id;
      if (clienteId && clienteId !== 'null' && clienteId !== null) {
        // Verificar se há pagamentos com Crediário para criar conta a receber
        const pagamentosCrediario = pagamentosRecebidos?.filter(p => p.metodo === 'Crediário') || [];
        
        if (pagamentosCrediario.length > 0) {
          // Calcular data de vencimento (30 dias a partir da finalização)
          const dataVencimento = addDays(new Date(osSalva.data_finalizacao_os || new Date()), 30);
          
          // Preparar descrição com observações da OS
          // Usar o ID da OS (campo id) ao invés do id_os
          let numeroOS = 'N/A';
          if (osSalva.id) {
            numeroOS = String(osSalva.id);
          } else if (osSalva.id_os) {
            // Fallback: se não tiver id, tentar extrair do id_os
            const idOSString = String(osSalva.id_os);
            const numeros = idOSString.match(/\d+/g);
            if (numeros && numeros.length > 0) {
              numeroOS = numeros[0];
            } else {
              numeroOS = idOSString.slice(-6);
            }
          }
        
          // Conta a receber já foi criada automaticamente na função saveOSToLocalStorage
          // Não precisamos criar novamente aqui para evitar duplicação
          mensagemFinal += `\n\nConta a receber criada automaticamente.`;
          mensagemFinal += `\nVencimento: ${dataVencimento.toLocaleDateString('pt-BR')}`;
          mensagemFinal += `\n\nA conta a receber foi salva no banco de dados e pode ser visualizada na página "Contas a Receber".`;
        } else {
          // Não há pagamentos com Crediário, não precisa criar conta a receber
          mensagemFinal += `\n\nPagamento à vista registrado.`;
        }
      } else {
        mensagemFinal += `\n\n⚠️ Aviso: Não foi possível criar conta a receber - cliente não identificado.`;
      }

      // Atualizar pontos do cliente (acumular/utilizar) se disponível e não for funcionário
      try {
        if (dadosPontos && (clienteSelecionado?.id || ordemServico.cliente_id) && !clienteSelecionado?.isFuncionario) {
          const clienteId = clienteSelecionado?.id || ordemServico.cliente_id;
          const pontosAuto = parseFloat(dadosPontos.pontosAcumuladosAutomaticamente || 0) || 0;
          const pontosDesconto = parseFloat(dadosPontos.descontoPontosAplicado || 0) || 0;
          if (pontosAuto > 0) {
            await pontosClienteService.atualizarPontosCliente(clienteId, totalCalculadoOS, 'acumular');
          }
          if (pontosDesconto > 0) {
            await pontosClienteService.atualizarPontosCliente(clienteId, pontosDesconto, 'utilizar');
          }
        }
      } catch (e) {
        console.error('Erro ao atualizar pontos do cliente na finalização da OS:', e);
      }

      // Mover para produção apenas se evoluirParaProducao for true (100% pago sempre move; parcial só se usuário escolheu)
      if (evoluirParaProducao && osSalva && osSalva.id_os && (osSalva.id || osSalva.id_os !== 'Novo')) {
        try {
          await osService.updateStatusProducao(osSalva.id_os, {
            status_producao: 'Em Produção'
          });
          console.log('✅ OS movida automaticamente para produção:', osSalva.id_os);
        } catch (productionError) {
          console.warn('⚠️ Erro ao mover OS para produção automaticamente:', productionError);
          // Não interromper o fluxo por causa deste erro
        }
      } else if (!evoluirParaProducao) {
        console.log('ℹ️ Pagamento parcial: OS não foi movida para produção (usuário optou por não evoluir).');
      } else {
        console.warn('⚠️ OS não foi salva com sucesso ou não tem ID válido, pulando movimento para produção');
      }

      const textoProducao = evoluirParaProducao ? "\n\n✅ OS movida automaticamente para produção." : (pagamentoTotal ? "" : "\n\nℹ️ OS não foi movida para produção (pagamento parcial).");
      toast({ 
        title: pagamentoTotal ? "OS Finalizada!" : "Pagamento parcial registrado!", 
        description: mensagemFinal + textoProducao,
        duration: 6000
      });
      
      // Comportamento padrão: abrir modal de documento ou ir para histórico
      if (setIsDocumentModalOpen) {
        setIsDocumentModalOpen(true); 
      } else {
        navigate(`/os/historico`); 
      }

    } catch (error) {
      console.error("Erro ao finalizar OS:", error);
      
      // Verificar se é um erro específico de conta a receber
      if (error.message && error.message.includes('conta a receber')) {
        toast({ 
          title: "Erro ao Criar Conta a Receber", 
          description: "A OS foi finalizada, mas houve um erro ao criar a conta a receber. Verifique a conexão com o servidor e tente novamente.", 
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Erro ao Finalizar", 
          description: error.message || "Ocorreu um problema ao finalizar a OS. Verifique o console para mais detalhes.", 
          variant: "destructive"
        });
      }
    } finally {
      setIsSaving(false);
    }
  };
  
  // Atualiza uma OS já finalizada sem alterar o status atual e sem efeitos financeiros
  const handleAtualizarOSFinalizada = async () => {
    const itensDaOS = Array.isArray(ordemServico.itens) ? ordemServico.itens : [];
    if (itensDaOS.length === 0) {
      toast({ title: "OS Vazia", description: "Adicione itens antes de atualizar.", variant: "destructive" });
      return;
    }
    if (!clienteSelecionado && !ordemServico.cliente_nome_manual) {
      toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso.", variant: "destructive" });
      return;
    }

    const totaisCalculados = totaisOSCallback();
    const totalCalculadoOS = safeParseFloat(totaisCalculados.totalGeral);
    if (typeof totalCalculadoOS !== 'number' || isNaN(totalCalculadoOS)) {
      toast({ title: "Erro no Cálculo", description: "Não foi possível calcular o total da OS (NaN).", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const osAtualizada = {
        ...ordemServico,
        // Preservar status atual (Finalizada/Entregue)
        status_os: ordemServico.status_os,
        status_pagamento: ordemServico.status_pagamento || 'Pago',
        // Atualizar a data de finalização para a data atual quando a OS for atualizada
        data_finalizacao_os: formatDateForBackend(),
        data_ultima_modificacao: formatDateForBackend(),
        cliente_info: clienteSelecionado || { nome: ordemServico.cliente_nome_manual || 'Cliente Avulso', id: ordemServico.cliente_id || null },
        vendedor_id: vendedorAtual?.id || ordemServico.vendedor_id || null,
        vendedor_nome: vendedorAtual?.nome || ordemServico.vendedor_nome || '',
        valor_total_os: totalCalculadoOS,
        desconto_terceirizado_percentual: String(safeParseFloat(ordemServico.desconto_terceirizado_percentual, 0)),
        desconto_geral_tipo: ordemServico.desconto_geral_tipo || 'percentual',
        desconto_geral_valor: String(safeParseFloat(ordemServico.desconto_geral_valor, 0)),
        itens: itensDaOS.map(item => normalizarItemParaPersistencia(item)),
      };

      testValorTotalOS(osAtualizada);
      const osSalva = await saveOSLogic(osAtualizada, { skipFinanceSideEffects: true });
      setOrdemServico(osSalva);
      setIsOSFinalizada(true);
      toast({ title: "OS Finalizada Atualizada!", description: `OS ${osSalva.id || 'N/A'} atualizada sem alterar o status.`, duration: 4000 });
      // Abrir modal de detalhes da OS atualizada
      if (setIsDocumentModalOpen) {
        setIsDocumentModalOpen(true);
      }
    } catch (error) {
      console.error("Erro ao atualizar OS finalizada:", error);
      toast({ title: "Erro ao Atualizar", description: error.message || "Ocorreu um problema ao atualizar a OS.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleResetOS = async () => {
    const novoEstadoOS = initialOrdemServicoStateSync();
    if (vendedorAtual) {
      novoEstadoOS.vendedor_id = vendedorAtual.id;
      novoEstadoOS.vendedor_nome = vendedorAtual.nome;
    }
    setOrdemServico(novoEstadoOS);
    setItemAtual(novoEstadoOS.itens.length > 0 ? novoEstadoOS.itens[0].tipo_item === 'unidade' ? initialProdutoUnidadeState() : initialServicoM2State() : initialServicoM2State());
    if (setClienteSelecionado) {
      setClienteSelecionado(null);
    }
    setIsOSFinalizada(false);
    setIsEditingItem(false);
    navigate('/operacional/ordens-servico', { replace: true });
    toast({ title: "Nova OS", description: "Campos limpos para uma nova Ordem de Serviço." });
  };


  // Função para finalizar OS diretamente do modal de Consumo de Material
  const handleFinalizarOSDoConsumoMaterial = async (itemComConsumoMaterial) => {
    if (!itemComConsumoMaterial) {
      toast({ title: "Erro", description: "Dados do consumo de material não informados.", variant: "destructive" });
      return;
    }

    if (!clienteSelecionado && !ordemServico?.cliente_nome_manual) {
      toast({ title: "Cliente Não Informado", description: "Selecione um cliente ou digite um nome avulso antes de finalizar.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Extrair dados de consumo de material
      const dadosConsumoMaterial = extrairDadosConsumoMaterial(itemComConsumoMaterial);
      
      // Formatar descrição com todos os dados
      const descricaoFormatada = formatarDadosConsumoMaterialParaDescricao(dadosConsumoMaterial, itemComConsumoMaterial);
      
      // Calcular valores
      const subtotalItem = safeParseFloat(itemComConsumoMaterial.subtotal_item || itemComConsumoMaterial.valor_total || 0);
      const subtotalAcabamentos = safeParseFloat(itemComConsumoMaterial.subtotal_acabamentos || 0);
      const valorTotalOS = subtotalItem + subtotalAcabamentos;

      // Criar item único com a descrição formatada
      const itemUnico = {
        ...itemComConsumoMaterial,
        detalhes: descricaoFormatada,
        observacoes: descricaoFormatada,
      };

      // Normalizar item para persistência
      const itemNormalizado = normalizarItemParaPersistencia(itemUnico);

      // Calcular data prevista de entrega (7 dias a partir de hoje)
      const dataPrevistaEntrega = formatDateForBackend(addDays(new Date(), 7));

      // Obter a primeira máquina disponível ou usar a da ordemServico, ou usar 1 como padrão
      let maquinaId = ordemServico?.maquina_impressao_id || null;
      if (!maquinaId && Array.isArray(maquinasDisponiveis) && maquinasDisponiveis.length > 0) {
        maquinaId = parseInt(maquinasDisponiveis[0].id, 10) || null;
      }
      // Se ainda não tiver máquina, usar 1 como padrão (assumindo que existe uma máquina com ID 1)
      if (!maquinaId || isNaN(maquinaId)) {
        maquinaId = 1;
      }

      // Criar OS finalizada com tipo_origem e dados_consumo_material
      const osFinalizada = {
        ...ordemServico,
        cliente_id: clienteSelecionado?.id || null,
        cliente_info: clienteSelecionado || { nome: ordemServico?.cliente_nome_manual || 'Cliente Avulso', id: null },
        status_os: 'Finalizada',
        valor_total_os: valorTotalOS,
        observacoes_gerais_os: descricaoFormatada,
        tipo_origem: 'consumo_material',
        dados_consumo_material: dadosConsumoMaterial,
        vendedor_id: vendedorAtual?.id || null,
        vendedor_nome: vendedorAtual?.nome || '',
        data_finalizacao_os: formatDateForBackend(),
        data_criacao: formatDateForBackend(),
        data_prevista_entrega: dataPrevistaEntrega, // Campo obrigatório quando status é Finalizada
        maquina_impressao_id: maquinaId, // Campo obrigatório quando status é Finalizada
        itens: [itemNormalizado],
        pagamentos: [],
      };

      console.log('💾 OS - Finalizando OS do consumo de material:', {
        id_os: osFinalizada.id_os,
        tipo_origem: osFinalizada.tipo_origem,
        valor_total: osFinalizada.valor_total_os
      });

      const osSalva = await saveOSLogic(osFinalizada);
      
      console.log('✅ OS - OS finalizada com sucesso:', {
        id_os: osSalva?.id_os,
        id: osSalva?.id,
      });

      toast({ 
        title: "OS Finalizada!", 
        description: `OS ${osSalva?.id || 'N/A'} criada e finalizada com sucesso a partir do consumo de material.`
      });

      // Navegar para o histórico
      navigate('/operacional/os-historico', { replace: true });
      
      return osSalva;
    } catch (error) {
      console.error("Erro ao finalizar OS do consumo de material:", error);
      toast({ 
        title: "Erro ao Finalizar", 
        description: error.message || "Ocorreu um problema ao finalizar a OS. Verifique o console para mais detalhes.", 
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    handleSalvarOrcamento,
    handleConfirmarPagamentoOS,
    handleAtualizarOSFinalizada,
    handleResetOS,
    handleFinalizarOSDoConsumoMaterial
  };
};