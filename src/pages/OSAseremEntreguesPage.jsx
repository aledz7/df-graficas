import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PackageSearch, Loader2, Search } from 'lucide-react';
import OSEntregaCard from '@/components/os/entrega/OSEntregaCard';
import OSEntregaModal from '@/components/os/entrega/OSEntregaModal';
import OSEntregaReciboModal from '@/components/os/entrega/OSEntregaReciboModal';
import { apiDataManager } from '@/lib/apiDataManager';
import { osService, empresaService } from '@/services/api';

const OSAseremEntreguesPage = ({ logoUrl, nomeEmpresa }) => {
  const { toast } = useToast();
  const [todasOS, setTodasOS] = useState([]);
  const [filteredOS, setFilteredOS] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [osParaEntrega, setOsParaEntrega] = useState(null);
  const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);
  const [osParaRecibo, setOsParaRecibo] = useState(null);
  const [isReciboModalOpen, setIsReciboModalOpen] = useState(false);
  
  const [empresa, setEmpresa] = useState({});

  useEffect(() => {
    const loadEmpresa = async () => {
      try {
        // Carregar configurações da empresa via serviço (mesmo método do OSDocumentModal)
        const resp = await empresaService.get();
        const data = resp?.data || resp || {};
        setEmpresa(data);
      } catch (err) {
        console.warn('Falha ao carregar configurações da empresa:', err);
        // Fallback para dados locais
        const storedEmpresa = await apiDataManager.getData('empresaSettings') || {};
        const logoUrl = await apiDataManager.getData('logoUrl') || '';
        setEmpresa({ ...storedEmpresa, logoUrl });
      }
    };
    loadEmpresa();
  }, []);

  const carregarOS = useCallback(async () => {
    setIsLoading(true);
    try {
      // Tentar usar a API primeiro
      try {
        const response = await osService.getASeremEntregues({
          search: searchTerm
        });
        
        // Ordenar pela data de finalização da OS (data_finalizacao_os) - mais recente primeiro
        // Se não tiver data_finalizacao_os, usa data_criacao como fallback
        const osOrdenadas = Array.isArray(response.data) ? response.data.sort((a, b) => {
          const dateA = a.data_finalizacao_os ? new Date(a.data_finalizacao_os) : (a.data_criacao ? new Date(a.data_criacao) : new Date(0));
          const dateB = b.data_finalizacao_os ? new Date(b.data_finalizacao_os) : (b.data_criacao ? new Date(b.data_criacao) : new Date(0));
          return dateB - dateA;
        }) : response.data;
        setTodasOS(osOrdenadas);
      } catch (apiError) {
        console.error("Erro na API, usando dados locais:", apiError);
        
        // Fallback para dados locais
        const todasOSSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas');
        
        const osParaEntregar = todasOSSalvas
          .filter(os => {
            // CRÍTICO: Excluir orçamentos - apenas OS finalizadas devem aparecer para entrega
            const isOrcamento = os.status_os === 'Orçamento Salvo' || os.status_os === 'Orçamento Salvo (Editado)';
            if (isOrcamento) return false;
            
            // Filtrar por status de produção "Pronto para Entrega" ou "Aguardando Entrega"
            return os.dados_producao?.status_producao === 'Pronto para Entrega' || 
                   os.dados_producao?.status_producao === 'Aguardando Entrega';
          })
          .sort((a, b) => {
            // Ordenar pela data de finalização da OS (data_finalizacao_os) - mais recente primeiro
            // Se não tiver data_finalizacao_os, usa data_criacao como fallback
            const dateA = a.data_finalizacao_os ? new Date(a.data_finalizacao_os) : (a.data_criacao ? new Date(a.data_criacao) : new Date(0));
            const dateB = b.data_finalizacao_os ? new Date(b.data_finalizacao_os) : (b.data_criacao ? new Date(b.data_criacao) : new Date(0));
            return dateB - dateA;
          });
        setTodasOS(osParaEntregar);
      }
    } catch (e) {
      console.error('Erro ao carregar OS:', e);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, toast]);

  useEffect(() => {
    carregarOS();
    window.addEventListener('focus', carregarOS);
    return () => window.removeEventListener('focus', carregarOS);
  }, [carregarOS]);

  useEffect(() => {
    let results = todasOS;
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(os =>
        os.id_os.toLowerCase().includes(lowerSearchTerm) ||
        (os.cliente?.nome || os.cliente?.nome_completo || os.cliente_info?.nome || '').toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredOS(results);
  }, [searchTerm, todasOS]);

  // Debug: verificar quando o modal de recibo é aberto
  useEffect(() => {
    if (isReciboModalOpen && osParaRecibo) {
      console.log('Modal de recibo aberto com dados:', {
        isOpen: isReciboModalOpen,
        os: osParaRecibo,
        empresa: empresa
      });
    }
  }, [isReciboModalOpen, osParaRecibo, empresa]);

  const handleOpenEntregaModal = (os) => {
    setOsParaEntrega(os);
    setIsEntregaModalOpen(true);
  };
  


  const handleConfirmarEntrega = async (osId, dadosEntrega) => {
    let osAtualizada = null;
    
    try {
      console.log('Iniciando confirmação de entrega para OS:', osId);
      console.log('OS original (osParaEntrega):', osParaEntrega);
      
      // Preservar os dados originais da OS antes de fazer qualquer alteração
      const osOriginal = osParaEntrega;
      
      // Tentar atualizar via API primeiro
      const response = await osService.updateStatusProducao(osId, {
        ...dadosEntrega,
        status_producao: 'Entregue'
      });
      
      // Buscar os dados atualizados da API
      try {
        const osAtualizadaResponse = await osService.getById(osId);
        console.log('OS atualizada da API:', osAtualizadaResponse);
        
        // Usar os dados da API para o recibo
        osAtualizada = {
          ...osAtualizadaResponse.data || osAtualizadaResponse,
          dados_producao: {
            ...(osAtualizadaResponse.data?.dados_producao || osAtualizadaResponse.dados_producao || {}),
            ...dadosEntrega,
            status_producao: 'Entregue',
          }
        };
        
        console.log('OS final para recibo (da API):', osAtualizada);
        setOsParaRecibo(osAtualizada);
        
      } catch (apiError) {
        console.error('Erro ao buscar OS atualizada da API:', apiError);
        
        // Fallback: usar os dados originais da OS que estava sendo entregue
        if (osOriginal) {
          osAtualizada = {
            ...osOriginal,
            dados_producao: {
              ...osOriginal.dados_producao,
              ...dadosEntrega,
              status_producao: 'Entregue',
            }
          };
          
          console.log('Usando dados originais da OS:', osAtualizada);
          setOsParaRecibo(osAtualizada);
        } else {
          // Fallback final: criar estrutura mínima
          osAtualizada = {
            id_os: osId,
            dados_producao: {
              ...dadosEntrega,
              status_producao: 'Entregue',
            },
            valor_total_os: 0,
            itens: [],
            cliente: null,
            cliente_info: null,
          };
          
          console.log('Criando estrutura mínima:', osAtualizada);
          setOsParaRecibo(osAtualizada);
        }
      }
      
      setIsEntregaModalOpen(false);
      setIsReciboModalOpen(true);

      // Recarregar a lista de OS após a entrega ser confirmada
      await carregarOS();

      // Disparar evento customizado para notificar outras páginas sobre a entrega
      const entregaEvent = new CustomEvent('osEntregue', {
        detail: {
          osId: osId,
          dadosEntrega: dadosEntrega,
          osAtualizada: osAtualizada || osOriginal
        }
      });
      window.dispatchEvent(entregaEvent);

      toast({ 
        title: `Entrega da OS ${osId} registrada!`, 
        description: 'O recibo de entrega está disponível para impressão.' 
      });
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error.response?.data || error);
      toast({ 
        title: 'Erro ao registrar entrega', 
        description: error.response?.data?.message || 'Não foi possível registrar a entrega da OS. Tente novamente.',
        variant: 'destructive' 
      });
    }
  };
  

  return (
    <>
      <div className="p-4 md:p-6 h-full flex flex-col">
        <Card>
            <CardHeader>
                <div className="flex items-center space-x-3">
                    <PackageSearch size={28} className="text-primary"/>
                    <div>
                        <CardTitle className="text-2xl">OS a Serem Entregues</CardTitle>
                        <CardDescription>Gerencie a entrega dos pedidos que estão prontos.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por Nº OS ou Cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </CardContent>
        </Card>
        
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
                  <OSEntregaCard 
                    os={os} 
                    onRegistrarEntrega={handleOpenEntregaModal}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-20">
              <PackageSearch size={48} className="mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma OS aguardando entrega</h3>
              <p className="text-sm">Quando uma OS estiver "Pronta para Entrega", mova-a para cá.</p>
            </div>
          )}
        </ScrollArea>
      </div>

      {isEntregaModalOpen && osParaEntrega && (
        <OSEntregaModal
            isOpen={isEntregaModalOpen}
            setIsOpen={setIsEntregaModalOpen}
            os={osParaEntrega}
            onConfirm={handleConfirmarEntrega}
        />
      )}

      {isReciboModalOpen && osParaRecibo && (
        <OSEntregaReciboModal
            isOpen={isReciboModalOpen}
            setIsOpen={setIsReciboModalOpen}
            os={osParaRecibo}
            empresa={empresa}
        />
      )}
    </>
  );
};

export default OSAseremEntreguesPage;