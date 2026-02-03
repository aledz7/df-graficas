import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateEnvelopamentoPdf = async (orcamento, empresaSettings) => {
  const doc = new jsPDF();
  const nomeEmpresa = empresaSettings.nomeFantasia || 'Sua Empresa';
  const contatoEmpresa = `Tel: ${empresaSettings.telefone || 'N/A'} | Email: ${empresaSettings.email || 'N/A'}`;
  const logoUrl = await apiDataManager.getItem('logoUrl');

  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', 14, 15, 30, 15, undefined, 'FAST');
    } catch (e) {
      console.error("Erro ao adicionar logo no PDF:", e);
      doc.setFontSize(18);
      doc.text(nomeEmpresa, 14, 22);
    }
  } else {
    doc.setFontSize(18);
    doc.text(nomeEmpresa, 14, 22);
  }
  
  doc.setFontSize(11);
  doc.text(contatoEmpresa, 14, 32);
  doc.setFontSize(16);
  doc.text('Orçamento de Envelopamento', 105, 40, { align: 'center' });

  doc.setFontSize(11);
  doc.text(`Cliente: ${orcamento.cliente.nome}`, 14, 50);
  doc.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 196, 50, { align: 'right' });

  const adicionaisLabels = {
    aplicacao: 'Aplicação',
    remocao: 'Remoção',
    lixamento: 'Lixamento/Preparação',
    transparente: 'Película Transparente',
  };

  const tableColumn = ["Item", "Medidas (m)", "Qtd.", "Área (m²)", "Serviços"];
  const tableRows = [];

  orcamento.selectedPecas.forEach(item => {
    const servicosAplicados = [];
    if (item.servicosAdicionais && typeof item.servicosAdicionais === 'object') {
      Object.entries(item.servicosAdicionais).forEach(([key, checked]) => {
        if (checked) {
          servicosAplicados.push(adicionaisLabels[key] || key);
        }
      });
    }
    
    const itemData = [
      item.parte.nome,
      `${parseFloat(item.parte.largura).toFixed(2)} x ${parseFloat(item.parte.altura).toFixed(2)}`,
      item.quantidade,
      (parseFloat(item.parte.altura) * parseFloat(item.parte.largura) * item.quantidade).toFixed(3),
      servicosAplicados.length > 0 ? servicosAplicados.join(', ') : 'Nenhum'
    ];
    tableRows.push(itemData);
  });

  doc.autoTable({
    startY: 55,
    head: [tableColumn], // Converter array de strings em array de arrays
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [34, 34, 34] }
  });

  let finalY = doc.lastAutoTable.finalY + 10;

  const details = [
    { title: 'Produto Utilizado:', value: orcamento.produto ? `${orcamento.produto.nome} ${orcamento.produto.cor_opcional ? `(${orcamento.produto.cor_opcional})` : ''}` : 'N/A' },
    { title: 'Cor Específica:', value: orcamento.cor || 'Conforme produto' },
  ];

  doc.setFontSize(10);
  details.forEach(detail => {
    doc.setFont('helvetica', 'bold');
    doc.text(detail.title, 14, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.value, 45, finalY);
    finalY += 5;
  });
  finalY += 5;

  if (orcamento.observacao) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', 14, finalY);
    finalY += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitObservacoes = doc.splitTextToSize(orcamento.observacao, 180);
    doc.text(splitObservacoes, 14, finalY);
    finalY += (splitObservacoes.length * 5) + 5;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo de Custos', 196, finalY, { align: 'right' });
  finalY += 6;

  const summary = [
    ['Área Total (m²)', `${orcamento.areaTotalM2.toFixed(4)}`],
    ['Custo do Produto', `R$ ${orcamento.custoTotalMaterial.toFixed(2)}`],
  ];
  
  // Adicionar total de serviços adicionais
  if (orcamento.custoTotalAdicionais > 0) {
    summary.push(['Serviços Adicionais', `R$ ${orcamento.custoTotalAdicionais.toFixed(2)}`]);
  }

  doc.autoTable({
    startY: finalY,
    body: summary,
    theme: 'plain',
    tableWidth: 'wrap',
    margin: { left: 130 },
    styles: { cellPadding: 1 },
    bodyStyles: { halign: 'right' },
  });
  finalY = doc.lastAutoTable.finalY;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 130, finalY + 8);
  doc.text(`R$ ${orcamento.orcamentoTotal.toFixed(2)}`, 196, finalY + 8, { align: 'right' });

  return doc.output('datauristring');
};