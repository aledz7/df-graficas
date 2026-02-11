import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Printer, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { getImageUrl } from '@/lib/imageUtils';
import { formatCurrency } from '@/lib/utils';

const OSPrintProducaoModal = ({ isOpen, setIsOpen, os, empresa, vendedorAtual }) => {
  const [prazoProducao, setPrazoProducao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const printContentRef = useRef(null);

  // Resetar campos quando o modal abrir
  React.useEffect(() => {
    if (isOpen) {
      setPrazoProducao('');
      setObservacoes('');
    }
  }, [isOpen]);

  // Função para obter o ID numérico da OS
  const getOSId = () => {
    return os?.id || os?.id_os || 'N/A';
  };

  // Função para obter o nome do cliente
  const getNomeCliente = () => {
    return os?.cliente?.nome_completo || 
           os?.cliente?.nome || 
           os?.cliente?.apelido_fantasia ||
           os?.cliente_info?.nome ||
           os?.cliente_nome_manual ||
           'N/A';
  };

  // Função para obter o nome do vendedor
  const getNomeVendedor = () => {
    return os?.vendedor_nome || 
           vendedorAtual?.nome || 
           'Não informado';
  };

  // Função para obter a data de emissão
  const getDataEmissao = () => {
    if (os?.data_criacao) {
      try {
        return format(new Date(os.data_criacao), 'dd/MM/yyyy HH:mm');
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  };

  // Função para resolver imagem do item
  const resolveImagemItem = (item) => {
    if (item?.arquivo_item_url) {
      return item.arquivo_item_url;
    }
    return item?.imagem_url ||
           item?.imagem_principal ||
           item?.variacao_selecionada?.imagem_url ||
           (item?.produto && (item.produto.imagem_principal || item.produto.imagem_url || item.produto.imagem)) ||
           null;
  };

  const handlePrint = () => {
    if (!prazoProducao.trim()) {
      alert('Por favor, informe o prazo de produção antes de imprimir.');
      return;
    }

    setIsPrinting(true);
    
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.');
        setIsPrinting(false);
        return;
      }

      const printStyles = `
        @page {
          size: A4;
          margin: 1cm;
        }
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background-color: white;
          color: #000;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: bold;
        }
        .info-section {
          margin-bottom: 20px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
        }
        .items-section {
          margin-top: 30px;
        }
        .item {
          border: 2px solid #000;
          margin-bottom: 20px;
          padding: 15px;
          page-break-inside: avoid;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 1px solid #ccc;
          padding-bottom: 10px;
        }
        .item-info {
          flex: 1;
        }
        .item-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .item-details {
          font-size: 12px;
          color: #666;
        }
        .item-art {
          width: 150px;
          height: 150px;
          border: 2px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          margin-left: 15px;
        }
        .item-art img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .item-quantity {
          font-size: 16px;
          font-weight: bold;
          margin-top: 10px;
        }
        .observacoes-section {
          margin-top: 30px;
          padding: 15px;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        }
        .observacoes-title {
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .observacoes-content {
          font-size: 12px;
          white-space: pre-wrap;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .item {
            page-break-inside: avoid;
          }
        }
      `;

      const itensHTML = (os?.itens || []).map((item, index) => {
        const imagemUrl = resolveImagemItem(item);
        const imagemSrc = imagemUrl ? getImageUrl(imagemUrl) : '';
        
        return `
          <div class="item">
            <div class="item-header">
              <div class="item-info">
                <div class="item-name">${item.nome_servico_produto || item.nome_produto || 'Item sem nome'}</div>
                <div class="item-details">
                  ${item.tipo_item === 'm2' && item.largura && item.altura 
                    ? `Medidas: ${parseFloat(item.largura).toFixed(2)}m x ${parseFloat(item.altura).toFixed(2)}m` 
                    : ''}
                  ${item.quantidade ? ` | Quantidade: ${item.quantidade}` : ''}
                </div>
              </div>
              <div class="item-art">
                ${imagemSrc 
                  ? `<img src="${imagemSrc}" alt="Arte ${index + 1}" onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'text-align:center;color:#999;\\'>Sem Arte</div>';" />` 
                  : '<div style="text-align:center;color:#999;">Sem Arte</div>'}
              </div>
            </div>
            <div class="item-quantity">
              Quantidade: ${item.quantidade || 1}
            </div>
          </div>
        `;
      }).join('');

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print de Produção - OS ${getOSId()}</title>
          <meta charset="UTF-8">
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="header">
            <h1>PRINT DE PRODUÇÃO</h1>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Nome do Cliente:</span>
              <span>${getNomeCliente()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Número do Pedido:</span>
              <span>${getOSId()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Vendedor:</span>
              <span>${getNomeVendedor()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data de Emissão:</span>
              <span>${getDataEmissao()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Prazo de Produção:</span>
              <span><strong>${prazoProducao}</strong></span>
            </div>
          </div>

          <div class="items-section">
            <h2 style="font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 5px;">ITENS DO PEDIDO</h2>
            ${itensHTML}
          </div>

          ${observacoes.trim() ? `
            <div class="observacoes-section">
              <div class="observacoes-title">OBSERVAÇÕES:</div>
              <div class="observacoes-content">${observacoes}</div>
            </div>
          ` : ''}

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
      setIsPrinting(false);
    } catch (error) {
      console.error('Erro ao gerar print de produção:', error);
      alert('Erro ao gerar impressão. Tente novamente.');
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print de Produção - OS {getOSId()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="prazo-producao" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Prazo de Produção <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prazo-producao"
              placeholder="Ex: 5 dias úteis, 10/02/2026, etc."
              value={prazoProducao}
              onChange={(e) => setPrazoProducao(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Observações
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Digite observações adicionais para a produção..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Informações do Pedido:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Cliente:</strong> {getNomeCliente()}</p>
              <p><strong>Número do Pedido:</strong> {getOSId()}</p>
              <p><strong>Vendedor:</strong> {getNomeVendedor()}</p>
              <p><strong>Data de Emissão:</strong> {getDataEmissao()}</p>
              <p><strong>Total de Itens:</strong> {os?.itens?.length || 0}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handlePrint} disabled={isPrinting || !prazoProducao.trim()}>
            {isPrinting ? (
              <>
                <Printer className="mr-2 h-4 w-4 animate-pulse" />
                Imprimindo...
              </>
            ) : (
              <>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSPrintProducaoModal;
