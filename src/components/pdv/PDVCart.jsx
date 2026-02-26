import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Trash2, ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';

const PDVCart = ({ carrinho, setCarrinho, productColors, productSizes, produtos }) => {
  const { toast } = useToast();
  const [quantidadesDigitadas, setQuantidadesDigitadas] = useState({});

  // Função para formatar quantidade removendo zeros desnecessários
  const formatarQuantidade = (quantidade) => {
    if (quantidade === null || quantidade === undefined) return '1';
    const num = parseFloat(quantidade);
    if (isNaN(num)) return '1';
    
    // Se for inteiro, retornar sem decimais
    // Preserva números grandes como 2000, mas remove decimais .000 de inteiros
    if (num % 1 === 0) {
      return num.toString();
    }
    
    // Para decimais, remover apenas zeros à direita desnecessários
    // Ex: 2.5 → "2.5", 2.50 → "2.5", 2.500 → "2.5"
    return num.toString().replace(/\.?0+$/, '');
  };

  // Inicializar quantidades digitadas quando o carrinho muda
  useEffect(() => {
    const novasQuantidades = {};
    carrinho.forEach(item => {
      const key = `${item.id_produto}-${item.variacao?.id_variacao || 'sem-variacao'}`;
      // Sempre inicializar com o valor do item, garantindo que seja uma string
      const quantidadeAtual = quantidadesDigitadas[key];
      if (quantidadeAtual !== undefined && quantidadeAtual !== null && quantidadeAtual !== '') {
        novasQuantidades[key] = String(quantidadeAtual);
      } else {
        // Se não existe no estado, usar a quantidade do item
        novasQuantidades[key] = String(item.quantidade || 1);
      }
    });
    setQuantidadesDigitadas(novasQuantidades);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrinho]);

  const getNomeVariacao = (varId, type) => {
    if (type === 'cor') {
      const cor = productColors.find(c => c.id === varId);
      return cor ? cor.nome : varId;
    }
    if (type === 'tamanho') {
      const tamanho = productSizes.find(s => s.id === varId);
      return tamanho ? tamanho.nome : varId;
    }
    return varId;
  };

  const getTamanhosPersonalizados = (variacao) => {
    if (!Array.isArray(variacao?.tamanhos_personalizados)) return [];
    return variacao.tamanhos_personalizados
      .map((tamanho) => String(tamanho || '').trim())
      .filter(Boolean);
  };

  const handleQuantidadeChange = (produtoId, variacaoId, valor) => {
    const key = `${produtoId}-${variacaoId || 'sem-variacao'}`;
    
    // Permitir apenas números, vírgula e ponto
    const valorLimpo = valor.replace(/[^\d,.-]/g, '');
    
    // Se o campo está vazio, mostrar "0" em vermelho
    if (valorLimpo === '' || valorLimpo === '-' || valorLimpo === '.' || valorLimpo === ',') {
      setQuantidadesDigitadas(prev => ({
        ...prev,
        [key]: '0'
      }));
      return;
    }

    // Se o valor anterior era "0" e o novo valor começa com "0" seguido de um dígito diferente de zero,
    // substituir o "0" inicial ao invés de concatenar (ex: "0" + "9" = "9" ao invés de "09")
    const valorAnterior = quantidadesDigitadas[key];
    if (valorAnterior === '0' && valorLimpo.length > 1 && valorLimpo.startsWith('0') && valorLimpo[1] !== '.' && valorLimpo[1] !== ',') {
      // Remover o "0" inicial
      const novoValor = valorLimpo.substring(1);
      setQuantidadesDigitadas(prev => ({
        ...prev,
        [key]: novoValor
      }));
      
      // Processar o novo valor
      const quantidade = parseFloat(String(novoValor).replace(',', '.'));
      if (!isNaN(quantidade) && quantidade > 0) {
        // Continuar com a lógica de atualização do carrinho
        const produtoOriginal = produtos.find(p => p.id === produtoId);
        if (!produtoOriginal) return;

        let estoqueDisponivel;
        if (variacaoId) {
          let variacaoEstoque = produtoOriginal.variacoes?.find(v => v.id_variacao === variacaoId);
          if (!variacaoEstoque) {
            variacaoEstoque = produtoOriginal.variacoes?.find(v => v.id === variacaoId);
          }
          estoqueDisponivel = parseFloat(variacaoEstoque?.estoque_var || 0);
        } else {
          estoqueDisponivel = parseFloat(produtoOriginal.estoque || 0);
        }

        const isComposto = produtoOriginal.isComposto || produtoOriginal.is_composto;
        const isDigital = produtoOriginal.is_digital === true || produtoOriginal.is_digital === 1 || produtoOriginal.is_digital === '1';
        
        if (!isComposto && !isDigital && quantidade > estoqueDisponivel) {
          toast({ 
            title: "Estoque Insuficiente", 
            description: `Disponível: ${estoqueDisponivel}. Solicitado: ${quantidade}. Quantidade ajustada para o máximo disponível.`, 
            variant: "destructive", 
            duration: 5000 
          });
          
          setQuantidadesDigitadas(prev => ({
            ...prev,
            [key]: String(estoqueDisponivel)
          }));
          
          setCarrinho(prevCarrinho => {
            const novoCarrinho = prevCarrinho.map(item => {
              if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
                const qtdNumerica = typeof estoqueDisponivel === 'number' ? estoqueDisponivel : parseFloat(String(estoqueDisponivel).replace(',', '.')) || 0;
                return { ...item, quantidade: qtdNumerica };
              }
              return item;
            });
            return novoCarrinho;
          });
        } else {
          setCarrinho(prevCarrinho => {
            const novoCarrinho = prevCarrinho.map(item => {
              if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
                const qtdNumerica = typeof quantidade === 'number' ? quantidade : parseFloat(String(quantidade).replace(',', '.')) || 0;
                return { ...item, quantidade: qtdNumerica };
              }
              return item;
            });
            return novoCarrinho;
          });
        }
      }
      return;
    }

    // Atualizar o estado local imediatamente para permitir digitação livre
    setQuantidadesDigitadas(prev => ({
      ...prev,
      [key]: valorLimpo
    }));

    const quantidade = parseFloat(String(valorLimpo).replace(',', '.'));
    
    // Se não é um número válido ou é 0, apenas atualizar o display sem atualizar carrinho
    if (isNaN(quantidade) || quantidade < 0) {
      return;
    }

    // Se for 0, não atualizar o carrinho ainda (aguardar o usuário digitar)
    if (quantidade === 0) {
      return;
    }

    // Atualizar o carrinho sempre que houver uma quantidade válida
    const produtoOriginal = produtos.find(p => p.id === produtoId);
    if (!produtoOriginal) return;

    let estoqueDisponivel;
    if (variacaoId) {
      // Tentar encontrar variação por id_variacao primeiro, depois por id
      let variacaoEstoque = produtoOriginal.variacoes?.find(v => v.id_variacao === variacaoId);
      if (!variacaoEstoque) {
        variacaoEstoque = produtoOriginal.variacoes?.find(v => v.id === variacaoId);
      }
      
      estoqueDisponivel = parseFloat(variacaoEstoque?.estoque_var || 0);
      
    } else {
      estoqueDisponivel = parseFloat(produtoOriginal.estoque || 0);
    }

    // Verificar se o produto é composto
    const isComposto = produtoOriginal.isComposto || produtoOriginal.is_composto;
    const isDigital = produtoOriginal.is_digital === true || produtoOriginal.is_digital === 1 || produtoOriginal.is_digital === '1';
    
    // Validar estoque apenas se não for produto composto
    if (!isComposto && !isDigital && quantidade > estoqueDisponivel) {
      toast({ 
        title: "Estoque Insuficiente", 
        description: `Disponível: ${estoqueDisponivel}. Solicitado: ${quantidade}. Quantidade ajustada para o máximo disponível.`, 
        variant: "destructive", 
        duration: 5000 
      });
      
      // Ajustar para o estoque máximo
      setQuantidadesDigitadas(prev => ({
        ...prev,
        [key]: String(estoqueDisponivel)
      }));
      
      setCarrinho(prevCarrinho => {
        const novoCarrinho = prevCarrinho.map(item => {
          if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
            // Garantir que a quantidade seja sempre um número
            const qtdNumerica = typeof estoqueDisponivel === 'number' ? estoqueDisponivel : parseFloat(String(estoqueDisponivel).replace(',', '.')) || 0;
            return { ...item, quantidade: qtdNumerica };
          }
          return item;
        });
        return novoCarrinho;
      });
    } else {
      // Atualizar o carrinho com a nova quantidade
      setCarrinho(prevCarrinho => {
        const novoCarrinho = prevCarrinho.map(item => {
          if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
            // Garantir que a quantidade seja sempre um número
            const qtdNumerica = typeof quantidade === 'number' ? quantidade : parseFloat(String(quantidade).replace(',', '.')) || 0;
            return { ...item, quantidade: qtdNumerica };
          }
          return item;
        });
        return novoCarrinho;
      });
    }
  };

  const handleQuantidadeFocus = (e) => {
    // Selecionar todo o texto quando o campo recebe foco para facilitar a edição
    e.target.select();
  };

  const handleQuantidadeBlur = (produtoId, variacaoId) => {
    const key = `${produtoId}-${variacaoId || 'sem-variacao'}`;
    const valorAtual = quantidadesDigitadas[key];
    
    // Se o campo está vazio, inválido ou é 0, usar a quantidade atual do item ou 1 como padrão
    if (valorAtual === '' || valorAtual === '-' || valorAtual === '.' || valorAtual === ',' || valorAtual === '0') {
      const item = carrinho.find(item => 
        item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)
      );
      const quantidadePadrao = item?.quantidade || 1;
      
      setQuantidadesDigitadas(prev => ({
        ...prev,
        [key]: String(quantidadePadrao)
      }));
      
      setCarrinho(prevCarrinho => 
        prevCarrinho.map(item => {
          if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
            return { ...item, quantidade: quantidadePadrao };
          }
          return item;
        })
      );
      return;
    }

    // Validar e corrigir se necessário
    const quantidade = parseFloat(String(valorAtual).replace(',', '.'));
    
    if (isNaN(quantidade) || quantidade <= 0) {
      const item = carrinho.find(item => 
        item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)
      );
      const quantidadePadrao = item?.quantidade || 1;
      
      setQuantidadesDigitadas(prev => ({
        ...prev,
        [key]: String(quantidadePadrao)
      }));
      
      setCarrinho(prevCarrinho => 
        prevCarrinho.map(item => {
          if (item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao)) {
            return { ...item, quantidade: quantidadePadrao };
          }
          return item;
        })
      );
    } else {
      // Garantir que o valor formatado está correto
      const valorFormatado = formatarQuantidade(quantidade);
      if (valorFormatado !== valorAtual) {
        setQuantidadesDigitadas(prev => ({
          ...prev,
          [key]: valorFormatado
        }));
      }
    }
  };

  const removerItemCarrinho = (produtoId, variacaoId) => {
    const key = `${produtoId}-${variacaoId || 'sem-variacao'}`;
    setQuantidadesDigitadas(prev => {
      const novo = { ...prev };
      delete novo[key];
      return novo;
    });
    
    setCarrinho(prevCarrinho => 
      prevCarrinho.filter(item => 
        !(item.id_produto === produtoId && (variacaoId ? item.variacao?.id_variacao === variacaoId : !item.variacao))
      )
    );
  };

  return (
    <ScrollArea className="flex-1 mb-4">
      {carrinho.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Seu carrinho está vazio.</p>
      ) : (
        carrinho.map(item => {
          const produtoOriginal = produtos.find(p => p.id === item.id_produto);
          let estoqueMaximoItem;
          if (item.variacao) {
            // Tentar encontrar variação por id_variacao primeiro, depois por id
            let variacaoEstoque = produtoOriginal?.variacoes?.find(v => v.id_variacao === item.variacao.id_variacao);
            if (!variacaoEstoque) {
              variacaoEstoque = produtoOriginal?.variacoes?.find(v => v.id === item.variacao.id_variacao);
            }
            estoqueMaximoItem = parseFloat(variacaoEstoque?.estoque_var || 0);
          } else {
            estoqueMaximoItem = parseFloat(produtoOriginal?.estoque || 0);
          }
          const precoUnitarioItem = parseFloat(item.preco_venda_aplicado || item.preco_venda_unitario || 0);

          return (
            <motion.div 
              key={item.id_produto + (item.variacao?.id_variacao || '')} 
              layout 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex items-center space-x-3 mb-3 p-2 border rounded-md bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="w-14 h-14 flex items-center justify-center border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700">
                {getImageUrl(item.imagem_principal) ? (
                  <img 
                    src={getImageUrl(item.imagem_principal)} 
                    alt={item.nome} 
                    className="w-full h-full object-cover rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <ImageIcon size={20} className="text-gray-400 dark:text-gray-500" style={getImageUrl(item.imagem_principal) ? { display: 'none' } : {}} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.nome}</p>
                {item.variacao && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-y-1">
                    <p>{item.variacao.nome || getNomeVariacao(item.variacao.cor, 'cor') || 'Variação'}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {item.variacao.cor && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Cor: {getNomeVariacao(item.variacao.cor, 'cor')}
                        </Badge>
                      )}
                      {getTamanhosPersonalizados(item.variacao).length > 0 ? (
                        getTamanhosPersonalizados(item.variacao).map((tamanho) => (
                          <Badge
                            key={`${item.id_produto}-${item.variacao?.id_variacao || item.variacao?.id}-${tamanho}`}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tamanho}
                          </Badge>
                        ))
                      ) : item.variacao.tamanho ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {getNomeVariacao(item.variacao.tamanho, 'tamanho')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                )}
                <p className="text-xs">{formatCurrency(precoUnitarioItem)}</p>
              </div>
              <div className="flex items-center space-x-1">
                <Input
                  type="text"
                  min="1"
                  max={estoqueMaximoItem}
                  value={quantidadesDigitadas[`${item.id_produto}-${item.variacao?.id_variacao || 'sem-variacao'}`] !== undefined 
                    ? quantidadesDigitadas[`${item.id_produto}-${item.variacao?.id_variacao || 'sem-variacao'}`]
                    : String(item.quantidade || 1)}
                  placeholder="1"
                  onChange={(e) => handleQuantidadeChange(item.id_produto, item.variacao?.id_variacao, e.target.value)}
                  onFocus={handleQuantidadeFocus}
                  onBlur={() => handleQuantidadeBlur(item.id_produto, item.variacao?.id_variacao)}
                  className={`h-8 w-16 text-center text-sm ${
                    quantidadesDigitadas[`${item.id_produto}-${item.variacao?.id_variacao || 'sem-variacao'}`] === '0' 
                      ? 'text-red-500 font-bold' 
                      : ''
                  }`}
                />
              </div>
              <p className="text-sm font-semibold w-20 text-right">{formatCurrency(precoUnitarioItem * (parseFloat(String(item.quantidade).replace(',', '.')) || 0))}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removerItemCarrinho(item.id_produto, item.variacao?.id_variacao)}><Trash2 size={16}/></Button>
            </motion.div>
          )
        })
      )}
    </ScrollArea>
  );
};

export default PDVCart;