import { v4 as uuidv4 } from 'uuid';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { finalizarOrcamentoEnvelopamento, salvarOrcamentoEnvelopamentoRascunho } from './envelopamentoDataService';
import { getNextEnvelopamentoId } from './envelopamentoState';
import { formatDateForBackend } from '@/utils/dateUtils';

export const createEnvelopamentoHandlers = (
  orcamento, 
  setOrcamento, 
  adminSettings, 
  vendedorAtual, 
  initialOrcamentoStateRef,
  toast,
  resetFullState,
  registrarAcaoCallback // Adicionado
) => {
  const handleAddPecaAvulsa = async () => {
    const alturaM = parseFloat(String(orcamento.pecaAvulsa.alturaM || '0').replace(',', '.'));
    const larguraM = parseFloat(String(orcamento.pecaAvulsa.larguraM || '0').replace(',', '.'));

    if (!orcamento.pecaAvulsa.descricao || alturaM <= 0 || larguraM <= 0) {
      toast({ title: "Dados incompletos", description: "Descrição, altura e largura (válidas) são obrigatórios para peças avulsas.", variant: "destructive" });
      return;
    }
    
    // Se quantidade não for preenchida, usar 1 como padrão
    const quantidade = parseInt(orcamento.pecaAvulsa.quantidade, 10);
    const quantidadeFinal = !isNaN(quantidade) && quantidade > 0 ? quantidade : 1;
    
    const novaPeca = {
      id: uuidv4(),
      parte: {
        id: uuidv4(), // ID único para a parte em si, mesmo que avulsa
        nome: orcamento.pecaAvulsa.descricao,
        altura: alturaM.toFixed(2),
        largura: larguraM.toFixed(2),
        imagem: null,
        imagem_url_externa: null, // Adicionado para consistência
        isAvulsa: true,
      },
      quantidade: quantidadeFinal,
      servicosAdicionais: {}, // Serviços adicionais individuais para esta peça
    };
    
    // Se houver um produto selecionado no orçamento, associá-lo à peça avulsa
    if (orcamento.produto && orcamento.produto.id) {
      novaPeca.produto = orcamento.produto;
    }
    
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: [...prev.selectedPecas, novaPeca],
      pecaAvulsa: { descricao: '', alturaM: '', larguraM: '', quantidade: '' },
    }));
  };

  const handleAddProdutoSemMedidas = (produtoSelecionado) => {
    const preco = parseFloat(String(produtoSelecionado.valorMetroQuadrado || produtoSelecionado.preco_venda || produtoSelecionado.preco_m2 || '0').replace(',', '.'));
    const estoqueDisponivel = parseFloat(String(produtoSelecionado.estoqueDisponivel || produtoSelecionado.estoque || '0').replace(',', '.'));
    

    if (estoqueDisponivel < 0 && (produtoSelecionado.unidadeMedida === 'm2' || produtoSelecionado.tipo_produto === 'm2')) {
        toast({
            title: `Estoque Negativo`,
            description: `O produto ${produtoSelecionado.nome} está com estoque negativo. Não é possível selecioná-lo.`,
            variant: "destructive",
            duration: 5000
        });
        return;
    }

    const novaPeca = {
      id: uuidv4(),
      parte: {
        id: uuidv4(),
        nome: produtoSelecionado.nome,
        altura: '0', // Sem medidas
        largura: '0', // Sem medidas
        imagem: produtoSelecionado.imagem || null,
        imagem_url_externa: produtoSelecionado.imagem_url_externa || null,
        isAvulsa: true,
        isProdutoSemMedidas: true, // Flag para identificar produtos sem medidas
      },
      quantidade: 1, // Quantidade padrão para produtos sem medidas
      produto: {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        valorMetroQuadrado: preco,
        estoqueDisponivel: estoqueDisponivel,
        unidadeMedida: produtoSelecionado.unidadeMedida || 'unidade',
        cor_opcional: produtoSelecionado.cor_opcional || '',
        preco_venda: preco, 
        preco_m2: preco,
        promocao_ativa: produtoSelecionado.promocao_ativa || false,
        preco_promocional: produtoSelecionado.preco_promocional || null,
        preco_original: produtoSelecionado.preco_original || preco
      },
      servicosAdicionais: {},
    };

    setOrcamento(prev => ({
      ...prev,
      selectedPecas: [...prev.selectedPecas, novaPeca],
    }));

    toast({
      title: "Produto Adicionado!",
      description: `${produtoSelecionado.nome} foi adicionado ao orçamento.`,
      variant: "default"
    });
  };

  const handleSelectPecasDoCatalogo = async (novasPecasDoCatalogo) => {
    const pecasParaAdicionar = novasPecasDoCatalogo.map(pecaCatalogo => ({
        id: uuidv4(), // ID único para o item na lista de orçamento
        parte: { ...pecaCatalogo }, // Copia todos os dados da peça do catálogo
        quantidade: 1,
        servicosAdicionais: {}, // Serviços adicionais individuais para esta peça
    }));
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: [...prev.selectedPecas, ...pecasParaAdicionar],
    }));
  };

  const handleUpdatePecaQuantidade = (pecaId, novaQuantidadeStr) => {
    const novaQuantidade = parseInt(novaQuantidadeStr, 10);
    // Permite campo vazio para digitação, mas força 1 se sair vazio ou inválido no blur (ou antes de calcular)
    if (novaQuantidadeStr !== '' && (isNaN(novaQuantidade) || novaQuantidade < 0)) return; // Não atualiza se for inválido e não vazio
  
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: prev.selectedPecas.map(p =>
        p.id === pecaId ? { ...p, quantidade: novaQuantidadeStr === '' ? '' : String(Math.max(0, novaQuantidade)) } : p 
      )
    }));
  };

  const handleRemovePeca = (pecaId) => {
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: prev.selectedPecas.filter(p => p.id !== pecaId)
    }));
  };

  const handleUpdatePecaServicosAdicionais = (pecaId, servicoKey, checked) => {
    setOrcamento(prev => {
      return {
        ...prev,
        selectedPecas: prev.selectedPecas.map(p =>
          p.id === pecaId 
            ? { 
                ...p, 
                servicosAdicionais: {
                  ...p.servicosAdicionais,
                  [servicoKey]: (() => {
                    // Se checked é um objeto com nome (ao copiar), usar ele diretamente
                    if (typeof checked === 'object' && checked !== null && checked.nome) {
                      return { id: checked.id || servicoKey, nome: checked.nome, checked: true };
                    }
                    
                    // Se checked é true, buscar o serviço na lista para obter o nome
                    if (checked === true) {
                      const servicosList = adminSettings?.servicosAdicionais || [];
                      const servico = servicosList.find(s => {
                        if (!s || !s.id) return false;
                        return String(s.id) === String(servicoKey) || Number(s.id) === Number(servicoKey);
                      });
                      
                      if (servico && servico.nome) {
                        return { id: servico.id, nome: servico.nome, checked: true };
                      }
                      
                      // Se não encontrou, tentar buscar no cache local
                      try {
                        const cacheKey = 'servicos_adicionais_envelopamento_cache';
                        const cachedServicos = localStorage.getItem(cacheKey);
                        if (cachedServicos) {
                          const parsed = JSON.parse(cachedServicos);
                          if (Array.isArray(parsed.data)) {
                            const servicoCache = parsed.data.find(s => {
                              if (!s || !s.id) return false;
                              return String(s.id) === String(servicoKey) || Number(s.id) === Number(servicoKey);
                            });
                            if (servicoCache && servicoCache.nome) {
                              return { id: servicoCache.id, nome: servicoCache.nome, checked: true };
                            }
                          }
                        }
                      } catch (e) {
                        // Ignorar erro
                      }
                      
                      // Último recurso: salvar com nome genérico
                      return { id: servicoKey, nome: `Serviço ${servicoKey}`, checked: true };
                    }
                    
                    // Se checked é false, desmarcar
                    return false;
                  })()
                }
              } 
            : p
        )
      };
    });
  };

  const handleUpdatePecaMedidas = (pecaId, largura, altura) => {
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: prev.selectedPecas.map(p =>
        p.id === pecaId 
          ? { 
              ...p, 
              parte: {
                ...p.parte,
                largura: largura.toFixed(2),
                altura: altura.toFixed(2)
              }
            } 
          : p
      )
    }));
  };

  const handleUpdatePecaProdutoDireto = (pecaId, produto) => {
    setOrcamento(prev => ({
      ...prev,
      selectedPecas: prev.selectedPecas.map(p =>
        p.id === pecaId 
          ? { 
              ...p, 
              produto: produto
            } 
          : p
      )
    }));
  };

  const handleUpdatePecaProduto = (pecaId) => {
    // Esta função será chamada quando o usuário clicar no botão de selecionar produto
    // Ela deve abrir o modal de produto e quando um produto for selecionado,
    // atualizar apenas a peça específica
    const handleProdutoSelect = (produtoSelecionado) => {
      const preco = parseFloat(String(produtoSelecionado.valorMetroQuadrado || produtoSelecionado.preco_venda || produtoSelecionado.preco_m2 || '0').replace(',', '.'));
      const estoqueDisponivel = parseFloat(String(produtoSelecionado.estoqueDisponivel || produtoSelecionado.estoque || '0').replace(',', '.'));

      if (estoqueDisponivel < 0 && (produtoSelecionado.unidadeMedida === 'm2' || produtoSelecionado.tipo_produto === 'm2')) {
          toast({
              title: `Estoque Negativo`,
              description: `O produto ${produtoSelecionado.nome} está com estoque negativo. Não é possível selecioná-lo.`,
              variant: "destructive",
              duration: 5000
          });
          return;
      }

      setOrcamento(prev => ({
        ...prev,
        selectedPecas: prev.selectedPecas.map(p =>
          p.id === pecaId 
            ? { 
                ...p, 
                produto: {
                  id: produtoSelecionado.id,
                  nome: produtoSelecionado.nome,
                  valorMetroQuadrado: preco,
                  estoqueDisponivel: estoqueDisponivel,
                  unidadeMedida: produtoSelecionado.unidadeMedida || 'm2',
                  cor_opcional: produtoSelecionado.cor_opcional || '',
                  preco_venda: preco, 
                  preco_m2: preco,
                  promocao_ativa: produtoSelecionado.promocao_ativa || false,
                  preco_promocional: produtoSelecionado.preco_promocional || null,
                  preco_original: produtoSelecionado.preco_original || preco
                }
              }
            : p
        )
      }));
    };

    // Retorna uma função que pode ser usada para abrir o modal
    return {
      pecaId,
      onSelectProduto: handleProdutoSelect
    };
  };

  const handleSelectCliente = (cliente) => {
    let nomeClienteFinal = cliente.nome_completo || cliente.nome;
    setOrcamento(prev => ({ ...prev, cliente: { id: cliente.id, nome: nomeClienteFinal, cpf_cnpj: cliente.cpf_cnpj } }));
  };

  const handleProductSelect = (produtoSelecionado) => {
    const preco = parseFloat(String(produtoSelecionado.valorMetroQuadrado || produtoSelecionado.preco_venda || produtoSelecionado.preco_m2 || '0').replace(',', '.'));
    const estoqueDisponivel = parseFloat(String(produtoSelecionado.estoqueDisponivel || produtoSelecionado.estoque || '0').replace(',', '.'));

    if (estoqueDisponivel < 0 && (produtoSelecionado.unidadeMedida === 'm2' || produtoSelecionado.tipo_produto === 'm2')) { // Checa estoque apenas para m2
        toast({
            title: `Estoque Negativo`,
            description: `O produto ${produtoSelecionado.nome} está com estoque negativo. Não é possível selecioná-lo.`,
            variant: "destructive",
            duration: 5000
        });
        return;
    }

    setOrcamento(prev => ({
      ...prev,
      produto: {
        id: produtoSelecionado.id,
        nome: produtoSelecionado.nome,
        valorMetroQuadrado: preco,
        estoqueDisponivel: estoqueDisponivel,
        unidadeMedida: produtoSelecionado.unidadeMedida || 'm2',
        cor_opcional: produtoSelecionado.cor_opcional || '',
        preco_venda: preco, 
        preco_m2: preco,
        promocao_ativa: produtoSelecionado.promocao_ativa || false,
        preco_promocional: produtoSelecionado.preco_promocional || null,
        preco_original: produtoSelecionado.preco_original || preco
      }
    }));
  };

  const handleSalvarRascunho = async () => {
    const orcamentoSalvo = await salvarOrcamentoEnvelopamentoRascunho(orcamento, vendedorAtual);
    setOrcamento(prev => ({ ...prev, id: orcamentoSalvo.id, status: 'Rascunho' })); // Atualiza o ID no estado local
    toast({
      title: "Rascunho Salvo!",
      description: `Seu orçamento ${orcamentoSalvo.id} foi salvo.`
    });
    return orcamentoSalvo;
  };

  const handleFinalizarPagamentoEConfirmar = async (pagamentos) => {
    if (!orcamento.cliente?.nome) {
      toast({ title: "Cliente não informado", description: "Por favor, selecione um cliente.", variant: "destructive" });
      return null;
    }
    if (!Array.isArray(orcamento.selectedPecas) || orcamento.selectedPecas.length === 0) {
      toast({ title: "Nenhuma peça selecionada", description: "Adicione pelo menos uma peça ao orçamento.", variant: "destructive" });
      return null;
    }
    // Verificar se cada peça necessita de produto (peças que só possuem serviços adicionais são válidas)
    const pecasSemProduto = orcamento.selectedPecas.filter(peca => {
      const possuiProduto = !!(peca.produto?.id);
      const possuiServicos = !!(peca.servicosAdicionais && Object.values(peca.servicosAdicionais).some(valor => !!valor));
      return !possuiProduto && !possuiServicos;
    });
    if (pecasSemProduto.length > 0) {
      const nomesPecas = pecasSemProduto.map(peca => peca.parte?.nome || 'Peça sem nome').join(', ');
      toast({ 
        title: "Produtos não selecionados", 
        description: `As seguintes peças não têm produto selecionado: ${nomesPecas}. Por favor, selecione um produto para cada peça.`, 
        variant: "destructive" 
      });
      return null;
    }
    
    // Verificar estoque para cada produto individual
    try {
      const produtoService = (await import('@/services/api')).produtoService;
      
      for (const peca of orcamento.selectedPecas) {
        const produto = peca.produto;
        if (!produto) continue;
        
        // Calcular área necessária para esta peça
        const alturaM = parseFloat(String(peca.parte?.altura || '0').replace(',', '.')) || 0;
        const larguraM = parseFloat(String(peca.parte?.largura || '0').replace(',', '.')) || 0;
        const quantidade = parseInt(peca.quantidade, 10) || 0;
        const areaPeca = alturaM * larguraM * quantidade;
        
        // Verificar apenas produtos em m²
        if ((produto.unidade_medida || produto.unidadeMedida) === 'm2' || produto.tipo_produto === 'm2') {
          
          
          try {
            const response = await produtoService.getById(produto.id);
            const produtoAtualizado = response.data;
            
            if (produtoAtualizado) {
              const dadosProduto = produtoAtualizado.data || produtoAtualizado;
              const estoqueRealAtual = parseFloat(String(dadosProduto.estoque || dadosProduto.estoque_disponivel || '0').replace(',','.'));
              

              if (estoqueRealAtual < areaPeca) {
                toast({
                  title: "Estoque Insuficiente!",
                  description: `Produto ${produto.nome} (peça: ${peca.parte?.nome}) tem ${estoqueRealAtual.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida} em estoque. Necessário: ${areaPeca.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida}.`,
                  variant: "destructive",
                  duration: 7000,
                });
                return null;
              }
            } else {
              console.error('❌ Produto não encontrado na API (Finalização):', produto.nome);
              toast({
                title: "Erro ao verificar estoque",
                description: `Não foi possível verificar o estoque do produto ${produto.nome}. Tente novamente.`,
                variant: "destructive",
                duration: 5000,
              });
              return null;
            }
          } catch (error) {
            console.error('❌ Erro ao verificar estoque na API para finalização -', produto.nome, ':', error);
            
            // Se for erro de autenticação, usar dados locais temporariamente
            if (error.response?.status === 401) {
              console.warn('⚠️ Erro de autenticação, usando dados locais temporariamente para finalização -', produto.nome);
              const estoqueLocal = parseFloat(String(produto.estoqueDisponivel || '0').replace(',','.'));
              if (estoqueLocal < areaPeca) {
                toast({
                  title: "Estoque Insuficiente!",
                  description: `Produto ${produto.nome} (peça: ${peca.parte?.nome}) tem ${estoqueLocal.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida} em estoque. Necessário: ${areaPeca.toFixed(2).replace('.',',')} ${produto.unidade_medida || produto.unidadeMedida}.`,
                  variant: "destructive",
                  duration: 7000,
                });
                return null;
              }
            } else {
              toast({
                title: "Erro ao verificar estoque",
                description: `Não foi possível conectar com o servidor para verificar o estoque do produto ${produto.nome}. Tente novamente.`,
                variant: "destructive",
                duration: 5000,
              });
              return null;
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro geral ao verificar estoque para finalização:', error);
      toast({
        title: "Erro ao verificar estoque",
        description: "Não foi possível verificar o estoque dos produtos. Tente novamente.",
        variant: "destructive",
        duration: 5000,
      });
      return null;
    }
    
    // Usar o ID existente se for válido, caso contrário deixar que o backend gere um ID
    const idFinal = orcamento.id && (
      // Se é um número (ID do banco)
      (typeof orcamento.id === 'number') ||
      // Se é uma string que não é rascunho
      (typeof orcamento.id === 'string' && !(orcamento.id.startsWith('env-draft-') || orcamento.id.startsWith('rascunho_env_')))
    )
      ? orcamento.id
      : null; // Deixar que o backend gere o ID final

    const orcamentoFinalizadoPayload = {
      ...orcamento,
      id: idFinal,
      data: formatDateForBackend(), // Sempre atualiza para a data de finalização
      data_criacao: orcamento.data_criacao || orcamento.data || formatDateForBackend(), // Preserva a data de criação original
      vendedor_id: vendedorAtual?.id,
      vendedor_nome: vendedorAtual?.nome,
      pagamentos: pagamentos,
      status: 'Finalizado',
    };

    console.log('🔄 [Envelopamento] Finalizando orçamento', {
      orcamentoId: orcamento.id,
      pagamentos,
      totalEsperado: orcamento.orcamentoTotal,
      cliente: orcamento.cliente?.id || null,
    });

    const orcamentoSalvo = await finalizarOrcamentoEnvelopamento(orcamentoFinalizadoPayload, registrarAcaoCallback, vendedorAtual);
    
    toast({ title: "Orçamento Finalizado!", description: `O orçamento ${orcamentoSalvo.id} foi salvo e o estoque atualizado.`, className: "bg-green-500 text-white" });
    return orcamentoSalvo;
  };

  const resetOrcamento = async () => {
    if(resetFullState) {
        await resetFullState(); // Isso deve setar um novo ID inicial
    } else {
        const novoId = await getNextEnvelopamentoId('env-draft-');
        setOrcamento({...initialOrcamentoStateRef.current, id: novoId});
    }
  };

  return {
    handleAddPecaAvulsa,
    handleAddProdutoSemMedidas,
    handleSelectPecasDoCatalogo,
    handleUpdatePecaQuantidade,
    handleRemovePeca,
    handleUpdatePecaServicosAdicionais,
    handleUpdatePecaMedidas,
    handleUpdatePecaProduto,
    handleUpdatePecaProdutoDireto,
    handleSelectCliente,
    handleProductSelect,
    handleSalvarRascunho,
    handleFinalizarPagamentoEConfirmar,
    resetOrcamento,
  };
};