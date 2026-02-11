import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ExternalLink, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { buscarProdutosEstoqueBaixo } from '@/utils/estoqueBaixoUtils';
import EditableEstoqueBaixoCard from './EditableEstoqueBaixoCard';
import { motion, AnimatePresence } from 'framer-motion';

const EstoqueBaixoModal = ({ isOpen, onClose }) => {
  const [produtos, setProdutos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [produtosRemovendo, setProdutosRemovendo] = useState(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      carregarProdutosEstoqueBaixo();
    }
  }, [isOpen]);

  const carregarProdutosEstoqueBaixo = async () => {
    setIsLoading(true);
    try {
      // Tentar carregar da API primeiro
      const { produtoService } = await import('@/services/api');
      let produtosData = [];
      
      try {
        console.log('🔍 Modal - Tentando carregar produtos com estoque baixo da API...');
        const estoqueBaixoResponse = await produtoService.getEstoqueBaixo();
        
        // O backend retorna: { success: true, message: "...", data: [produtos] }
        // produtoService.getEstoqueBaixo() retorna response.data, então temos o objeto completo
        let responseData = estoqueBaixoResponse;
        
        // Se a resposta tem a estrutura { success, message, data }
        if (responseData && typeof responseData === 'object' && responseData.data !== undefined) {
          responseData = responseData.data;
        }
        
        // Garantir que seja um array - tratar diferentes estruturas de resposta
        if (Array.isArray(responseData)) {
          produtosData = responseData;
        } else if (responseData && typeof responseData === 'object') {
          // Se ainda for um objeto, tentar extrair o array
          if (Array.isArray(responseData.data)) {
            produtosData = responseData.data;
          } else if (Array.isArray(responseData.produtos)) {
            produtosData = responseData.produtos;
          } else {
            // Tentar converter valores do objeto em array (caso seja uma Collection do Laravel)
            const valores = Object.values(responseData);
            produtosData = valores.filter(item => 
              item && typeof item === 'object' && (item.id !== undefined || item.nome !== undefined)
            );
          }
        } else {
          produtosData = [];
        }
        
        console.log('✅ Modal - Produtos carregados da API:', produtosData.length, 'Formato resposta:', typeof estoqueBaixoResponse);
      } catch (apiError) {
        console.warn('⚠️ Modal - Erro ao carregar da API, usando localStorage:', apiError);
        
        // Fallback para localStorage
        const { loadData } = await import('@/lib/utils');
        const produtosLocal = await loadData('produtos', []);
        
        // Garantir que produtosLocal seja um array
        const produtosLocalArray = Array.isArray(produtosLocal) ? produtosLocal : [];
        
        // Usar função compartilhada para garantir lógica idêntica
        console.log('🔍 Modal - Chamando função compartilhada buscarProdutosEstoqueBaixo...');
        produtosData = await buscarProdutosEstoqueBaixo(produtosLocalArray);
        
        // Garantir que o resultado seja um array
        produtosData = Array.isArray(produtosData) ? produtosData : [];
      }

      // Garantir que produtosData seja sempre um array antes de setar
      setProdutos(Array.isArray(produtosData) ? produtosData : []);
    } catch (error) {
      console.error('Erro ao carregar produtos com estoque baixo:', error);
      // Em caso de erro, garantir que produtos seja um array vazio
      setProdutos([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos com estoque baixo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProdutoUpdate = async (produtoAtualizado) => {
    console.log('📦 Produto atualizado recebido:', produtoAtualizado);
    
    // Atualizar localmente IMEDIATAMENTE para feedback instantâneo
    setProdutos(prevProdutos => {
      // Garantir que prevProdutos seja um array
      const produtosArray = Array.isArray(prevProdutos) ? prevProdutos : [];
      
      const produtosAtualizados = produtosArray.map(p => 
        p.id === produtoAtualizado.id ? produtoAtualizado : p
      ).filter(p => {
        // Verificar se o produto ainda tem estoque baixo (principal ou variações)
        const estoqueAtual = parseFloat(p.estoque || 0);
        const estoqueMinimo = parseFloat(p.estoque_minimo || 0);
        
        // Verificar estoque principal
        let temEstoqueBaixo = estoqueAtual <= estoqueMinimo && estoqueMinimo > 0;
        
        // Verificar variações se existirem
        if (!temEstoqueBaixo && p.variacoes_ativa && Array.isArray(p.variacoes)) {
          temEstoqueBaixo = p.variacoes.some(variacao => {
            const estoqueVar = parseFloat(variacao.estoque_var || 0);
            return estoqueVar <= estoqueMinimo && estoqueMinimo > 0;
          });
        }
        
        if (p.id === produtoAtualizado.id && !temEstoqueBaixo) {
          console.log('🗑️ Removendo produto da lista IMEDIATAMENTE (estoque não mais baixo):', p.nome, {
            estoqueAtual,
            estoqueMinimo,
            temEstoqueBaixo
          });
          
          // Adicionar indicador visual de remoção
          setProdutosRemovendo(prev => new Set([...prev, p.id]));
          
          // Remover o indicador após a animação
          setTimeout(() => {
            setProdutosRemovendo(prev => {
              const newSet = new Set(prev);
              newSet.delete(p.id);
              return newSet;
            });
          }, 300);
        }
        
        return temEstoqueBaixo;
      });
      
      console.log('📋 Lista atualizada IMEDIATAMENTE:', produtosAtualizados.length, 'produtos');
      return produtosAtualizados;
    });

    // Sincronizar com API em background (sem bloquear a UI)
    // Usar requestIdleCallback se disponível, senão setTimeout
    const syncWithAPI = async () => {
      try {
        console.log('🔄 Sincronizando com API em background...');
        await carregarProdutosEstoqueBaixo();
        console.log('✅ Sincronização com API concluída');
      } catch (error) {
        console.error('Erro ao sincronizar com API:', error);
        // A atualização local já foi feita acima, então não afeta a UX
      }
    };

    if (window.requestIdleCallback) {
      window.requestIdleCallback(syncWithAPI, { timeout: 2000 });
    } else {
      setTimeout(syncWithAPI, 100);
    }

    // Atualizar dados no localStorage como backup
    const updateLocalStorage = async () => {
      try {
        const { loadData } = await import('@/lib/utils');
        const { setData } = await import('@/lib/apiDataManager');
        const produtosLocal = await loadData('produtos', []);
        const produtosAtualizados = produtosLocal.map(p => 
          p.id === produtoAtualizado.id ? produtoAtualizado : p
        );
        await setData('produtos', produtosAtualizados);
      } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
      }
    };
    
    updateLocalStorage();
    
    // Disparar evento customizado para notificar outras páginas sobre a atualização
    const eventoAtualizacao = new CustomEvent('produtoEstoqueAtualizado', {
      detail: { produto: produtoAtualizado }
    });
    window.dispatchEvent(eventoAtualizacao);
    console.log('📡 Evento de atualização de estoque disparado');
  };

  const handleProdutoError = (error) => {
    console.error('Erro ao editar produto:', error);
    // O toast de erro já é exibido pelo componente EditableEstoqueBaixoCard
  };

  const handleIrParaProdutos = () => {
    onClose();
    navigate('/cadastros/produtos', { state: { filterEstoqueBaixo: true } });
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Produtos com Estoque Baixo
          </DialogTitle>
          <DialogDescription>
            Lista de produtos que estão com estoque abaixo do mínimo configurado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-2">Carregando produtos...</span>
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum produto com estoque baixo encontrado.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {produtos.length} produto{produtos.length !== 1 ? 's' : ''} com estoque baixo
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleIrParaProdutos}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Gerenciar Produtos
                </Button>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {Array.isArray(produtos) && produtos.map((produto) => (
                      <motion.div
                        key={produto.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0, 
                          scale: 1,
                          backgroundColor: produtosRemovendo.has(produto.id) ? '#fef3c7' : 'transparent'
                        }}
                        exit={{ 
                          opacity: 0, 
                          y: -20, 
                          scale: 0.95,
                          transition: { duration: 0.2 }
                        }}
                        transition={{ 
                          duration: 0.3,
                          ease: "easeInOut"
                        }}
                        className={`rounded-lg transition-colors duration-300 ${
                          produtosRemovendo.has(produto.id) 
                            ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' 
                            : ''
                        }`}
                      >
                        <EditableEstoqueBaixoCard
                          produto={produto}
                          onUpdate={handleProdutoUpdate}
                          onError={handleProdutoError}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EstoqueBaixoModal;

