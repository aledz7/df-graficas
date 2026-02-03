import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, PlusCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AddComponenteModal from '@/components/produtos/modals/AddComponenteModal';

const AddComponenteButton = ({ onOpenModal }) => {
    return (
        <Button 
            type="button" 
            onClick={onOpenModal}
            className="w-full sm:w-auto flex items-center gap-2 bg-primary hover:bg-primary/90"
        >
            <PlusCircle size={16} /> 
            Adicionar Produto Componente
        </Button>
    );
};

const ProdutoTabComposicao = ({
  currentProduto,
  handleInputChange,
  allProducts,
  addComponente,
  removeComponente,
  updateComponenteQuantidade,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Layers className="mr-2 h-5 w-5"/>Composição do Produto</CardTitle>
            <CardDescription>Defina se este item é um kit ou serviço composto por outros produtos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox id="isComposto" name="isComposto" checked={currentProduto.isComposto} onCheckedChange={(checked) => handleInputChange({ target: { name: 'isComposto', checked, type: 'checkbox' }})}/>
                    <Label htmlFor="isComposto">Este é um produto composto (Kit/Serviço)?</Label>
                </div>
                {currentProduto.isComposto && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4 pl-6 border-l ml-2">
                        <p className="text-sm text-muted-foreground">Adicione os produtos que compõem este item. A baixa no estoque será feita nestes componentes.</p>
                        <AddComponenteButton onOpenModal={handleOpenModal} />
                        
                        <AnimatePresence>
                            <div className="space-y-2">
                            {(currentProduto.composicao || []).map((comp, index) => (
                                <motion.div 
                                    key={comp.produtoId || index}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="p-3 border rounded-md bg-muted/50"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-base break-words">{comp.nome}</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeComponente(index)} className="text-destructive h-8 w-8 flex-shrink-0 ml-2">
                                            <Trash2 size={16}/>
                                        </Button>
                                    </div>
                                    
                                    {/* Mobile: Stacked layout */}
                                    <div className="block sm:hidden space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">Qtd:</span>
                                            <Input
                                                type="number"
                                                value={comp.quantidade}
                                                onChange={(e) => updateComponenteQuantidade(index, e.target.value)}
                                                min="0.01"
                                                step="0.01"
                                                className="w-20 h-8 text-sm"
                                            />
                                            <span className="text-sm">un.</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {comp.preco_unitario && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Preço unit.</p>
                                                    <p className="text-sm font-semibold">R$ {comp.preco_unitario.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            )}
                                            {comp.custo_unitario && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Custo unit.</p>
                                                    <p className="text-sm font-semibold text-orange-600">R$ {comp.custo_unitario.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            {comp.preco_total && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Venda</p>
                                                    <p className="text-sm font-semibold text-green-600">R$ {comp.preco_total.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            )}
                                            {comp.custo_total && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Total Custo</p>
                                                    <p className="text-sm font-semibold text-orange-600">R$ {comp.custo_total.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Desktop: Horizontal layout */}
                                    <div className="hidden sm:block">
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <span>Qtd:</span>
                                                <Input
                                                    type="number"
                                                    value={comp.quantidade}
                                                    onChange={(e) => updateComponenteQuantidade(index, e.target.value)}
                                                    min="0.01"
                                                    step="0.01"
                                                    className="w-20 h-6 text-xs"
                                                />
                                                <span className="text-xs">un.</span>
                                            </div>
                                            {comp.preco_unitario && (
                                                <span>Preço unit.: <span className="font-semibold">R$ {comp.preco_unitario.toFixed(2).replace('.', ',')}</span></span>
                                            )}
                                            {comp.custo_unitario && (
                                                <span>Custo unit.: <span className="font-semibold text-orange-600">R$ {comp.custo_unitario.toFixed(2).replace('.', ',')}</span></span>
                                            )}
                                            {comp.preco_total && (
                                                <span className="text-green-600 font-semibold">Total Venda: R$ {comp.preco_total.toFixed(2).replace('.', ',')}</span>
                                            )}
                                            {comp.custo_total && (
                                                <span className="text-orange-600 font-semibold">Total Custo: R$ {comp.custo_total.toFixed(2).replace('.', ',')}</span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            </div>
                        </AnimatePresence>
                        
                        {/* Resumo do preço total da composição */}
                        {(currentProduto.composicao || []).length > 0 && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-orange-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-green-800">💰 Totais do Kit:</span>
                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                            Calculado Automaticamente
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-green-700">Preço de Venda Total:</span>
                                        <span className="text-lg font-bold text-green-600">
                                            R$ {currentProduto.preco_venda ? parseFloat(currentProduto.preco_venda).toFixed(2).replace('.', ',') : '0,00'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-orange-700">Custo Total:</span>
                                        <span className="text-lg font-bold text-orange-600">
                                            R$ {currentProduto.preco_custo ? parseFloat(currentProduto.preco_custo).toFixed(2).replace('.', ',') : '0,00'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-gray-700 border-t pt-3">
                                    <p className="font-medium">✅ Estes valores são a soma de todos os itens do kit</p>
                                    <p className="text-xs mt-1">
                                        O preço de venda e custo do produto serão automaticamente atualizados conforme você adiciona, remove ou altera a quantidade dos componentes.
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </CardContent>

        {/* Modal para adicionar componentes */}
        <AddComponenteModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onAddComponente={addComponente}
          allProducts={allProducts}
          currentProdutoId={currentProduto.id}
        />
    </Card>
  );
};

export default ProdutoTabComposicao;