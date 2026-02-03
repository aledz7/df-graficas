import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPdf = (title, headers, data, summaryData, logoUrl, nomeEmpresa) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cores modernas inspiradas no Canva
  const colors = {
    primary: [59, 130, 246], // Azul moderno
    secondary: [16, 185, 129], // Verde esmeralda
    accent: [139, 92, 246], // Roxo vibrante
    warning: [245, 158, 11], // Laranja
    danger: [239, 68, 68], // Vermelho
    light: [248, 250, 252], // Cinza claro
    dark: [31, 41, 55], // Cinza escuro
    text: [55, 65, 81], // Cinza texto
    border: [229, 231, 235] // Cinza borda
  };

  if (logoUrl) {
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => {
        try {
            doc.addImage(img, 'PNG', 14, 10, 30, 15);
        } catch (e) {
            console.error("Erro ao adicionar imagem ao PDF:", e);
        }
        generateContent();
    };
    img.onerror = () => {
        console.error("Não foi possível carregar a imagem para o PDF.");
        generateContent();
    };
  } else {
    generateContent();
  }
  
  function generateContent() {
    // Forçar fundo branco em todas as páginas
    forceWhiteBackground();
    
    // Cabeçalho com design moderno
    drawHeader();
    
    // Resumo em formato de tópicos
    if (summaryData && summaryData.length > 0) {
      drawSummaryTopics(summaryData);
    }
    
    // Tabela principal com design moderno
    drawModernTable(headers, data);
    
    // Rodapé estilizado
    drawFooter();
    
    // Salvar arquivo
    doc.save(`${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  function forceWhiteBackground() {
    // Forçar fundo branco em todas as páginas existentes e futuras
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  }

  function drawHeader() {
    // Background branco forçado para garantir que o PDF sempre tenha fundo claro
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Logo (se existir) - apenas se a URL for válida
    if (logoUrl && logoUrl.trim() !== '' && logoUrl !== 'undefined') {
      try {
        // Verificar se a URL é válida
        if (logoUrl.startsWith('http') || logoUrl.startsWith('/') || logoUrl.startsWith('data:')) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              doc.addImage(img, 'PNG', 20, 15, 40, 20);
            } catch (e) {
              console.error("Erro ao adicionar logo ao PDF:", e);
            }
          };
          img.onerror = () => {
            console.warn("Não foi possível carregar a logo para o PDF:", logoUrl);
          };
          img.src = logoUrl;
        }
      } catch (e) {
        console.error("Erro ao processar logo:", e);
      }
    }
    
    // Nome da empresa - sempre em preto para garantir legibilidade
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Preto forçado
    doc.text(nomeEmpresa || 'JET-IMPRE', 20, 25);
    
    // Título do relatório - sempre em azul escuro para contraste
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 139); // Azul escuro para contraste
    doc.text(title, 20, 40);
    
    // Data de geração - sempre em cinza escuro
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(64, 64, 64); // Cinza escuro para legibilidade
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 20, 25, { align: 'right' });
    
    // Linha decorativa - removida para evitar conflitos
    // doc.setDrawColor(0, 0, 139);
    // doc.setLineWidth(3);
    // doc.line(20, 50, pageWidth - 20, 50);
  }

  function drawSummaryTopics(summaryData) {
    let startY = 70;
    
    // Título da seção de resumo
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Resumo Financeiro', 20, startY);
    startY += 15;
    
    // Fundo da seção
    const sectionHeight = summaryData.length * 12 + 20;
    doc.setFillColor(248, 250, 252); // Cinza muito claro
    doc.roundedRect(20, startY - 5, pageWidth - 40, sectionHeight, 5, 5, 'F');
    
    // Borda sutil
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(1);
    doc.roundedRect(20, startY - 5, pageWidth - 40, sectionHeight, 5, 5, 'S');
    
    // Desenhar cada tópico
    summaryData.forEach((item, index) => {
      const y = startY + (index * 12);
      
      // Círculo colorido para o tópico
      const colors = [
        [59, 130, 246],   // Azul
        [16, 185, 129],   // Verde
        [139, 92, 246],   // Roxo
        [245, 158, 11],   // Laranja
        [239, 68, 68]     // Vermelho
      ];
      const color = colors[index % colors.length];
      
      doc.setFillColor(color[0], color[1], color[2]);
      doc.circle(30, y + 3, 2, 'F');
      
      // Texto do tópico
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(item.label, 40, y + 4);
      
      // Valor do tópico
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(String(item.value || ''), pageWidth - 30, y + 4, { align: 'right' });
    });
    
    // Atualizar posição para a próxima seção
    startY += sectionHeight + 10;
  }


  function drawModernTable(headers, data) {
    let startY = 70;
    
    // Ajustar posição se houver resumo em tópicos
    if (summaryData && summaryData.length > 0) {
      const sectionHeight = summaryData.length * 12 + 20;
      startY = 70 + 15 + sectionHeight + 20; // Título + seção + espaçamento
    }
    
    // Verificar se há espaço suficiente na página atual
    if (startY > pageHeight - 100) {
      doc.addPage();
      startY = 20;
    }
    
    // Determinar o título da tabela baseado no título do relatório
    let tituloTabela = 'Detalhamento';
    if (title.toLowerCase().includes('sangria')) {
      tituloTabela = 'Movimentações de Caixa';
    } else if (title.toLowerCase().includes('venda')) {
      tituloTabela = 'Detalhamento das Vendas';
    }
    
    // Título da tabela - sempre em preto
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Preto forçado
    doc.text(tituloTabela, 20, startY);
    
    // Detectar o número de colunas para configuração dinâmica
    const numColunas = headers[0] ? headers[0].length : (headers.length || 4);
    
    // Configuração simples e limpa das colunas
    let columnStyles = {};
    if (numColunas === 4) {
      // Para sangrias/suprimentos
      columnStyles = {
        0: { cellWidth: 30, halign: 'center' },  // Data
        1: { cellWidth: 25, halign: 'center' },  // Tipo
        2: { cellWidth: 85 },                    // Motivo
        3: { cellWidth: 25, halign: 'right' }    // Valor
      };
    } else if (numColunas === 10) {
      // Para contas a receber - layout ultra compacto para caber na página
      // Largura total da página A4: 210mm, margens: 40mm (20mm cada lado) = 170mm disponível
      // Total das colunas: 23+14+14+11+14+14+14+14+17+19 = 154mm (com margem de segurança)
      columnStyles = {
        0: { cellWidth: 23, halign: 'left' },    // Cliente
        1: { cellWidth: 14, halign: 'right' },   // Valor Original
        2: { cellWidth: 14, halign: 'right' },   // Valor Pendente
        3: { cellWidth: 11, halign: 'right' },   // Juros
        4: { cellWidth: 14, halign: 'center' },  // Status
        5: { cellWidth: 14, halign: 'center' },  // Emissão
        6: { cellWidth: 14, halign: 'center' },  // Vencimento
        7: { cellWidth: 14, halign: 'center' },  // Pagamento
        8: { cellWidth: 17, halign: 'left' },    // Origem/Ref
        9: { cellWidth: 19, halign: 'left' }     // Descrição
      };
    } else if (numColunas >= 7) {
      // Para vendas - layout mais compacto
      columnStyles = {
        0: { cellWidth: 18, halign: 'center' },  // Data
        1: { cellWidth: 22, halign: 'center' },  // Tipo
        2: { cellWidth: 35 },                    // Cliente
        3: { cellWidth: 20, halign: 'center' },  // Forma Pag.
        4: { cellWidth: 20, halign: 'right' },   // Total
        5: { cellWidth: 18, halign: 'right' },   // Desconto
        6: { cellWidth: 20, halign: 'right' },   // Total Líquido
        7: { cellWidth: 25 }                     // Origem
      };
    }
    
    // Tabela simples e limpa
    // headers já é um array de arrays, então usar diretamente
    const headData = Array.isArray(headers[0]) ? headers : [headers];
    doc.autoTable({
      startY: startY + 10,
      head: headData,
      body: data,
      theme: 'striped',
      headStyles: { 
        fillColor: [0, 0, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: numColunas === 10 ? 7 : 9,
        cellPadding: numColunas === 10 ? 2 : 3
      },
      bodyStyles: {
        fontSize: numColunas === 10 ? 7 : 8,
        cellPadding: numColunas === 10 ? 1.5 : 2,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 10, right: 20, bottom: 20, left: 20 },
      tableWidth: numColunas === 10 ? 'wrap' : 'auto',
      columnStyles: columnStyles,
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.3,
        overflow: 'hidden', // Evitar quebra de linha desnecessária
        cellPadding: 2,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0]
      }
    });
  }

  function drawFooter() {
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
    // Linha decorativa no rodapé - removida para evitar conflitos
    // doc.setDrawColor(0, 0, 139);
    // doc.setLineWidth(1);
    // doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25);
      
      // Informações do rodapé - sempre em cinza escuro para legibilidade
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(64, 64, 64); // Cinza escuro forçado
      
      // Página
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      // Data de geração
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      doc.text(`Gerado em ${dataGeracao}`, 20, pageHeight - 15);
      
      // Nome da empresa
      doc.text(nomeEmpresa || 'JET-IMPRE', pageWidth - 20, pageHeight - 15, { align: 'right' });
    }
  }
};

// Função especializada para relatórios de recebimentos com layout profissional
export const exportRecebimentosToPdf = (title, headers, data, estatisticas, distribuicaoPorForma, topClientes, logoUrl, nomeEmpresa) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = 20;

  // Paleta de cores profissional
  const colors = {
    primary: [41, 98, 255],      // Azul corporativo
    success: [16, 185, 129],      // Verde
    warning: [251, 146, 60],      // Laranja
    accent: [139, 92, 246],       // Roxo
    dark: [17, 24, 39],           // Preto suave
    gray: [107, 114, 128],        // Cinza
    lightGray: [243, 244, 246],   // Cinza claro
    white: [255, 255, 255]
  };

  // === CABEÇALHO PROFISSIONAL ===
  function drawProfessionalHeader() {
    // Faixa superior com gradiente visual (simulado)
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Logo (se disponível)
    if (logoUrl && logoUrl.trim() !== '' && logoUrl !== 'undefined') {
      try {
        if (logoUrl.startsWith('http') || logoUrl.startsWith('/') || logoUrl.startsWith('data:')) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              doc.addImage(img, 'PNG', 15, 8, 35, 20);
            } catch (e) {
              console.error("Erro ao adicionar logo:", e);
            }
          };
          img.src = logoUrl;
        }
      } catch (e) {
        console.error("Erro ao processar logo:", e);
      }
    }
    
    // Nome da empresa
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(nomeEmpresa || 'JET-IMPRE', 55, 20);
    
    // Título do relatório
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 55, 30);
    
    // Data de geração
    doc.setFontSize(9);
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Gerado em: ${dataGeracao}`, pageWidth - 15, 25, { align: 'right' });
    
    currentY = 55;
  }

  // === CARDS DE ESTATÍSTICAS ===
  function drawStatisticsCards() {
    const cardData = [
      { 
        label: 'Total Recebido', 
        value: `R$ ${estatisticas.totalRecebido.toFixed(2)}`,
        color: colors.success,
        icon: '$'
      },
      { 
        label: 'Quantidade', 
        value: estatisticas.quantidade,
        color: colors.primary,
        icon: '#'
      },
      { 
        label: 'Ticket Médio', 
        value: `R$ ${estatisticas.ticketMedio.toFixed(2)}`,
        color: colors.accent,
        icon: '~'
      },
      { 
        label: 'Maior Recebimento', 
        value: `R$ ${estatisticas.maiorRecebimento.toFixed(2)}`,
        color: colors.warning,
        icon: '↑'
      }
    ];

    const cardWidth = 45;
    const cardHeight = 28;
    const spacing = 3;
    const startX = 15;

    cardData.forEach((card, index) => {
      const x = startX + (index * (cardWidth + spacing));
      const y = currentY;

      // Sombra
      doc.setFillColor(220, 220, 220);
      doc.roundedRect(x + 1, y + 1, cardWidth, cardHeight, 3, 3, 'F');

      // Card principal
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'F');
      
      // Borda colorida superior
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.rect(x, y, cardWidth, 4, 'F');

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      const labelLines = doc.splitTextToSize(card.label, cardWidth - 4);
      doc.text(labelLines, x + 2, y + 10);

      // Valor
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      const valueText = String(card.value);
      const valueLines = doc.splitTextToSize(valueText, cardWidth - 4);
      doc.text(valueLines, x + 2, y + 20);
    });

    currentY += cardHeight + 10;
  }

  // === GRÁFICO DE DISTRIBUIÇÃO (VISUAL EM TEXTO) ===
  function drawDistributionChart() {
    if (!distribuicaoPorForma || distribuicaoPorForma.length === 0) return;

    // Título da seção
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text('Distribuição por Forma de Pagamento', 15, currentY);
    currentY += 8;

    // Fundo da seção
    const sectionHeight = (distribuicaoPorForma.length * 12) + 10;
    doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
    doc.roundedRect(15, currentY, pageWidth - 30, sectionHeight, 3, 3, 'F');
    
    currentY += 5;

    const chartColors = [
      [59, 130, 246],   // Azul
      [16, 185, 129],   // Verde
      [251, 146, 60],   // Laranja
      [139, 92, 246],   // Roxo
      [236, 72, 153],   // Rosa
      [14, 165, 233],   // Ciano
    ];

    const total = distribuicaoPorForma.reduce((acc, item) => acc + item.value, 0);
    const maxBarWidth = pageWidth - 100;

    distribuicaoPorForma.forEach((item, index) => {
      const percentage = (item.value / total) * 100;
      const barWidth = (percentage / 100) * maxBarWidth;
      const color = chartColors[index % chartColors.length];

      // Barra
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(20, currentY, barWidth, 8, 2, 2, 'F');

      // Nome
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.text(item.name, 22, currentY + 5.5);

      // Valor e percentual
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      const valueText = `R$ ${item.value.toFixed(2)} (${percentage.toFixed(1)}%)`;
      doc.text(valueText, pageWidth - 20, currentY + 5.5, { align: 'right' });

      currentY += 12;
    });

    currentY += 5;
  }

  // === TOP CLIENTES ===
  function drawTopClientes() {
    if (!topClientes || topClientes.length === 0) return;

    // Verificar se precisa de nova página
    if (currentY > pageHeight - 80) {
      doc.addPage();
      currentY = 20;
    }

    // Título da seção
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text('Top 5 Clientes por Recebimento', 15, currentY);
    currentY += 8;

    const tableData = topClientes.slice(0, 5).map((cliente, index) => [
      `${index + 1}º`,
      cliente.nome,
      cliente.quantidade,
      `R$ ${cliente.total.toFixed(2)}`
    ]);

    doc.autoTable({
      startY: currentY,
      head: [['Pos.', 'Cliente', 'Qtd.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [colors.dark[0], colors.dark[1], colors.dark[2]]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 100 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 15, right: 15 }
    });

    currentY = doc.lastAutoTable.finalY + 10;
  }

  // === TABELA DE DETALHAMENTO ===
  function drawDetailedTable() {
    // Verificar se precisa de nova página
    if (currentY > pageHeight - 100) {
      doc.addPage();
      currentY = 20;
    }

    // Título da tabela
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text('Detalhamento de Recebimentos', 15, currentY);
    currentY += 8;

    doc.autoTable({
      startY: currentY,
      head: [headers], // Converter array de strings em array de arrays
      body: data,
      theme: 'grid',
      headStyles: {
        fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [colors.dark[0], colors.dark[1], colors.dark[2]]
      },
      alternateRowStyles: {
        fillColor: [colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]]
      },
      columnStyles: {
        0: { cellWidth: 30, halign: 'center' },  // Data
        1: { cellWidth: 25, halign: 'center' },  // Origem
        2: { cellWidth: 55 },                     // Cliente
        3: { cellWidth: 30, halign: 'center' },  // Forma Pgto
        4: { cellWidth: 30, halign: 'right' }    // Valor
      },
      margin: { left: 15, right: 15 },
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.3
      }
    });
  }

  // === RODAPÉ PROFISSIONAL ===
  function drawProfessionalFooter() {
    const totalPages = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Linha decorativa - removida para evitar conflitos
      // doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      // doc.setLineWidth(0.5);
      // doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
      
      // Informações do rodapé
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.gray[0], colors.gray[1], colors.gray[2]);
      
      doc.text(`${nomeEmpresa || 'JET-IMPRE'}`, 15, pageHeight - 12);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
      
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      doc.text(`Gerado em ${dataAtual}`, pageWidth - 15, pageHeight - 12, { align: 'right' });
    }
  }

  // Gerar o conteúdo
  drawProfessionalHeader();
  drawStatisticsCards();
  drawDistributionChart();
  drawTopClientes();
  drawDetailedTable();
  drawProfessionalFooter();

  // Salvar o PDF
  const fileName = `${title.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};