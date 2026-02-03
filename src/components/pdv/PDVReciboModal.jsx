import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, Download, RotateCcw, MessageSquare, ShoppingBag, Wrench as Tool, Layers, ArrowLeft, CreditCard, Smartphone, Coins, Landmark, Tag, Info, CalendarDays, User as UserIcon, Wallet, CheckCircle2, Package as PackageIcon, ImageIcon, Loader2 } from 'lucide-react';
import { format, addDays, isValid, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ptBR } from 'date-fns/locale';
import { safeJsonParse, formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { printElementDirect } from '@/lib/osDocumentGenerator';
import { useToast } from '@/components/ui/use-toast';

const PDVReciboModal = ({ 
  isOpen, 
  setIsOpen, 
  reciboRef, 
  documento, 
  logoUrl, 
  nomeEmpresa: appNomeEmpresa, 
  empresaSettings,
  produtos = [],
  productColors = [],
  productSizes = [],
  getNomeVariacao,
  handleImpressaoRecibo, 
  handleGerarPdfRecibo,
  handleNovoPedido 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Função auxiliar para obter nome da variação (se não for passada como prop)
  const getNomeVariacaoLocal = (varId, type) => {
    if (getNomeVariacao) {
      return getNomeVariacao(varId, type);
    }
    if (!varId) return 'N/A';
    
    // Converter para número para comparação
    const varIdNum = typeof varId === 'string' ? parseInt(varId, 10) : varId;
    
    if (type === 'cor') {
      // Tentar encontrar por ID numérico ou string
      const cor = productColors.find(c => {
        const cId = typeof c.id === 'string' ? parseInt(c.id, 10) : c.id;
        return cId === varIdNum || c.id === varId || String(c.id) === String(varId);
      });
      return cor ? cor.nome : (isNaN(varIdNum) ? varId : 'N/A');
    }
    if (type === 'tamanho') {
      // Tentar encontrar por ID numérico ou string
      const tamanho = productSizes.find(s => {
        const sId = typeof s.id === 'string' ? parseInt(s.id, 10) : s.id;
        return sId === varIdNum || s.id === varId || String(s.id) === String(varId);
      });
      return tamanho ? tamanho.nome : (isNaN(varIdNum) ? varId : 'N/A');
    }
    return varId;
  };
  
  // Função para obter o nome completo da variação (usando a mesma lógica do PDVVariationsModal)
  const obterNomeVariacaoCompleto = (variacao) => {
    if (!variacao) return '';
    
    // Se tiver nomeDisplay, usar ele
    if (variacao.nomeDisplay) {
      return variacao.nomeDisplay;
    }
    
    // Se tiver nome, usar ele
    if (variacao.nome) {
      return variacao.nome;
    }
    
    // Construir a partir de cor e tamanho (mesma lógica do PDVVariationsModal)
    const partes = [];
    if (variacao.cor) {
      const nomeCor = getNomeVariacaoLocal(variacao.cor, 'cor');
      if (nomeCor && nomeCor !== 'N/A' && nomeCor !== String(variacao.cor)) {
        partes.push(nomeCor);
      }
    }
    if (variacao.tamanho) {
      const nomeTamanho = getNomeVariacaoLocal(variacao.tamanho, 'tamanho');
      if (nomeTamanho && nomeTamanho !== 'N/A' && nomeTamanho !== String(variacao.tamanho)) {
        partes.push(nomeTamanho);
      }
    }
    
    return partes.length > 0 ? partes.join(' / ') : '';
  };
  
  // Função para renderizar informações da variação (igual ao modal)
  const renderizarInfoVariacao = (variacao) => {
    if (!variacao) return null;
    
    const partes = [];
    
    // Se tiver cor, mostrar "Cor: {nome}"
    if (variacao.cor) {
      const nomeCor = getNomeVariacaoLocal(variacao.cor, 'cor');
      if (nomeCor && nomeCor !== 'N/A' && nomeCor !== String(variacao.cor)) {
        partes.push(`Cor: ${nomeCor}`);
      }
    }
    
    // Se tiver tamanho, mostrar "Tamanho: {nome}"
    if (variacao.tamanho) {
      const nomeTamanho = getNomeVariacaoLocal(variacao.tamanho, 'tamanho');
      if (nomeTamanho && nomeTamanho !== 'N/A' && nomeTamanho !== String(variacao.tamanho)) {
        partes.push(`Tamanho: ${nomeTamanho}`);
      }
    }
    
    // Se não tiver cor nem tamanho, tentar usar nomeDisplay ou nome
    if (partes.length === 0) {
      if (variacao.nomeDisplay) {
        return variacao.nomeDisplay;
      }
      if (variacao.nome) {
        return variacao.nome;
      }
    }
    
    return partes.length > 0 ? partes.join(' • ') : null;
  };
  
  // Função para extrair número do documento (prioriza venda_id da API)
  const obterNumeroDocumento = (doc) => {
    if (!doc) return 'N/A';
    
    // Priorizar venda_id retornado pela API (ID do banco de dados)
    if (doc.venda_id) {
      return String(doc.venda_id);
    }
    
    // Se tiver codigo_venda, usar ele
    if (doc.codigo_venda) {
      return String(doc.codigo_venda);
    }
    
    // Se o ID começar com PDV-, extrair o número
    if (doc.id && String(doc.id).startsWith('PDV-')) {
      const numero = String(doc.id).replace('PDV-', '');
      return numero;
    }
    
    // Fallback: usar o ID
    if (doc.id) {
      return String(doc.id);
    }
    
    return 'N/A';
  };
  
  // Função para formatar quantidade removendo zeros desnecessários
  const formatarQuantidade = (quantidade) => {
    if (quantidade === null || quantidade === undefined) return '1';
    const num = parseFloat(quantidade);
    if (isNaN(num)) return '1';
    
    // Se for inteiro, retornar sem decimais (preserva números grandes como 2000)
    if (num % 1 === 0) {
      return num.toString();
    }
    
    // Para decimais, remover apenas zeros à direita desnecessários
    // Ex: 2.5 → "2.5", 2.50 → "2.5", 2.500 → "2.5"
    return num.toString().replace(/\.?0+$/, '');
  };
  
  // Estado para controlar o loading do PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Referência local para o conteúdo do documento
  const localDocumentRef = useRef(null);
  
  // Efeito para copiar o conteúdo do documento para a referência local
  useEffect(() => {
    if (isOpen && reciboRef?.current) {
      // Garantir que a referência local seja atualizada quando o modal abrir
      localDocumentRef.current = reciboRef.current;
    }
  }, [isOpen, reciboRef]);
  
  // Função para gerar PDF com loading
  const handleGerarPdfReciboComLoading = async () => {
    if (!handleGerarPdfRecibo) return;
    
    setIsGeneratingPdf(true);
    toast({ title: "Gerando PDF", description: "Aguarde, o arquivo está sendo gerado...", variant: "default" });
    
    try {
      await handleGerarPdfRecibo();
      toast({ title: "PDF Gerado", description: "O arquivo foi baixado com sucesso!", variant: "default" });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: "Erro", description: "Ocorreu um erro ao gerar o PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Função de impressão direta em nova guia com HTML otimizado para impressão
  const handleImpressaoDireta = () => {
    // Usar a referência local ou a referência recebida como prop
    const elementRef = localDocumentRef.current || reciboRef?.current;
    
    if (!elementRef) {
      toast({ title: "Erro", description: "Não foi possível preparar o documento para impressão.", variant: "destructive" });
      return;
    }
    
    try {
      // Criar uma nova janela
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: "Erro", description: "Não foi possível abrir uma nova guia. Verifique se o bloqueador de pop-ups está desativado.", variant: "destructive" });
        return;
      }
      
      // Gerar HTML otimizado para impressão
      const printHtml = gerarHtmlParaImpressao();
      
      // Adicionar o HTML otimizado à nova janela
      printWindow.document.write(printHtml);
      printWindow.document.close();
      
      // Imprimir automaticamente após um pequeno delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({ title: "Erro de Impressão", description: error.message || "Ocorreu um problema ao imprimir.", variant: "destructive" });
    }
  };
  
  // Função para gerar HTML otimizado para impressão
  const gerarHtmlParaImpressao = () => {
    // Formatar data atual
    const dataAtual = format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    
    // Gerar HTML para itens da tabela
    const itensHtml = documento.itens.map((item, index) => {
      // Buscar a imagem do produto original se não estiver no item
      let imagemPrincipal = item.imagem_principal;
      if (!imagemPrincipal && item.id_produto && Array.isArray(produtos)) {
        const produtoOriginal = produtos.find(p => p.id === item.id_produto);
        if (produtoOriginal && produtoOriginal.imagem_principal) {
          imagemPrincipal = produtoOriginal.imagem_principal;
        }
      }
      const imageUrl = getImageUrl(imagemPrincipal);
      
      return `
        <tr style="border-bottom: 1px solid #e5e5e5;">
          <td style="padding: 2px; vertical-align: middle; width: 30px;">
            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e5e5; border-radius: 4px; background-color: #f9f9f9;">
              ${imageUrl ? `<img src="${imageUrl}" alt="${item.nome || 'Produto'}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">` : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'}
            </div>
          </td>
          <td style="padding: 2px; vertical-align: middle;">
            <div style="display: flex; flex-direction: column; white-space: normal; word-wrap: break-word; overflow: hidden; text-overflow: ellipsis;">
              <span style="font-size: 8px; font-weight: 500; overflow: hidden; text-overflow: ellipsis;">${item.nome || 'Produto não especificado'}</span>
              ${(() => {
                // Verificar se a variação está diretamente no item ou em dados_adicionais
                const variacao = item.variacao || item.dados_adicionais?.variacao;
                if (variacao) {
                  // Usar a mesma lógica do modal: mostrar "Cor: {nome}" e "Tamanho: {nome}"
                  const partes = [];
                  
                  // Se tiver cor, mostrar "Cor: {nome}"
                  if (variacao.cor) {
                    const nomeCor = getNomeVariacaoLocal ? getNomeVariacaoLocal(variacao.cor, 'cor') : (productColors.find(c => {
                      const cId = typeof c.id === 'string' ? parseInt(c.id, 10) : c.id;
                      const varIdNum = typeof variacao.cor === 'string' ? parseInt(variacao.cor, 10) : variacao.cor;
                      return cId === varIdNum || c.id === variacao.cor || String(c.id) === String(variacao.cor);
                    })?.nome || variacao.cor);
                    if (nomeCor && nomeCor !== 'N/A' && nomeCor !== String(variacao.cor)) {
                      partes.push('Cor: ' + nomeCor);
                    }
                  }
                  
                  // Se tiver tamanho, mostrar "Tamanho: {nome}"
                  if (variacao.tamanho) {
                    const nomeTamanho = getNomeVariacaoLocal ? getNomeVariacaoLocal(variacao.tamanho, 'tamanho') : (productSizes.find(s => {
                      const sId = typeof s.id === 'string' ? parseInt(s.id, 10) : s.id;
                      const varIdNum = typeof variacao.tamanho === 'string' ? parseInt(variacao.tamanho, 10) : variacao.tamanho;
                      return sId === varIdNum || s.id === variacao.tamanho || String(s.id) === String(variacao.tamanho);
                    })?.nome || variacao.tamanho);
                    if (nomeTamanho && nomeTamanho !== 'N/A' && nomeTamanho !== String(variacao.tamanho)) {
                      partes.push('Tamanho: ' + nomeTamanho);
                    }
                  }
                  
                  // Se não tiver cor nem tamanho, tentar usar nomeDisplay ou nome
                  if (partes.length === 0) {
                    if (variacao.nomeDisplay) {
                      partes.push(variacao.nomeDisplay);
                    } else if (variacao.nome) {
                      partes.push(variacao.nome);
                    }
                  }
                  
                  const infoVariacao = partes.length > 0 ? partes.join(' • ') : '';
                  return infoVariacao ? `<span style="font-size: 7px; color: #666; font-weight: 500; margin-top: 2px; overflow: hidden; text-overflow: ellipsis;">${infoVariacao}</span>` : '';
                }
                return '';
              })()}
            </div>
          </td>
          <td style="padding: 2px; vertical-align: middle; text-align: right; font-size: 8px;">${formatCurrency(item.preco_venda_unitario)}</td>
          <td style="padding: 2px; vertical-align: middle; text-align: center; font-size: 8px;">${item.quantidade}</td>
          <td style="padding: 2px; vertical-align: middle; text-align: right; font-size: 8px; font-weight: 500;">${formatCurrency(getSubtotalItem(item))}</td>
        </tr>
      `;
    }).join('');
    
    // Gerar HTML para pagamentos
    let pagamentosHtml = '';
    if (!isOrcamento && documento.pagamentos && documento.pagamentos.length > 0) {
      const pagamentosOriginais = documento.pagamentos.filter(p => !p.isHistorico);
      const pagamentosHistorico = documento.pagamentos.filter(p => p.isHistorico);
      
      pagamentosHtml = `
        <div style="margin-bottom: 10px;">
          <h2 style="font-size: 10px; font-weight: 600; margin-bottom: 5px; display: flex; align-items: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>
            PAGAMENTOS
          </h2>
          <div style="background-color: #f9f9f9; padding: 5px; border-radius: 4px; border: 1px solid #e5e5e5;">
            ${pagamentosOriginais.map((p, i) => {
              let icone = '';
              switch(p.metodo) {
                case 'Pix':
                  icone = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M22 10a1.78 1.78 0 0 1-3.1 1.4"></path><path d="M2 10a1.78 1.78 0 0 0 3.1 1.4"></path><line x1="10" y1="3" x2="14" y2="3"></line><line x1="12" y1="3" x2="12" y2="6"></line></svg>';
                  break;
                case 'Dinheiro':
                  icone = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><circle cx="12" cy="12" r="8"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
                  break;
                case 'Cartão Débito':
                case 'Cartão Crédito':
                  icone = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>';
                  break;
                default:
                  icone = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>';
              }
              
              return `
                <div style="font-size: 8px; padding: 4px; margin-bottom: 3px; background-color: white; border: 1px solid #e5e5e5; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between; font-weight: 500;">
                    <span style="display: flex; align-items: center;">
                      ${icone}
                      ${p.metodo} ${p.parcelas ? ` (${p.parcelas}x)` : ''}
                    </span>
                    <span>${formatCurrency(p.valorFinal || p.valor)}</span>
                  </div>
                  ${p.maquinaInfo?.nome ? `<p style="margin: 2px 0 0 17px; font-size: 7px; color: #666;">Máquina: ${p.maquinaInfo.nome}</p>` : ''}
                  ${p.taxaInfo?.valor && parseFloat(p.taxaInfo.valor) > 0 ? `
                    <div style="margin: 2px 0 0 17px; font-size: 7px; color: #666;">
                      <p>Taxa: ${parseFloat(p.taxaInfo.valor).toFixed(2).replace('.',',')}% (Original: ${formatCurrency(p.valorOriginal)} | Taxa: ${formatCurrency(parseFloat(p.valorFinal || p.valor) - parseFloat(p.valorOriginal || 0))})</p>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
            
            ${pagamentosHistorico.length > 0 ? `
              <div style="border-top: 1px solid #e5e5e5; padding-top: 5px; margin-top: 5px;">
                <h3 style="font-size: 8px; font-weight: 600; color: #16a34a; margin-bottom: 3px; display: flex; align-items: center;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><path d="m9 12 2 2 4-4"></path><circle cx="12" cy="12" r="10"></circle></svg>
                  Pagamentos Já Recebidos
                </h3>
                ${pagamentosHistorico.map((p, i) => `
                  <div style="font-size: 8px; padding: 4px; margin-bottom: 3px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 500; color: #15803d;">
                      <span style="display: flex; align-items: center;">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="m9 12 2 2 4-4"></path><circle cx="12" cy="12" r="10"></circle></svg>
                        ${p.metodo}
                      </span>
                      <span>${formatCurrency(p.valor)}</span>
                    </div>
                    ${p.data_pagamento ? `<p style="margin: 2px 0 0 15px; font-size: 7px; color: #166534;">Data: ${p.data_pagamento}</p>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    // Gerar HTML completo para impressão
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${documento.tipo || 'Documento'} ${obterNumeroDocumento(documento)}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4;
            margin: 15mm 10mm 15mm 10mm;
          }
          @media print {
            * {
              box-sizing: border-box;
            }
            body {
              width: 100% !important;
              max-width: 100% !important;
              overflow-x: hidden !important;
            }
            .container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            table {
              width: 100% !important;
              max-width: 100% !important;
            }
            .flex-row {
              width: 100% !important;
              max-width: 100% !important;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 9px;
            color: #333;
            background-color: white !important;
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
          }
          .container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            padding: 0;
            box-sizing: border-box;
            background-color: white !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            background-color: white !important;
          }
          th {
            text-align: left;
            background-color: #f5f5f5 !important;
            font-size: 8px;
            padding: 3px;
            color: #333 !important;
          }
          td {
            background-color: white !important;
            color: #333 !important;
          }
          th:nth-child(1) { width: 8%; } /* Imagem */
          th:nth-child(2) { width: 45%; } /* Descrição */
          th:nth-child(3) { width: 15%; } /* Preço Un. */
          th:nth-child(4) { width: 12%; } /* Qtd. */
          th:nth-child(5) { width: 20%; } /* Subtotal */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e5e5;
            width: 100%;
            box-sizing: border-box;
          }
          .logo {
            max-height: 40px;
            max-width: 120px;
            object-fit: contain;
          }
          .empresa-info {
            max-width: 55%;
            min-width: 0;
            overflow: hidden;
          }
          .documento-info {
            text-align: right;
            max-width: 40%;
            min-width: 0;
            overflow: hidden;
          }
          .cliente-info {
            margin-bottom: 10px;
            background-color: #f9f9f9 !important;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            color: #333 !important;
          }
          .section {
            margin-bottom: 10px;
          }
          .section-title {
            font-size: 10px;
            font-weight: 600;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
          }
          .resumo {
            width: 100%;
            background-color: #f9f9f9 !important;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            color: #333 !important;
          }
          .resumo-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .total {
            background-color: #f0f9ff;
            border-radius: 4px;
            padding: 3px 5px;
            font-weight: bold;
            font-size: 12px;
            margin: 3px 0;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 5px;
            border-top: 1px solid #e5e5e5;
            font-size: 7px;
            color: #666;
          }
          .info-adicional {
            background-color: #f9f9f9 !important;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            margin-bottom: 10px;
            color: #333 !important;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            width: 100%;
            box-sizing: border-box;
          }
          .info-item {
            display: flex;
            align-items: center;
            font-size: 8px;
            min-width: 0;
            overflow: hidden;
          }
          .observacoes {
            background-color: #f9f9f9 !important;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #e5e5e5;
            font-size: 8px;
            white-space: pre-wrap;
            color: #666 !important;
          }
          .termos {
            font-size: 7px;
            color: #666 !important;
            margin-top: 10px;
            padding-top: 5px;
            border-top: 1px solid #e5e5e5;
            background-color: white !important;
          }
          .flex-row {
            display: flex;
            gap: 10px;
            width: 100%;
            box-sizing: border-box;
            background-color: white !important;
          }
          .flex-col-1 {
            flex: 1;
            min-width: 0;
            overflow: hidden;
            background-color: white !important;
          }
          .flex-col-2 {
            width: 35%;
            min-width: 0;
            overflow: hidden;
            background-color: white !important;
          }
          * {
            background-color: white !important;
            color: #333 !important;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Cabeçalho -->
          <div class="header">
            <div class="empresa-info">
              ${logoUrl ? `<img src="${getImageUrl(logoUrl)}" alt="Logo Empresa" class="logo">` : `<h1 style="font-size: 14px; margin: 0 0 3px 0;">${nomeEmpresaParaExibir}</h1>`}
              <p style="font-size: 7px; margin: 0; color: #666;">${settings.razaoSocial || ''}</p>
              <p style="font-size: 7px; margin: 0; color: #666;">${settings.enderecoCompleto || ''}</p>
              <p style="font-size: 7px; margin: 0; color: #666;">
                ${settings.cnpj ? `CNPJ: ${settings.cnpj}` : ''}
                ${settings.telefone ? ` | Tel: ${settings.telefone}` : ''}
              </p>
            </div>
            <div class="documento-info">
              <h1 style="font-size: 16px; margin: 0 0 3px 0; text-transform: uppercase; letter-spacing: 1px;">${documentoNomeUpper}</h1>
              <p style="font-size: 9px; margin: 0; color: #666;">Nº: <span style="font-family: monospace;">${obterNumeroDocumento(documento)}</span></p>
            </div>
          </div>
          
          <!-- Informações do Cliente -->
          <div class="section">
            <h2 style="font-size: 10px; margin: 0 0 3px 0;">CLIENTE:</h2>
            <div class="cliente-info">
              <p style="font-size: 12px; margin: 0 0 2px 0; font-weight: 500;">${clienteNomeDisplay}</p>
              ${documento.cliente?.cpf_cnpj ? `<p style="font-size: 7px; margin: 0; color: #666;">CPF/CNPJ: ${documento.cliente.cpf_cnpj}</p>` : ''}
              ${documento.cliente?.telefone_principal ? `<p style="font-size: 7px; margin: 0; color: #666;">Telefone: ${documento.cliente.telefone_principal}</p>` : ''}
            </div>
          </div>
          
          <!-- Tabela de Itens -->
          <div class="section">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
              ITENS
            </h2>
            <table>
              <thead>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <th style="width: 30px; text-align: left;">Imagem</th>
                  <th style="text-align: left;">Descrição</th>
                  <th style="text-align: right;">Preço Un.</th>
                  <th style="text-align: center;">Qtd.</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itensHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Pagamento e Resumo -->
          <div class="flex-row">
            <div class="flex-col-1">
              ${pagamentosHtml}
            </div>
            <div class="flex-col-2">
              <div class="resumo">
                <div class="resumo-item">
                  <span>Subtotal Itens:</span>
                  <span>${formatCurrency(totalBruto)}</span>
                </div>
                ${totalDescontoBase > 0 && (
                  <div class="resumo-item" style="color: #e11d48;">
                    <span>Desconto (${documento.desconto?.valor_aplicado > 0 ? 'Aplicado' : (documento.desconto.tipo === 'percent' ? `${parseFloat(documento.desconto.valor)}%` : 'Fixo')}):</span>
                    <span>- ${formatCurrency(totalDescontoBase)}</span>
                  </div>
                ) }
                ${descontoPontosAplicado > 0 ? `
                  <div class="resumo-item" style="color: #e11d48;">
                    <span>Desconto Pontos (usados):</span>
                    <span>- ${formatCurrency(descontoPontosAplicado)}</span>
                  </div>
                ` : ''}
                <hr style="border: none; border-top: 1px dashed #e5e5e5; margin: 3px 0;">
                <div class="resumo-item total">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(totalDocumento)}</span>
                </div>
                ${!isOrcamento ? `
                  <div class="resumo-item" style="font-weight: 500;">
                    <span>Total Pago:</span>
                    <span>${formatCurrency(totalPagoPelosMetodos)}</span>
                  </div>
                  ${trocoReal > 0.009 ? `
                    <div class="resumo-item" style="color: #16a34a; font-weight: 600;">
                      <span>TROCO:</span>
                      <span>${formatCurrency(trocoReal)}</span>
                    </div>
                  ` : ''}
                  ${restanteEmAberto > 0.009 ? `
                    <div class="resumo-item" style="color: #ea580c; font-weight: 600;">
                      <span>Restante em Aberto:</span>
                      <span>${formatCurrency(restanteEmAberto)}</span>
                    </div>
                  ` : ''}
                ` : ''}
              </div>
            </div>
          </div>
          
          <!-- Informações Adicionais -->
          <div class="section">
            <h2 class="section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 5px;"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
              INFORMAÇÕES ADICIONAIS
            </h2>
            <div class="info-adicional">
              <div class="info-grid">
                <div class="info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <strong>Vendedor:</strong><span style="margin-left: 3px;">${documento.vendedor_nome || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <strong>Data da Venda:</strong><span style="margin-left: 3px;">${dataDocumento && isValid(dataDocumento) ? format(dataDocumento, "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}</span>
                </div>
                <div class="info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <strong>Status:</strong><span style="margin-left: 3px;">${documento.status || 'N/A'}</span>
                </div>
                <div class="info-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  <strong>Tipo:</strong><span style="margin-left: 3px;">${documento.origem_venda || (isOrcamento ? 'Orçamento PDV' : 'Venda PDV')}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Validade do Orçamento -->
          ${isOrcamento && validadeOrcamento ? `
            <div style="text-align: center; margin: 10px 0; padding-top: 5px; border-top: 1px solid #e5e5e5;">
              <p style="font-size: 8px; margin: 0; color: #e11d48; display: flex; align-items: center; justify-content: center;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 3px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Este orçamento é válido até: ${validadeOrcamento}
              </p>
            </div>
          ` : ''}
          
          <!-- Observações -->
          ${documento.observacoes ? `
            <div class="section">
              <h3 style="font-size: 9px; margin: 0 0 3px 0; font-weight: 600;">Observações:</h3>
              <div class="observacoes">${documento.observacoes}</div>
            </div>
          ` : ''}
          
          <!-- Termos e Condições -->
          ${(settings.termosCondicoesRecibo || settings.informacoesPagamentoRecibo) ? `
            <div class="termos">
              ${settings.informacoesPagamentoRecibo ? `
                <div style="margin-bottom: 5px;">
                  <h3 style="font-size: 8px; margin: 0 0 2px 0; font-weight: 600; color: #333;">Informações de Pagamento:</h3>
                  <p style="margin: 0; white-space: pre-wrap;">${settings.informacoesPagamentoRecibo}</p>
                </div>
              ` : ''}
              ${settings.termosCondicoesRecibo ? `
                <div>
                  <h3 style="font-size: 8px; margin: 0 0 2px 0; font-weight: 600; color: #333;">Termos e Condições:</h3>
                  <p style="margin: 0; white-space: pre-wrap;">${settings.termosCondicoesRecibo}</p>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          <!-- Rodapé -->
          <div class="footer">
            <p style="margin: 0;">${settings.mensagemPersonalizadaRodape}</p>
            <p style="margin: 2px 0 0 0;">Gerado por: ${settings.nomeSistema || 'Sistema Gráfico'} em ${dataAtual}</p>
          </div>
        </div>
        
        <script>
          // Imprimir automaticamente quando o conteúdo estiver carregado
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;
  };
  if (!documento) return null;

  const settings = empresaSettings || {
      nomeFantasia: appNomeEmpresa,
      razaoSocial: 'N/A',
      cnpj: 'N/A',
      enderecoCompleto: 'N/A',
      telefone: 'N/A',
      email: 'N/A',
      site: 'N/A',
      mensagemPersonalizadaRodape: 'Obrigado pela sua preferência!',
      termosCondicoesRecibo: '',
      informacoesPagamentoRecibo: '',
      nomeSistema: 'Jet Impre'
  };
  
  const nomeEmpresaParaExibir = settings.nomeFantasia || appNomeEmpresa;

  const isOrcamento = documento.tipo === 'Orçamento PDV';
  const documentoNomeUpper = isOrcamento ? 'ORÇAMENTO' : 'RECIBO DE VENDA';
  const validadeOrcamento = isOrcamento && documento.data_validade && isValid(parseISO(documento.data_validade)) ? format(parseISO(documento.data_validade), 'dd/MM/yyyy', { locale: ptBR }) : null;
  const clienteNomeDisplay = documento.cliente_nome || documento.cliente?.nome || 'Cliente Avulso';

  const formatCurrency = (value) => {
    const val = parseFloat(value);
    return isNaN(val) ? 'R$ 0,00' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const getSubtotalItem = (item) => {
    const preco = parseFloat(item.preco_venda_unitario || item.preco_unitario || 0);
    const qtd = parseInt(item.quantidade || 0);
    return preco * qtd;
  };

  const totalBruto = documento.itens.reduce((acc, item) => acc + getSubtotalItem(item), 0);
  const descontoPontosAplicado = parseFloat(documento.dadosPontos?.descontoPontosAplicado || 0) || 0;
  let totalDescontoBase = 0;
  if (documento.desconto?.valor_aplicado > 0) {
    // Em alguns fluxos, valor_aplicado já pode incluir pontos. Separar visualmente o que é "desconto normal" do que é "pontos".
    totalDescontoBase = Math.max(0, parseFloat(documento.desconto.valor_aplicado) - descontoPontosAplicado);
  } else if (documento.desconto?.valor > 0) {
    totalDescontoBase = documento.desconto.tipo === 'percent' 
      ? (totalBruto * (parseFloat(documento.desconto.valor) / 100)) 
      : parseFloat(documento.desconto.valor);
  }
  const totalDesconto = totalDescontoBase + (descontoPontosAplicado > 0 ? descontoPontosAplicado : 0);
  
  const totalDocumento = parseFloat(documento.total || 0);
  
  const totalPagoPelosMetodos = documento.pagamentos?.reduce((acc, p) => acc + parseFloat(p.valorFinal || p.valor || 0), 0) || 0;
  let trocoReal = 0;
  if (!isOrcamento && totalPagoPelosMetodos >= totalDocumento) {
    const pagamentosEmDinheiro = documento.pagamentos?.filter(p => p.metodo === 'Dinheiro') || [];
    const totalEmDinheiro = pagamentosEmDinheiro.reduce((acc, p) => acc + parseFloat(p.valor || 0), 0);
    const valorDevidoAposOutrosPagamentos = Math.max(0, totalDocumento - (totalPagoPelosMetodos - totalEmDinheiro));
    trocoReal = Math.max(0, totalEmDinheiro - valorDevidoAposOutrosPagamentos);
  }
  const restanteEmAberto = isOrcamento ? 0 : Math.max(0, totalDocumento - totalPagoPelosMetodos);

  const dataDocumento = documento.data_emissao ? parseISO(documento.data_emissao) : null;

  const handleVoltarHistorico = () => {
    setIsOpen(false);
    navigate('/pdv/historico');
  };

  const formaPagamentoIcones = {
    Pix: <Smartphone size={16} className="mr-2 text-green-500" />,
    Dinheiro: <Coins size={16} className="mr-2 text-yellow-500" />,
    'Cartão Débito': <CreditCard size={16} className="mr-2 text-blue-500" />,
    'Cartão Crédito': <CreditCard size={16} className="mr-2 text-purple-500" />,
    Crediário: <CalendarDays size={16} className="mr-2 text-orange-500" />,
    'Transferência Bancária': <Landmark size={16} className="mr-2 text-indigo-500" />,
    Outro: <Tag size={16} className="mr-2 text-gray-500" />
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden shadow-2xl rounded-lg bg-white text-black" style={{ backgroundColor: 'white', color: 'black' }}>
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">{documentoNomeUpper}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[85vh]">
           <div ref={reciboRef} className="p-4 sm:p-8 bg-white text-black printable-content w-full sm:w-[794px] mx-auto font-sans text-[10px] sm:text-sm" style={{ backgroundColor: 'white', color: 'black' }}>
            
            <header className="flex justify-between items-start mb-4 sm:mb-6 pb-4 border-b border-gray-300" style={{ borderBottomColor: '#d1d5db' }}>
              <div className="max-w-[60%]">
                {logoUrl ? (
                  <img src={getImageUrl(logoUrl)} alt="Logo Empresa" className="h-12 sm:h-16 mb-1 sm:mb-2 object-contain" />
                ) : (
                  nomeEmpresaParaExibir && <h1 className="text-xl sm:text-2xl font-bold text-blue-600 mb-1" style={{ color: '#2563eb' }}>{nomeEmpresaParaExibir}</h1>
                )}
                <p className="text-[9px] sm:text-xs text-gray-600" style={{ color: '#4b5563' }}>{settings.razaoSocial || ''}</p>
                <p className="text-[9px] sm:text-xs text-gray-600" style={{ color: '#4b5563' }}>{settings.enderecoCompleto || ''}</p>
                <p className="text-[9px] sm:text-xs text-gray-600" style={{ color: '#4b5563' }}>
                  {settings.cnpj && `CNPJ: ${settings.cnpj}`}
                  {settings.telefone && ` | Tel: ${settings.telefone}`}
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-2xl sm:text-3xl font-bold text-black uppercase tracking-wider" style={{ color: 'black' }}>{documentoNomeUpper}</h1>
                 <p className="text-xs sm:text-sm text-gray-600 mt-1" style={{ color: '#4b5563' }}>Nº: <span className="font-mono">{obterNumeroDocumento(documento)}</span></p>
              </div>
            </header>

            <section className="mb-4 sm:mb-6">
                <h2 className="text-sm sm:text-base font-semibold text-blue-600 mb-1" style={{ color: '#2563eb' }}>CLIENTE:</h2>
                <div className="bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-300" style={{ backgroundColor: '#f9fafb', borderColor: '#d1d5db' }}>
                    <p className="text-base sm:text-lg font-medium text-black" style={{ color: 'black' }}>{clienteNomeDisplay}</p>
                    {documento.cliente?.cpf_cnpj && <p className="text-[9px] sm:text-xs text-gray-600" style={{ color: '#4b5563' }}>CPF/CNPJ: {documento.cliente.cpf_cnpj}</p>}
                    {documento.cliente?.telefone_principal && <p className="text-[9px] sm:text-xs text-gray-600" style={{ color: '#4b5563' }}>Telefone: {documento.cliente.telefone_principal}</p>}
                </div>
            </section>
            
            <hr className="my-3 sm:my-4 border-gray-300" style={{ borderColor: '#d1d5db' }} />

            <section className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-blue-600 mb-2 flex items-center" style={{ color: '#2563eb' }}>
                  <ShoppingBag size={18} className="mr-2"/> ITENS
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] sm:text-sm">
                  <thead className="bg-gray-100" style={{ backgroundColor: '#f3f4f6' }}>
                    <tr className="border-b border-gray-300" style={{ borderBottomColor: '#d1d5db' }}>
                      <th className="text-left py-1 sm:py-1.5 px-1 sm:px-2 font-semibold w-[40px] text-[10px] sm:text-xs text-black" style={{ color: 'black' }}>Imagem</th>
                      <th className="text-left py-1 sm:py-1.5 px-1 sm:px-2 font-semibold text-[10px] sm:text-xs text-black" style={{ color: 'black' }}>Descrição</th>
                      <th className="text-right py-1 sm:py-1.5 px-1 sm:px-2 font-semibold text-[10px] sm:text-xs text-black" style={{ color: 'black' }}>Preço Un.</th>
                      <th className="text-center py-1 sm:py-1.5 px-1 sm:px-2 font-semibold text-[10px] sm:text-xs text-black" style={{ color: 'black' }}>Qtd.</th>
                      <th className="text-right py-1 sm:py-1.5 px-1 sm:px-2 font-semibold text-[10px] sm:text-xs text-black" style={{ color: 'black' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white" style={{ backgroundColor: 'white' }}>
                    {documento.itens.map((item, index) => (
                      <tr key={`prod-${index}`} className="border-b border-gray-300 last:border-b-0 hover:bg-gray-50" style={{ borderBottomColor: '#d1d5db' }}>
                        <td className="py-1 sm:py-1.5 px-1 sm:px-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 max-w-[32px] flex items-center justify-center border border-gray-300 rounded-md bg-gray-50" style={{ borderColor: '#d1d5db', backgroundColor: '#f9fafb' }}>
                            {(() => {
                              // Buscar a imagem do produto original se não estiver no item
                              let imagemPrincipal = item.imagem_principal;
                              
                              // Se não tem imagem no item, tentar buscar do produto original
                              if (!imagemPrincipal && item.id_produto && Array.isArray(produtos)) {
                                const produtoOriginal = produtos.find(p => p.id === item.id_produto);
                                if (produtoOriginal && produtoOriginal.imagem_principal) {
                                  imagemPrincipal = produtoOriginal.imagem_principal;
                                }
                              }
                              
                              const imageUrl = getImageUrl(imagemPrincipal);
                              
                              if (imageUrl) {
                                return (
                                  <>
                                    <img 
                                      src={imageUrl} 
                                      alt={item.nome || 'Produto'} 
                                      className="w-full h-full object-contain rounded-md"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        const fallbackIcon = e.target.parentElement.querySelector('.fallback-icon');
                                        if (fallbackIcon) {
                                          fallbackIcon.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <ImageIcon size={16} className="text-gray-400 fallback-icon" style={{ display: 'none' }} />
                                  </>
                                );
                              } else {
                                return <ImageIcon size={16} className="text-gray-400" />;
                              }
                            })()}
                          </div>
                        </td>
                        <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-black" style={{ color: 'black' }}>
                          <div className="flex flex-col gap-0.5 whitespace-normal break-words max-w-[200px]">
                            <span className="text-[10px] sm:text-xs font-medium">{item.nome || 'Produto não especificado'}</span>
                            {(() => {
                              // Verificar se a variação está diretamente no item ou em dados_adicionais
                              const variacao = item.variacao || item.dados_adicionais?.variacao;
                              
                              if (variacao) {
                                // Usar a mesma lógica do PDVVariationsModal: mostrar "Cor: {nome}" e "Tamanho: {nome}"
                                const infoVariacao = renderizarInfoVariacao(variacao);
                                return infoVariacao ? (
                                  <span className="text-gray-600 text-[9px] sm:text-xs font-medium" style={{ color: '#4b5563' }}>
                                    {infoVariacao}
                                  </span>
                                ) : null;
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="text-right py-1 sm:py-1.5 px-1 sm:px-2 text-black text-[10px] sm:text-xs" style={{ color: 'black' }}>{formatCurrency(item.preco_venda_unitario)}</td>
                        <td className="text-center py-1 sm:py-1.5 px-1 sm:px-2 text-black text-[10px] sm:text-xs" style={{ color: 'black' }}>{formatarQuantidade(item.quantidade)}</td>
                        <td className="text-right py-1 sm:py-1.5 px-1 sm:px-2 font-medium text-black text-[10px] sm:text-xs" style={{ color: 'black' }}>{formatCurrency(getSubtotalItem(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            
            <hr className="my-3 sm:my-4 border-gray-300" style={{ borderColor: '#d1d5db' }} />

            <section className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="flex-1">
                {!isOrcamento && documento.pagamentos && documento.pagamentos.length > 0 && (
                  <>
                    <h2 className="text-base sm:text-lg font-semibold text-blue-600 mb-2 flex items-center" style={{ color: '#2563eb' }}>
                        <Wallet size={18} className="mr-2"/> PAGAMENTOS
                    </h2>
                    <div className="space-y-1.5 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-300" style={{ backgroundColor: '#f9fafb', borderColor: '#d1d5db' }}>
                      {/* Pagamentos originais */}
                      {documento.pagamentos.filter(p => !p.isHistorico).map((p, i) => (
                          <div key={i} className="text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-md bg-white border border-gray-300" style={{ backgroundColor: 'white', borderColor: '#d1d5db' }}>
                              <div className="flex items-center justify-between font-medium">
                                  <span className="flex items-center text-black" style={{ color: 'black' }}>
                                    {formaPagamentoIcones[p.metodo] || <Tag size={16} className="mr-2 text-gray-500" />}
                                    {p.metodo} {p.parcelas ? ` (${p.parcelas}x)` : ''}
                                  </span>
                                  <span className="text-black" style={{ color: 'black' }}>{formatCurrency(p.valorFinal || p.valor)}</span>
                              </div>
                              {p.maquinaInfo?.nome && <p className="text-gray-600 text-[9px] sm:text-[10px] ml-7" style={{ color: '#4b5563' }}>Máquina: {p.maquinaInfo.nome}</p>}
                              {p.taxaInfo?.valor && parseFloat(p.taxaInfo.valor) > 0 && (
                                  <div className="text-gray-600 text-[9px] sm:text-[10px] ml-7 mt-0.5" style={{ color: '#4b5563' }}>
                                      <p>Taxa: {parseFloat(p.taxaInfo.valor).toFixed(2).replace('.',',')}% (Original: {formatCurrency(p.valorOriginal)} | Taxa: {formatCurrency(parseFloat(p.valorFinal || p.valor) - parseFloat(p.valorOriginal || 0))})</p>
                                  </div>
                              )}
                          </div>
                      ))}
                      
                      {/* Pagamentos já recebidos (histórico do crediário) */}
                      {documento.pagamentos.filter(p => p.isHistorico).length > 0 && (
                        <>
                          <div className="border-t border-border pt-2 mt-2">
                            <h3 className="text-xs font-semibold text-green-600 mb-1.5 flex items-center">
                              <CheckCircle2 size={14} className="mr-1"/> Pagamentos Já Recebidos
                            </h3>
                            {documento.pagamentos.filter(p => p.isHistorico).map((p, i) => (
                              <div key={`hist-${i}`} className="text-[10px] sm:text-xs p-1.5 sm:p-2 rounded-md bg-green-50 border border-green-200 mb-1">
                                <div className="flex items-center justify-between font-medium">
                                  <span className="flex items-center text-green-700">
                                    <CheckCircle2 size={14} className="mr-2 text-green-500" />
                                    {p.metodo}
                                  </span>
                                  <span className="text-green-700">{formatCurrency(p.valor)}</span>
                                </div>
                                {p.data_pagamento && (
                                  <p className="text-green-600 text-[9px] sm:text-[10px] ml-7">
                                    Data: {isValid(parseISO(p.data_pagamento)) ? format(parseISO(p.data_pagamento), "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="w-full sm:w-2/5 text-[10px] sm:text-sm space-y-1.5 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-300" style={{ backgroundColor: '#f9fafb', borderColor: '#d1d5db' }}>
                <div className="flex justify-between py-1 text-black" style={{ color: 'black' }}>
                  <span>Subtotal Itens:</span>
                  <span>{formatCurrency(totalBruto)}</span>
                </div>
                {documento.desconto && ( 
                  <div className="flex justify-between py-1 text-red-500" style={{ color: '#ef4444' }}>
                    <span>Desconto ({documento.desconto.tipo === 'percent' ? `${parseFloat(documento.desconto.valor)}%` : `${formatCurrency(documento.desconto.valor)}`}):</span>
                    <span>- {formatCurrency(totalDescontoBase)}</span>
                  </div>
                )}
                {descontoPontosAplicado > 0 && (
                  <div className="flex justify-between py-1 text-red-500" style={{ color: '#ef4444' }}>
                    <span>Desconto Pontos:</span>
                    <span>- {formatCurrency(descontoPontosAplicado)}</span>
                  </div>
                )}
                 <hr className="border-dashed border-gray-300" style={{ borderColor: '#d1d5db' }} />
                <div className="flex justify-between py-1.5 sm:py-2 bg-blue-100 text-blue-600 rounded-md px-2 font-bold text-base sm:text-lg" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(totalDocumento)}</span>
                </div>
                {!isOrcamento && (
                  <>
                    <div className="flex justify-between py-1 text-black font-medium" style={{ color: 'black' }}>
                      <span>Total Pago:</span>
                      <span>{formatCurrency(totalPagoPelosMetodos)}</span>
                    </div>
                    {trocoReal > 0.009 && (
                      <div className="flex justify-between py-1 text-green-600 font-semibold" style={{ color: '#16a34a' }}>
                        <span>TROCO:</span>
                        <span>{formatCurrency(trocoReal)}</span>
                      </div>
                    )}
                    {restanteEmAberto > 0.009 && (
                        <div className="flex justify-between py-1 text-orange-600 font-semibold" style={{ color: '#ea580c' }}>
                            <span>Restante em Aberto:</span>
                            <span>{formatCurrency(restanteEmAberto)}</span>
                        </div>
                    )}
                  </>
                )}
              </div>
            </section>

            <hr className="my-3 sm:my-4 border-gray-300" style={{ borderColor: '#d1d5db' }} />
            
            <section className="mb-4 sm:mb-6 bg-gray-50 p-2 sm:p-3 rounded-md border border-gray-300" style={{ backgroundColor: '#f9fafb', borderColor: '#d1d5db' }}>
                <h2 className="text-base sm:text-lg font-semibold text-blue-600 mb-2 flex items-center" style={{ color: '#2563eb' }}>
                    <Info size={18} className="mr-2"/> INFORMAÇÕES ADICIONAIS
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] sm:text-xs">
                    <div className="flex items-center"><UserIcon size={14} className="mr-1.5 text-gray-600" style={{ color: '#4b5563' }}/><strong className="text-black" style={{ color: 'black' }}>Vendedor:</strong><span className="ml-1 text-black" style={{ color: 'black' }}>{documento.vendedor_nome || 'N/A'}</span></div>
                    <div className="flex items-center"><CalendarDays size={14} className="mr-1.5 text-gray-600" style={{ color: '#4b5563' }}/><strong className="text-black" style={{ color: 'black' }}>Data da Venda:</strong><span className="ml-1 text-black" style={{ color: 'black' }}>{dataDocumento && isValid(dataDocumento) ? format(dataDocumento, "dd/MM/yyyy HH:mm", { locale: ptBR }) : 'N/A'}</span></div>
                    <div className="flex items-center"><CheckCircle2 size={14} className="mr-1.5 text-gray-600" style={{ color: '#4b5563' }}/><strong className="text-black" style={{ color: 'black' }}>Status:</strong><span className="ml-1 text-black" style={{ color: 'black' }}>{documento.status || 'N/A'}</span></div>
                    <div className="flex items-center"><ShoppingBag size={14} className="mr-1.5 text-gray-600" style={{ color: '#4b5563' }}/><strong className="text-black" style={{ color: 'black' }}>Tipo:</strong><span className="ml-1 text-black" style={{ color: 'black' }}>{documento.origem_venda || (isOrcamento ? 'Orçamento PDV' : 'Venda PDV')}</span></div>
                </div>
            </section>
            
            {isOrcamento && validadeOrcamento && (
                <section className="mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-gray-300 text-center" style={{ borderTopColor: '#d1d5db' }}>
                    <p className="text-[9px] sm:text-xs font-medium text-red-500 flex items-center justify-center" style={{ color: '#ef4444' }}>
                        <CalendarDays size={14} className="mr-1"/>
                        Este orçamento é válido até: {validadeOrcamento}
                    </p>
                </section>
            )}

            {documento.observacoes && (
              <section className="mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-gray-300" style={{ borderTopColor: '#d1d5db' }}>
                <h3 className="text-sm sm:text-base font-semibold text-blue-600 mb-1" style={{ color: '#2563eb' }}>Observações:</h3>
                <p className="text-[9px] sm:text-xs whitespace-pre-wrap text-gray-600 bg-gray-50 p-1.5 sm:p-2 rounded-md border border-gray-300" style={{ color: '#4b5563', backgroundColor: '#f9fafb', borderColor: '#d1d5db' }}>{documento.observacoes}</p>
              </section>
            )}

            {(settings.termosCondicoesRecibo || settings.informacoesPagamentoRecibo) && (
              <section className="mb-4 sm:mb-6 pt-3 sm:pt-4 border-t border-gray-300 text-[9px] sm:text-xs text-gray-600" style={{ borderTopColor: '#d1d5db', color: '#4b5563' }}>
                {settings.informacoesPagamentoRecibo && (
                  <div className="mb-2">
                    <h3 className="font-semibold text-black" style={{ color: 'black' }}>Informações de Pagamento:</h3>
                    <p className="whitespace-pre-wrap">{settings.informacoesPagamentoRecibo}</p>
                  </div>
                )}
                {settings.termosCondicoesRecibo && (
                  <div>
                    <h3 className="font-semibold text-black" style={{ color: 'black' }}>Termos e Condições:</h3>
                    <p className="whitespace-pre-wrap">{settings.termosCondicoesRecibo}</p>
                  </div>
                )}
              </section>
            )}

            <footer className="text-center mt-6 pt-4 border-t border-gray-300 text-[9px] sm:text-xs text-gray-600" style={{ borderTopColor: '#d1d5db', color: '#4b5563' }}>
                <p>{settings.mensagemPersonalizadaRodape}</p>
                <p className="mt-0.5">Gerado por: {settings.nomeSistema || 'Sistema Gráfico'} em {format(new Date(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
            </footer>
            
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 sm:p-6 pt-0 sm:pt-0 border-t-0 bg-gray-100 print:hidden" style={{ backgroundColor: '#f3f4f6' }}>
          <div className="flex flex-wrap justify-center sm:justify-end gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={handleImpressaoDireta} 
              className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 h-auto bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              style={{ backgroundColor: 'white', color: '#374151', borderColor: '#d1d5db' }}
            >
              <Printer size={16} /> Imprimir
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGerarPdfReciboComLoading} 
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 h-auto bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              style={{ backgroundColor: 'white', color: '#374151', borderColor: '#d1d5db' }}
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={16} /> Baixar PDF
                </>
              )}
            </Button>
            <Button 
              onClick={handleNovoPedido} 
              className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 h-auto bg-green-600 hover:bg-green-700 text-white"
              style={{ backgroundColor: '#16a34a', color: 'white' }}
            >
              <RotateCcw size={16} /> Novo Pedido
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleVoltarHistorico} 
              className="flex items-center gap-1.5 text-xs sm:text-sm py-1.5 px-3 h-auto bg-white hover:bg-gray-50 text-gray-700"
              style={{ backgroundColor: 'white', color: '#374151' }}
            >
              <ArrowLeft size={16} /> Voltar ao Histórico
            </Button>
            <DialogClose asChild>
              <Button 
                variant="secondary" 
                className="text-xs sm:text-sm py-1.5 px-3 h-auto bg-gray-200 hover:bg-gray-300 text-gray-700"
                style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
              >
                Fechar
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PDVReciboModal;