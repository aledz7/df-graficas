import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { apiDataManager } from '@/lib/apiDataManager';
import { getImageUrl } from '@/lib/imageUtils';

const EnvelopamentoDocumentModal = ({ isOpen, setIsOpen, documento, logoUrl, nomeEmpresa, documentRef, handleGerarPdf, handleImpressao, handleNovoOrcamento }) => {
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [contaPixSelecionada, setContaPixSelecionada] = useState(null);
  const [servicosAdicionais, setServicosAdicionais] = useState([]);
  const [servicosCache, setServicosCache] = useState({}); // Cache para serviços buscados individualmente
  const [servicosCarregando, setServicosCarregando] = useState(new Set()); // IDs de serviços que estão sendo carregados
  const [forcarAtualizacao, setForcarAtualizacao] = useState(0); // Forçar atualização quando serviços forem carregados
  
  // Refs para acessar valores mais recentes sem causar re-renders
  const servicosAdicionaisRef = useRef([]);
  const servicosCacheRef = useRef({});
  const servicosCarregandoRef = useRef(new Set());
  
  // Atualizar refs quando os estados mudarem
  useEffect(() => {
    servicosAdicionaisRef.current = servicosAdicionais;
  }, [servicosAdicionais]);
  
  useEffect(() => {
    servicosCacheRef.current = servicosCache;
  }, [servicosCache]);
  
  useEffect(() => {
    servicosCarregandoRef.current = servicosCarregando;
  }, [servicosCarregando]);

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && documento) {
        // Carregar configurações da empresa da mesma forma do modal de OS
        const settingsStr = await apiDataManager.getItem('empresaSettings');
        const parsed = JSON.parse(settingsStr || '{}');
        const settings = parsed && typeof parsed === 'object' && parsed.data ? parsed.data : parsed;
        setEmpresaSettings(settings);
        
        // Carregar serviços adicionais do banco
        try {
          // Primeiro, tentar carregar do cache local
          const cacheKey = 'servicos_adicionais_envelopamento_cache';
          const cachedServicos = localStorage.getItem(cacheKey);
          if (cachedServicos) {
            try {
              const parsed = JSON.parse(cachedServicos);
              const cacheDate = parsed.timestamp ? new Date(parsed.timestamp) : null;
              const now = new Date();
              // Usar cache se tiver menos de 1 hora
              if (cacheDate && (now - cacheDate) < 60 * 60 * 1000 && Array.isArray(parsed.data)) {
                console.log('📦 Usando serviços do cache local:', parsed.data.length);
                setServicosAdicionais(parsed.data);
              }
            } catch (e) {
              console.warn('Erro ao parsear cache de serviços:', e);
            }
          }
          
          const token = localStorage.getItem('auth_token');
          if (token) {
            const response = await fetch('/api/servicos-adicionais', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                // A API já filtra por tipo envelopamento, então podemos usar diretamente
                const servicosEnvelopamento = Array.isArray(data.data) ? data.data : [];
                console.log('✅ Serviços adicionais carregados:', servicosEnvelopamento.length, 'serviços', servicosEnvelopamento.map(s => ({ id: s.id, nome: s.nome })));
                setServicosAdicionais(servicosEnvelopamento);
                
                // Salvar no cache local
                try {
                  localStorage.setItem(cacheKey, JSON.stringify({
                    data: servicosEnvelopamento,
                    timestamp: new Date().toISOString()
                  }));
                } catch (e) {
                  console.warn('Erro ao salvar cache de serviços:', e);
                }
              } else {
                console.warn('⚠️ Resposta da API de serviços adicionais não contém data:', data);
                // Não limpar se já temos cache
                if (!cachedServicos) {
                  setServicosAdicionais([]);
                }
              }
            } else {
              // Tentar obter mais detalhes do erro
              let errorDetails = '';
              try {
                const errorData = await response.json();
                errorDetails = errorData.message || errorData.error || '';
              } catch (e) {
                // Ignorar erro ao parsear JSON
              }
              console.error('❌ Erro na resposta da API de serviços adicionais:', response.status, response.statusText, errorDetails);
              // Não limpar se já temos cache
              if (!cachedServicos) {
                setServicosAdicionais([]);
              }
            }
          }
        } catch (error) {
          console.error('❌ Erro ao carregar serviços adicionais:', error);
          // Não limpar se já temos cache
          const cacheKey = 'servicos_adicionais_envelopamento_cache';
          const cachedServicos = localStorage.getItem(cacheKey);
          if (!cachedServicos) {
            setServicosAdicionais([]);
          }
        }
        
        // console.log('Dados da empresa:', settings);

        if (documento.pagamentos && documento.pagamentos.length > 0) {
          const pixPayment = documento.pagamentos.find(p => p.metodo === 'Pix' && p.contaBancariaId);
          if (pixPayment) {
            const contas = JSON.parse(await apiDataManager.getItem('contasBancarias') || '[]');
            const conta = contas.find(c => c.id === pixPayment.contaBancariaId);
            setContaPixSelecionada(conta);
          } else {
            setContaPixSelecionada(null);
          }
        } else {
          setContaPixSelecionada(null);
        }
      }
    };
    
    loadData();
  }, [isOpen, documento]);

  // Função para buscar um serviço individualmente pelo ID (memoizada)
  // IMPORTANTE: Este hook deve ser chamado ANTES de qualquer return condicional
  const buscarServicoPorId = useCallback(async (servicoId) => {
    // Se já está no cache, retornar do cache
    if (servicosCacheRef.current[servicoId]) {
      return servicosCacheRef.current[servicoId];
    }
    
    // Se já está na lista de serviços adicionais, retornar da lista
    const servicoNaLista = servicosAdicionaisRef.current.find(s => {
      if (!s || !s.id) return false;
      return String(s.id) === String(servicoId) || Number(s.id) === Number(servicoId);
    });
    if (servicoNaLista) {
      return servicoNaLista;
    }
    
    // Evitar múltiplas requisições para o mesmo serviço
    if (servicosCarregandoRef.current.has(servicoId)) {
      return null;
    }
    
    // Tentar buscar do cache local primeiro
    const cacheKey = 'servicos_adicionais_envelopamento_cache';
    const cachedServicos = localStorage.getItem(cacheKey);
    if (cachedServicos) {
      try {
        const parsed = JSON.parse(cachedServicos);
        if (Array.isArray(parsed.data)) {
          const servicoNoCache = parsed.data.find(s => {
            if (!s || !s.id) return false;
            return String(s.id) === String(servicoId) || Number(s.id) === Number(servicoId);
          });
          if (servicoNoCache) {
            setServicosCache(prev => ({ ...prev, [servicoId]: servicoNoCache }));
            return servicoNoCache;
          }
        }
      } catch (e) {
        // Ignorar erro ao parsear cache
      }
    }
    
    // Tentar buscar individualmente da API
    try {
      setServicosCarregando(prev => new Set(prev).add(servicoId));
      const token = localStorage.getItem('auth_token');
      if (token) {
        const response = await fetch(`/api/servicos-adicionais/${servicoId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Adicionar ao cache e à lista de serviços
            setServicosCache(prev => ({ ...prev, [servicoId]: data.data }));
            setServicosAdicionais(prev => {
              // Evitar duplicatas
              if (prev.find(s => String(s.id) === String(servicoId))) {
                return prev;
              }
              return [...prev, data.data];
            });
            // Forçar atualização do componente para mostrar os nomes
            setForcarAtualizacao(prev => prev + 1);
            
            // Atualizar cache local também
            try {
              const cacheKey = 'servicos_adicionais_envelopamento_cache';
              const cached = localStorage.getItem(cacheKey);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed.data)) {
                  // Adicionar o serviço ao cache se não existir
                  if (!parsed.data.find(s => String(s.id) === String(servicoId))) {
                    parsed.data.push(data.data);
                    localStorage.setItem(cacheKey, JSON.stringify({
                      data: parsed.data,
                      timestamp: parsed.timestamp || new Date().toISOString()
                    }));
                  }
                }
              }
            } catch (e) {
              // Ignorar erro ao atualizar cache
            }
            
            return data.data;
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar serviço ${servicoId}:`, error);
    } finally {
      setServicosCarregando(prev => {
        const novo = new Set(prev);
        novo.delete(servicoId);
        return novo;
      });
    }
    
    return null;
  }, []); // Sem dependências - usa refs para acessar valores atuais

  // Ref para evitar múltiplas execuções do useEffect
  const servicosCarregadosRef = useRef(new Set());

  // Carregar serviços que estão faltando quando o documento é aberto
  useEffect(() => {
    if (!isOpen || !documento) {
      servicosCarregadosRef.current.clear();
      return;
    }
    
    const documentoId = documento.id;
    
    const carregarServicosFaltantes = async () => {
      const selectedPecas = Array.isArray(documento.selectedPecas) ? documento.selectedPecas : Array.isArray(documento.selected_pecas) ? documento.selected_pecas : [];
      const servicosIds = new Set();
      
      // Coletar todos os IDs de serviços que precisam ser carregados
      selectedPecas.forEach(peca => {
        if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
          Object.entries(peca.servicosAdicionais).forEach(([key, value]) => {
            // Se o valor já tem nome (novo formato), não precisa buscar
            if (typeof value === 'object' && value !== null && value.nome) {
              // Já tem nome, não precisa buscar
              return;
            }
            const isChecked = typeof value === 'object' ? Boolean(value?.checked) : Boolean(value);
            if (isChecked && !isNaN(parseInt(key))) {
              servicosIds.add(key);
            }
          });
        }
      });
      
      // Se não há serviços para carregar, retornar
      if (servicosIds.size === 0) {
        return;
      }
      
      // Buscar cada serviço que não está na lista nem no cache
      const promessas = [];
      for (const servicoId of servicosIds) {
        // Verificar se já está na lista (usar ref para valor mais recente)
        const servicoNaLista = servicosAdicionaisRef.current.find(s => {
          if (!s || !s.id) return false;
          return String(s.id) === String(servicoId) || Number(s.id) === Number(servicoId);
        });
        
        // Verificar se já está no cache (usar ref para valor mais recente)
        const servicoNoCache = servicosCacheRef.current[servicoId] || servicosCacheRef.current[String(servicoId)] || servicosCacheRef.current[Number(servicoId)];
        
        // Se não está em nenhum lugar e não está sendo carregado, buscar
        if (!servicoNaLista && !servicoNoCache && !servicosCarregandoRef.current.has(servicoId)) {
          promessas.push(buscarServicoPorId(servicoId));
        }
      }
      
      // Aguardar todas as buscas completarem
      if (promessas.length > 0) {
        await Promise.all(promessas);
      }
    };
    
    // Carregar imediatamente e também após um delay para garantir
    carregarServicosFaltantes();
    const timeout = setTimeout(() => {
      carregarServicosFaltantes();
    }, 500);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [isOpen, documento?.id, buscarServicoPorId, servicosAdicionais, servicosCache]);

  // Verificar se documento existe APÓS todos os hooks
  if (!documento) return null;

  // Debug: mostrar dados do documento no console
  console.log('📄 EnvelopamentoDocumentModal - Dados do documento:', documento);
  console.log('💰 Desconto:', documento.desconto, 'Tipo:', documento.descontoTipo, 'Calculado:', documento.descontoCalculado);
  console.log('🚚 Frete:', documento.frete);
  
  // Debug: mostrar serviços aplicados nas peças
  const selectedPecas = Array.isArray(documento.selectedPecas) ? documento.selectedPecas : Array.isArray(documento.selected_pecas) ? documento.selected_pecas : [];
  console.log('🔧 Serviços aplicados nas peças:', selectedPecas.map(peca => ({
    peca: peca.parte?.nome,
    servicos: peca.servicosAdicionais
  })));

  // Coletar todos os serviços adicionais aplicados (sem duplicatas)
  const servicosAplicadosUnicos = (() => {
    const servicosMap = new Map();
    
    // Primeiro, tentar usar a coluna servicos_adicionais_aplicados ou adicionais se existir
    if (documento.servicos_adicionais_aplicados && Array.isArray(documento.servicos_adicionais_aplicados)) {
      documento.servicos_adicionais_aplicados.forEach(servico => {
        if (servico && servico.nome) {
          servicosMap.set(servico.id || servico.nome, servico.nome);
        }
      });
    } else if (documento.adicionais && Array.isArray(documento.adicionais)) {
      documento.adicionais.forEach(servico => {
        if (servico && servico.nome) {
          servicosMap.set(servico.id || servico.nome, servico.nome);
        }
      });
    }
    
    // Se não encontrou na coluna, coletar das peças
    if (servicosMap.size === 0 && selectedPecas.length > 0) {
      selectedPecas.forEach(peca => {
        if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
          Object.entries(peca.servicosAdicionais).forEach(([key, value]) => {
            const isChecked = typeof value === 'object' ? Boolean(value?.checked) : Boolean(value);
            if (isChecked) {
              // Se já tem nome no objeto (novo formato), usar ele
              if (typeof value === 'object' && value !== null && value.nome) {
                servicosMap.set(key, value.nome);
              } else {
                // Tentar buscar na lista de serviços
                const servico = servicosAdicionais.find(s => {
                  if (!s || !s.id) return false;
                  return String(s.id) === String(key) || Number(s.id) === Number(key);
                });
                if (servico && servico.nome) {
                  servicosMap.set(key, servico.nome);
                } else {
                  // Tentar no cache
                  const servicoCache = servicosCache[key] || servicosCache[parseInt(key)] || servicosCache[String(key)];
                  if (servicoCache && servicoCache.nome) {
                    servicosMap.set(key, servicoCache.nome);
                  }
                }
              }
            }
          });
        }
      });
    }
    
    return Array.from(servicosMap.values());
  })();

  const totalPago = documento.pagamentos?.reduce((acc, p) => acc + parseFloat(p.valorFinal || p.valor), 0) || 0;
  const saldoPendente = parseFloat(documento.orcamento_total || 0) - totalPago;
  
  const formaPagamentoIcones = {
    Pix: '📱', Dinheiro: '💵', 'Cartão Débito': '💳', 'Cartão Crédito': '💳', Crediário: '🗓️',
  };

  const isFinalizado = String(documento.status || '').toLowerCase().startsWith('finaliz');
  const titulo = documento.status === 'Rascunho' ? 'Rascunho de Orçamento' : (isFinalizado ? 'Venda de Envelopamento' : 'Orçamento de Envelopamento');
  const idLabel = isFinalizado ? 'Venda Env. Nº:' : 'Orçamento Nº:';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{titulo} - {documento.id}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div ref={documentRef} className="p-6 bg-white text-black printable-content">
            <header className="flex justify-between items-start mb-6 pb-4 border-b">
              <div className="max-w-[60%]">
                {(empresaSettings.logoUrl || logoUrl) ? 
                  <img src={getImageUrl(empresaSettings.logoUrl || logoUrl)} alt="Logo Empresa" className="h-16 mb-2 object-contain" />
                  : <div className="h-16 w-40 bg-gray-200 flex items-center justify-center text-gray-500 mb-2">LOGO EMPRESA</div>
                }
                <h2 className="text-2xl font-bold text-gray-900">{empresaSettings.nome_fantasia || empresaSettings.nomeFantasia || nomeEmpresa}</h2>
                <p className="text-xs text-gray-600">{empresaSettings.razao_social || empresaSettings.razaoSocial}</p>
                <p className="text-xs text-gray-600">CNPJ: {empresaSettings.cnpj}</p>
                <p className="text-xs text-gray-600">Tel: {empresaSettings.telefone} | Email: {empresaSettings.email}</p>
                <p className="text-xs text-gray-600">{empresaSettings.endereco_completo || empresaSettings.enderecoCompleto}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">{idLabel} {documento.id}</p>
                <p className="text-sm">Data: {documento.data ? format(new Date(documento.data), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                {documento.vendedor_nome && <p className="text-sm mt-1">Vendedor(a): <span className="font-medium">{documento.vendedor_nome}</span></p>}
                {documento.nome_orcamento && <p className="text-sm mt-1">Nome do Orçamento: <span className="font-medium">{documento.nome_orcamento}</span></p>}
              </div>
            </header>

            <div className="mb-4">
              <h3 className="font-semibold border-b pb-1 mb-2">Cliente</h3>
              <p>{documento.cliente?.nome_completo || documento.cliente?.nome || 'Cliente não selecionado'}</p>
              {documento.cliente?.cpf_cnpj && <p className="text-sm text-gray-600">CPF/CNPJ: {documento.cliente.cpf_cnpj}</p>}
            </div>

            <h3 className="font-semibold border-b pb-1 mb-2">Itens do Orçamento</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 pr-2">Peça/Serviço</th>
                  <th className="text-left py-1 px-2">Material</th>
                  <th className="text-right py-1 px-2">Área</th>
                  <th className="text-left py-1 px-2">Serviços</th>
                  <th className="text-right py-1 px-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(documento.selectedPecas) ? documento.selectedPecas : Array.isArray(documento.selected_pecas) ? documento.selected_pecas : []).map((peca, index) => {
                  const servicosAplicados = [];
                  
                  // Função auxiliar para buscar nome do serviço
                  const buscarNomeServico = (servicoId) => {
                    if (!servicoId) return null;
                    
                    const keyNum = parseInt(servicoId);
                    const keyStr = String(servicoId);
                    
                    // Função auxiliar para comparar IDs de forma flexível
                    const idsIguais = (id1, id2) => {
                      if (!id1 || !id2) return false;
                      const num1 = parseInt(id1);
                      const num2 = parseInt(id2);
                      const str1 = String(id1);
                      const str2 = String(id2);
                      
                      // Comparar como números se ambos forem numéricos
                      if (!isNaN(num1) && !isNaN(num2)) {
                        return num1 === num2;
                      }
                      // Comparar como strings
                      return str1 === str2 || str1 === String(id2) || String(id1) === str2;
                    };
                    
                    // 1. Tentar buscar na coluna adicionais do documento (prioridade - dados já salvos)
                    if (documento.adicionais && Array.isArray(documento.adicionais)) {
                      for (const servico of documento.adicionais) {
                        if (!servico) continue;
                        const sId = servico.id || servico.servico_id;
                        if (sId && idsIguais(sId, servicoId)) {
                          if (servico.nome) {
                            return servico.nome;
                          }
                        }
                      }
                    }
                    
                    // 2. Tentar buscar na coluna servicos_adicionais_aplicados
                    if (documento.servicos_adicionais_aplicados && Array.isArray(documento.servicos_adicionais_aplicados)) {
                      for (const servico of documento.servicos_adicionais_aplicados) {
                        if (!servico) continue;
                        const sId = servico.id || servico.servico_id;
                        if (sId && idsIguais(sId, servicoId)) {
                          if (servico.nome) {
                            return servico.nome;
                          }
                        }
                      }
                    }
                    
                    // 3. Tentar buscar na lista de serviços adicionais carregados
                    for (const servico of servicosAdicionais) {
                      if (!servico || !servico.id) continue;
                      if (idsIguais(servico.id, servicoId)) {
                        if (servico.nome) {
                          return servico.nome;
                        }
                      }
                    }
                    
                    // 4. Se não encontrou, tentar no cache do estado
                    const cacheKeys = [servicoId, keyNum, keyStr];
                    for (const cacheKey of cacheKeys) {
                      const servico = servicosCache[cacheKey];
                      if (servico && servico.nome) {
                        return servico.nome;
                      }
                    }
                    
                    // 5. Se ainda não encontrou, tentar buscar no cache local
                    try {
                      const cacheKey = 'servicos_adicionais_envelopamento_cache';
                      const cachedServicos = localStorage.getItem(cacheKey);
                      if (cachedServicos) {
                        const parsed = JSON.parse(cachedServicos);
                        if (Array.isArray(parsed.data)) {
                          for (const servico of parsed.data) {
                            if (!servico || !servico.id) continue;
                            if (idsIguais(servico.id, servicoId)) {
                              if (servico.nome) {
                                // Adicionar ao cache do estado
                                setServicosCache(prev => ({ ...prev, [servicoId]: servico }));
                                return servico.nome;
                              }
                            }
                          }
                        }
                      }
                    } catch (e) {
                      // Ignorar erro ao buscar no cache
                    }
                    
                    return null;
                  };
                  
                  if (peca.servicosAdicionais && typeof peca.servicosAdicionais === 'object') {
                    Object.entries(peca.servicosAdicionais).forEach(([key, value]) => {
                      // Verificar se o valor já é um objeto com nome (novo formato)
                      if (typeof value === 'object' && value !== null && value.nome) {
                        // Novo formato: {id, nome, checked}
                        if (value.checked !== false) {
                          servicosAplicados.push(value.nome);
                        }
                      } else {
                        // Formato antigo: apenas true/false ou {checked: true}
                        const isChecked = typeof value === 'object' ? Boolean(value?.checked) : Boolean(value);
                        
                        if (isChecked) {
                          // Se for um ID numérico, buscar o nome do serviço
                          if (!isNaN(parseInt(key))) {
                            const nomeServico = buscarNomeServico(key);
                            if (nomeServico) {
                              servicosAplicados.push(nomeServico);
                            } else {
                              // Tentar buscar de forma mais agressiva - verificar se o ID está em qualquer lugar
                              let encontrado = false;
                              
                              // Buscar em todos os arrays disponíveis
                              const todasFontes = [
                                ...(Array.isArray(documento.adicionais) ? documento.adicionais : []),
                                ...(Array.isArray(documento.servicos_adicionais_aplicados) ? documento.servicos_adicionais_aplicados : []),
                                ...servicosAdicionais,
                                ...Object.values(servicosCache)
                              ];
                              
                              for (const servico of todasFontes) {
                                if (servico && servico.id) {
                                  const sId = String(servico.id);
                                  const sIdNum = Number(servico.id);
                                  const keyStr = String(key);
                                  const keyNum = Number(key);
                                  if (sId === keyStr || sIdNum === keyNum || sId === key || String(sId) === keyStr || Number(sId) === keyNum) {
                                    if (servico.nome) {
                                      servicosAplicados.push(servico.nome);
                                      encontrado = true;
                                      break;
                                    }
                                  }
                                }
                              }
                              
                              // Se ainda não encontrou, tentar buscar no cache local de forma mais agressiva
                              if (!encontrado) {
                                try {
                                  const cacheKey = 'servicos_adicionais_envelopamento_cache';
                                  const cachedServicos = localStorage.getItem(cacheKey);
                                  if (cachedServicos) {
                                    const parsed = JSON.parse(cachedServicos);
                                    if (Array.isArray(parsed.data)) {
                                      const servico = parsed.data.find(s => {
                                        if (!s || !s.id) return false;
                                        const sId = String(s.id);
                                        const sIdNum = Number(s.id);
                                        const keyStr = String(key);
                                        const keyNum = Number(key);
                                        return sId === keyStr || sIdNum === keyNum || String(s.id) === keyStr || Number(s.id) === keyNum;
                                      });
                                      if (servico && servico.nome) {
                                        servicosAplicados.push(servico.nome);
                                        encontrado = true;
                                        // Adicionar ao cache do estado para próxima renderização
                                        setServicosCache(prev => ({ ...prev, [key]: servico }));
                                      }
                                    }
                                  }
                                } catch (e) {
                                  // Ignorar erro
                                }
                              }
                              
                              // Se ainda não encontrou, mostrar o ID temporariamente
                              // O useEffect vai carregar e atualizar automaticamente
                              if (!encontrado) {
                                servicosAplicados.push(`Serviço ${key}`);
                              }
                            }
                          } else {
                            // Estrutura antiga - usar labels mapeados
                            const servicoLabels = {
                              aplicacao: 'Aplicação',
                              remocao: 'Remoção',
                              lixamento: 'Lixamento',
                              transparente: 'Transparente',
                            };
                            servicosAplicados.push(servicoLabels[key] || key);
                          }
                        }
                      }
                    });
                  }
                  
                  const areaPeca = (
                    (parseFloat(String(peca.parte?.altura || '0').replace(',', '.')) || 0) *
                    (parseFloat(String(peca.parte?.largura || '0').replace(',', '.')) || 0) *
                    (peca.quantidade || 1)
                  );
                  
                  // Calcular subtotal do material para esta peça (consistente com cálculo oficial)
                  const produto = peca.produto || documento.produto;
                  const temPromocao = produto?.promocao_ativa && parseFloat(produto?.preco_promocional || 0) > 0;
                  const precoMaterial = temPromocao
                    ? (parseFloat(String(produto?.preco_promocional || '0').replace(',', '.')) || 0)
                    : (parseFloat(String(produto?.preco_venda || produto?.valorMetroQuadrado || produto?.preco_m2 || '0').replace(',', '.')) || 0);
                  
                  // Para produtos sem medidas, calcular por quantidade, não por área
                  const subtotalMaterial = peca.parte?.isProdutoSemMedidas 
                    ? (peca.quantidade || 1) * precoMaterial
                    : areaPeca * precoMaterial;
                  
                  // Calcular subtotal dos serviços adicionais
                  // Como os serviços agora vêm do banco, precisamos dos preços dos adminSettings
                  // Por enquanto, vamos usar o custo total calculado pelo sistema
                  let subtotalServicos = 0;
                  
                  // Se temos o custo total dos adicionais, distribuir proporcionalmente pela área
                  const custoTotalAdicionais = parseFloat(documento.custoTotalAdicionais || documento.custo_total_adicionais || 0);
                  const areaTotal = parseFloat(documento.areaTotalM2 || documento.area_total_m2 || 0);
                  
                  if (custoTotalAdicionais > 0 && areaTotal > 0) {
                    // Distribuir proporcionalmente pela área da peça
                    subtotalServicos = (custoTotalAdicionais * areaPeca) / areaTotal;
                  }
                  
                  const subtotalPeca = subtotalMaterial + subtotalServicos;
                  
                  // Obter medidas da peça
                  const alturaM = parseFloat(String(peca.parte?.altura || '0').replace(',', '.')) || 0;
                  const larguraM = parseFloat(String(peca.parte?.largura || '0').replace(',', '.')) || 0;
                  const medidasTexto = alturaM > 0 && larguraM > 0 ? `${larguraM.toFixed(2)}m x ${alturaM.toFixed(2)}m` : 'N/A';
                  
                  return (
                    <tr key={index} className="border-b">
                      <td className="py-1 pr-2">{peca.parte?.nome || 'Item'} <br/><div className="text-xs text-gray-500">Medidas: {medidasTexto}</div></td>
                      <td className="text-left py-1 px-2">{produto?.nome || 'Material não selecionado'}</td>
                      <td className="text-right py-1 px-2">
                        <div className="text-sm">{areaPeca.toFixed(2)} m²</div>
                      </td>
                      <td className="text-left py-1 px-2 text-xs">
                        {servicosAplicados.length > 0 ? servicosAplicados.join(', ') : 'Nenhum'}
                      </td>
                      <td className="text-right py-1 px-2">R$ {subtotalPeca.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-full md:w-1/2 lg:w-2/5 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal Material:</span>
                  <span>R$ {parseFloat(documento.custoTotalMaterial || documento.custo_total_material || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Serviços Adicionais:</span>
                  <span>R$ {parseFloat(documento.custoTotalAdicionais || documento.custo_total_adicionais || 0).toFixed(2)}</span>
                </div>
                
                {/* Lista de Serviços Adicionais Aplicados */}
                {servicosAplicadosUnicos.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Serviços Adicionais Aplicados:</div>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {servicosAplicadosUnicos.map((nomeServico, idx) => (
                        <div key={idx} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{nomeServico}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Subtotal antes de desconto e frete */}
                {((documento.desconto && parseFloat(documento.desconto) > 0) || (documento.frete && parseFloat(documento.frete) > 0)) && (
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ {(parseFloat(documento.custoTotalMaterial || documento.custo_total_material || 0) + parseFloat(documento.custoTotalAdicionais || documento.custo_total_adicionais || 0)).toFixed(2)}</span>
                  </div>
                )}
                
                {/* Desconto */}
                {(() => {
                  // Calcular desconto simples: subtotal - total
                  const subtotal = parseFloat(documento.custoTotalMaterial || documento.custo_total_material || 0) + 
                                 parseFloat(documento.custoTotalAdicionais || documento.custo_total_adicionais || 0);
                  const total = parseFloat(documento.orcamentoTotal || documento.orcamento_total || 0);
                  const descontoCalculado = subtotal - total;
                  
                  // Só mostrar desconto se for maior que 0
                  if (descontoCalculado > 0) {
                    return (
                      <div className="flex justify-between text-green-600">
                        <span>Desconto:</span>
                        <span>- R$ {descontoCalculado.toFixed(2)}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Frete */}
                {documento.frete && parseFloat(documento.frete) > 0 && (
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>+ R$ {parseFloat(documento.frete).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-base font-bold border-t pt-1">
                  <span>VALOR TOTAL:</span>
                  <span>R$ {parseFloat(documento.orcamentoTotal || documento.orcamento_total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {documento.pagamentos && documento.pagamentos.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold border-b pb-1 mb-2">Pagamentos</h3>
                {documento.pagamentos.map((p, i) => (
                  <p key={i} className="text-sm">{formaPagamentoIcones[p.metodo] || '💸'} {p.metodo}: R$ {parseFloat(p.valorFinal || p.valor).toFixed(2)}</p>
                ))}
                {saldoPendente > 0.01 && (
                  <p className="text-sm font-semibold text-red-600 mt-1">Pendente: R$ {saldoPendente.toFixed(2)}</p>
                )}
              </div>
            )}
            
            {documento.observacao && (
              <div className="mb-4 pt-2 border-t mt-4">
                <h3 className="font-semibold mb-1">Observações:</h3>
                <p className="text-sm whitespace-pre-wrap">{documento.observacao}</p>
              </div>
            )}

            {saldoPendente > 0.01 && contaPixSelecionada && (
              <div className="mt-6 pt-4 border-t text-center">
                <h3 className="font-semibold mb-2">Pague o valor restante com PIX</h3>
                <div className="flex flex-col items-center gap-2">
                   {contaPixSelecionada.qrCodeUrl ? (
                        <img src={contaPixSelecionada.qrCodeUrl} alt="PIX QR Code" className="w-32 h-32 object-contain border rounded-md" />
                    ) : (
                       <p className="text-sm text-muted-foreground">QR Code não disponível. Use a chave:</p>
                    )}
                   <div className="text-xs text-center">
                        <p><strong>Banco:</strong> {contaPixSelecionada.nomeBanco}</p>
                        <p><strong>Chave PIX:</strong> {contaPixSelecionada.chavePix}</p>
                   </div>
                </div>
                <p className="text-sm mt-2">Valor Pendente: <span className="font-bold">R$ {saldoPendente.toFixed(2)}</span></p>
              </div>
            )}
            
            <p className="text-xs text-center mt-6 text-gray-500">{empresaSettings.mensagemPersonalizadaRodape || 'Obrigado pela preferência!'}</p>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-0 border-t flex-wrap justify-center sm:justify-end gap-2">
          {handleNovoOrcamento && (
            <Button variant="secondary" onClick={handleNovoOrcamento}>Novo Orçamento</Button>
          )}
          <Button variant="outline" onClick={handleGerarPdf}><FileText size={16} className="mr-2"/> Baixar PDF</Button>
          <Button variant="outline" onClick={handleImpressao}><Printer size={16} className="mr-2"/> Imprimir</Button>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnvelopamentoDocumentModal;