import { useToast } from '@/components/ui/use-toast';
import { useOSItemHandlers } from './osItemHandlers';
import { useOSDocumentHandlers } from './osDocumentHandlers';
import { useOSLifecycleHandlers } from './osLifecycleHandlers';

export const useOSHandlers = (
  ordemServico, setOrdemServico,
  itemAtual, setItemAtual,
  clienteSelecionado, setClienteSelecionado,
  setIsOSFinalizada, setIsEditingItem,
  acabamentosConfig, produtosCadastrados,
  setIsClienteModalOpen, setIsPagamentoModalOpen, setIsDocumentModalOpen,
  setIsSaving, 
  documentRef, vendedorAtual, totaisOSCallback,
  maquinasDisponiveis = []
) => {
  const { toast } = useToast();

  const itemHandlers = useOSItemHandlers(
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    setIsEditingItem,
    acabamentosConfig, produtosCadastrados
  );

  const documentHandlers = useOSDocumentHandlers(
    ordemServico,
    clienteSelecionado,
    setIsDocumentModalOpen,
    documentRef
  );

  const lifecycleHandlers = useOSLifecycleHandlers(
    ordemServico, setOrdemServico,
    itemAtual, setItemAtual,
    clienteSelecionado, setClienteSelecionado,
    setIsOSFinalizada, setIsEditingItem,
    setIsPagamentoModalOpen, setIsSaving,
    vendedorAtual, totaisOSCallback,
    acabamentosConfig,
    setIsDocumentModalOpen,
    maquinasDisponiveis
  );

  const handleClienteSelecionado = (cliente) => {
    console.log('🔍 useOSHandlers - handleClienteSelecionado chamado com:', {
      cliente,
      clienteId: cliente?.id,
      clienteIdType: typeof cliente?.id,
      clienteNome: cliente?.nome || cliente?.nome_completo,
      clienteKeys: cliente ? Object.keys(cliente) : 'null'
    });
    
    console.log('🔍 useOSHandlers - Estado ANTES da atualização:', {
      clienteSelecionado,
      clienteSelecionadoId: clienteSelecionado?.id,
      clienteSelecionadoKeys: clienteSelecionado ? Object.keys(clienteSelecionado) : 'null'
    });
    
    // Usar a função customizada com logs
    setClienteSelecionado(cliente);
    setOrdemServico(prev => ({ ...prev, cliente_id: cliente?.id, cliente_info: cliente, cliente_nome_manual: cliente ? '' : prev.cliente_nome_manual }));
    setIsClienteModalOpen(false);
    
    console.log('✅ useOSHandlers - Cliente selecionado e estado atualizado');
    console.log('🔍 useOSHandlers - Estado DEPOIS da atualização:', {
      clienteSelecionado: cliente,
      clienteSelecionadoId: cliente?.id,
      clienteSelecionadoKeys: cliente ? Object.keys(cliente) : 'null'
    });
    
    // Log adicional para verificar se o estado foi realmente atualizado
    setTimeout(() => {
      console.log('🔍 useOSHandlers - Estado após timeout (deve ser o novo valor):', {
        clienteSelecionado,
        clienteSelecionadoId: clienteSelecionado?.id
      });
    }, 100);
  };
  

  return {
    handleClienteSelecionado,
    ...itemHandlers,
    ...documentHandlers,
    ...lifecycleHandlers,
    handleFinalizarOSDoConsumoMaterial: lifecycleHandlers.handleFinalizarOSDoConsumoMaterial,
  };
};