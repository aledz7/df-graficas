import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import OSEmProducaoHeader from '@/components/os/producao/OSEmProducaoHeader';
import OSEmProducaoCard from '@/components/os/producao/OSEmProducaoCard';
import OSDocumentModal from '@/components/os/OSDocumentModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardList, Loader2 } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { osService, empresaService } from '@/services/api';
import { useOSCountContext } from '@/contexts/OSCountContext';

const OSEmProducaoPage = () => {
  const { toast } = useToast();
  const { refreshCount } = useOSCountContext();
  const [todasOS, setTodasOS] = useState([]);
  const [filteredOS, setFilteredOS] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [osParaRecibo, setOsParaRecibo] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [empresa, setEmpresa] = useState({});
  const [contasBancarias, setContasBancarias] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarOS = useCallback(async () => {
    setIsLoading(true);
    try {
      // Tentar usar a API do Laravel primeiro
      try {
        
        // Debug: verificar token antes da requisição
        const token = apiDataManager.getToken();
        
        const response = await osService.getEmProducao({ 
          status: 'Em Produção',
          search: searchTerm 
        });
        
        const osParaProducao = response.data
          .filter(os => os.status_os !== 'Orçamento Salvo' && os.status_os !== 'Orçamento Salvo (Editado)')
          .map(os => {
            // Criar dados_producao se não existir
            const dadosProducao = os.dados_producao || {
              prazo_estimado: '',
              status_producao: 'Em Produção',
              fotos_producao: [],
              observacoes_internas: '',
            };
            
            // Transferir automaticamente data_prevista_entrega para prazo_estimado se necessário
            if (!dadosProducao.prazo_estimado && os.data_prevista_entrega) {
              dadosProducao.prazo_estimado = os.data_prevista_entrega;
              console.log('Transferindo data_prevista_entrega para prazo_estimado:', {
                os_id: os.id_os,
                data_prevista_entrega: os.data_prevista_entrega,
                prazo_estimado: dadosProducao.prazo_estimado
              });
            }
            
            return {
              ...os,
              dados_producao: dadosProducao
            };
          });

        setTodasOS(osParaProducao);
        
      } catch (apiError) {
        if (apiError?.response?.status === 401) {
          console.error('Erro 401 - Token inválido ou expirado');
        }
        setTodasOS([]);
        toast({
          title: 'Erro ao carregar',
          description: apiError?.response?.status === 404
            ? 'Rota da API não encontrada. Verifique a configuração do backend.'
            : 'Não foi possível carregar as ordens de serviço da API.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro geral ao carregar OS:', error);
      toast({ 
        title: 'Erro ao carregar', 
        description: 'Não foi possível carregar as ordens de serviço.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Buscar configurações da empresa da API
        const empresaResponse = await empresaService.get();
        setEmpresa(empresaResponse.data.data || {});
      } catch (error) {
        console.error('Erro ao carregar dados da empresa:', error);
        // Fallback para dados locais
        const storedEmpresa = await apiDataManager.getData('empresaSettings') || {};
        const logoUrl = await apiDataManager.getData('logoUrl') || '';
        setEmpresa({ ...storedEmpresa, logoUrl });
      }
      
      // Carregar contas bancárias e máquinas
      try {
        const [contasData, maquinasData] = await Promise.all([
          apiDataManager.getItem('contasBancarias'),
          apiDataManager.getItem('maquinas')
        ]);
        setContasBancarias(safeJsonParse(contasData, []));
        setMaquinas(safeJsonParse(maquinasData, []));
      } catch (error) {
        console.error('Erro ao carregar contas bancárias ou máquinas:', error);
        setContasBancarias([]);
        setMaquinas([]);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    // Agora a filtragem é feita diretamente na API
    // Apenas atualizamos a lista filtrada com base nos dados recebidos
    setFilteredOS(todasOS);
  }, [todasOS]);
  
  // Recarregar quando o searchTerm mudar
  useEffect(() => {
    carregarOS();
  }, [searchTerm, carregarOS]);

  // Listener para recarregar dados quando uma OS for entregue
  useEffect(() => {
    const handleOSEntregue = (event) => {
      console.log('Evento de OS entregue recebido na página Em Produção:', event.detail);
      carregarOS(); // Recarregar os dados da página
    };

    window.addEventListener('osEntregue', handleOSEntregue);
    
    // Cleanup
    return () => {
      window.removeEventListener('osEntregue', handleOSEntregue);
    };
  }, [carregarOS]);

  const handleUpdateOS = async (osId, novosDados, isAnexoOnly = false) => {
    try {
      if (isAnexoOnly) {
        // Se for apenas anexo, usar a API para salvar no banco de dados
        
        // Usar o método updateStatusProducao para salvar as fotos no banco
        await osService.updateStatusProducao(osId, novosDados);
        
        // Atualizar o estado local (comparar tanto por id quanto por id_os)
        setTodasOS(prev => prev.map(os => 
          (os.id === osId || os.id_os === osId)
            ? { ...os, dados_producao: { ...os.dados_producao, ...novosDados } }
            : os
        ));
        
        toast({ title: `Anexos da OS ${osId} salvos no banco!` });
        return;
      }
      
      // Para outras atualizações, usar a API do Laravel
      await osService.updateStatusProducao(osId, novosDados);
      
      
      
      // Atualizar dados locais para manter sincronização
      try {
        const todasOSSalvas = safeJsonParse(await apiDataManager.getItem('ordens_servico_salvas'), []);
        if (Array.isArray(todasOSSalvas)) {
          const osIndex = todasOSSalvas.findIndex(os => os.id === osId || os.id_os === osId);
          
          if (osIndex !== -1) {
            todasOSSalvas[osIndex] = {
              ...todasOSSalvas[osIndex],
              dados_producao: {
                ...todasOSSalvas[osIndex].dados_producao,
                ...novosDados
              }
            };
            
            await apiDataManager.setItem('ordens_servico_salvas', todasOSSalvas);
          }
        }
      } catch (localError) {
        console.warn('Erro ao atualizar dados locais:', localError);
      }
      
      // Se o status for 'Pronto para Entrega', recarregar a lista e atualizar contagem
      if (novosDados.status_producao === 'Pronto para Entrega') {
        toast({ 
          title: `OS ${osId} movida para Entregas`, 
          description: 'A ordem de serviço foi movida para a seção "A Serem Entregues"'
        });
        // Atualizar contagem de OS prontas para entrega
        refreshCount();
        // Aguardar um pouco para garantir que o backend processou
        setTimeout(() => {
          carregarOS();
        }, 500);
      } else if (novosDados.status_producao === 'Entregue') {
        // Se o status for 'Entregue', remover da lista local e recarregar
        toast({ 
          title: `OS ${osId} entregue!`, 
          description: 'A ordem de serviço foi movida para a seção "Pedidos Entregues"'
        });
        // Atualizar contagem
        refreshCount();
        // Recarregar a lista para remover a OS entregue
        carregarOS();
      } else {
        // Atualizar o status localmente (comparar tanto por id quanto por id_os)
        setTodasOS(prev => prev.map(os => 
          (os.id === osId || os.id_os === osId)
            ? { ...os, dados_producao: { ...os.dados_producao, ...novosDados } }
            : os
        ));
        toast({ title: `OS ${osId} atualizada!` });
      }
    } catch (error) {
      console.error('Erro ao atualizar OS:', error);
      toast({ 
        title: 'Erro ao atualizar', 
        description: error.response?.data?.message || 'Não foi possível atualizar a ordem de serviço.', 
        variant: 'destructive' 
      });
    }
  };
  
  const handleVerRecibo = (os) => {
    setOsParaRecibo(os);
    setIsDocumentModalOpen(true);
  };

  const handleGerarPdfDocumentoStub = () => {
    toast({ title: "Funcionalidade Indisponível", description: "A geração de PDF será implementada em breve." });
  };

  const handleImpressaoDocumento = () => {
    // Abrir uma nova janela com o conteúdo do documento
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Erro", description: "Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativado.", variant: "destructive" });
      return;
    }

    // Preparar o conteúdo HTML para impressão
    if (!osParaRecibo) {
      printWindow.close();
      toast({ title: "Erro", description: "Nenhum documento selecionado para impressão.", variant: "destructive" });
      return;
    }

    // Estilos para a impressão
    const printStyles = `
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      .print-container { max-width: 800px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 15px; }
      .logo { max-height: 80px; max-width: 200px; }
      .company-info { max-width: 60%; }
      .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
      .company-details { font-size: 12px; color: #666; }
      .document-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
      .section { margin-bottom: 20px; }
      .section-title { font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      th { background-color: #f5f5f5; text-align: left; padding: 8px; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      .text-right { text-align: right; }
      .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `;

    // Formatar moeda
    const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

    // Gerar conteúdo HTML do documento
    const os = osParaRecibo;
    const itensHTML = os.itens && Array.isArray(os.itens) ? os.itens.map(item => `
      <tr>
        <td>${item.nome_servico_produto || item.nome_produto || 'Item sem nome'}</td>
        <td class="text-right">${item.quantidade || 1}</td>
        <td class="text-right">${formatCurrency(item.valor_unitario)}</td>
        <td class="text-right">${formatCurrency(item.valor_total)}</td>
      </tr>
    `).join('') : '';

    const pagamentosHTML = os.pagamentos && Array.isArray(os.pagamentos) ? os.pagamentos.map(pag => `
      <div>
        <strong>${pag.metodo || 'N/A'}</strong>: ${formatCurrency(pag.valor || 0)}
      </div>
    `).join('') : '';

    // Conteúdo completo do documento
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OS ${os.id_os || 'N/A'}</title>
        <meta charset="UTF-8">
        <style>${printStyles}</style>
      </head>
      <body>
        <div class="print-container">
          <div class="header">
            <div class="company-info">
                              <div class="company-name">${empresa.nome_fantasia || empresa.nomeFantasia || 'Empresa'}</div>
              <div class="company-details">
                ${empresa.razaoSocial ? `<div>${empresa.razaoSocial}</div>` : ''}
                ${empresa.cnpj ? `<div>CNPJ: ${empresa.cnpj}</div>` : ''}
                ${empresa.telefone ? `<div>Tel: ${empresa.telefone}</div>` : ''}
                ${empresa.email ? `<div>Email: ${empresa.email}</div>` : ''}
                ${empresa.enderecoCompleto ? `<div>${empresa.enderecoCompleto}</div>` : ''}
              </div>
            </div>
            <div>
              <p><strong>OS Nº:</strong> ${os.id_os || 'N/A'}</p>
              <p><strong>Data:</strong> ${new Date(os.data_criacao).toLocaleDateString('pt-BR')}</p>
              ${os.data_finalizacao_os ? `<p><strong>Finalização:</strong> ${new Date(os.data_finalizacao_os).toLocaleDateString('pt-BR')}</p>` : ''}
            </div>
          </div>
          
          <div class="document-title">
            ${os.status_os === 'Finalizada' ? 'Ordem de Serviço Finalizada' : 'Orçamento de Serviço'}
          </div>
          
          <div class="section">
            <div class="section-title">Dados do Cliente</div>
            <p><strong>${os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome_completo || os.cliente_info?.nome || os.cliente_nome_manual || 'Cliente não informado'}</strong></p>
            ${os.cliente_info?.cpf_cnpj ? `<p>CPF/CNPJ: ${os.cliente_info.cpf_cnpj}</p>` : ''}
            ${os.cliente_info?.telefone_principal ? `<p>Telefone: ${os.cliente_info.telefone_principal}</p>` : ''}
            ${os.cliente_info?.email ? `<p>Email: ${os.cliente_info.email}</p>` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Itens do Serviço/Pedido</div>
            <table>
              <thead>
                <tr>
                  <th>Produto/Serviço</th>
                  <th class="text-right">Qtd.</th>
                  <th class="text-right">Valor Unit.</th>
                  <th class="text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itensHTML || '<tr><td colspan="4">Nenhum item registrado</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right"><strong>Total:</strong></td>
                  <td class="text-right"><strong>${formatCurrency(os.valor_total_os || 0)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${os.pagamentos && os.pagamentos.length > 0 ? `
          <div class="section">
            <div class="section-title">Pagamentos</div>
            ${pagamentosHTML}
            <p><strong>Total Pago:</strong> ${formatCurrency(os.pagamentos.reduce((sum, p) => sum + parseFloat(p.valor || 0), 0))}</p>
          </div>
          ` : ''}
          
          ${os.observacoes ? `
          <div class="section">
            <div class="section-title">Observações</div>
            <p>${os.observacoes}</p>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };


  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <OSEmProducaoHeader totalOS={filteredOS.length} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      
      <ScrollArea className="flex-grow mt-4 pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full pt-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOS.length > 0 ? (
          <div className="space-y-4">
            {filteredOS.map((os, index) => (
              <motion.div
                key={os.id_os}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <OSEmProducaoCard 
                  os={os} 
                  onUpdate={handleUpdateOS} 
                  onVerRecibo={handleVerRecibo} 
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
            <ClipboardList size={48} className="mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma OS em produção encontrada</h3>
            <p className="text-sm">Tente ajustar os filtros ou finalizar uma nova OS.</p>
          </div>
        )}
      </ScrollArea>
      
      {isDocumentModalOpen && osParaRecibo && (
        <OSDocumentModal
          isOpen={isDocumentModalOpen}
          setIsOpen={setIsDocumentModalOpen}
          documento={osParaRecibo}
          logoUrl={empresa.logoUrl}
                      nomeEmpresa={empresa.nome_fantasia || empresa.nomeFantasia}
          onGerarPdf={handleGerarPdfDocumentoStub}
          empresaSettings={empresa}
          contasBancarias={contasBancarias}
          maquinas={maquinas}
        />
      )}
    </div>
  );
};

export default OSEmProducaoPage;