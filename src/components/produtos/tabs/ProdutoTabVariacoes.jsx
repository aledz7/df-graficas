import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Upload, ImagePlus, Settings, X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

const ProdutoTabVariacoes = ({
  currentProduto,
  handleInputChange,
  productColors,
  productSizes,
  addVariacao,
  updateVariacao,
  removeVariacao,
  handleVariacaoImageUpload,
  handleVariacoesBulkUpload,
}) => {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkPreco, setBulkPreco] = useState('');
  const [bulkEstoque, setBulkEstoque] = useState('');
  // Função para obter a URL completa da imagem
  const getImageUrl = (path) => {
    if (!path) return null;
    
    // Se já for uma URL completa ou um data:image, retornar como está
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    
    // Para compatibilidade com dados antigos que possam ter apenas o caminho relativo
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    // Se o caminho já começar com /storage, não adicionar novamente
    if (path.startsWith('/storage')) {
      return `${apiBaseUrl}${path}`;
    }
    
    return `${apiBaseUrl}/storage/${path}`;
  };

  // Funções para edição em massa
  const aplicarPrecoEmMassa = () => {
    if (!bulkPreco || isNaN(parseFloat(bulkPreco))) return;
    
    const novoPreco = parseFloat(bulkPreco);
    currentProduto.variacoes.forEach((_, index) => {
      updateVariacao(index, 'preco_var', novoPreco.toString());
    });
    setBulkPreco('');
  };

  const aplicarEstoqueEmMassa = () => {
    if (!bulkEstoque || isNaN(parseFloat(bulkEstoque))) return;
    
    const novoEstoque = parseFloat(bulkEstoque);
    currentProduto.variacoes.forEach((_, index) => {
      updateVariacao(index, 'estoque_var', novoEstoque.toString());
    });
    setBulkEstoque('');
  };

  const limparCamposBulk = () => {
    setBulkPreco('');
    setBulkEstoque('');
  };

  // Função para gerar novo código de barras para uma variação
  const gerarNovoCodigoBarras = (index) => {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 6).toUpperCase();
    const codigoBarrasVariacao = `${currentProduto.codigo_produto || 'VAR'}-${timestamp}-${index}-${randomSuffix}`;
    updateVariacao(index, 'codigo_barras', codigoBarrasVariacao);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Variações do Produto</CardTitle>
            <CardDescription>Configure cores, tamanhos e outras variações com estoque e preço individual.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="variacoes_ativa" name="variacoes_ativa" checked={currentProduto.variacoes_ativa} onCheckedChange={(checked) => handleInputChange({ target: { name: 'variacoes_ativa', checked, type: 'checkbox' }})}/>
                <Label htmlFor="variacoes_ativa">Ativar Variações para este Produto?</Label>
            </div>

            {currentProduto.variacoes_ativa && (
                <div className="space-y-3 pt-3 border-t max-h-80 overflow-y-auto">
                    {/* Upload em massa para criar variações a partir de imagens */}
                    <div className="p-3 border rounded-md bg-muted/30">
                        <Label className="text-sm mb-2 block">Adicionar várias variações por imagens</Label>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline">
                                <label htmlFor="variacoes-bulk-upload" className="cursor-pointer">
                                    <Upload size={16} className="mr-2" /> Selecionar Imagens
                                    <input id="variacoes-bulk-upload" type="file" className="sr-only" accept="image/*" multiple onChange={handleVariacoesBulkUpload} />
                                </label>
                            </Button>
                            <span className="text-xs text-muted-foreground">Cada imagem vira uma variação com o nome do arquivo.</span>
                        </div>
                    </div>

                    {/* Controles de Edição em Massa */}
                    {currentProduto.variacoes && currentProduto.variacoes.length > 1 && (
                        <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Settings size={16} className="text-blue-600" />
                                    <h4 className="font-medium text-sm text-blue-800 dark:text-blue-200">
                                        Edição em Massa ({currentProduto.variacoes.length} variações)
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setShowBulkEdit(!showBulkEdit)}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        {showBulkEdit ? 'Ocultar' : 'Mostrar'}
                                    </Button>
                                    {showBulkEdit && (
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={limparCamposBulk}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X size={14} />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            
                            {showBulkEdit && (
                                <div className="space-y-3">
                                    <Separator />
                                    
                                    {/* Definir Preço e Estoque lado a lado */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                Definir Preço para Todas (R$)
                                            </Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={bulkPreco}
                                                    onChange={(e) => setBulkPreco(e.target.value)}
                                                    placeholder="0.00"
                                                    className="text-sm"
                                                />
                                                <Button 
                                                    type="button" 
                                                    size="sm"
                                                    onClick={aplicarPrecoEmMassa}
                                                    disabled={!bulkPreco || isNaN(parseFloat(bulkPreco))}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Aplicar
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                                Definir Estoque para Todas
                                            </Label>
                                            <div className="flex gap-2 mt-1">
                                                <Input
                                                    type="number"
                                                    value={bulkEstoque}
                                                    onChange={(e) => setBulkEstoque(e.target.value)}
                                                    placeholder="0"
                                                    className="text-sm"
                                                />
                                                <Button 
                                                    type="button" 
                                                    size="sm"
                                                    onClick={aplicarEstoqueEmMassa}
                                                    disabled={!bulkEstoque || isNaN(parseFloat(bulkEstoque))}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Aplicar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Botão para gerar códigos de barras para todas as variações que não têm */}
                    {currentProduto.variacoes && currentProduto.variacoes.length > 0 && (
                        <div className="mb-3">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                    currentProduto.variacoes.forEach((variacao, index) => {
                                        if (!variacao.codigo_barras) {
                                            gerarNovoCodigoBarras(index);
                                        }
                                    });
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <RefreshCw size={14} className="mr-2" />
                                Gerar códigos faltantes
                            </Button>
                        </div>
                    )}
                    
                    {currentProduto.variacoes?.map((variacao, index) => (
                        <motion.div 
                            key={variacao.id} 
                            className="p-3 border rounded-md space-y-3 bg-muted/50"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {variacao.imagem_url ? (
                                        <img 
                                            src={variacao.imagem_url_preview || getImageUrl(variacao.imagem_url)} 
                                            alt="Variação" 
                                            className="h-10 w-10 object-cover rounded-sm"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 bg-gray-200 rounded-sm flex items-center justify-center">
                                            <ImagePlus size={20} className="text-gray-400"/>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Label htmlFor={`var-nome-${index}`} className="text-sm text-muted-foreground">Nome da Variação</Label>
                                        <Input 
                                            id={`var-nome-${index}`}
                                            type="text"
                                            value={variacao.nome || ''}
                                            onChange={(e) => updateVariacao(index, 'nome', e.target.value)}
                                            placeholder={`Variação ${index + 1}`}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariacao(index)} className="text-destructive">
                                    <Trash2 size={16}/>
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <Label htmlFor={`var-cor-${index}`}>Cor</Label>
                                    <Select value={variacao.cor} onValueChange={(value) => updateVariacao(index, 'cor', value)}>
                                        <SelectTrigger id={`var-cor-${index}`}><SelectValue placeholder="Cor"/></SelectTrigger>
                                        <SelectContent>
                                            {productColors.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor={`var-tamanho-${index}`}>Tamanho</Label>
                                    <Select value={variacao.tamanho} onValueChange={(value) => updateVariacao(index, 'tamanho', value)}>
                                        <SelectTrigger id={`var-tamanho-${index}`}><SelectValue placeholder="Tamanho"/></SelectTrigger>
                                        <SelectContent>
                                            {productSizes.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                                <div className="lg:col-span-2">
                                    <Label htmlFor={`var-codigo-barras-${index}`}>Código de Barras</Label>
                                    <div className="flex gap-1">
                                        <Input 
                                            id={`var-codigo-barras-${index}`} 
                                            type="text" 
                                            value={variacao.codigo_barras || ''} 
                                            onChange={(e) => updateVariacao(index, 'codigo_barras', e.target.value)} 
                                            placeholder="Código único da variação"
                                            className="font-mono text-xs flex-1"
                                        />
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="icon"
                                            onClick={() => gerarNovoCodigoBarras(index)}
                                            title="Gerar novo código"
                                            className="h-8 w-8"
                                        >
                                            <RefreshCw size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <Label htmlFor={`var-img-${index}`} className="text-transparent select-none">.</Label>
                                    <Button asChild variant="outline">
                                        <label htmlFor={`var-img-upload-${index}`}>
                                            <Upload size={16} className="mr-2"/> Imagem
                                            <input id={`var-img-upload-${index}`} type="file" className="sr-only" onChange={(e) => handleVariacaoImageUpload(e, index)} accept="image/*" />
                                        </label>
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                <div>
                                    <Label htmlFor={`var-estoque_var-${index}`}>Estoque</Label>
                                    <Input id={`var-estoque_var-${index}`} type="number" value={variacao.estoque_var} onChange={(e) => updateVariacao(index, 'estoque_var', e.target.value)} placeholder="0"/>
                                </div>
                                <div>
                                    <Label htmlFor={`var-preco_var-${index}`}>Preço (R$)</Label>
                                    <Input id={`var-preco_var-${index}`} type="number" step="0.01" value={variacao.preco_var} onChange={(e) => updateVariacao(index, 'preco_var', e.target.value)} placeholder="0.00"/>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    <Button type="button" variant="outline" onClick={addVariacao} className="w-full mb-4">
                        <PlusCircle size={16} className="mr-2"/> Adicionar Variação
                    </Button>
                </div>
            )}
        </CardContent>
    </Card>
  );
};

export default ProdutoTabVariacoes;