import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, CheckCircle, Percent, DollarSign, TrendingUp, Package, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const EntradaEstoqueItensParaEntrada = ({ itensEntrada, handleUpdateItem, handleRemoveItem, handleFinalizarEntrada, setItensEntrada }) => {
  const [markupType, setMarkupType] = useState('percentual'); // 'percentual' ou 'fixo'
  const [markupValue, setMarkupValue] = useState('');

  const applyMarkupToItem = (item, type, value) => {
    const custo = parseFloat(item.custoUnitario || 0);
    if (isNaN(custo)) return item.preco_venda || '';

    let novoPrecoVenda;
    if (type === 'percentual') {
      novoPrecoVenda = custo * (1 + (parseFloat(value || 0) / 100));
    } else { // fixo
      novoPrecoVenda = custo + parseFloat(value || 0);
    }
    return novoPrecoVenda.toFixed(2);
  };
  
  const handleApplyMarkupGlobal = () => {
    if (markupValue === '' || isNaN(parseFloat(markupValue))) {
      alert("Por favor, insira um valor de markup válido.");
      return;
    }
    
    const updatedItens = itensEntrada.map(item => {
      // Aplicar markup apenas se for um novo item do XML ou se o preço de venda não estiver definido
      // ou se o usuário explicitamente quiser (poderia ser um checkbox "Sobrescrever Preços Existentes")
      // Por agora, vamos focar em novos itens e itens sem preço de venda
      if (item.isNovoDoXml || !item.preco_venda || parseFloat(item.preco_venda) === 0) {
        const novoPrecoVenda = applyMarkupToItem(item, markupType, markupValue);
        return { ...item, preco_venda: novoPrecoVenda };
      }
      return item;
    });
    setItensEntrada(updatedItens);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens para Entrada</CardTitle>
        <CardDescription>Produtos selecionados para adicionar ao estoque. Ajuste preços de venda aqui.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 border rounded-lg bg-muted/30 dark:bg-muted/20">
          <h4 className="text-md font-semibold mb-2 flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-blue-500"/>Aplicar Markup no Preço de Venda (para itens novos/sem preço)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label htmlFor="markupType" className="text-sm font-medium">Tipo de Markup</label>
              <Select value={markupType} onValueChange={setMarkupType}>
                <SelectTrigger id="markupType" className="h-10">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual"><Percent className="mr-2 h-4 w-4 inline-block"/>Percentual (%)</SelectItem>
                  <SelectItem value="fixo"><DollarSign className="mr-2 h-4 w-4 inline-block"/>Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="markupValue" className="text-sm font-medium">Valor do Markup</label>
              <Input
                id="markupValue"
                type="number"
                placeholder={markupType === 'percentual' ? 'Ex: 50 para 50%' : 'Ex: 25 para R$25,00'}
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                className="h-10"
              />
            </div>
            <Button onClick={handleApplyMarkupGlobal} className="h-10 bg-blue-600 hover:bg-blue-700 text-white">
              Aplicar em Todos
            </Button>
          </div>
           <p className="text-xs text-muted-foreground mt-2">O markup será aplicado sobre o custo para calcular o preço de venda de itens novos ou sem preço de venda definido.</p>
        </div>

        {/* Visualização em Cards para Mobile */}
        <div className="md:hidden">
          <ScrollArea className="h-64">
            <div className="space-y-4 pr-2">
              {itensEntrada.length > 0 ? itensEntrada.map(item => (
                <motion.div
                  key={item.itemId || item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base break-words">{item.nomeExibicao || item.nome}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.variacao && (
                            <Badge variant="secondary" className="text-purple-600 border-purple-300">
                              <Palette className="h-3 w-3 mr-1" /> Variação
                            </Badge>
                          )}
                          {item.isNovoDoXml && (
                            <Badge variant="outline" className="text-blue-600 border-blue-300">
                              Novo do XML
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(item.itemId || item.id)} 
                        className="text-red-600 hover:text-red-700 flex-shrink-0 ml-2"
                      >
                        <Trash2 size={20}/>
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`qtd-${item.itemId || item.id}`} className="text-xs">Quantidade</Label>
                        <Input 
                          id={`qtd-${item.itemId || item.id}`}
                          type="number" 
                          value={item.quantidade} 
                          onChange={(e) => handleUpdateItem(item.itemId || item.id, 'quantidade', parseFloat(e.target.value) || 0)} 
                          min="0.01" 
                          step="0.01" 
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`custo-${item.itemId || item.id}`} className="text-xs">Custo Unit.</Label>
                        <Input 
                          id={`custo-${item.itemId || item.id}`}
                          type="number" 
                          step="0.01" 
                          value={item.custoUnitario} 
                          onChange={(e) => handleUpdateItem(item.itemId || item.id, 'custoUnitario', e.target.value)} 
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`venda-${item.itemId || item.id}`} className="text-xs">Preço de Venda</Label>
                      <Input 
                        id={`venda-${item.itemId || item.id}`}
                        type="number" 
                        step="0.01" 
                        value={item.preco_venda || ''} 
                        onChange={(e) => handleUpdateItem(item.itemId || item.id, 'preco_venda', e.target.value)} 
                        placeholder="R$ 0,00" 
                        className="h-9"
                      />
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Subtotal Custo</span>
                        <span className="text-base font-bold text-primary">
                          {formatCurrency(item.quantidade * parseFloat(item.custoUnitario || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Nenhum item adicionado.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Visualização em Tabela para Desktop */}
        <div className="hidden md:block">
          <ScrollArea className="h-64 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-24">Qtd.</TableHead>
                  <TableHead className="w-28">Custo Unit.</TableHead>
                  <TableHead className="w-28">Preço Venda</TableHead>
                  <TableHead className="w-28 text-right">Subtotal Custo</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensEntrada.map(item => (
                  <TableRow key={item.itemId || item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{item.nomeExibicao || item.nome}</span>
                        {item.variacao && (
                          <Badge variant="secondary" className="text-purple-600 text-xs">
                            <Palette className="h-3 w-3 mr-1" /> Var
                          </Badge>
                        )}
                        {item.isNovoDoXml && <span className="text-xs text-blue-500 ml-1">(Novo do XML)</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={item.quantidade} onChange={(e) => handleUpdateItem(item.itemId || item.id, 'quantidade', parseFloat(e.target.value) || 0)} min="0.01" step="0.01" className="h-8"/>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={item.custoUnitario} onChange={(e) => handleUpdateItem(item.itemId || item.id, 'custoUnitario', e.target.value)} className="h-8"/>
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.01" value={item.preco_venda || ''} onChange={(e) => handleUpdateItem(item.itemId || item.id, 'preco_venda', e.target.value)} placeholder="R$ 0,00" className="h-8"/>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.quantidade * parseFloat(item.custoUnitario || 0))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.itemId || item.id)} className="text-destructive h-8 w-8"><Trash2 size={16}/></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {itensEntrada.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum item adicionado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleFinalizarEntrada} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="mr-2 h-5 w-5"/> Finalizar Entrada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntradaEstoqueItensParaEntrada;