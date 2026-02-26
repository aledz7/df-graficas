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
    setClienteSelecionado(cliente);
    setOrdemServico(prev => ({ ...prev, cliente_id: cliente?.id, cliente_info: cliente, cliente_nome_manual: cliente ? '' : prev.cliente_nome_manual }));
    setIsClienteModalOpen(false);
  };
  

  return {
    handleClienteSelecionado,
    ...itemHandlers,
    ...documentHandlers,
    ...lifecycleHandlers,
    handleFinalizarOSDoConsumoMaterial: lifecycleHandlers.handleFinalizarOSDoConsumoMaterial,
  };
};