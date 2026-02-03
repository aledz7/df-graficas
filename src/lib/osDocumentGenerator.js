import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { getImageUrl } from './imageUtils';
import { safeParseFloat } from './utils';

// Função para carregar logo de forma assíncrona
const loadLogo = (logoUrl) => {
  return new Promise((resolve) => {
    if (!logoUrl) {
      resolve(null);
      return;
    }
    
    // Processar a URL da logo usando getImageUrl
    const processedUrl = getImageUrl(logoUrl);
    console.log('🖼️ [PDF Generator] URL original:', logoUrl);
    console.log('🖼️ [PDF Generator] URL processada:', processedUrl);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('✅ [PDF Generator] Logo carregada com sucesso');
      resolve(img);
    };
    img.onerror = () => {
      console.warn('❌ [PDF Generator] Erro ao carregar logo:', processedUrl);
      resolve(null);
    };
    img.src = processedUrl;
  });
};

// Função para converter imagem para base64
const imageToBase64 = (img) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    } catch (error) {
      console.error('Erro ao converter imagem para base64:', error);
      reject(error);
    }
  });
};

// Função para carregar imagem e converter para base64
const loadImageAsBase64 = (src) => {
  return new Promise(async (resolve) => {
    console.log('🔄 [PDF Generator] Tentando converter imagem:', src);
    
    // Se já for base64 ou blob, retornar como está
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      console.log('✅ [PDF Generator] Imagem já está em base64/blob');
      resolve(src);
      return;
    }

    // Tentar primeiro com fetch (melhor para CORS)
    try {
      console.log('🔄 [PDF Generator] Tentando carregar via fetch...');
      const response = await fetch(src);
      const blob = await response.blob();
      console.log('✅ [PDF Generator] Blob carregado, convertendo para base64...');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('✅ [PDF Generator] Imagem convertida para base64 via fetch');
        resolve(reader.result);
      };
      reader.onerror = () => {
        console.warn('❌ [PDF Generator] Erro ao ler blob, tentando método alternativo...');
        // Fallback para método com Image()
        tryImageMethod();
      };
      reader.readAsDataURL(blob);
      return;
    } catch (error) {
      console.warn('❌ [PDF Generator] Erro no fetch, tentando método alternativo:', error);
      tryImageMethod();
    }
    
    // Método alternativo usando Image()
    function tryImageMethod() {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          console.log('✅ [PDF Generator] Imagem carregada via Image(), convertendo para base64...');
          const base64 = await imageToBase64(img);
          console.log('✅ [PDF Generator] Imagem convertida para base64 com sucesso');
          resolve(base64);
        } catch (error) {
          console.warn('❌ [PDF Generator] Erro ao converter imagem:', error);
          resolve(''); // Retornar string vazia em caso de erro
        }
      };
      
      img.onerror = (error) => {
        console.warn('❌ [PDF Generator] Erro ao carregar imagem via Image():', src, error);
        resolve(''); // Retornar string vazia em caso de erro
      };
      
      // Adicionar timestamp para evitar cache
      const srcWithTimestamp = src.includes('?') ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`;
      console.log('🔄 [PDF Generator] Carregando imagem com src:', srcWithTimestamp);
      img.src = srcWithTimestamp;
    }
  });
};

// Função para pré-carregar e converter todas as imagens do elemento para base64
const preloadAndConvertImages = async (element) => {
  console.log('🔄 [PDF Generator] Iniciando conversão de imagens para base64...');
  
  // Encontrar todas as imagens no elemento
  const images = element.querySelectorAll('img');
  console.log(`📷 [PDF Generator] Encontradas ${images.length} imagens`);
  
  if (images.length === 0) {
    console.log('ℹ️ [PDF Generator] Nenhuma imagem encontrada no elemento');
    return;
  }
  
  // Converter cada imagem para base64
  const conversions = Array.from(images).map(async (img, index) => {
    const originalSrc = img.src;
    console.log(`🔄 [PDF Generator] Convertendo imagem ${index + 1}/${images.length}:`, originalSrc);
    
    try {
      const base64Src = await loadImageAsBase64(originalSrc);
      img.src = base64Src;
      console.log(`✅ [PDF Generator] Imagem ${index + 1} convertida com sucesso`);
    } catch (error) {
      console.warn(`❌ [PDF Generator] Erro ao converter imagem ${index + 1}:`, error);
    }
  });
  
  // Aguardar todas as conversões completarem
  await Promise.all(conversions);
  console.log('✅ [PDF Generator] Todas as imagens foram processadas');
  
  // Aguardar um pouco mais para garantir que o DOM foi atualizado
  await new Promise(resolve => setTimeout(resolve, 500));
};

// Função alternativa para gerar PDF baseado em texto
export const generateTextBasedPdf = async (documento, empresaSettings, fileName, logoUrl = null) => {
  console.log('🔍 [PDF Generator] Dados recebidos:');
  console.log('📄 Documento:', documento);
  console.log('🏢 Empresa Settings:', empresaSettings);
  console.log('🖼️ Logo URL:', logoUrl);
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let yPosition = 20;
  
  // Cabeçalho - replicando o layout do modal
  // Função helper para tratar valores null/undefined
  const getValue = (value, fallback = 'Não informado') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };
  
  // Verificar se empresaSettings está vazio
  if (!empresaSettings || Object.keys(empresaSettings).length === 0) {
    console.warn('⚠️ [PDF Generator] empresaSettings está vazio, usando dados padrão');
    empresaSettings = {
      nome_fantasia: 'JET-IMPRE',
      cnpj: 'Não informado',
      telefone: 'Não informado',
      email: 'Não informado'
    };
  }
  
  // Carregar logo de forma assíncrona
  console.log('🖼️ [PDF Generator] Carregando logo...');
  const logoImg = await loadLogo(logoUrl);
  console.log('🖼️ [PDF Generator] Logo carregada:', logoImg ? 'Sim' : 'Não');
  
  if (logoImg) {
    try {
      const logoWidth = 50;
      const logoHeight = 20;
      doc.addImage(logoImg, 'PNG', 20, yPosition, logoWidth, logoHeight);
      console.log('✅ [PDF Generator] Logo adicionada ao PDF');
    } catch (error) {
      console.warn('❌ [PDF Generator] Erro ao adicionar logo ao PDF:', error);
      // Fallback para placeholder
      doc.setFillColor(240, 240, 240);
      doc.rect(20, yPosition, 50, 20, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('LOGO EMPRESA', 45, yPosition + 12, { align: 'center' });
    }
  } else {
    // Logo placeholder (área reservada)
    console.log('📦 [PDF Generator] Usando placeholder da logo');
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPosition, 50, 20, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('LOGO EMPRESA', 45, yPosition + 12, { align: 'center' });
  }
  
  // Nome da empresa
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const nomeEmpresa = getValue(empresaSettings.nome_fantasia || empresaSettings.nomeFantasia, 'JET-IMPRE');
  console.log('🏢 [PDF Generator] Nome da empresa:', nomeEmpresa);
  doc.text(nomeEmpresa, 20, yPosition + 25);
  
  // Dados da empresa
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const cnpj = getValue(empresaSettings.cnpj, 'Não informado');
  const telefone = getValue(empresaSettings.telefone, 'Não informado');
  const email = getValue(empresaSettings.email, 'Não informado');
  
  console.log('📋 [PDF Generator] Dados da empresa:');
  console.log('  - CNPJ:', cnpj);
  console.log('  - Telefone:', telefone);
  console.log('  - Email:', email);
  
  doc.text(`CNPJ: ${cnpj}`, 20, yPosition + 30);
  doc.text(`Tel: ${telefone} | Email: ${email}`, 20, yPosition + 33);
  
  // Endereço se disponível
  const endereco = getValue(empresaSettings.endereco_completo || empresaSettings.enderecoCompleto);
  if (endereco !== 'Não informado') {
    console.log('  - Endereço:', endereco);
    doc.text(endereco, 20, yPosition + 36);
  }
  
  // Informações da OS (lado direito)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`OS Nº ${documento.id || 'N/A'}`, pageWidth - 20, yPosition + 10, { align: 'right' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data Emissão: ${new Date(documento.data_criacao).toLocaleDateString('pt-BR')} ${new Date(documento.data_criacao).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`, pageWidth - 20, yPosition + 15, { align: 'right' });
  
  if (documento.data_finalizacao_os) {
    doc.text(`Data Finalização: ${new Date(documento.data_finalizacao_os).toLocaleDateString('pt-BR')} ${new Date(documento.data_finalizacao_os).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`, pageWidth - 20, yPosition + 18, { align: 'right' });
  }
  
  doc.text(`Atendente: ${documento.vendedor_nome || 'Não informado'}`, pageWidth - 20, yPosition + 21, { align: 'right' });
  
  yPosition += 45;
  
  // Seção Dados do Cliente (caixa cinza)
  doc.setFillColor(249, 250, 251);
  doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(20, yPosition, pageWidth - 40, 25, 'S');
  
  // Título da seção
  doc.setFillColor(243, 244, 246);
  doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Cliente', 25, yPosition + 5.5);
  
  // Dados do cliente
  yPosition += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${documento.cliente?.nome || documento.cliente?.nome_completo || documento.cliente_info?.nome_completo || documento.cliente_info?.nome || documento.cliente_nome_manual || 'Não informado'}`, 25, yPosition);
  
  yPosition += 4;
  doc.text(`CPF/CNPJ: ${documento.cliente?.cpf_cnpj || documento.cliente_info?.cpf_cnpj || 'Não informado'}`, 25, yPosition);
  
  yPosition += 4;
  doc.text(`Telefone: ${documento.cliente?.telefone_principal || documento.cliente?.telefone || documento.cliente_info?.telefone_principal || documento.cliente_info?.telefone || 'Não informado'}`, 25, yPosition);
  
  yPosition += 4;
  doc.text(`Email: ${documento.cliente?.email || documento.cliente_info?.email || 'Não informado'}`, 25, yPosition);
  
  // Desconto terceirizado se aplicável
  if (parseFloat(documento.desconto_terceirizado_percentual || 0) > 0) {
    yPosition += 4;
    doc.setFont('helvetica', 'bold');
    doc.text(`Cliente Terceirizado - Desconto de ${parseFloat(documento.desconto_terceirizado_percentual || 0).toFixed(2).replace('.',',')}% aplicado`, 25, yPosition);
  }
  
  yPosition += 15;
  
  // Seção Itens do Serviço/Pedido
  doc.setFillColor(249, 250, 251);
  doc.rect(20, yPosition, pageWidth - 40, 15, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(20, yPosition, pageWidth - 40, 15, 'S');
  
  // Título da seção
  doc.setFillColor(243, 244, 246);
  doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Itens do Serviço/Pedido', 25, yPosition + 5.5);
  
  yPosition += 20;
  
  // Função auxiliar para formatar informações de consumo de material de forma compacta
  const formatarConsumoMaterialParaNotinha = (item) => {
    if (!item) return '';
    
    const consumoMaterial = item.consumo_material_utilizado;
    const consumoLarguraPeca = safeParseFloat(item.consumo_largura_peca, 0);
    const consumoAlturaPeca = safeParseFloat(item.consumo_altura_peca, 0);
    const consumoLarguraChapa = safeParseFloat(item.consumo_largura_chapa, 0);
    const consumoAlturaChapa = safeParseFloat(item.consumo_altura_chapa, 0);
    const consumoPecasPorChapa = Math.max(0, Math.floor(safeParseFloat(item.consumo_pecas_por_chapa, 0)));
    const consumoChapasNecessarias = Math.max(0, Math.ceil(safeParseFloat(item.consumo_chapas_necessarias, 0)));
    const consumoAproveitamento = safeParseFloat(item.consumo_aproveitamento_percentual, 0);
    const consumoCustoTotal = safeParseFloat(item.consumo_custo_total, 0);
    const consumoCustoUnitario = safeParseFloat(item.consumo_custo_unitario, 0);
    
    if (!consumoMaterial && consumoChapasNecessarias === 0 && consumoCustoTotal === 0) {
      return '';
    }
    
    let linhas = [];
    
    // Dimensões da peça
    if (consumoLarguraPeca > 0 && consumoAlturaPeca > 0) {
      const areaPeca = (consumoLarguraPeca * consumoAlturaPeca) / 10000; // cm² para m²
      linhas.push(`${(consumoLarguraPeca / 100).toFixed(2).replace('.', ',')}m x ${(consumoAlturaPeca / 100).toFixed(2).replace('.', ',')}m (Area ${areaPeca.toFixed(3).replace('.', ',')}m²)`);
    }
    
    // Material utilizado
    if (consumoMaterial) {
      let materialInfo = consumoMaterial;
      if (consumoLarguraChapa > 0 && consumoAlturaChapa > 0) {
        materialInfo += ` (${(consumoLarguraChapa / 100).toFixed(2).replace('.', ',')}m x ${(consumoAlturaChapa / 100).toFixed(2).replace('.', ',')}m)`;
      }
      linhas.push(`Material: ${materialInfo}`);
    }
    
    // Consumo
    if (consumoChapasNecessarias > 0) {
      let consumoInfo = `Consumo: ${consumoChapasNecessarias} chapa(s)`;
      if (consumoPecasPorChapa > 0) {
        consumoInfo += ` - ${consumoPecasPorChapa} peça(s)/chapa`;
      }
      if (consumoAproveitamento > 0) {
        consumoInfo += ` - Aproveitamento ${consumoAproveitamento.toFixed(2).replace('.', ',')}%`;
      }
      linhas.push(consumoInfo);
    }
    
    // Custo material
    if (consumoCustoTotal > 0) {
      let custoInfo = `Custo material: R$ ${consumoCustoTotal.toFixed(2).replace('.', ',')}`;
      if (consumoCustoUnitario > 0) {
        custoInfo += ` (R$ ${consumoCustoUnitario.toFixed(2).replace('.', ',')}/peça)`;
      }
      linhas.push(custoInfo);
    }
    
    return linhas.length > 0 ? linhas.join(' | ') : '';
  };

  // Tabela de itens
  if (documento.itens && Array.isArray(documento.itens) && documento.itens.length > 0) {
    const tableHeaders = ['Arte', 'Produto/Serviço', 'Qtd.', 'Subtotal'];
    const tableData = documento.itens.map(item => {
      // Calcular subtotal do item
      const subtotal = parseFloat(item.subtotal_item || 0);
      const quantidade = item.quantidade || 1;
      const dimensoes = item.tipo_item === 'm2' ? ` (${String(item.altura || '0').replace('.',',')}m x ${String(item.largura || '0').replace('.',',')}m)` : '';
      const areaM2 = item.tipo_item === 'm2' ? ` (${(parseFloat(String(item.altura || '0').replace(',','.')) * parseFloat(String(item.largura || '0').replace(',','.')) * parseInt(item.quantidade)).toFixed(2).replace('.',',')}m²)` : '';
      
      // Informações de consumo de material
      const consumoMaterialTexto = formatarConsumoMaterialParaNotinha(item);
      const descricaoCompleta = `${item.nome_servico_produto || item.nome_produto || 'Item sem nome'}${dimensoes}${consumoMaterialTexto ? ` | ${consumoMaterialTexto}` : ''}`;
      
      return [
        '', // Arte (vazio por enquanto)
        descricaoCompleta,
        `${quantidade}${areaM2}`,
        `R$ ${subtotal.toFixed(2).replace('.', ',')}`
      ];
    });
    
    doc.autoTable({
      head: [tableHeaders], // Converter array de strings em array de arrays
      body: tableData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      styles: { 
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: { 
        fillColor: [243, 244, 246],
        textColor: [55, 65, 81],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Arte
        1: { cellWidth: 80 }, // Produto/Serviço
        2: { cellWidth: 25 }, // Qtd
        3: { cellWidth: 25 }  // Subtotal
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      }
    });
    
    yPosition = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Nenhum item registrado', 25, yPosition);
    yPosition += 10;
  }
  
  // Seção Resumo Financeiro (caixa cinza)
  doc.setFillColor(249, 250, 251);
  doc.rect(20, yPosition, pageWidth - 40, 30, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(20, yPosition, pageWidth - 40, 30, 'S');
  
  // Título da seção
  doc.setFillColor(243, 244, 246);
  doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo de Valores', 25, yPosition + 5.5);
  
  yPosition += 12;
  
  // Calcular valores
  const subtotalItens = documento.itens && Array.isArray(documento.itens) 
    ? documento.itens.reduce((sum, item) => sum + parseFloat(item.subtotal_item || 0), 0)
    : 0;
  
  const descontoTerceirizadoPercentual = parseFloat(documento.desconto_terceirizado_percentual || 0);
  const descontoTerceirizadoValor = (subtotalItens * descontoTerceirizadoPercentual) / 100;
  
  const descontoGeralTipo = documento.desconto_geral_tipo || 'percentual';
  const descontoGeralValor = parseFloat(documento.desconto_geral_valor || 0);
  let descontoGeralCalculado = 0;
  if (descontoGeralValor > 0) {
    if (descontoGeralTipo === 'percentual') {
      const valorAposTerceirizado = subtotalItens - descontoTerceirizadoValor;
      descontoGeralCalculado = (valorAposTerceirizado * descontoGeralValor) / 100;
    } else {
      descontoGeralCalculado = descontoGeralValor;
    }
  }
  
  const freteValor = parseFloat(documento.frete_valor || 0);
  const valorTotalCalculado = subtotalItens - descontoTerceirizadoValor - descontoGeralCalculado + freteValor;
  
  // Exibir valores
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  // Subtotal dos itens
  doc.text('Subtotal dos Itens:', 25, yPosition);
  doc.text(`R$ ${subtotalItens.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
  yPosition += 4;
  
  // Desconto terceirizado
  if (descontoTerceirizadoPercentual > 0) {
    doc.text(`Desconto Terceirizado (${descontoTerceirizadoPercentual.toFixed(2).replace('.',',')}%):`, 25, yPosition);
    doc.text(`- R$ ${descontoTerceirizadoValor.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 4;
  }
  
  // Desconto geral
  if (descontoGeralValor > 0) {
    const label = descontoGeralTipo === 'percentual' ? `Desconto Geral (${descontoGeralValor.toFixed(2).replace('.',',')}%)` : 'Desconto Geral (Valor Fixo)';
    doc.text(`${label}:`, 25, yPosition);
    doc.text(`- R$ ${descontoGeralCalculado.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 4;
  }
  
  // Frete
  if (freteValor > 0) {
    doc.text('Frete:', 25, yPosition);
    doc.text(`+ R$ ${freteValor.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 4;
  }
  
  // Linha separadora
  doc.setDrawColor(209, 213, 219);
  doc.line(25, yPosition, pageWidth - 25, yPosition);
  yPosition += 4;
  
  // Valor total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VALOR TOTAL:', 25, yPosition);
  doc.text(`R$ ${valorTotalCalculado.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
  
  yPosition += 20;
  
  // Seção Pagamentos (se houver)
  if (documento.pagamentos && Array.isArray(documento.pagamentos) && documento.pagamentos.length > 0) {
    doc.setFillColor(249, 250, 251);
    doc.rect(20, yPosition, pageWidth - 40, 25, 'F');
    doc.setDrawColor(209, 213, 219);
    doc.rect(20, yPosition, pageWidth - 40, 25, 'S');
    
    // Título da seção
    doc.setFillColor(243, 244, 246);
    doc.rect(20, yPosition, pageWidth - 40, 8, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes do Pagamento', 25, yPosition + 5.5);
    
    yPosition += 12;
    
    let totalPago = 0;
    documento.pagamentos.forEach((pag, index) => {
      const valor = parseFloat(pag.valorFinal || pag.valor || 0);
      totalPago += valor;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pag.metodo}:`, 25, yPosition);
      doc.text(`R$ ${valor.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
      
      if (index < documento.pagamentos.length - 1) {
        yPosition += 4;
        // Linha separadora
        doc.setDrawColor(209, 213, 219);
        doc.line(25, yPosition, pageWidth - 25, yPosition);
        yPosition += 4;
      }
    });
    
    yPosition += 4;
    // Linha separadora final
    doc.setDrawColor(209, 213, 219);
    doc.line(25, yPosition, pageWidth - 25, yPosition);
    yPosition += 4;
    
    // Total pago
    doc.setFont('helvetica', 'bold');
    doc.text('Total Pago:', 25, yPosition);
    doc.text(`R$ ${totalPago.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
    
    const saldoPendente = valorTotalCalculado - totalPago;
    if (saldoPendente > 0.01) {
      yPosition += 4;
      doc.text('Valor Pendente:', 25, yPosition);
      doc.text(`R$ ${saldoPendente.toFixed(2).replace('.', ',')}`, pageWidth - 25, yPosition, { align: 'right' });
    }
    
    yPosition += 20;
  }
  
  // Rodapé
  yPosition = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(empresaSettings.mensagemPersonalizadaRodape || 'Obrigado pela preferência!', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 4;
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });
  
  doc.save(fileName);
};

export const generatePdfFromElement = async (element, fileName) => {
  if (!element) {
    throw new Error("Elemento para gerar PDF não foi encontrado.");
  }
  
  console.log('🔄 [PDF Generator] Iniciando geração de PDF...');
  
  try {
    // Clonar o elemento para não modificar o original
    const clonedElement = element.cloneNode(true);
    
    // Adicionar o elemento clonado ao DOM temporariamente (oculto)
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '0';
    document.body.appendChild(clonedElement);
    
    // Pré-carregar e converter todas as imagens para base64
    await preloadAndConvertImages(clonedElement);
    
    console.log('📸 [PDF Generator] Capturando elemento com html2canvas...');
    const canvas = await html2canvas(clonedElement, { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Remover o elemento clonado do DOM
    document.body.removeChild(clonedElement);
    
    console.log('✅ [PDF Generator] Canvas gerado com sucesso');
    
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
    const y = (pdfHeight - imgHeight) / 2;
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
    pdf.save(fileName);
    console.log('✅ [PDF Generator] PDF salvo com sucesso');
  } catch (error) {
    console.error("❌ [PDF Generator] Erro detalhado ao gerar PDF:", error);
    
    // Tentar fallback com configurações mais simples
    try {
      console.log("🔄 [PDF Generator] Tentando fallback com configurações simplificadas...");
      
      // Clonar o elemento para não modificar o original
      const clonedElement = element.cloneNode(true);
      
      // Adicionar o elemento clonado ao DOM temporariamente (oculto)
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      clonedElement.style.top = '0';
      document.body.appendChild(clonedElement);
      
      // Pré-carregar e converter todas as imagens para base64
      await preloadAndConvertImages(clonedElement);
      
      const canvas = await html2canvas(clonedElement, { 
        scale: 1, 
        useCORS: false, 
        logging: false,
        allowTaint: false,
        backgroundColor: '#ffffff',
        removeContainer: true
      });
      
      // Remover o elemento clonado do DOM
      document.body.removeChild(clonedElement);
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
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
      const y = (pdfHeight - imgHeight) / 2;
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(fileName);
      console.log('✅ [PDF Generator] PDF salvo com sucesso (fallback)');
    } catch (fallbackError) {
      console.error("❌ [PDF Generator] Erro no fallback também:", fallbackError);
      throw new Error("Erro ao processar o conteúdo da página. Tente usar a opção de impressão em vez do PDF.");
    }
  }
};

export const printElement = async (element, documentTitle) => {
  if (!element) {
    throw new Error("Elemento para impressão não foi encontrado.");
  }
  
  console.log('🔄 [PDF Generator] Iniciando impressão...');
  
  try {
    // Clonar o elemento para não modificar o original
    const clonedElement = element.cloneNode(true);
    
    // Adicionar o elemento clonado ao DOM temporariamente (oculto)
    clonedElement.style.position = 'absolute';
    clonedElement.style.left = '-9999px';
    clonedElement.style.top = '0';
    document.body.appendChild(clonedElement);
    
    // Pré-carregar e converter todas as imagens para base64
    await preloadAndConvertImages(clonedElement);
    
    console.log('📸 [PDF Generator] Capturando elemento para impressão...');
    const canvas = await html2canvas(clonedElement, { 
      scale: 2, 
      useCORS: true, 
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });
    
    // Remover o elemento clonado do DOM
    document.body.removeChild(clonedElement);
    
    console.log('✅ [PDF Generator] Abrindo janela de impressão...');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>${documentTitle}</title>`);
    printWindow.document.write('<style>body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; } img { max-width: 100%; max-height: 95vh; object-fit: contain; } @page { size: A4; margin: 10mm; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<img src="' + canvas.toDataURL('image/png') + '" />');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  } catch (error) {
    console.error("❌ [PDF Generator] Erro ao preparar impressão:", error);
    throw error;
  }
};

// Nova função de impressão direta sem usar html2canvas
export const printElementDirect = (element, documentTitle) => {
  if (!element) {
    throw new Error("Elemento para impressão não foi encontrado.");
  }
  
  // Clonar o elemento para não afetar o original
  const clonedContent = element.cloneNode(true);
  
  // Abrir uma nova janela para impressão
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<html><head><title>${documentTitle}</title>`);
  
  // Adicionar estilos para impressão
  printWindow.document.write(`
    <style>
      @media print {
        @page { size: A4; margin: 10mm; }
        body { margin: 0; }
        .print-hidden { display: none !important; }
      }
      body { 
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
      }
      .printable-container {
        max-width: 800px;
        margin: 0 auto;
      }
    </style>
  `);
  
  // Adicionar o conteúdo clonado
  printWindow.document.write('</head><body><div class="printable-container">');
  printWindow.document.write(clonedContent.outerHTML);
  printWindow.document.write('</div></body></html>');
  
  // Remover elementos que não devem ser impressos
  const elementsToHide = printWindow.document.querySelectorAll('.print-hidden');
  elementsToHide.forEach(el => {
    el.style.display = 'none';
  });
  
  printWindow.document.close();
  printWindow.focus();
  
  // Imprimir após um pequeno delay para garantir que o conteúdo seja carregado
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

