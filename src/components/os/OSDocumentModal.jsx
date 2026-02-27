import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText, Loader2, UserCircle, Info, Wallet, ShoppingBag, Percent, Package as PackageIcon } from 'lucide-react';
import { format } from 'date-fns';

import { getImageUrl } from '@/lib/imageUtils';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse, formatCurrency, safeParseFloat } from '@/lib/utils';
import { generatePdfFromElement, generateTextBasedPdf } from '@/lib/osDocumentGenerator';
import { calcularSubtotalItem } from '@/hooks/os/osLogic';
import { produtoService, acabamentoService, empresaService, contaBancariaService, maquinaService } from '@/services/api';

const OSDocumentModal = ({ isOpen, setIsOpen, documento, logoUrl, nomeEmpresa, onGerarPdf, empresaSettings: propsEmpresaSettings, contasBancarias: propsContasBancarias, maquinas: propsMaquinas, documentRef, vendedorAtual }) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [contaPixSelecionada, setContaPixSelecionada] = useState(null);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [produtosCadastrados, setProdutosCadastrados] = useState([]);
  const [acabamentosConfigState, setAcabamentosConfigState] = useState([]);
  const { toast } = useToast();

  // Debug logs removidos para evitar loop infinito

  useEffect(() => {
    const loadData = async () => {
      if (isOpen && documento) {
        try {
          // Carregar configurações de acabamentos via serviço (API com token automático)
          let acabamentosConfig = [];
          try {
            const resp = await acabamentoService.getAll();
            const arr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : (Array.isArray(resp?.data?.data) ? resp.data.data : []));
            acabamentosConfig = arr;
            setAcabamentosConfigState(arr);
          } catch (err) {
            console.warn('Falha ao carregar acabamentos da API:', err);
          }

          // IMPORTANTE: Preservar os valores dos itens do banco quando existirem
          // Não recalcular se já existe um valor válido, para evitar alterações indesejadas
          if (documento.itens && Array.isArray(documento.itens)) {
            documento.itens = documento.itens.map(item => {
              // Preservar o valor_total ou subtotal_item do banco quando existir
              const subtotalDoBanco = parseFloat(item.valor_total || item.subtotal_item || 0);

              if (subtotalDoBanco > 0) {
                // Preservar o valor do banco
                return {
                  ...item,
                  subtotal_item: subtotalDoBanco,
                  valor_total: subtotalDoBanco // Garantir que valor_total também está correto
                };
              }

              // Só recalcular se realmente não houver valor válido
              if (!item.subtotal_item || item.subtotal_item === 0) {
                const subtotalCalculado = calcularSubtotalItem(item, acabamentosConfig);
                return {
                  ...item,
                  subtotal_item: subtotalCalculado,
                  valor_total: subtotalCalculado // Garantir que valor_total também está correto
                };
              }
              return item;
            });
          }

          // Empresa Settings via serviço
          try {
            const resp = await empresaService.get();
            const data = resp?.data?.data || resp?.data || resp || {};
            setEmpresaSettings(data);
          } catch (err) {
            console.warn('Falha ao carregar configurações da empresa:', err);
          }

          // Contas Bancárias via serviço
          try {
            const resp = await contaBancariaService.getAll();
            const contas = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp?.data?.data) ? resp.data.data : (Array.isArray(resp) ? resp : []));
            setContasBancarias(contas);
          } catch (err) {
            console.warn('Falha ao carregar contas bancárias:', err);
          }

          // Máquinas via serviço
          try {
            const resp = await maquinaService.getAll();
            const maquinasArr = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
            setMaquinas(maquinasArr);
          } catch (err) {
            console.warn('Falha ao carregar máquinas:', err);
          }

          // Produtos via serviço (para imagens)
          try {
            const produtosResp = await produtoService.getAll();
            const produtosArr = Array.isArray(produtosResp?.data)
              ? produtosResp.data
              : Array.isArray(produtosResp?.data?.data)
                ? produtosResp.data.data
                : Array.isArray(produtosResp)
                  ? produtosResp
                  : [];
            setProdutosCadastrados(produtosArr);
          } catch (errProdutos) {
            console.error('❌ [OSDocumentModal] Erro ao carregar produtos:', errProdutos?.response?.status, errProdutos?.response?.statusText || errProdutos?.message);
            setProdutosCadastrados([]);
          }

          // Configurar conta PIX se necessário
          if (documento.pagamentos && Array.isArray(documento.pagamentos)) {
            const pixPayment = documento.pagamentos.find(p => p.metodo === 'Pix' && p.contaBancariaId);
            if (pixPayment && contasBancarias.length > 0) {
              const conta = contasBancarias.find(c => c.id === pixPayment.contaBancariaId);
              setContaPixSelecionada(conta);
            } else {
              setContaPixSelecionada(null);
            }
          } else {
            setContaPixSelecionada(null);
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
        }
      }
    };

    loadData();
  }, [isOpen, documento, propsEmpresaSettings, propsContasBancarias, propsMaquinas]);

  if (!documento) return null;

  const isFinalizadaPaga = documento.status_os === 'Finalizada' && documento.status_pagamento === 'Pago';
  const isOrcamento = !documento.status_os || documento.status_os === 'Orçamento Salvo';

  let tituloModal = isOrcamento ? 'Orçamento de Serviço' : 'Ordem de Serviço';
  if (isFinalizadaPaga) {
    tituloModal = 'Comprovante de Ordem de Serviço';
  } else if (documento.status_os === 'Finalizada') {
    tituloModal = 'Detalhes da Ordem de Serviço Finalizada';
  }

  const idLabel = isOrcamento ? 'Orçamento/OS Nº:' : 'OS Nº:';

  // Função para obter o ID numérico da OS (campo 'id' da tabela ordens_servico)
  const getDisplayId = (doc) => {
    // Usar apenas o ID numérico do banco (campo 'id') - este é o número sequencial (500, 501, etc)
    if (doc?.id && doc.id !== undefined && doc.id !== 'Novo' && doc.id !== 'N/A' && typeof doc.id === 'number') {
      return doc.id;
    }

    // Se não tiver ID do banco, retornar "Novo"
    return 'Novo';
  };

  const getPrevisaoEntregaRaw = (doc) => (
    doc?.data_previsao_entrega ||
    doc?.data_prevista_entrega ||
    doc?.previsao_entrega ||
    null
  );

  const formatPrevisaoEntrega = (doc) => {
    const previsaoRaw = getPrevisaoEntregaRaw(doc);
    if (!previsaoRaw) return '';
    const data = new Date(previsaoRaw);
    if (Number.isNaN(data.getTime())) return '';
    return format(data, 'dd/MM/yyyy');
  };

  const formaPagamentoIcones = {
    Pix: '📱', Dinheiro: '💵', 'Cartão Débito': '💳', 'Cartão Crédito': '💳', Crediário: '🗓️',
  };

  const valorTotalOS = parseFloat(documento.valor_total_os || 0);
  let totalPago = 0;
  let totalTaxasCartao = 0;

  if (documento.pagamentos && Array.isArray(documento.pagamentos)) {
    documento.pagamentos.forEach(p => {
      const valorFinalPago = parseFloat(p.valorFinal || p.valor || 0);
      totalPago += valorFinalPago;
      if ((p.metodo === 'Cartão Crédito' || p.metodo === 'Cartão Débito') && p.taxaInfo) {
        const valorOriginal = parseFloat(p.valorOriginal || 0);
        if (valorFinalPago > valorOriginal) {
          totalTaxasCartao += (valorFinalPago - valorOriginal);
        }
      }
    });
  }

  const saldoPendente = valorTotalOS - totalPago;
  let troco = 0;
  let exibirTaxas = false;

  if (totalPago > valorTotalOS) {
    if (totalTaxasCartao > 0 && Math.abs((totalPago - valorTotalOS) - totalTaxasCartao) < 0.01) {
      // Diferença é primariamente devido às taxas
      exibirTaxas = true;
    } else {
      // Diferença é troco real
      troco = totalPago - valorTotalOS;
    }
  }



  // Função para decodificar sequências unicode escapadas
  const decodeUnicodeEscapes = (text) => {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });
  };

  // Helper síncrono para obter subtotal do item com fallback seguro
  const getSubtotalItemSafe = (item) => {
    const subtotalItem = parseFloat(item?.subtotal_item);
    if (!isNaN(subtotalItem) && subtotalItem > 0) return subtotalItem;
    const valorTotal = parseFloat(item?.valor_total);
    if (!isNaN(valorTotal) && valorTotal > 0) return valorTotal;
    const quantidade = parseFloat(item?.quantidade || 1);
    const valorUnitario = parseFloat(item?.valor_unitario_m2 || item?.valor_unitario || 0);
    const calculado = quantidade * valorUnitario;
    return isNaN(calculado) ? 0 : calculado;
  };

  // Calcula somente o subtotal de acabamentos do item (fallback quando não vier do backend)
  const getSubtotalAcabamentosSafe = (item) => {
    // 1) Campo vindo do backend
    const doBancoRaw = item?.subtotal_acabamentos;
    if (doBancoRaw !== undefined && doBancoRaw !== null) {
      const doBanco = parseFloat(String(doBancoRaw).replace(',', '.'));
      if (!isNaN(doBanco) && doBanco > 0) return doBanco;
    }

    // 2) Primeiro tentar calcular usando os dados salvos no próprio item (campo `acabamentos` vindo da tabela)
    let selecionados = item?.acabamentos;
    if (typeof selecionados === 'string') {
      try { selecionados = JSON.parse(selecionados); } catch { selecionados = null; }
    }
    if (Array.isArray(selecionados) && selecionados.length > 0) {
      const qtd = parseFloat(String(item?.quantidade ?? '1').replace(',', '.')) || 1;
      if (item?.tipo_item === 'm2') {
        const larguraM = parseFloat(String(item?.largura || '0').replace(',', '.')) || 0;
        const alturaM = parseFloat(String(item?.altura || '0').replace(',', '.')) || 0;
        const area = larguraM * alturaM;
        let subtotal = 0;
        selecionados.forEach(acab => {
          const tipo = acab?.tipo_aplicacao || acab?.tipoAplicacao;
          if (tipo === 'area_total') {
            const vM2 = parseFloat(String(acab?.valor_m2 ?? acab?.valor ?? 0).replace(',', '.')) || 0;
            subtotal += area * qtd * vM2;
          } else if (tipo === 'perimetro' || tipo === 'metro_linear') {
            const perimetro = 2 * (larguraM + alturaM);
            const unit = parseFloat(String((acab?.valor_m2 ?? acab?.valor_un ?? acab?.valor ?? 0)).replace(',', '.')) || 0;
            subtotal += perimetro * qtd * unit;
          } else if (tipo === 'unidade') {
            const vUn = parseFloat(String(acab?.valor_un ?? acab?.valor ?? 0).replace(',', '.')) || 0;
            subtotal += qtd * vUn;
          }
        });
        const resultado = isNaN(subtotal) ? 0 : parseFloat(subtotal.toFixed(2));
        return resultado;
      }
      // unidade
      let subtotal = 0;
      selecionados.forEach(acab => {
        const vUn = parseFloat(String(acab?.valor_un ?? acab?.valor ?? 0).replace(',', '.')) || 0;
        subtotal += (parseFloat(String(item?.quantidade ?? '1').replace(',', '.')) || 1) * vUn;
      });
      return isNaN(subtotal) ? 0 : parseFloat(subtotal.toFixed(2));
    }

    // 3) Normalizar seleção de acabamentos do item (estrutura usada na UI) como fallback
    selecionados = item?.acabamentos_selecionados;
    if (!Array.isArray(selecionados)) {
      if (typeof selecionados === 'string') {
        try { selecionados = JSON.parse(selecionados); } catch { selecionados = []; }
      } else if (Array.isArray(item?.acabamentos)) {
        selecionados = item.acabamentos;
      } else if (typeof item?.acabamentos === 'string') {
        try { selecionados = JSON.parse(item.acabamentos); } catch { selecionados = []; }
      } else {
        selecionados = [];
      }
    }

    // 4) Derivar por diferença do subtotal e base sem acabamentos
    const quantidade = parseFloat(String(item?.quantidade ?? '1').replace(',', '.')) || 1;
    const subtotalItem = getSubtotalItemSafe(item);
    let base = 0;
    if (item?.tipo_item === 'm2') {
      const largura = parseFloat(String(item?.largura || '0').replace(',', '.')) || 0;
      const altura = parseFloat(String(item?.altura || '0').replace(',', '.')) || 0;
      const area = largura * altura;
      const valorUnit = parseFloat(String((item?.valor_unitario_m2 ?? item?.valor_unitario ?? '0')).replace(',', '.')) || 0;
      base = area * quantidade * valorUnit;
    } else {
      const valorUnit = parseFloat(String(item?.valor_unitario || '0').replace(',', '.')) || 0;
      base = quantidade * valorUnit;
    }
    const diff = subtotalItem - base;
    if (diff > 0.009) {
      return parseFloat(diff.toFixed(2));
    }

    // 5) Se a diferença não indicar acabamentos, e houver seleção+config, calcular pelos acabamentos
    if (Array.isArray(selecionados) && selecionados.length > 0 && Array.isArray(acabamentosConfigState) && acabamentosConfigState.length > 0) {
      const qtdLocal = quantidade;
      if (item?.tipo_item === 'm2') {
        const largura = parseFloat(String(item?.largura || '0').replace(',', '.')) || 0;
        const altura = parseFloat(String(item?.altura || '0').replace(',', '.')) || 0;
        const area = largura * altura;
        let subtotal = 0;
        selecionados.forEach(acab => {
          const def = acabamentosConfigState.find(a => String(a.id) === String(acab.id));
          if (!def) return;
          const tipoAplicacao = def.tipo_aplicacao || def.tipoAplicacao;
          if (tipoAplicacao === 'area_total') {
            const v = parseFloat(def.valor_m2 ?? def.valor ?? 0) || 0;
            subtotal += area * qtdLocal * v;
          } else if (tipoAplicacao === 'perimetro' || tipoAplicacao === 'metro_linear') {
            const perimetro = 2 * (largura + altura);
            const v = parseFloat(def.valor_m2 ?? def.valor_un ?? def.valor ?? 0) || 0;
            subtotal += perimetro * qtdLocal * v;
          } else if (tipoAplicacao === 'unidade') {
            const v = parseFloat(def.valor_un ?? def.valor ?? 0) || 0;
            subtotal += qtdLocal * v;
          }
        });
        return isNaN(subtotal) ? 0 : parseFloat(subtotal.toFixed(2));
      }
      let subtotal = 0;
      selecionados.forEach(acab => {
        const def = acabamentosConfigState.find(a => String(a.id) === String(acab.id));
        if (!def) return;
        const v = parseFloat(def.valor_un ?? def.valor ?? 0) || 0;
        subtotal += qtdLocal * v;
      });
      return isNaN(subtotal) ? 0 : parseFloat(subtotal.toFixed(2));
    }

    return 0;
    // (ramo removido na reorganização)
  };

  // Função para calcular o subtotal do item na impressão baseado nos dados do banco
  const calcularSubtotalItemImpressao = async (item) => {
    // Se temos subtotal_item calculado, usar ele
    if (item.subtotal_item && parseFloat(item.subtotal_item) > 0) {
      return parseFloat(item.subtotal_item);
    }

    // Se temos valor_total no banco, usar ele
    if (item.valor_total && parseFloat(item.valor_total) > 0) {
      return parseFloat(item.valor_total);
    }

    // Se não, calcular baseado no tipo de item
    const quantidade = parseFloat(item.quantidade || 1);

    // Para itens m², calcular área × quantidade × valor unitário
    if (item.tipo_item === 'm2' && item.largura && item.altura) {
      const largura = parseFloat(item.largura);
      const altura = parseFloat(item.altura);
      const area = largura * altura;
      const valorUnitario = parseFloat(item.valor_unitario_m2 || item.valor_unitario || 0);
      return area * quantidade * valorUnitario;
    }

    // Para itens em unidade, multiplicar quantidade × valor unitário
    const valorUnitario = parseFloat(item.valor_unitario || 0);
    return quantidade * valorUnitario;
  };

  // Função auxiliar para obter medidas corretas em metros
  const obterMedidasCorretas = (item) => {
    let alturaExibir = safeParseFloat(item.altura, 0);
    let larguraExibir = safeParseFloat(item.largura, 0);

    // Se os valores parecem estar em centímetros (maior que 10), converter
    if (alturaExibir > 10 || larguraExibir > 10) {
      // Verificar se tem dados de consumo para confirmar que está em cm
      if (item.consumo_largura_peca || item.consumo_altura_peca) {
        const alturaCm = safeParseFloat(item.consumo_altura_peca || item.altura, 0);
        const larguraCm = safeParseFloat(item.consumo_largura_peca || item.largura, 0);
        alturaExibir = alturaCm / 100;
        larguraExibir = larguraCm / 100;
      }
    }

    return { largura: larguraExibir, altura: alturaExibir };
  };

  // Função auxiliar para formatar informações de consumo de material de forma compacta (simplificada)
  const formatarConsumoMaterialParaNotinha = (item) => {
    if (!item) return '';

    // Valores de consumo sempre vêm em centímetros quando presentes
    // Se o valor for menor que 1, já está em metros, caso contrário está em centímetros
    const converterParaCm = (valor) => {
      const numero = safeParseFloat(valor, 0);
      if (numero <= 0) return 0;
      // Se o valor é menor que 1, provavelmente já está em metros, converter para cm
      // Se for maior ou igual a 1, está em centímetros
      if (numero < 1) {
        return numero * 100;
      }
      return numero;
    };

    const consumoLarguraPeca = converterParaCm(item.consumo_largura_peca);
    const consumoAlturaPeca = converterParaCm(item.consumo_altura_peca);
    // Usar consumo_quantidade_solicitada se disponível, senão usar quantidade do item
    const consumoQuantidadeSolicitada = Math.max(0, safeParseFloat(item.consumo_quantidade_solicitada || item.quantidade, 0));
    const consumoValorUnitarioChapa = safeParseFloat(item.consumo_valor_unitario_chapa, 0);
    const consumoCustoUnitario = safeParseFloat(item.consumo_custo_unitario, 0);

    // Verificar se há dados de consumo de material
    const temConsumoMaterial = (consumoLarguraPeca > 0 && consumoAlturaPeca > 0 && consumoQuantidadeSolicitada > 0);

    if (!temConsumoMaterial) {
      return '';
    }

    let linhas = [];

    // Peça - Largura (cm)
    if (consumoLarguraPeca > 0) {
      linhas.push(`Peça - Largura (cm): ${consumoLarguraPeca.toFixed(2).replace('.', ',')}`);
    }

    // Peça - Altura (cm)
    if (consumoAlturaPeca > 0) {
      linhas.push(`Peça - Altura (cm): ${consumoAlturaPeca.toFixed(2).replace('.', ',')}`);
    }

    // Quantidade Solicitada
    if (consumoQuantidadeSolicitada > 0) {
      linhas.push(`Quantidade Solicitada: ${consumoQuantidadeSolicitada.toFixed(0)}`);
    }

    // Valor por m² (R$)
    if (consumoValorUnitarioChapa > 0) {
      linhas.push(`Valor por m² (R$): ${consumoValorUnitarioChapa.toFixed(2).replace('.', ',')}`);
    }

    // Custo unitário por peça
    if (consumoCustoUnitario > 0) {
      linhas.push(`Custo unitário por peça: R$ ${consumoCustoUnitario.toFixed(2).replace('.', ',')}`);
    }

    return linhas.length > 0 ? linhas.join('\n') : '';
  };

  // Helper para resolver a melhor imagem do item (espelha lógica usada na rotina operacional)
  const resolveImagemItem = (item) => {
    let imagemUrl = null;
    let imagemProdutoFallback = null;

    // 1) Arte final anexada diretamente no item
    if (item?.arquivo_item_url) {
      imagemUrl = item.arquivo_item_url;
    }

    // 2) Fallbacks do próprio item e do produto/variação
    imagemProdutoFallback = item?.imagem_url
      || item?.imagem_principal
      || item?.variacao_selecionada?.imagem_url
      || (item?.produto && (item.produto.imagem_principal || item.produto.imagem_url || item.produto.imagem));

    // Debug: verificar se o produto está vindo no item
    if (item?.produto_id && !imagemProdutoFallback) {
      console.log('🔍 [OSDocumentModal] Item sem imagem, verificando produto:', {
        item_id: item.id,
        produto_id: item.produto_id,
        produto_no_item: item?.produto ? 'sim' : 'não',
        produto_imagem: item?.produto?.imagem_principal || 'não tem',
        produtosCadastrados_count: produtosCadastrados?.length || 0
      });
    }

    // 3) Caso ainda não tenha, tentar buscar nos produtos cadastrados
    if (!imagemProdutoFallback && Array.isArray(produtosCadastrados) && item?.produto_id) {
      const prod = produtosCadastrados.find(p => String(p.id) === String(item.produto_id));

      if (prod) {
        let variacaoImg = null;
        if (item?.variacao_selecionada?.id_variacao && Array.isArray(prod.variacoes)) {
          const varMatch = prod.variacoes.find(v => String(v.id_variacao) === String(item.variacao_selecionada.id_variacao));
          variacaoImg = varMatch?.imagem_url || varMatch?.imagem || null;
        }
        imagemProdutoFallback = variacaoImg || prod.imagem_principal || prod.imagem_url || prod.imagem;

        if (imagemProdutoFallback) {
          console.log('✅ [OSDocumentModal] Imagem encontrada nos produtos cadastrados:', {
            produto_id: prod.id,
            imagem: imagemProdutoFallback
          });
        }
      } else {
        console.warn('⚠️ [OSDocumentModal] Produto não encontrado nos produtos cadastrados:', {
          produto_id: item.produto_id,
          produtos_ids: produtosCadastrados.map(p => p.id)
        });
      }
    }

    if (!imagemUrl && imagemProdutoFallback) {
      imagemUrl = imagemProdutoFallback;
    }

    return imagemUrl || null;
  };

  // Cache de imagens resolvidas para evitar múltiplas resoluções por re-render
  const imagensItensResolvidas = useMemo(() => {
    if (!Array.isArray(documento?.itens)) return [];
    console.log('🔄 [OSDocumentModal] Recalculando imagens dos itens:', {
      itens_count: documento.itens.length,
      produtosCadastrados_count: produtosCadastrados?.length || 0,
      itens_com_produto: documento.itens.filter(it => it.produto).length,
      itens_com_produto_id: documento.itens.filter(it => it.produto_id).length
    });
    return documento.itens.map(it => resolveImagemItem(it));
  }, [documento?.itens, produtosCadastrados]);

  // Função para calcular o subtotal do item no modal visual
  const calcularSubtotalItemModal = async (item) => {
    // Se temos subtotal_item calculado no frontend, usar ele
    if (item.subtotal_item && parseFloat(item.subtotal_item) > 0) {
      return parseFloat(item.subtotal_item);
    }

    // Se não, usar valor_total do banco
    if (item.valor_total && parseFloat(item.valor_total) > 0) {
      return parseFloat(item.valor_total);
    }

    // Se não, calcular baseado no valor_unitario
    const quantidade = parseFloat(item.quantidade || 1);
    const valorUnitario = parseFloat(item.valor_unitario_m2 || item.valor_unitario || 0);
    return quantidade * valorUnitario;
  };

  // Cálculos usados na exibição do modal (não impressão)
  const subtotalCalculadoItens = Array.isArray(documento.itens)
    ? documento.itens.reduce((acc, item) => acc + getSubtotalItemSafe(item), 0)
    : 0;

  // Se não há itens ou o subtotal calculado é 0, usar o valor total da OS
  const valorTotalOSModal = parseFloat(documento.valor_total_os || 0);
  const subtotalModal = subtotalCalculadoItens > 0 ? subtotalCalculadoItens : valorTotalOSModal;
  // Quebra dos subtotais por tipo e acabamentos
  let totaisQuebrados;
  if (Array.isArray(documento.itens) && documento.itens.length > 0) {
    totaisQuebrados = documento.itens.reduce(
      (acc, item) => {
        const subtotalItem = getSubtotalItemSafe(item);
        const subtotalAcabamentosItem = getSubtotalAcabamentosSafe(item);

        // Se não conseguiu calcular acabamentos, usar uma proporção baseada no valor total
        let baseSemAcabamentos = subtotalItem;
        if (subtotalAcabamentosItem > 0) {
          baseSemAcabamentos = subtotalItem - subtotalAcabamentosItem;
        }

        // Garantir que não seja negativo
        baseSemAcabamentos = Math.max(0, baseSemAcabamentos);

        if (item?.tipo_item === 'm2') {
          acc.subtotalServicosM2 += baseSemAcabamentos;
        } else if (item?.tipo_item === 'unidade') {
          acc.subtotalProdutosUnidade += baseSemAcabamentos;
        } else {
          // Caso não informado, considerar como serviço m² por padrão
          acc.subtotalServicosM2 += baseSemAcabamentos;
        }
        acc.totalAcabamentos += subtotalAcabamentosItem;
        return acc;
      },
      { subtotalServicosM2: 0, subtotalProdutosUnidade: 0, totalAcabamentos: 0 }
    );
  } else {
    // Se não há itens, usar o valor total da OS como subtotal de serviços
    totaisQuebrados = {
      subtotalServicosM2: valorTotalOSModal,
      subtotalProdutosUnidade: 0,
      totalAcabamentos: 0
    };
  }
  const totalOSSemDescontos =
    totaisQuebrados.subtotalServicosM2 + totaisQuebrados.subtotalProdutosUnidade + totaisQuebrados.totalAcabamentos;
  const descTerceirizadoPercent = parseFloat(documento.desconto_terceirizado_percentual || 0) || 0;
  const descTerceirizadoValorModal = (subtotalModal * descTerceirizadoPercent) / 100;
  const descGeralTipo = documento.desconto_geral_tipo || 'percentual';
  const descGeralInput = parseFloat(documento.desconto_geral_valor || 0) || 0;
  const descGeralCalculadoModal = descGeralTipo === 'percentual'
    ? ((subtotalModal - descTerceirizadoValorModal) * descGeralInput) / 100
    : descGeralInput;
  const freteModal = parseFloat(documento.frete_valor || 0) || 0;
  const totalFinalModal = subtotalModal - descTerceirizadoValorModal - descGeralCalculadoModal + freteModal;

  // Função auxiliar para converter imagem para base64
  const convertImageToBase64 = (url) => {
    return new Promise(async (resolve) => {
      if (!url) {
        resolve('');
        return;
      }

      // Se já for base64, retornar como está
      if (url.startsWith('data:')) {
        resolve(url);
        return;
      }

      // Tentar primeiro com fetch (melhor para CORS)
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = () => {
          console.warn('❌ [Modal] Erro ao ler blob, tentando método alternativo...');
          tryImageMethod();
        };
        reader.readAsDataURL(blob);
        return;
      } catch (error) {
        console.warn('❌ [Modal] Erro no fetch, tentando método alternativo:', error);
        tryImageMethod();
      }

      // Método alternativo usando Image()
      function tryImageMethod() {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
          } catch (error) {
            console.warn('❌ [Modal] Erro ao converter imagem:', error);
            resolve(''); // Retornar vazio em caso de erro
          }
        };

        img.onerror = (error) => {
          console.warn('❌ [Modal] Erro ao carregar imagem via Image():', url, error);
          resolve(''); // Retornar vazio em caso de erro
        };

        // Adicionar timestamp para evitar cache
        const urlWithTimestamp = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
        img.src = urlWithTimestamp;
      }
    });
  };

  const handlePrint = async () => {
    setIsPrinting(true);

    // Abrir uma nova janela com o conteúdo do documento
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Erro", description: "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.", variant: "destructive" });
      setIsPrinting(false);
      return;
    }

    // Estilos para a impressão - replicando exatamente o visual do modal
    const printStyles = `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        margin: 0; 
        padding: 20px; 
        background-color: white;
        color: #1f2937;
      }
      .print-container { 
        max-width: 800px; 
        margin: 0 auto; 
        background-color: white;
      }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start;
        border-bottom: 1px solid #d1d5db; 
        padding-bottom: 15px; 
        margin-bottom: 15px; 
      }
      .logo { 
        max-height: 80px; 
        max-width: 200px; 
        object-fit: contain;
      }
      .company-info { 
        max-width: 60%; 
      }
      .company-name { 
        font-size: 24px; 
        font-weight: bold; 
        margin-bottom: 5px; 
        color: #111827;
      }
      .company-details { 
        font-size: 12px; 
        color: #6b7280; 
        line-height: 1.4;
      }
      .document-title { 
        font-size: 18px; 
        font-weight: bold; 
        margin-bottom: 15px; 
        text-align: center; 
        color: #111827;
      }
      .section { 
        margin-bottom: 20px; 
      }
      .section-box { 
        padding: 16px; 
        border: 1px solid #d1d5db; 
        border-radius: 8px; 
        background-color: #f9fafb; 
        margin-bottom: 20px;
      }
      .section-title { 
        font-weight: 600; 
        border-bottom: 1px solid #e5e7eb; 
        padding-bottom: 5px; 
        margin-bottom: 10px; 
        color: #1f2937;
        display: flex;
        align-items: center;
        font-size: 16px;
      }
      .section-title-icon { 
        margin-right: 8px; 
        color: #3b82f6; 
        width: 20px; 
        height: 20px;
      }
      .section-title-text { 
        margin-left: 8px;
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 15px; 
        background-color: white;
      }
      th { 
        background-color: #f3f4f6; 
        text-align: left; 
        padding: 8px 12px; 
        font-weight: 600;
        color: #374151;
        border-bottom: 1px solid #d1d5db;
      }
      td { 
        padding: 8px 12px; 
        border-bottom: 1px solid #e5e7eb; 
        vertical-align: top;
      }
      tr:nth-child(even) { 
        background-color: #f9fafb; 
      }
      .text-right { 
        text-align: right; 
      }
      .text-center { 
        text-align: center; 
      }
      .font-medium { 
        font-weight: 500; 
      }
      .font-semibold { 
        font-weight: 600; 
      }
      .font-bold { 
        font-weight: 700; 
      }
      .text-gray-800 { 
        color: #1f2937; 
      }
      .text-gray-700 { 
        color: #374151; 
      }
      .text-gray-600 { 
        color: #6b7280; 
      }
      .text-gray-500 { 
        color: #6b7280; 
      }
      .text-primary { 
        color: #3b82f6; 
      }
      .text-blue-600 { 
        color: #2563eb; 
      }
      .text-red-600 { 
        color: #dc2626; 
      }
      .text-green-600 { 
        color: #059669; 
      }
      .border-gray-200 { 
        border-color: #e5e7eb; 
      }
      .border-gray-300 { 
        border-color: #d1d5db; 
      }
      .bg-gray-50 { 
        background-color: #f9fafb; 
      }
      .bg-gray-100 { 
        background-color: #f3f4f6; 
      }
      .rounded-lg { 
        border-radius: 8px; 
      }
      .space-y-2 > * + * { 
        margin-top: 8px; 
      }
      .space-y-3 > * + * { 
        margin-top: 12px; 
      }
      .mb-2 { 
        margin-bottom: 8px; 
      }
      .mb-3 { 
        margin-bottom: 12px; 
      }
      .mb-4 { 
        margin-bottom: 16px; 
      }
      .mb-6 { 
        margin-bottom: 24px; 
      }
      .mt-2 { 
        margin-top: 8px; 
      }
      .mt-3 { 
        margin-top: 12px; 
      }
      .mt-4 { 
        margin-top: 16px; 
      }
      .mt-6 { 
        margin-top: 24px; 
      }
      .pt-2 { 
        padding-top: 8px; 
      }
      .pt-3 { 
        padding-top: 12px; 
      }
      .pt-4 { 
        padding-top: 16px; 
      }
      .pb-1 { 
        padding-bottom: 4px; 
      }
      .pb-2 { 
        padding-bottom: 8px; 
      }
      .pb-3 { 
        padding-bottom: 12px; 
      }
      .px-3 { 
        padding-left: 12px; 
        padding-right: 12px; 
      }
      .py-2 { 
        padding-top: 8px; 
        padding-bottom: 8px; 
      }
      .w-10 { 
        width: 40px; 
      }
      .h-10 { 
        height: 40px; 
      }
      .w-14 { 
        width: 56px; 
      }
      .object-contain { 
        object-fit: contain; 
      }
      .rounded { 
        border-radius: 4px; 
      }
      .text-xs { 
        font-size: 12px; 
      }
      .text-sm { 
        font-size: 14px; 
      }
      .text-base { 
        font-size: 16px; 
      }
      .text-lg { 
        font-size: 18px; 
      }
      .text-2xl { 
        font-size: 24px; 
      }
      .flex { 
        display: flex; 
      }
      .items-center { 
        align-items: center; 
      }
      .justify-between { 
        justify-content: space-between; 
      }
      .border-t { 
        border-top: 1px solid #e5e7eb; 
      }
      .border-b { 
        border-bottom: 1px solid #e5e7eb; 
      }
      .footer { 
        margin-top: 30px; 
        font-size: 12px; 
        color: #6b7280; 
        text-align: center; 
        border-top: 1px solid #e5e7eb; 
        padding-top: 15px; 
      }
      .footer p { 
        margin: 4px 0; 
      }
      @media print { 
        @page {
          size: A4;
          margin: 6mm;
        }
        body { 
          -webkit-print-color-adjust: exact; 
          print-color-adjust: exact; 
          margin: 0 !important;
          padding: 4px !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
          zoom: 0.92;
        } 
        p, h1, h2, h3, h4 {
          margin-top: 2px !important;
          margin-bottom: 2px !important;
          line-height: 1.1 !important;
        }
        .header {
          padding-bottom: 6px !important;
          margin-bottom: 6px !important;
        }
        .company-name {
          font-size: 16px !important;
        }
        .company-details { 
          font-size: 10px !important; 
          line-height: 1.15 !important;
        }
        .document-title {
          font-size: 14px !important;
          margin-bottom: 6px !important;
        }
        .section {
          margin-bottom: 8px !important;
        }
        .section-box {
          padding: 7px !important;
          margin-bottom: 8px !important;
          border-radius: 5px !important;
        }
        th,
        td {
          padding: 4px 6px !important;
          font-size: 10px !important;
        }
        table {
          margin-bottom: 8px !important;
        }
        .section-title {
          font-size: 13px !important;
          margin-bottom: 6px !important;
          padding-bottom: 3px !important;
        }
        .section-title-icon {
          width: 14px !important;
          height: 14px !important;
          margin-right: 4px !important;
        }
        .section-title-text {
          margin-left: 4px !important;
        }
        .text-xs { font-size: 9px !important; }
        .text-sm { font-size: 10px !important; }
        .text-base { font-size: 11px !important; }
        .text-lg { font-size: 12px !important; }
        .text-2xl { font-size: 15px !important; }
        .space-y-2 > * + * { margin-top: 4px !important; }
        .space-y-3 > * + * { margin-top: 6px !important; }
        .mt-1, .mt-2, .mt-3, .mt-4, .mt-6 { margin-top: 4px !important; }
        .mb-2, .mb-3, .mb-4, .mb-6 { margin-bottom: 6px !important; }
        .pt-2, .pt-3, .pt-4 { padding-top: 4px !important; }
        .pb-1, .pb-2, .pb-3 { padding-bottom: 4px !important; }
        .py-2 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .px-3 { padding-left: 6px !important; padding-right: 6px !important; }
        .w-10 { width: 28px !important; }
        .h-10 { height: 28px !important; }
        .w-14 { width: 38px !important; }
        .logo { max-height: 54px !important; max-width: 150px !important; }
        .footer {
          margin-top: 8px !important;
          padding-top: 6px !important;
          font-size: 9px !important;
        }
        .footer p { margin: 1px 0 !important; }
        .print-container { 
          box-shadow: none; 
          max-width: 100% !important;
        }
      }
    `;

    // Conteúdo completo do documento - replicando exatamente o visual do modal
    const os = documento;
    const previsaoEntregaFormatada = formatPrevisaoEntrega(os);
    const tituloModal = os.status_os === 'Finalizada' ? 'Ordem de Serviço Finalizada' : 'Orçamento de Serviço';

    // Calcular subtotais dos itens dinamicamente e pré-carregar imagens
    const itensComSubtotais = [];
    let imagensConvertidas = 0;
    let imagensFalhadas = 0;

    for (const item of (os.itens || [])) {
      const subtotalCalculado = await calcularSubtotalItemImpressao(item);

      // Pré-carregar e converter imagem para base64
      const imagemResolvida = resolveImagemItem(item);
      let imagemBase64 = '';
      if (imagemResolvida) {
        const imagemUrl = getImageUrl(imagemResolvida);
        imagemBase64 = await convertImageToBase64(imagemUrl);
        if (imagemBase64 && imagemBase64.startsWith('data:')) {
          imagensConvertidas++;
        } else {
          imagensFalhadas++;
          console.warn(`❌ [Modal] Falha ao converter imagem do item (${imagensFalhadas})`);
        }
      }

      itensComSubtotais.push({ ...item, subtotalCalculado, imagemBase64 });
    }


    // Converter logo para base64 também
    let logoBase64 = '';
    if (logoUrl) {
      const logoUrlProcessada = getImageUrl(logoUrl);
      logoBase64 = await convertImageToBase64(logoUrlProcessada);
      if (logoBase64 && logoBase64.startsWith('data:')) {
        // Logo convertida com sucesso
      } else {
        console.warn('❌ [Modal] Falha ao converter logo');
      }
    } else {
      // Sem logo para converter
    }

    const itensHTML = itensComSubtotais.map(item => {
      let selecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : null;
      if (!Array.isArray(selecionados)) {
        if (Array.isArray(item.acabamentos)) {
          selecionados = item.acabamentos;
        } else if (typeof item.acabamentos === 'string') {
          try { selecionados = JSON.parse(item.acabamentos); } catch { selecionados = []; }
        } else {
          selecionados = [];
        }
      }
      const nomesAcab = Array.isArray(selecionados) ? selecionados.map(a => a?.nome).filter(Boolean) : [];
      const linhaAcab = nomesAcab.length > 0 ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Acabamentos: ${nomesAcab.join(', ')}</div>` : '';
      // Tratar detalhes como array ou string
      let detalhesTexto = '';
      if (item.detalhes) {
        if (Array.isArray(item.detalhes)) {
          detalhesTexto = item.detalhes.map(d => decodeUnicodeEscapes(d)).join(' ');
        } else {
          detalhesTexto = decodeUnicodeEscapes(item.detalhes);
        }
      }
      const linhaObs = detalhesTexto ? `<div style="font-size: 11px; color: #2563eb; margin-top: 2px; font-style: italic;">Obs: ${detalhesTexto}</div>` : '';

      // Informações de consumo de material
      const consumoMaterialTexto = formatarConsumoMaterialParaNotinha(item);
      const linhaConsumoMaterial = consumoMaterialTexto ? `<div style="font-size: 11px; color: #059669; margin-top: 2px; white-space: pre-line;">${consumoMaterialTexto}</div>` : '';

      return `
      <tr>
        <td>
          ${item.imagemBase64 ?
          `<img src="${item.imagemBase64}" alt="${item.nome_produto || 'Produto'}" style="width: 40px; height: 40px; object-fit: contain; margin-right: 10px;">` :
          ''
        }
          <div><strong>${item.nome_servico_produto || item.nome_produto || 'Item sem nome'}</strong></div>
          ${linhaAcab}
          ${linhaConsumoMaterial}
          ${linhaObs}
        </td>
        <td class="text-right">${item.quantidade || 1}</td>
        <td class="text-right">${formatCurrency(item.valor_unitario_m2 || item.valor_unitario)}</td>
        <td class="text-right">${formatCurrency(item.subtotalCalculado)}</td>
      </tr>
    `;
    }).join('');

    const pagamentosHTML = os.pagamentos && Array.isArray(os.pagamentos) ? os.pagamentos.map(pag => `
      <div>
        <strong>${pag.metodo || 'N/A'}</strong>: ${formatCurrency(pag.valor || 0)}
      </div>
    `).join('') : '';

    // Calcular valores
    const valorTotal = parseFloat(os.valor_total_os || 0);
    const valorPago = (os.pagamentos || []).reduce((sum, p) => sum + parseFloat(p.valor || 0), 0);
    const saldoPendente = valorTotal - valorPago;

    // Calcular subtotal dos itens (sem descontos) - usando cálculo dinâmico
    const subtotalItens = itensComSubtotais.reduce((sum, item) => sum + item.subtotalCalculado, 0);

    // Verificar se há desconto terceirizado
    const descontoTerceirizadoPercentual = parseFloat(os.desconto_terceirizado_percentual || 0);
    const descontoTerceirizadoValor = (subtotalItens * descontoTerceirizadoPercentual) / 100;
    const temDescontoTerceirizado = descontoTerceirizadoPercentual > 0;

    // Verificar se há desconto geral
    const descontoGeralTipo = os.desconto_geral_tipo || 'percentual';
    const descontoGeralValor = parseFloat(os.desconto_geral_valor || 0);
    const temDescontoGeral = descontoGeralValor > 0;

    // Calcular desconto geral
    let descontoGeralCalculado = 0;
    if (temDescontoGeral) {
      if (descontoGeralTipo === 'percentual') {
        const valorAposTerceirizado = subtotalItens - descontoTerceirizadoValor;
        descontoGeralCalculado = (valorAposTerceirizado * descontoGeralValor) / 100;
      } else {
        descontoGeralCalculado = descontoGeralValor;
      }
    }

    // Verificar se há frete
    const freteValor = parseFloat(os.frete_valor || 0);
    const temFrete = freteValor > 0;

    // Calcular valor total final considerando todos os descontos e frete
    const valorTotalCalculado = subtotalItens - descontoTerceirizadoValor - descontoGeralCalculado + freteValor;

    // Conteúdo completo do documento
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tituloModal} - OS ${getDisplayId(os)}</title>
        <meta charset="UTF-8">
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="print-container">
          <header class="header">
            <div class="company-info">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo">` : '<div class="logo bg-gray-200 flex items-center justify-center text-gray-500 text-sm" style="height: 80px; width: 200px;">LOGO EMPRESA</div>'}
              <h2 class="company-name">${empresaSettings.nome_fantasia || empresaSettings.nomeFantasia || nomeEmpresa}</h2>
              <div class="company-details">
                ${empresaSettings.razao_social || empresaSettings.razaoSocial ? `<p>${empresaSettings.razao_social || empresaSettings.razaoSocial}</p>` : ''}
                ${empresaSettings.cnpj ? `<p>CNPJ: ${empresaSettings.cnpj}</p>` : ''}
                <p>
                  ${[
                    empresaSettings.telefone || empresaSettings.whatsapp ? `Tel/Zap: ${empresaSettings.telefone || empresaSettings.whatsapp}` : null,
                    empresaSettings.email ? `Email: ${empresaSettings.email}` : null
                  ].filter(Boolean).join(' | ')}
                </p>
                ${empresaSettings.endereco_completo || empresaSettings.enderecoCompleto ? `<p>${empresaSettings.endereco_completo || empresaSettings.enderecoCompleto}</p>` : ''}
              </div>
            </div>
            <div class="text-right">
              <p class="font-semibold text-lg"><span class="font-bold text-gray-900">OS Nº ${getDisplayId(os)}</span></p>
              <p class="text-sm">Data Emissão: ${format(new Date(os.data_criacao), 'dd/MM/yyyy HH:mm')}</p>
              ${os.data_finalizacao_os ? `<p class="text-sm">Data Finalização: ${format(new Date(os.data_finalizacao_os), 'dd/MM/yyyy HH:mm')}</p>` : ''}
              <p class="text-sm mt-1">Atendente: <span class="font-medium text-gray-700">${(() => {
        const nomeAtendente = os.vendedor_nome || vendedorAtual?.nome || 'Não informado';
        // Log removido para evitar problemas de performance
        return nomeAtendente;
      })()}</span></p>
              ${previsaoEntregaFormatada ? `<p class="text-sm mt-1">Previsão Entrega: <span class="font-medium text-gray-700">${previsaoEntregaFormatada}</span></p>` : ''}
              ${os.maquina_impressao_id ? `<p class="text-sm mt-1">Máquina: <span class="font-medium text-gray-700">${Array.isArray(maquinas) && maquinas.find(m => m.id === os.maquina_impressao_id)?.nome || 'N/A'}</span></p>` : ''}
            </div>
          </header>

          <div class="section-box">
            <h3 class="section-title">
              <span class="section-title-icon">👤</span>
              <span class="section-title-text">Dados do Cliente</span>
            </h3>
            <p class="font-medium text-gray-900">${os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual}</p>
            <p class="text-sm text-gray-600">CPF/CNPJ: ${os.cliente?.cpf_cnpj || os.cliente_info?.cpf_cnpj || 'Não informado'}</p>
            <p class="text-sm text-gray-600">Telefone: ${os.cliente?.telefone_principal || os.cliente?.telefone || os.cliente_info?.telefone_principal || os.cliente_info?.telefone || 'Não informado'}</p>
            <p class="text-sm text-gray-600">Email: ${os.cliente?.email || os.cliente_info?.email || 'Não informado'}</p>
            ${temDescontoTerceirizado ? `<p class="text-sm text-blue-600 font-semibold mt-2">🏢 Cliente Terceirizado - Desconto de ${descontoTerceirizadoPercentual}% aplicado</p>` : ''}
          </div>

          <div class="section-box">
            <h3 class="section-title">
              <span class="section-title-icon">👤</span>
              <span class="section-title-text">Vendedor/Atendente</span>
            </h3>
            <p class="font-medium text-gray-900 text-lg">${(() => {
        const nomeVendedor = os.vendedor_nome || vendedorAtual?.nome || 'Não informado';
        // Log removido para evitar problemas de performance
        return nomeVendedor;
      })()}</p>
            ${vendedorAtual?.email ? `<p class="text-sm text-gray-600 mt-1">Email: ${vendedorAtual.email}</p>` : ''}
            ${vendedorAtual?.telefone ? `<p class="text-sm text-gray-600">Telefone: ${vendedorAtual.telefone}</p>` : ''}
          </div>

          <div class="section">
            <h3 class="section-title">
              <span class="section-title-icon">🛍️</span>
              <span class="section-title-text">Itens do Serviço/Pedido</span>
            </h3>
            <table>
              <thead class="bg-gray-100">
                <tr class="border-b border-gray-300">
                  <th class="w-14">Arte</th>
                  <th>Produto/Serviço</th>
                  <th class="text-center">Qtd.</th>
                  <th class="text-right">Valor Unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itensComSubtotais.map((item, index) => {
        // Resolver lista de acabamentos para exibição (aceita \`acabamentos_selecionados\` ou \`acabamentos\` string/array)
        let selecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : null;
        if (!Array.isArray(selecionados)) {
          if (Array.isArray(item.acabamentos)) {
            selecionados = item.acabamentos;
          } else if (typeof item.acabamentos === 'string') {
            try { selecionados = JSON.parse(item.acabamentos); } catch { selecionados = []; }
          } else {
            selecionados = [];
          }
        }
        const nomesAcab = Array.isArray(selecionados) ? selecionados.map(a => {
          if (a?.nome) return a.nome;
          const def = Array.isArray(acabamentosConfigState) ? acabamentosConfigState.find(d => String(d.id) === String(a?.id)) : null;
          return def?.nome_acabamento || null;
        }).filter(Boolean) : [];
        return `
                  <tr class="border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}"}>
                    <td class="py-2 px-3">
                      ${item.imagemBase64 ?
            `<img src="${item.imagemBase64}" alt="${item.nome_servico_produto || item.nome_produto || 'Produto'}" class="w-10 h-10 object-contain rounded">` :
            '<span class="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">📦</span>'
          }
                    </td>
                    <td class="py-2 px-3">
                      <span class="font-medium text-gray-800">${item.nome_servico_produto || item.nome_produto}</span>
                      ${item.tipo_item === 'm2' ? (() => {
            const medidas = obterMedidasCorretas(item);
            return `<span class="text-xs text-gray-500 ml-1">(${medidas.largura.toFixed(2).replace('.', ',')}m x ${medidas.altura.toFixed(2).replace('.', ',')}m)</span>`;
          })() : ''}
                      ${nomesAcab.length > 0 ? `<span class="block text-xs text-gray-500 mt-0.5">Acabamentos: ${nomesAcab.join(', ')}</span>` : ''}
                      ${(() => {
            const consumoMaterialTexto = formatarConsumoMaterialParaNotinha(item);
            return consumoMaterialTexto ? `<span class="block text-xs text-green-600 mt-0.5" style="white-space: pre-line;">${consumoMaterialTexto}</span>` : '';
          })()}
                      ${(() => {
            let detalhesTexto = '';
            if (item.detalhes) {
              if (Array.isArray(item.detalhes)) {
                detalhesTexto = item.detalhes.map(d => decodeUnicodeEscapes(d)).join(' ');
              } else {
                detalhesTexto = decodeUnicodeEscapes(item.detalhes);
              }
            }
            return detalhesTexto ? `<span class="block text-xs text-blue-600 italic mt-0.5">Obs: ${detalhesTexto}</span>` : '';
          })()}
                      ${item.variacao_selecionada?.nome ? `<span class="block text-xs text-gray-500 mt-0.5">Variação: ${item.variacao_selecionada.nome}</span>` : ''}
                    </td>
                    <td class="text-center py-2 px-3">${item.quantidade}${item.tipo_item === 'm2' ? (() => {
            const medidas = obterMedidasCorretas(item);
            const areaTotal = medidas.altura * medidas.largura * parseInt(item.quantidade || 1);
            return ` (${areaTotal.toFixed(2).replace('.', ',')}m²)`;
          })() : ''}</td>
                    <td class="text-right py-2 px-3">${formatCurrency(parseFloat(item.valor_unitario_m2 || item.valor_unitario || 0))}</td>
                    <td class="text-right py-2 px-3 font-medium">${formatCurrency(item.subtotalCalculado)}</td>
                  </tr>
                `;
      }).join('')}
              </tbody>
            </table>
          </div>

          <div class="section-box">
            <h3 class="section-title">
              <span class="section-title-icon">%</span>
              <span class="section-title-text">Resumo de Valores</span>
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-gray-700">
                <span>Subtotal dos Itens:</span>
                <span class="font-medium">${formatCurrency(subtotalItens)}</span>
              </div>
              ${temDescontoTerceirizado ? `
                <div class="flex justify-between text-blue-600">
                  <span>🏢 Desconto Terceirizado (${descontoTerceirizadoPercentual}%):</span>
                  <span class="font-medium">- ${formatCurrency(descontoTerceirizadoValor)}</span>
                </div>
              ` : ''}
              ${temDescontoGeral ? `
                <div class="flex justify-between text-red-600">
                  <span>🏷️ Desconto Geral ${descontoGeralTipo === 'percentual' ? `(${descontoGeralValor}%)` : '(Valor Fixo)'}:</span>
                  <span class="font-medium">- ${formatCurrency(descontoGeralCalculado)}</span>
                </div>
              ` : ''}
              ${temFrete ? `
                <div class="flex justify-between text-green-600">
                  <span>🚚 Frete:</span>
                  <span class="font-medium">+ ${formatCurrency(freteValor)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-2 text-gray-900">
                <span>VALOR TOTAL:</span>
                <span>${formatCurrency(valorTotalCalculado)}</span>
              </div>
            </div>
          </div>

          ${!isOrcamento && os.pagamentos && os.pagamentos.length > 0 ? `
            <div class="section-box">
              <h3 class="section-title">
                <span class="section-title-icon">💳</span>
                <span class="section-title-text">Detalhes do Pagamento</span>
              </h3>
              ${os.pagamentos.map((p, i) => `
                <div class="text-sm mb-2 pb-2 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
                  <div class="flex items-center justify-between">
                    <span class="font-medium flex items-center">${formaPagamentoIcones[p.metodo] || '💸'} ${p.metodo}</span>
                    <span class="font-semibold">${formatCurrency(p.valorFinal || p.valor)}</span>
                  </div>
                  ${p.maquinaInfo ? `<p class="text-xs text-gray-500 ml-6">Máquina: ${p.maquinaInfo.nome}</p>` : ''}
                  ${p.taxaInfo ? `
                    <div class="text-xs text-gray-500 ml-6">
                      <p>Parcelas: ${p.parcelas}x (Taxa: ${parseFloat(p.taxaInfo.valor).toFixed(2).replace('.', ',')}%)</p>
                      <p>Valor Original: ${formatCurrency(p.valorOriginal)} | Taxa: ${formatCurrency(parseFloat(p.valorFinal || p.valor) - parseFloat(p.valorOriginal || 0))}</p>
                    </div>
                  ` : ''}
                  ${p.metodo === 'Pix' && p.contaBancariaId && contasBancarias.length > 0 ? `<p class="text-xs text-gray-500 ml-6">Conta PIX: ${Array.isArray(contasBancarias) ? contasBancarias.find(c => c.id === p.contaBancariaId)?.nomeBanco || 'N/A' : 'N/A'} (${Array.isArray(contasBancarias) ? contasBancarias.find(c => c.id === p.contaBancariaId)?.chavePix || 'N/A' : 'N/A'})</p>` : ''}
                </div>
              `).join('')}
              <div class="mt-3 pt-2 border-t border-gray-300">
                <div class="flex justify-between text-sm font-medium text-gray-700">
                  <span>Total Pago:</span>
                  <span>${formatCurrency(valorPago)}</span>
                </div>
                ${exibirTaxas && totalTaxasCartao > 0.009 ? `
                  <div class="flex justify-between text-sm font-medium text-blue-600 mt-1">
                    <span>Taxas de Cartão:</span>
                    <span>${formatCurrency(totalTaxasCartao)}</span>
                  </div>
                ` : ''}
                ${saldoPendente > 0.009 ? `
                  <div class="flex justify-between text-sm font-bold text-red-600 mt-1">
                    <span>VALOR PENDENTE:</span>
                    <span>${formatCurrency(saldoPendente)}</span>
                  </div>
                ` : ''}
                ${troco > 0.009 ? `
                  <div class="flex justify-between text-sm font-bold text-green-600 mt-1">
                    <span>TROCO:</span>
                    <span>${formatCurrency(troco)}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${os.observacoes_gerais_os ? `
            <div class="section pt-3 border-t border-gray-300 mt-4">
              <h3 class="font-semibold text-gray-800 mb-1">ℹ️ Observações da OS:</h3>
              <p class="text-sm whitespace-pre-wrap text-gray-600">${os.observacoes_gerais_os}</p>
            </div>
          ` : ''}

          ${os.observacoes_cliente_para_nota ? `
            <div class="section pt-3 border-t border-gray-300 mt-4">
              <h3 class="font-semibold text-gray-800 mb-1">ℹ️ Observações do Cliente (Nota):</h3>
              <p class="text-sm whitespace-pre-wrap text-gray-600">${os.observacoes_cliente_para_nota}</p>
            </div>
          ` : ''}

          <footer class="footer">
            <p>${empresaSettings.mensagemPersonalizadaRodape || 'Obrigado pela preferência!'}</p>
            <p>Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
          </footer>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    // Escrever o conteúdo na janela e imprimir
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Quando a impressão for concluída ou cancelada
    printWindow.onafterprint = () => {
      setIsPrinting(false);
    };

    // Se algo der errado, garantir que o estado de impressão seja resetado
    setTimeout(() => {
      setIsPrinting(false);
    }, 5000);
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Primeiro tentar com html2canvas se o documentRef estiver disponível
      if (documentRef?.current) {
        try {
          await generatePdfFromElement(documentRef.current, `OS_${documento?.id || 'documento'}.pdf`);
          toast({ title: "PDF Gerado", description: `O PDF da OS foi baixado.` });
          return;
        } catch (error) {
          console.error("Erro ao gerar PDF com html2canvas:", error);
        }
      }

      // Se html2canvas falhar ou documentRef não estiver disponível, usar PDF baseado em texto
      // Usar empresaSettings já carregados no estado

      await generateTextBasedPdf(documento, empresaSettings, `OS_${documento?.id || 'documento'}.pdf`, logoUrl);
      toast({
        title: "PDF Gerado (Modo Alternativo)",
        description: `O PDF da OS foi baixado usando modo alternativo.`
      });

    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        title: "Erro ao Gerar PDF",
        description: error.message || "Ocorreu um problema ao tentar gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const previsaoEntregaDocumento = formatPrevisaoEntrega(documento);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{tituloModal} - {getDisplayId(documento)}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="p-8 bg-white text-gray-800 printable-content font-sans" ref={documentRef}>

            <header className="flex justify-between items-start mb-6 pb-4 border-b border-gray-300">
              <div className="max-w-[60%]">
                {logoUrl ?
                  <img src={getImageUrl(logoUrl)} alt="Logo Empresa" className="h-20 mb-3 object-contain" />
                  : <div className="h-20 w-48 bg-gray-200 flex items-center justify-center text-gray-500 mb-3 text-sm">LOGO EMPRESA</div>
                }
                <h2 className="text-2xl font-bold text-gray-900">{empresaSettings.nome_fantasia || empresaSettings.nomeFantasia || nomeEmpresa}</h2>
                <p className="text-xs text-gray-600">{empresaSettings.razao_social || empresaSettings.razaoSocial}</p>
                {empresaSettings.cnpj && <p className="text-xs text-gray-600">CNPJ: {empresaSettings.cnpj}</p>}
                {(empresaSettings.telefone || empresaSettings.email) && (
                  <p className="text-xs text-gray-600">
                    {empresaSettings.telefone && `Tel: ${empresaSettings.telefone}`}
                    {empresaSettings.telefone && empresaSettings.email && ' | '}
                    {empresaSettings.email && `Email: ${empresaSettings.email}`}
                  </p>
                )}
                <p className="text-xs text-gray-600">{empresaSettings.endereco_completo || empresaSettings.enderecoCompleto}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-lg">{idLabel} <span className="font-bold text-gray-900">{getDisplayId(documento)}</span></p>
                <p className="text-sm">Data Emissão: {format(new Date(documento.data_criacao), 'dd/MM/yyyy HH:mm')}</p>
                {documento.data_finalizacao_os && <p className="text-sm">Data Finalização: {format(new Date(documento.data_finalizacao_os), 'dd/MM/yyyy HH:mm')}</p>}
                <p className="text-sm mt-1">Atendente: <span className="font-medium text-gray-700">{(() => {
                  const nomeAtendente = documento.vendedor_nome || vendedorAtual?.nome || 'Não informado';
                  // Log removido para evitar loop infinito
                  return nomeAtendente;
                })()}</span></p>
                {previsaoEntregaDocumento && <p className="text-sm mt-1">Previsão Entrega: <span className="font-medium text-gray-700">{previsaoEntregaDocumento}</span></p>}
                {documento.maquina_impressao_id && <p className="text-sm mt-1">Máquina: <span className="font-medium text-gray-700">{Array.isArray(maquinas) && maquinas.find(m => m.id === documento.maquina_impressao_id)?.nome || 'N/A'}</span></p>}
              </div>
            </header>

            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center"><UserCircle size={20} className="mr-2 text-primary" />Dados do Cliente</h3>
              <p className="font-medium text-gray-900">{documento.cliente?.nome || documento.cliente?.nome_completo || documento.cliente_info?.nome_completo || documento.cliente_info?.nome || documento.cliente_nome_manual}</p>
              <p className="text-sm text-gray-600">CPF/CNPJ: {documento.cliente?.cpf_cnpj || documento.cliente_info?.cpf_cnpj || 'Não informado'}</p>
              <p className="text-sm text-gray-600">Telefone: {documento.cliente?.telefone_principal || documento.cliente?.telefone || documento.cliente_info?.telefone_principal || documento.cliente_info?.telefone || 'Não informado'}</p>
              <p className="text-sm text-gray-600">Email: {documento.cliente?.email || documento.cliente_info?.email || 'Não informado'}</p>
              {parseFloat(documento.desconto_terceirizado_percentual || 0) > 0 && (
                <p className="text-sm text-blue-600 font-semibold mt-2 flex items-center">
                  🏢 Cliente Terceirizado - Desconto de {parseFloat(documento.desconto_terceirizado_percentual || 0).toFixed(2).replace('.', ',')}% aplicado
                </p>
              )}
            </div>

            {/* Card do Vendedor */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <UserCircle size={20} className="mr-2 text-blue-600" />
                Vendedor/Atendente
              </h3>
              <p className="font-medium text-gray-900 text-lg">
                {(() => {
                  const nomeVendedor = documento.vendedor_nome || vendedorAtual?.nome || 'Não informado';
                  // Log removido para evitar loop infinito
                  return nomeVendedor;
                })()}
              </p>
              {vendedorAtual?.email && (
                <p className="text-sm text-gray-600 mt-1">Email: {vendedorAtual.email}</p>
              )}
              {vendedorAtual?.telefone && (
                <p className="text-sm text-gray-600">Telefone: {vendedorAtual.telefone}</p>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2 pb-1 border-b border-gray-300 flex items-center"><ShoppingBag size={20} className="mr-2 text-primary" />Itens do Serviço/Pedido</h3>
              <table className="w-full text-sm mb-4">
                <thead className="bg-gray-100">
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-3 font-semibold text-gray-700 w-14">Arte</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-700">Produto/Serviço</th>
                    <th className="text-center py-2 px-3 font-semibold text-gray-700">Qtd.</th>
                    {/* <th className="text-right py-2 px-3 font-semibold text-gray-700">Valor Unit.</th> */}
                    <th className="text-right py-2 px-3 font-semibold text-gray-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {documento.itens && Array.isArray(documento.itens) && documento.itens.map((item, index) => (
                    <tr key={item.id_item_os || index} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-2 px-3">
                        {(() => {
                          const imgPath = imagensItensResolvidas[index];
                          if (!imgPath) return <PackageIcon size={24} className="text-gray-400 mx-auto" />;
                          const imgSrc = getImageUrl(imgPath);
                          return (
                            <img
                              src={imgSrc}
                              alt={item.nome_servico_produto || item.nome_produto || "Arte"}
                              className="w-10 h-10 object-contain rounded"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-10 h-10 flex items-center justify-center bg-gray-100 rounded';
                                fallback.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                                e.target.parentElement.appendChild(fallback);
                              }}
                            />
                          );
                        })()}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-gray-800">{item.nome_servico_produto || item.nome_produto}</span>
                        {item.tipo_item === 'm2' && (() => {
                          // Se tem dados de consumo, usar os valores convertidos corretamente
                          // Caso contrário, usar os valores diretos (já em metros)
                          let alturaExibir = safeParseFloat(item.altura, 0);
                          let larguraExibir = safeParseFloat(item.largura, 0);

                          // Se os valores parecem estar em centímetros (maior que 10), converter
                          if (alturaExibir > 10 || larguraExibir > 10) {
                            // Verificar se tem dados de consumo para confirmar que está em cm
                            if (item.consumo_largura_peca || item.consumo_altura_peca) {
                              const alturaCm = safeParseFloat(item.consumo_altura_peca || item.altura, 0);
                              const larguraCm = safeParseFloat(item.consumo_largura_peca || item.largura, 0);
                              alturaExibir = alturaCm / 100;
                              larguraExibir = larguraCm / 100;
                            }
                          }

                          return <span className="text-xs text-gray-500 ml-1">({larguraExibir.toFixed(2).replace('.', ',')}m x {alturaExibir.toFixed(2).replace('.', ',')}m)</span>;
                        })()}
                        {(() => {
                          // Resolver lista de acabamentos para exibição (aceita `acabamentos_selecionados` ou `acabamentos` string/array)
                          let selecionados = Array.isArray(item.acabamentos_selecionados) ? item.acabamentos_selecionados : null;
                          if (!Array.isArray(selecionados)) {
                            if (Array.isArray(item.acabamentos)) {
                              selecionados = item.acabamentos;
                            } else if (typeof item.acabamentos === 'string') {
                              try { selecionados = JSON.parse(item.acabamentos); } catch { selecionados = []; }
                            } else {
                              selecionados = [];
                            }
                          }
                          const nomesAcab = Array.isArray(selecionados) ? selecionados.map(a => {
                            if (a?.nome) return a.nome;
                            const def = Array.isArray(acabamentosConfigState) ? acabamentosConfigState.find(d => String(d.id) === String(a?.id)) : null;
                            return def?.nome_acabamento || null;
                          }).filter(Boolean) : [];
                          return nomesAcab.length > 0 ? (
                            <span className="block text-xs text-gray-500 mt-0.5">Acabamentos: {nomesAcab.join(', ')}</span>
                          ) : null;
                        })()}
                        {(() => {
                          const consumoMaterialTexto = formatarConsumoMaterialParaNotinha(item);
                          return consumoMaterialTexto ? (
                            <span className="block text-xs text-green-600 mt-0.5 whitespace-pre-line">{consumoMaterialTexto}</span>
                          ) : null;
                        })()}
                        {(() => {
                          let detalhesTexto = '';
                          if (item.detalhes) {
                            if (Array.isArray(item.detalhes)) {
                              detalhesTexto = item.detalhes.map(d => decodeUnicodeEscapes(d)).join(' ');
                            } else {
                              detalhesTexto = decodeUnicodeEscapes(item.detalhes);
                            }
                          }
                          return detalhesTexto ? (
                            <span className="block text-xs text-blue-600 italic mt-0.5">Obs: {detalhesTexto}</span>
                          ) : null;
                        })()}
                        {item.variacao_selecionada?.nome && (
                          <span className="block text-xs text-gray-500 mt-0.5">Variação: {item.variacao_selecionada.nome}</span>
                        )}
                      </td>
                      <td className="text-center py-2 px-3">{item.quantidade}{item.tipo_item === 'm2' ? (() => {
                        // Calcular área usando os mesmos valores corrigidos
                        let alturaArea = safeParseFloat(item.altura, 0);
                        let larguraArea = safeParseFloat(item.largura, 0);

                        // Se os valores parecem estar em centímetros (maior que 10), converter
                        if (alturaArea > 10 || larguraArea > 10) {
                          if (item.consumo_largura_peca || item.consumo_altura_peca) {
                            const alturaCm = safeParseFloat(item.consumo_altura_peca || item.altura, 0);
                            const larguraCm = safeParseFloat(item.consumo_largura_peca || item.largura, 0);
                            alturaArea = alturaCm / 100;
                            larguraArea = larguraCm / 100;
                          }
                        }

                        const areaTotal = alturaArea * larguraArea * parseInt(item.quantidade || 1);
                        return ` (${areaTotal.toFixed(2).replace('.', ',')}m²)`;
                      })() : ''}</td>
                      {/* <td className="text-right py-2 px-3">{formatCurrency(parseFloat(item.valor_unitario_m2 || item.valor_unitario || 0))}</td> */}
                      <td className="text-right py-2 px-3 font-medium">{formatCurrency(getSubtotalItemSafe(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center"><Percent size={20} className="mr-2 text-primary" />Resumo Financeiro</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal Serviços (m²):</span>
                  <span className="font-medium">{formatCurrency(totaisQuebrados.subtotalServicosM2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal Produtos (Un):</span>
                  <span className="font-medium">{formatCurrency(totaisQuebrados.subtotalProdutosUnidade)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Total Acabamentos:</span>
                  <span className="font-medium">{formatCurrency(totaisQuebrados.totalAcabamentos)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Total OS (sem desc.):</span>
                  <span className="font-semibold">{formatCurrency(totalOSSemDescontos)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center"><span className="mr-2">🚚</span>Frete:</span>
                  <span className="font-medium">{formatCurrency(freteModal)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center"><span className="mr-2">🏷️</span>Desconto Geral {documento.desconto_geral_tipo === 'percentual' ? `(${(parseFloat(documento.desconto_geral_valor || 0) || 0).toFixed(2).replace('.', ',')}%)` : '(Valor Fixo)'}:</span>
                  <span className="font-medium">- {formatCurrency(descGeralCalculadoModal)}</span>
                </div>
                {parseFloat(documento.desconto_terceirizado_percentual || 0) > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span className="flex items-center"><span className="mr-2">🏢</span>Desconto Terceirizado ({parseFloat(documento.desconto_terceirizado_percentual || 0).toFixed(2).replace('.', ',')}%):</span>
                    <span className="font-medium">- {formatCurrency(descTerceirizadoValorModal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2 mt-2 text-gray-900">
                  <span>TOTAL FINAL:</span>
                  <span>{formatCurrency(totalFinalModal)}</span>
                </div>
                {!isOrcamento && (
                  <div className="mt-3 pt-2 border-t border-gray-300">
                    <div className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Total Pago:</span>
                      <span>{formatCurrency(totalPago)}</span>
                    </div>
                    {exibirTaxas && totalTaxasCartao > 0.009 && (
                      <div className="flex justify-between text-sm font-medium text-blue-600 mt-1">
                        <span>Taxas de Cartão:</span>
                        <span>{formatCurrency(totalTaxasCartao)}</span>
                      </div>
                    )}
                    {saldoPendente > 0.009 && (
                      <div className="flex justify-between text-sm font-bold text-red-600 mt-1">
                        <span>Valor Pendente:</span>
                        <span>{formatCurrency(saldoPendente)}</span>
                      </div>
                    )}
                    {troco > 0.009 && (
                      <div className="flex justify-between text-sm font-bold text-green-600 mt-1">
                        <span>Troco:</span>
                        <span>{formatCurrency(troco)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {!isOrcamento && documento.pagamentos && documento.pagamentos.length > 0 && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center"><Wallet size={20} className="mr-2 text-primary" />Detalhes do Pagamento</h3>
                {documento.pagamentos.map((p, i) => (
                  <div key={i} className="text-sm mb-2 pb-2 border-b border-gray-200 last:border-b-0 last:pb-0 last:mb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center">{formaPagamentoIcones[p.metodo] || '💸'} {p.metodo}</span>
                      <span className="font-semibold">{formatCurrency(p.valorFinal || p.valor)}</span>
                    </div>
                    {p.maquinaInfo && <p className="text-xs text-gray-500 ml-6">Máquina: {p.maquinaInfo.nome}</p>}
                    {p.taxaInfo && (
                      <div className="text-xs text-gray-500 ml-6">
                        <p>Parcelas: {p.parcelas}x (Taxa: {parseFloat(p.taxaInfo.valor).toFixed(2).replace('.', ',')}%)</p>
                        <p>Valor Original: {formatCurrency(p.valorOriginal)} | Taxa: {formatCurrency(parseFloat(p.valorFinal || p.valor) - parseFloat(p.valorOriginal || 0))}</p>
                      </div>
                    )}
                    {p.metodo === 'Pix' && p.contaBancariaId && contasBancarias.length > 0 && (
                      <p className="text-xs text-gray-500 ml-6">Conta PIX: {Array.isArray(contasBancarias) ? contasBancarias.find(c => c.id === p.contaBancariaId)?.nomeBanco || 'N/A' : 'N/A'} ({Array.isArray(contasBancarias) ? contasBancarias.find(c => c.id === p.contaBancariaId)?.chavePix || 'N/A' : 'N/A'})</p>
                    )}
                  </div>
                ))}
                <div className="mt-3 pt-2 border-t border-gray-300">
                  <div className="flex justify-between text-sm font-medium text-gray-700">
                    <span>Total Pago:</span>
                    <span>{formatCurrency(totalPago)}</span>
                  </div>
                  {exibirTaxas && totalTaxasCartao > 0.009 && (
                    <div className="flex justify-between text-sm font-medium text-blue-600 mt-1">
                      <span>Taxas de Cartão:</span>
                      <span>{formatCurrency(totalTaxasCartao)}</span>
                    </div>
                  )}
                  {saldoPendente > 0.009 && (
                    <div className="flex justify-between text-sm font-bold text-red-600 mt-1">
                      <span>VALOR PENDENTE:</span>
                      <span>{formatCurrency(saldoPendente)}</span>
                    </div>
                  )}
                  {troco > 0.009 && (
                    <div className="flex justify-between text-sm font-bold text-green-600 mt-1">
                      <span>TROCO:</span>
                      <span>{formatCurrency(troco)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {documento.observacoes_gerais_os && (
              <div className="mb-4 pt-3 border-t border-gray-300 mt-4">
                <h3 className="font-semibold text-gray-800 mb-1 flex items-center"><Info size={18} className="mr-2 text-primary" />Observações da OS:</h3>
                <p className="text-sm whitespace-pre-wrap text-gray-600">{documento.observacoes_gerais_os}</p>
              </div>
            )}
            {documento.observacoes_cliente_para_nota && (
              <div className="mb-4 pt-3 border-t border-gray-300 mt-4">
                <h3 className="font-semibold text-gray-800 mb-1 flex items-center"><Info size={18} className="mr-2 text-primary" />Observações do Cliente (Nota):</h3>
                <p className="text-sm whitespace-pre-wrap text-gray-600">{documento.observacoes_cliente_para_nota}</p>
              </div>
            )}

            {saldoPendente > 0.009 && contaPixSelecionada && !isOrcamento && (
              <div className="mt-6 pt-4 border-t border-gray-300 text-center">
                <h3 className="font-semibold text-gray-800 mb-2">Pague o valor restante com PIX</h3>
                <div className="flex flex-col items-center gap-2">
                  {contaPixSelecionada.qrCodeUrl ? (
                    <img src={contaPixSelecionada.qrCodeUrl} alt="PIX QR Code" className="w-36 h-36 object-contain border border-gray-300 rounded-md shadow-sm" />
                  ) : (
                    <p className="text-sm text-gray-500">QR Code não disponível. Use a chave abaixo:</p>
                  )}
                  <div className="text-xs text-center text-gray-600">
                    <p><strong>Banco:</strong> {contaPixSelecionada.nomeBanco}</p>
                    <p><strong>Chave PIX:</strong> {contaPixSelecionada.chavePix}</p>
                  </div>
                </div>
                <p className="text-sm mt-2">Valor Pendente: <span className="font-bold text-red-600">{formatCurrency(saldoPendente)}</span></p>
              </div>
            )}

            <footer className="text-xs text-center mt-8 pt-4 border-t border-gray-300 text-gray-500">
              <p>{empresaSettings.mensagemPersonalizadaRodape || 'Obrigado pela preferência!'}</p>
              <p>Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss")}</p>
            </footer>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={handleGeneratePdf} className="flex items-center" disabled={isPrinting || isGeneratingPdf}>
            {isGeneratingPdf ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" /> Gerando PDF...
              </>
            ) : (
              <>
                <FileText size={16} className="mr-2" /> Baixar PDF
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handlePrint} className="flex items-center" disabled={isPrinting || isGeneratingPdf}>
            {isPrinting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" /> Imprimindo...
              </>
            ) : (
              <>
                <Printer size={16} className="mr-2" /> Imprimir
              </>
            )}
          </Button>
          <DialogClose asChild>
            <Button>Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSDocumentModal;