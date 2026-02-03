import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import JsBarcode from 'jsbarcode';
import { v4 as uuidv4 } from 'uuid';
import printJS from 'print-js';
import jsPDF from 'jspdf';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, PlusCircle, Trash2, FileText, Package, ImagePlus, ChevronDown, CheckSquare, Square, Thermometer, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { produtoService } from '@/services/api';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// Componente para exibir imagem do produto
const ProductImage = ({ product, className = "h-8 w-8" }) => {
    const getImageUrl = (path) => {
        if (!path) return null;
        
        if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }
        
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        if (path.startsWith('/storage')) {
            return `${apiBaseUrl}${path}`;
        }
        
        return `${apiBaseUrl}/storage/${path}`;
    };

    const imageUrl = getImageUrl(product?.imagem_principal);

    if (!imageUrl) {
        return (
            <div className={`${className} bg-gray-200 rounded-sm flex items-center justify-center`}>
                <ImagePlus size={16} className="text-gray-400"/>
            </div>
        );
    }

    return (
        <img 
            src={imageUrl} 
            alt={product?.nome || 'Produto'} 
            className={`${className} object-cover rounded-sm`}
            onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
            }}
        />
    );
};

// Componente para seleção de variações
const VariationSelector = ({ product, isOpen, onClose, onConfirm }) => {
    const [selectedVariations, setSelectedVariations] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all'); // all, cor, tamanho, preco

    useEffect(() => {
        if (product && product.variacoes) {
            setSelectedVariations([]);
            setSelectAll(false);
            setSearchTerm('');
            setFilterBy('all');
        }
    }, [product]);

    // Função para filtrar variações
    const getFilteredVariations = () => {
        if (!product?.variacoes) return [];
        
        let filtered = product.variacoes.filter((variation, index) => {
            const matchesSearch = !searchTerm || 
                variation.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                variation.cor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                variation.tamanho?.toLowerCase().includes(searchTerm.toLowerCase());
            
            return matchesSearch;
        });
        
        return filtered;
    };

    const filteredVariations = getFilteredVariations();

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedVariations(filteredVariations.map((_, index) => 
                product.variacoes.findIndex(v => v === filteredVariations[index])
            ));
        } else {
            setSelectedVariations([]);
        }
    };

    const handleVariationToggle = (index) => {
        setSelectedVariations(prev => {
            const newSelection = prev.includes(index) 
                ? prev.filter(i => i !== index)
                : [...prev, index];
            
            setSelectAll(newSelection.length === filteredVariations.length);
            return newSelection;
        });
    };

    const handleSelectRandom = () => {
        const randomCount = Math.floor(Math.random() * filteredVariations.length) + 1;
        const randomIndices = [];
        const availableIndices = filteredVariations.map((_, index) => 
            product.variacoes.findIndex(v => v === filteredVariations[index])
        );
        
        for (let i = 0; i < randomCount; i++) {
            const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            if (!randomIndices.includes(randomIndex)) {
                randomIndices.push(randomIndex);
            }
        }
        
        setSelectedVariations(randomIndices);
        setSelectAll(randomIndices.length === filteredVariations.length);
    };

    const handleClearSelection = () => {
        setSelectedVariations([]);
        setSelectAll(false);
    };

    const handleConfirm = () => {
        const variationsToAdd = selectedVariations.map(index => product.variacoes[index]);
        onConfirm(variationsToAdd);
        onClose();
    };

    if (!product || !product.variacoes) return null;

    // Obter estatísticas das variações
    const getVariationStats = () => {
        const cores = [...new Set(product.variacoes.map(v => v.cor).filter(Boolean))];
        const tamanhos = [...new Set(product.variacoes.map(v => v.tamanho).filter(Boolean))];
        const precoMin = Math.min(...product.variacoes.map(v => parseFloat(v.preco_var || 0)));
        const precoMax = Math.max(...product.variacoes.map(v => parseFloat(v.preco_var || 0)));
        
        return { cores, tamanhos, precoMin, precoMax };
    };

    const stats = getVariationStats();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="flex-shrink-0 pb-4">
                    <DialogTitle>Selecionar Variações - {product.nome}</DialogTitle>
                    <DialogDescription>
                        Escolha quais variações você deseja adicionar às etiquetas. 
                        Total de variações: {product.variacoes.length}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-col flex-1 min-h-0 space-y-4 overflow-hidden">
                    {/* Barra de busca */}
                    <div className="space-y-2 flex-shrink-0">
                        <Label htmlFor="search-variations">Buscar variações</Label>
                        <Input
                            id="search-variations"
                            placeholder="Buscar por nome, cor ou tamanho..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                        />
                    </div>

                    {/* Estatísticas e ações rápidas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg flex-shrink-0">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Estatísticas</h4>
                            <div className="text-xs space-y-1 text-muted-foreground">
                                {stats.cores.length > 0 && <p>• {stats.cores.length} cores: {stats.cores.join(', ')}</p>}
                                {stats.tamanhos.length > 0 && <p>• {stats.tamanhos.length} tamanhos: {stats.tamanhos.join(', ')}</p>}
                                <p>• Preço: R$ {stats.precoMin.toFixed(2)} - R$ {stats.precoMax.toFixed(2)}</p>
                                <p>• Selecionadas: {selectedVariations.length} de {filteredVariations.length}</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Ações Rápidas</h4>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectAll(true)}
                                    disabled={filteredVariations.length === 0}
                                >
                                    Todas ({filteredVariations.length})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSelection}
                                    disabled={selectedVariations.length === 0}
                                >
                                    Limpar
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSelectRandom}
                                    disabled={filteredVariations.length === 0}
                                >
                                    Aleatórias
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Seleção principal */}
                    <div className="flex items-center space-x-2 p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 flex-shrink-0">
                        <Checkbox 
                            id="select-all" 
                            checked={selectAll}
                            onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all" className="font-medium">
                            Selecionar todas as variações filtradas ({filteredVariations.length})
                        </Label>
                    </div>

                    {/* Lista de variações */}
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <div className="h-full overflow-y-auto overflow-x-hidden border rounded-md">
                            <div className="space-y-2 p-3">
                            {filteredVariations.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <ImagePlus size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma variação encontrada</p>
                                    <p className="text-xs">Tente ajustar os filtros de busca</p>
                                </div>
                            ) : (
                                filteredVariations.map((variation, index) => {
                                    const originalIndex = product.variacoes.findIndex(v => v === variation);
                                    return (
                                        <div key={originalIndex} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                            <Checkbox 
                                                id={`variation-${originalIndex}`}
                                                checked={selectedVariations.includes(originalIndex)}
                                                onCheckedChange={() => handleVariationToggle(originalIndex)}
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                                {variation.imagem_url ? (
                                                    <img 
                                                        src={variation.imagem_url_preview || variation.imagem_url} 
                                                        alt={variation.nome} 
                                                        className="h-12 w-12 object-cover rounded-sm border"
                                                    />
                                                ) : (
                                                    <div className="h-12 w-12 bg-gray-200 rounded-sm flex items-center justify-center border">
                                                        <ImagePlus size={20} className="text-gray-400"/>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="font-medium">{variation.nome}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        R$ {parseFloat(variation.preco_var || 0).toFixed(2)}
                                                    </div>
                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                        {variation.cor && (
                                                            <span className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                                                                {variation.cor}
                                                            </span>
                                                        )}
                                                        {variation.tamanho && (
                                                            <span className="bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                                                                {variation.tamanho}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            </div>
                        </div>
                    </div>

                    {/* Rodapé com ações */}
                    <div className="flex justify-between items-center pt-4 mt-4 border-t flex-shrink-0 bg-background">
                        <div className="text-sm text-muted-foreground">
                            {selectedVariations.length > 0 && (
                                <span className="font-medium text-primary">
                                    {selectedVariations.length} variação{selectedVariations.length !== 1 ? 'ões' : ''} selecionada{selectedVariations.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleConfirm}
                                disabled={selectedVariations.length === 0}
                            >
                                Adicionar {selectedVariations.length} variação{selectedVariations.length !== 1 ? 'ões' : ''}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Componente para seleção de produto com variações
const ProductSelector = ({ products, selectedProductId, onProductSelect, selectedVariation, onVariationSelect, onShowVariationSelector, isLoading }) => {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [barcodeSearchTerm, setBarcodeSearchTerm] = useState('');

    // Função para buscar produto por código de barras (incluindo variações)
    const findProductByBarcode = (barcode) => {
        if (!barcode.trim()) return null;
        
        const cleanBarcode = barcode.trim().toLowerCase();
        
        // Buscar nos produtos principais
        for (const product of products) {
            if (!product.status) continue;
            
            // Verificar código de barras do produto principal
            if (product.codigo_barras?.toLowerCase() === cleanBarcode || 
                product.codigo_produto?.toLowerCase() === cleanBarcode) {
                return { product, variation: null };
            }
            
            // Verificar códigos de barras das variações
            if (product.variacoes_ativa && product.variacoes?.length > 0) {
                for (const variation of product.variacoes) {
                    if (variation.codigo_barras?.toLowerCase() === cleanBarcode) {
                        return { product, variation };
                    }
                }
            }
        }
        
        return null;
    };

    // Função para buscar automaticamente quando um código de barras é inserido
    const handleBarcodeSearch = (barcode) => {
        setBarcodeSearchTerm(barcode);
        
        if (barcode.length >= 8) { // Buscar apenas se tiver pelo menos 8 caracteres (código de barras mínimo)
            const result = findProductByBarcode(barcode);
            if (result) {
                onProductSelect(result.product.id);
                onVariationSelect(result.variation);
                setIsOpen(false);
                setBarcodeSearchTerm('');
                
                // Feedback visual
                toast({
                    title: "Produto encontrado!",
                    description: result.variation 
                        ? `${result.product.nome} - ${result.variation.nome}`
                        : result.product.nome
                });
            }
        }
    };

    const filteredProducts = (products || []).filter(p => 
        (p.status !== false) && 
        ((p.nome || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
    );

    const selectedProduct = products.find(p => p.id === selectedProductId);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    role="combobox" 
                    aria-expanded={isOpen}
                    className="w-full justify-between h-auto p-3"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="text-muted-foreground">Carregando produtos...</span>
                    ) : selectedProduct ? (
                        <div className="flex items-center gap-3 w-full">
                            <ProductImage product={selectedProduct} className="h-10 w-10" />
                            <div className="flex-1 text-left">
                                <div className="font-medium">{selectedProduct.nome}</div>
                                <div className="text-sm text-muted-foreground">
                                    {selectedProduct.codigo_produto}
                                    {selectedVariation && (
                                        <span className="ml-2">
                                            • {selectedVariation.nome}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Selecione um produto...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="p-3 border-b space-y-2">
                    <Input
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8"
                    />
                    <div className="relative">
                        <Input
                            placeholder="Ler/digitar código de barras..."
                            value={barcodeSearchTerm}
                            onChange={(e) => handleBarcodeSearch(e.target.value)}
                            className="h-8 pl-8"
                            autoFocus={false}
                        />
                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                            <span className="text-xs font-mono bg-gray-100 px-1 rounded">|||</span>
                        </div>
                    </div>
                </div>
                <ScrollArea className="h-[300px]">
                    <div className="p-1">
                        {filteredProducts.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto ativo'}
                            </div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div key={product.id}>
                                    <div
                                        className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer rounded-md"
                                        onClick={() => {
                                            onProductSelect(product.id);
                                            onVariationSelect(null);
                                            if (!product.variacoes_ativa || !product.variacoes?.length) {
                                                setIsOpen(false);
                                            }
                                        }}
                                    >
                                        <ProductImage product={product} className="h-12 w-12" />
                                        <div className="flex-1">
                                            <div className="font-medium">{product.nome}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {product.codigo_produto}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                R$ {parseFloat(product.preco_venda || 0).toFixed(2)}
                                            </div>
                                        </div>
                                        {product.variacoes_ativa && product.variacoes?.length > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {product.variacoes.length} variações
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    {/* Mostrar variações se o produto tiver variações ativas */}
                                    {product.variacoes_ativa && product.variacoes?.length > 0 && selectedProductId === product.id && (
                                        <div className="ml-4 border-l-2 border-muted pl-3">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                                Variações disponíveis:
                                            </div>
                                            <div
                                                className="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer rounded-md mb-1 border border-blue-200 dark:border-blue-800"
                                                onClick={() => {
                                                    onShowVariationSelector(product);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-sm flex items-center justify-center">
                                                    <CheckSquare size={14} className="text-blue-600"/>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                        Selecionar múltiplas variações
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Escolha todas, várias ou uma variação
                                                    </div>
                                                </div>
                                                <div className="text-xs text-blue-500 font-medium">
                                                    {product.variacoes.length} variações
                                                </div>
                                            </div>
                                            {product.variacoes.map((variation, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer rounded-md mb-1"
                                                    onClick={() => {
                                                        onVariationSelect(variation);
                                                        setIsOpen(false);
                                                    }}
                                                >
                                                    {variation.imagem_url ? (
                                                        <img 
                                                            src={variation.imagem_url_preview || variation.imagem_url} 
                                                            alt={variation.nome} 
                                                            className="h-8 w-8 object-cover rounded-sm"
                                                        />
                                                    ) : (
                                                        <div className="h-8 w-8 bg-gray-200 rounded-sm flex items-center justify-center">
                                                            <ImagePlus size={14} className="text-gray-400"/>
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{variation.nome}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            R$ {parseFloat(variation.preco_var || 0).toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

// Função para gerar código de barras otimizado para impressora térmica
const generateThermalBarcode = (product) => {
    try {
        // Prioridade: código do produto > código de barras da variação > código de barras principal > ID
        const productCode = product.codigo_produto || 
                            product.variation?.codigo_produto ||
                            product.variation?.codigo_barras || 
                            product.codigo_barras ||
                            product.id;
        
        // Converter para string e extrair apenas números
        const codeStr = String(productCode || '');
        const numericOnly = codeStr.replace(/[^0-9]/g, '');
        
        // Se encontrou números válidos, usar eles
        if (numericOnly && numericOnly.length > 0) {
            // Garantir que tenha pelo menos 8 dígitos e máximo 13 (EAN-13)
            const result = numericOnly.length < 8 ? numericOnly.padStart(8, '0') : 
                          (numericOnly.length > 13 ? numericOnly.substring(0, 13) : numericOnly);
            console.log('🔧 generateThermalBarcode - Números encontrados:', {
                original: productCode,
                numericOnly,
                result,
                length: result.length,
                product: product.nome
            });
            return result;
        }
        
        // Se não há números válidos, gerar código baseado no ID
        const idStr = String(product.id || '1');
        const idNumeric = idStr.replace(/[^0-9]/g, '');
        const validId = idNumeric || '1';
        
        // Garantir que tenha pelo menos 8 dígitos e máximo 13 (EAN-13)
        const result = validId.length < 8 ? validId.padStart(8, '0') : 
                      (validId.length > 13 ? validId.substring(0, 13) : validId);
        
        console.log('🔧 generateThermalBarcode - Fallback para ID:', {
            original: productCode,
            idStr,
            idNumeric,
            validId,
            result,
            length: result.length,
            product: product.nome
        });
        
        return result;
        
    } catch (error) {
        console.error('Erro ao gerar código de barras térmico:', error);
        // Código padrão seguro em caso de erro
        return '10000001';
    }
};

// Função para reduzir o conteúdo do código de barras
const shortenBarcodeContent = (barcodeValue, type = 'a4', product = null) => {
    try {
        if (!barcodeValue) return '10000001'; // Código padrão válido
        
        const originalValue = String(barcodeValue);
        
        // Para impressora térmica, gerar código otimizado
        if (type === 'thermal' && product) {
            const shortCode = generateThermalBarcode(product);
            // Garantir que o código seja válido (apenas números)
            const validCode = shortCode.replace(/[^0-9]/g, '');
            return validCode || '10000001';
        }
        
        // Para A4, extrair apenas números também
        const numericOnly = originalValue.replace(/[^0-9]/g, '');
        return numericOnly || '10000001';
        
    } catch (error) {
        console.error('Erro ao processar código de barras:', error);
        return '10000001'; // Código padrão seguro
    }
};

const BarcodeLabel = ({ product, type = 'a4' }) => {
    const barcodeRef = useRef(null);

    useEffect(() => {
        if (barcodeRef.current && product) {
            try {
                // Calcular o valor do código primeiro - priorizar código do produto
                const originalBarcodeValue = product.codigo_produto || 
                                             product.variation?.codigo_produto ||
                                             product.variation?.codigo_barras || 
                                             product.codigo_barras || 
                                             product.id;
                const barcodeValue = shortenBarcodeContent(originalBarcodeValue, type, product);
                
                // Validação extra: garantir que o código seja apenas números
                const cleanBarcodeValue = String(barcodeValue || '').replace(/[^0-9]/g, '');
                const finalBarcodeValue = cleanBarcodeValue || '10000001';
                
                // Debug: mostrar o código gerado
                console.log('🔍 Debug Código de Barras:', {
                    original: originalBarcodeValue,
                    processed: barcodeValue,
                    cleaned: cleanBarcodeValue,
                    final: finalBarcodeValue,
                    product: product.nome
                });
                
                // Ajustar largura automaticamente para caber no container
                const containerWidthPx = type === 'thermal' ? 190 : 200;
                const digits = String(finalBarcodeValue || '').length || 12;
                const targetBars = digits * 11; // aprox. largura CODE128 em módulos
                const computedWidth = Math.max(0.8, Math.min(2, (containerWidthPx - 4) / targetBars));

                const barcodeOptions = type === 'thermal' ? {
                    format: "CODE128",
                    height: 50, // aumentado para facilitar o bip
                    width: 1.2,
                    displayValue: true,
                    fontSize: 8,
                    margin: 0,
                    textMargin: 1,
                    marginLeft: 0,
                    marginRight: 0
                } : {
                    format: "CODE128",
                    height: 40,
                    width: computedWidth,
                    displayValue: true,
                    fontSize: 10,
                    margin: 0,
                    textMargin: 0,
                    marginLeft: 0,
                    marginRight: 0
                };
                
                // Usar código de barras validado
                JsBarcode(barcodeRef.current, finalBarcodeValue, barcodeOptions);
            } catch (e) {
                console.error("Erro ao gerar código de barras:", e);
                // Em caso de erro, tentar com código padrão
                try {
                    JsBarcode(barcodeRef.current, '10000001', {
                        format: "CODE128",
                        height: type === 'thermal' ? 50 : 40,
                        width: 1.2,
                        displayValue: true,
                        fontSize: 8,
                        margin: 0,
                        textMargin: 1
                    });
                } catch (fallbackError) {
                    console.error("Erro no fallback do código de barras:", fallbackError);
                }
            }
        }
    }, [product, type]);

    if (!product) return null;

    const getImageUrl = (path) => {
        if (!path) return null;
        
        if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
            return path;
        }
        
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        if (path.startsWith('/storage')) {
            return `${apiBaseUrl}${path}`;
        }
        
        return `${apiBaseUrl}/storage/${path}`;
    };

    const imageUrl = getImageUrl(product.imagem_principal);

    if (type === 'thermal') {
        const nomeAbreviado = product.nome.length > 25 
            ? product.nome.substring(0, 25) + '...' 
            : product.nome;
        const preco = parseFloat(product.preco_venda || 0).toFixed(2);
        const nomeComPreco = `${nomeAbreviado} - R$ ${preco}`;
        
        return (
            <div className="thermal-label" style={{
                border: '1px solid #ddd',
                padding: '1mm 2mm',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                backgroundColor: 'white',
                color: 'black',
                width: '50mm',
                height: '30mm',
                boxSizing: 'border-box'
            }}>
                <div className="thermal-label-name" style={{
                    fontSize: '6pt',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: '1mm',
                    lineHeight: 1.1,
                    wordBreak: 'break-word',
                    maxHeight: '2.2em',
                    overflow: 'hidden',
                    width: '100%'
                }}>{nomeComPreco}</div>
                
                {/* Sem imagem na etiqueta térmica para aumentar o código de barras */}
                
                <svg ref={barcodeRef} style={{ width: '42mm', height: 'auto', maxHeight: '25mm' }}></svg>
            </div>
        );
    }

    return (
        <div className="barcode-item" style={{
            border: '1px solid #ccc',
            padding: '0.25cm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            color: 'black',
            width: '6cm',
            height: '3.8cm',
            boxSizing: 'border-box'
        }}>
            <div className="barcode-item-name" style={{
                fontSize: '11px',
                fontWeight: 'bold',
                textAlign: 'center',
                marginBottom: '2px',
                lineHeight: 1.1,
                wordBreak: 'break-word',
                maxHeight: '2.4em',
                overflow: 'hidden'
            }}>{product.nome}</div>
            
            {imageUrl && (
                <div className="barcode-item-image" style={{
                    width: '2cm',
                    height: '1.4cm',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2px'
                }}>
                    <img 
                        src={imageUrl} 
                        alt={product.nome} 
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            )}
            
            <svg ref={barcodeRef} style={{ width: '100%', height: '34px' }}></svg>
            <div className="barcode-item-price" style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginTop: '2px'
            }}>R$ {parseFloat(product.preco_venda || 0).toFixed(2)}</div>
        </div>
    );
};

const BarcodeGeneratorPage = () => {
    const { toast } = useToast();
    const [allProducts, setAllProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariation, setSelectedVariation] = useState(null);
    const [productsToPrint, setProductsToPrint] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [variationSelectorOpen, setVariationSelectorOpen] = useState(false);
    const [productForVariationSelector, setProductForVariationSelector] = useState(null);
    const [printType, setPrintType] = useState('a4'); // 'a4' ou 'thermal'

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoadingProducts(true);
                const response = await produtoService.getAll('?per_page=1000');
                const payload = (response && response.data !== undefined) ? response.data : response;
                const productsData = (payload && payload.data) ? payload.data : payload;
                const products = Array.isArray(productsData) ? productsData : [];
                setAllProducts(products);
            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                setAllProducts([]);
                toast({
                    title: "Erro ao carregar produtos",
                    description: "Não foi possível carregar a lista de produtos. Tente novamente.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingProducts(false);
            }
        };
        
        loadData();
    }, [toast]);

    const handleAddProduct = () => {
        if (!selectedProductId) {
            toast({ title: 'Nenhum produto selecionado', variant: 'destructive' });
            return;
        }
        const product = (allProducts || []).find(p => p.id === selectedProductId);
        if (product) {
            // Verificar estoque disponível
            const estoqueDisponivel = selectedVariation?.estoque_var || 
                                      product.estoque_atual || 
                                      product.estoque || 
                                      0;
            
            // Se não há estoque, mostrar aviso
            if (estoqueDisponivel <= 0) {
                toast({
                    title: 'Produto sem estoque',
                    description: 'Este produto não possui quantidade disponível em estoque.',
                    variant: 'destructive'
                });
                return;
            }
            
            // Verificar se já existe este produto na lista e calcular quantidade total
            const quantidadeAtualNaLista = productsToPrint
                .filter(item => {
                    // Para produtos com variação, comparar o ID da variação
                    if (selectedVariation && item.product.variation) {
                        return item.product.variation.id === selectedVariation.id;
                    }
                    // Para produtos sem variação, comparar o ID do produto principal
                    if (!selectedVariation && !item.product.variation) {
                        return item.product.id === product.id;
                    }
                    return false;
                })
                .reduce((total, item) => total + (item.quantity || 0), 0);
            
            // Verificar se adicionar 1 unidade excederia o estoque
            if (quantidadeAtualNaLista + 1 > estoqueDisponivel) {
                toast({
                    title: 'Estoque insuficiente',
                    description: `Quantidade atual na lista: ${quantidadeAtualNaLista}. Estoque disponível: ${estoqueDisponivel}. Você não pode adicionar mais unidades deste produto.`,
                    variant: 'destructive'
                });
                return;
            }
            
            // Se tem variação selecionada, usar dados da variação
            const productToAdd = selectedVariation ? {
                ...product,
                nome: `${product.nome} - ${selectedVariation.nome}`,
                preco_venda: selectedVariation.preco_var || product.preco_venda,
                codigo_barras: selectedVariation.codigo_barras || product.codigo_barras,
                imagem_principal: selectedVariation.imagem_url || product.imagem_principal,
                variation: selectedVariation
            } : product;
            
            setProductsToPrint(prev => [...prev, { id: uuidv4(), product: productToAdd, quantity: 1 }]);
            setSelectedProductId('');
            setSelectedVariation(null);
            
            // Limpar campos de busca
            const quickSearchInput = document.getElementById('barcode-quick-search');
            if (quickSearchInput) {
                quickSearchInput.value = '';
            }
            
            toast({ 
                title: 'Produto adicionado!', 
                description: selectedVariation 
                    ? `${product.nome} - ${selectedVariation.nome} (Estoque: ${estoqueDisponivel})`
                    : `${product.nome} (Estoque: ${estoqueDisponivel})`
            });
        }
    };

    const handleShowVariationSelector = (product) => {
        setProductForVariationSelector(product);
        setVariationSelectorOpen(true);
    };

    const handleVariationSelectorConfirm = (variations) => {
        const product = productForVariationSelector;
        if (product && variations.length > 0) {
            const productsToAdd = [];
            const variationsComProblema = [];
            
            // Verificar cada variação individualmente
            for (const variation of variations) {
                const estoqueDisponivel = variation.estoque_var || 0;
                
                // Verificar se já existe esta variação na lista
                const quantidadeAtualNaLista = productsToPrint
                    .filter(item => item.product.variation && item.product.variation.id === variation.id)
                    .reduce((total, item) => total + (item.quantity || 0), 0);
                
                // Verificar se adicionar 1 unidade excederia o estoque
                if (quantidadeAtualNaLista + 1 > estoqueDisponivel) {
                    variationsComProblema.push({
                        variation,
                        quantidadeAtual: quantidadeAtualNaLista,
                        estoqueDisponivel
                    });
                } else if (estoqueDisponivel > 0) {
                    // Adicionar apenas se há estoque disponível
                    productsToAdd.push({
                        id: uuidv4(),
                        product: {
                            ...product,
                            nome: `${product.nome} - ${variation.nome}`,
                            preco_venda: variation.preco_var || product.preco_venda,
                            codigo_barras: variation.codigo_barras || product.codigo_barras,
                            imagem_principal: variation.imagem_url || product.imagem_principal,
                            variation: variation
                        },
                        quantity: 1
                    });
                }
            }
            
            // Adicionar apenas as variações que passaram na validação
            if (productsToAdd.length > 0) {
                setProductsToPrint(prev => [...prev, ...productsToAdd]);
            }
            
            // Mostrar feedback
            if (productsToAdd.length === variations.length) {
                toast({ 
                    title: `${variations.length} variação${variations.length !== 1 ? 'ões' : ''} adicionada${variations.length !== 1 ? 's' : ''}`, 
                    description: `Produto: ${product.nome}` 
                });
            } else if (productsToAdd.length > 0) {
                toast({ 
                    title: `${productsToAdd.length} variação${productsToAdd.length !== 1 ? 'ões' : ''} adicionada${productsToAdd.length !== 1 ? 's' : ''}`, 
                    description: `${variationsComProblema.length} variação${variationsComProblema.length !== 1 ? 'ões' : ''} não adicionada${variationsComProblema.length !== 1 ? 's' : ''} por falta de estoque`,
                    variant: "destructive"
                });
            } else {
                toast({ 
                    title: "Nenhuma variação adicionada", 
                    description: "Todas as variações selecionadas já estão no limite do estoque disponível",
                    variant: "destructive"
                });
            }
        }
    };

    const handleVariationSelectorClose = () => {
        setVariationSelectorOpen(false);
        setProductForVariationSelector(null);
    };

    // Função para busca rápida por código de barras no campo principal
    const handleQuickBarcodeSearch = (barcode) => {
        if (barcode.length >= 8) { // Buscar apenas se tiver pelo menos 8 caracteres
            const cleanBarcode = barcode.trim().toLowerCase();
            
            // Buscar nos produtos principais
            for (const product of allProducts) {
                if (!product.status) continue;
                
                // Verificar código de barras do produto principal
                if (product.codigo_barras?.toLowerCase() === cleanBarcode || 
                    product.codigo_produto?.toLowerCase() === cleanBarcode) {
                    setSelectedProductId(product.id);
                    setSelectedVariation(null);
                    toast({
                        title: "Produto encontrado!",
                        description: product.nome
                    });
                    return;
                }
                
                // Verificar códigos de barras das variações
                if (product.variacoes_ativa && product.variacoes?.length > 0) {
                    for (const variation of product.variacoes) {
                        if (variation.codigo_barras?.toLowerCase() === cleanBarcode) {
                            setSelectedProductId(product.id);
                            setSelectedVariation(variation);
                            toast({
                                title: "Variação encontrada!",
                                description: `${product.nome} - ${variation.nome}`
                            });
                            return;
                        }
                    }
                }
            }
            
            // Se chegou até aqui, não encontrou
            if (barcode.length >= 10) { // Só mostrar erro para códigos mais longos
                toast({
                    title: "Produto não encontrado",
                    description: "Nenhum produto com este código de barras foi encontrado.",
                    variant: "destructive"
                });
            }
        }
    };
    
    const handleUpdateQuantity = (id, quantity) => {
        const newQuantity = parseInt(quantity, 10);
        if (isNaN(newQuantity) || newQuantity < 1) return;
        
        // Encontrar o item para verificar o estoque
        const item = productsToPrint.find(p => p.id === id);
        if (!item) return;
        
        // Obter quantidade em estoque (verificar variação ou produto principal)
        const estoqueDisponivel = item.product.variation?.estoque_var || 
                                  item.product.estoque_atual || 
                                  item.product.estoque || 
                                  0;
        
        // Limitar a quantidade ao estoque disponível
        const quantidadeFinal = Math.min(newQuantity, estoqueDisponivel);
        
        // Se a quantidade foi limitada, mostrar aviso
        if (quantidadeFinal < newQuantity) {
            toast({
                title: "Quantidade limitada pelo estoque",
                description: `Estoque disponível: ${estoqueDisponivel}. Quantidade ajustada para ${quantidadeFinal}.`,
                variant: "destructive"
            });
        }
        
        setProductsToPrint(prev => prev.map(item => item.id === id ? { ...item, quantity: quantidadeFinal } : item));
    };

    const handleRemoveProduct = (id) => {
        setProductsToPrint(prev => prev.filter(item => item.id !== id));
    };

    const handleGenerateThermalPDF = async () => {
        if ((productsToPrint || []).length === 0) {
            toast({ title: "Nenhuma etiqueta para imprimir", variant: "destructive" });
            return;
        }

        try {
            // Calcular total de etiquetas
            const totalEtiquetas = productsToPrint.reduce((acc, item) => acc + item.quantity, 0);
            
            // Dimensões: 50mm largura x altura padrão (tamanho real do papel)
            const pageWidth = 50; // largura da etiqueta
            const pageHeight = 297; // altura A4 em mm (máximo seguro)
            const labelHeight = 30; // altura de cada etiqueta
            const spacingHeight = 3; // espaçamento entre etiquetas

            // Criar PDF em orientação portrait (retrato) para etiquetas térmicas
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pageHeight, pageWidth] // [altura, largura] - portrait
            });

            let currentY = 0; // posição Y atual no PDF
            let currentPage = 1;
            const maxHeightPerPage = pageHeight - 10; // margem de segurança

            // Processar cada produto/etiqueta em sequência
            for (const item of productsToPrint) {
                for (let i = 0; i < item.quantity; i++) {
                    const product = item.product;

                    // Verificar se precisa de nova página
                    if (currentY + labelHeight > maxHeightPerPage) {
                        pdf.addPage([pageHeight, pageWidth], 'portrait');
                        currentY = 0;
                        currentPage++;
                    }

                    // Gerar código de barras baseado no código do produto
                    const canvas = document.createElement('canvas');
                    const originalBarcodeValue = product.codigo_produto || 
                                                 product.variation?.codigo_produto ||
                                                 product.variation?.codigo_barras || 
                                                 product.codigo_barras || 
                                                 product.id;
                    
                    const barcodeValue = shortenBarcodeContent(originalBarcodeValue, 'thermal', product);

                    try {
                        JsBarcode(canvas, barcodeValue, {
                            format: "CODE128",
                            height: 50, // aumentado para facilitar o bip
                            width: 1.2, // mantido para caber em 50mm
                            displayValue: true,
                            fontSize: 8, // mantido
                            margin: 0,
                            textMargin: 1
                        });

                        // Converter canvas para imagem
                        const barcodeImage = canvas.toDataURL('image/png');

                        // Adicionar nome do produto e preço (no topo da etiqueta)
                        const nomeAbreviado = (product.nome || '').length > 25 
                            ? (product.nome || '').substring(0, 25) + '...' 
                            : (product.nome || '');
                        const preco = parseFloat(product.preco_venda || 0).toFixed(2);
                        const nomeComPreco = `${nomeAbreviado} - R$ ${preco}`;

                        pdf.setFontSize(6);
                        pdf.setFont(undefined, 'bold');
                        
                        // Centralizar texto horizontalmente
                        const textWidth = pdf.getTextWidth(nomeComPreco);
                        const textX = (pageWidth - textWidth) / 2;
                        pdf.text(nomeComPreco, textX, currentY + 2); // Posição Y relativa

                        // Adicionar código de barras (centralizado na área útil de 30mm)
                        const barcodeWidth = 42; // mantido para caber em 50mm
                        const barcodeHeight = 25; // aumentado para facilitar o bip
                        const barcodeX = (pageWidth - barcodeWidth) / 2;
                        const barcodeY = currentY + 4; // posição Y ajustada
                        
                        pdf.addImage(barcodeImage, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);

                        // Avançar para a próxima etiqueta (30mm + 3mm espaçamento)
                        currentY += labelHeight;
                        
                        // Adicionar espaçamento apenas se não for a última etiqueta da página
                        if (currentY + spacingHeight <= maxHeightPerPage) {
                            currentY += spacingHeight;
                        }

                    } catch (error) {
                        console.error('Erro ao gerar código de barras:', error);
                        // Em caso de erro, adicionar texto simples
                        pdf.setFontSize(8);
                        pdf.text(`${product.nome}`, 2, currentY + 8);
                        pdf.text(`Código: ${barcodeValue}`, 2, currentY + 16);
                        pdf.text(`R$ ${parseFloat(product.preco_venda || 0).toFixed(2)}`, 2, currentY + 24);
                        
                        // Avançar para a próxima etiqueta mesmo com erro
                        currentY += labelHeight;
                        
                        // Adicionar espaçamento apenas se não for a última etiqueta da página
                        if (currentY + spacingHeight <= maxHeightPerPage) {
                            currentY += spacingHeight;
                        }
                    }
                }
            }

            // Salvar PDF
            const fileName = `etiquetas-termicas-50x30mm-${new Date().toISOString().slice(0, 10)}-${totalEtiquetas}un.pdf`;
            pdf.save(fileName);

            toast({ 
                title: "PDF gerado com sucesso!", 
                description: `${totalEtiquetas} etiqueta(s) em ${currentPage} página(s) - ${fileName}`
            });

        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            toast({ 
                title: "Erro ao gerar PDF", 
                description: "Não foi possível gerar o arquivo PDF.", 
                variant: "destructive" 
            });
        }
    };

    const handlePrintSheet = () => {
        if ((productsToPrint || []).length === 0) {
            toast({ title: "Nenhuma etiqueta para imprimir", variant: "destructive" });
            return;
        }

        // Criar um elemento temporário para impressão
        const printElement = document.createElement('div');
        
        // Função para gerar código de barras como SVG
        const generateBarcodeSVG = (text, type = 'a4') => {
            try {
                // Criar um elemento SVG temporário
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                document.body.appendChild(tempDiv);
                
                const svgElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                tempDiv.appendChild(svgElement);
                
                // Configurações específicas para cada tipo de impressão
                const barcodeOptions = type === 'thermal' ? {
                    format: "CODE128",
                    height: 45,
                    width: 1.6,
                    displayValue: true,
                    fontSize: 10,
                    margin: 0,
                    textMargin: 1
                } : {
                    format: "CODE128",
                    height: 34,
                    width: 1.4,
                    displayValue: false,
                    fontSize: 10,
                    margin: 4
                };
                
                // Gerar código de barras usando JsBarcode
                JsBarcode(svgElement, text, barcodeOptions);
                
                // Obter o HTML do SVG
                const svgHTML = svgElement.outerHTML;
                
                // Remover elemento temporário
                document.body.removeChild(tempDiv);
                
                return svgHTML;
            } catch (e) {
                console.error("Erro ao gerar código de barras:", e);
                return `<div style="height: ${type === 'thermal' ? '30px' : '40px'}; display: flex; align-items: center; justify-content: center; color: #999; font-size: ${type === 'thermal' ? '6pt' : '8pt'};">${text}</div>`;
            }
        };

        // Função para obter URL da imagem
        const getImageUrl = (path) => {
            if (!path) return null;
            
            if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
                return path;
            }
            
            const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            
            if (path.startsWith('/storage')) {
                return `${apiBaseUrl}${path}`;
            }
            
            return `${apiBaseUrl}/storage/${path}`;
        };

        // Gerar HTML com códigos de barras
        const labelsHTML = (productsToPrint || []).flatMap(item => 
            Array(item.quantity).fill(item.product).map((product, index) => {
                // Priorizar código do produto para geração do código de barras
                const originalBarcodeText = product.codigo_produto || 
                                            product.variation?.codigo_produto ||
                                            product.variation?.codigo_barras || 
                                            product.codigo_barras || 
                                            product.id;
                const barcodeText = shortenBarcodeContent(originalBarcodeText, printType, product);
                const barcodeSVG = generateBarcodeSVG(barcodeText, printType);
                const imageUrl = getImageUrl(product.imagem_principal);
                
                if (printType === 'thermal') {
                    // Abreviar nome do produto para no máximo 30 caracteres
                    const nomeAbreviado = (product.nome || '').length > 30 
                        ? (product.nome || '').substring(0, 30) + '...' 
                        : (product.nome || '');
                    const preco = parseFloat(product.preco_venda || 0).toFixed(2);
                    const nomeComPreco = `${nomeAbreviado} - R$ ${preco}`;
                    
                    return `
                        <div class="thermal-label">
                            <div class="thermal-label-name">${nomeComPreco}</div>
                            <div class="thermal-barcode">
                                ${barcodeSVG}
                            </div>
                        </div>
                    `;
                } else {
                    const imageHTML = imageUrl ? `
                        <div class="barcode-item-image">
                            <img src="${imageUrl}" alt="${product.nome || ''}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                        </div>
                    ` : '';
                    
                    return `
                        <div class="barcode-item">
                            <div class="barcode-item-name">${product.nome || ''}</div>
                            ${imageHTML}
                            <div class="barcode-barcode">
                                ${barcodeSVG}
                            </div>
                            <div class="barcode-item-price">R$ ${parseFloat(product.preco_venda || 0).toFixed(2)}</div>
                        </div>
                    `;
                }
            })
        ).join('');

        const cssStyles = printType === 'thermal' ? `
            @page {
                size: 50mm 33mm; /* 30mm útil + 3mm espaçamento */
                margin: 0;
            }
            html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0;
                padding: 0;
                width: 50mm;
            }
            .thermal-grid {
                display: block;
                width: 50mm;
            }
            .thermal-label {
                border: none;
                padding: 1mm 2mm 3mm 2mm; /* 3mm na parte inferior para espaçamento */
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                page-break-inside: avoid !important;
                page-break-after: always !important;
                break-after: page !important;
                background-color: white !important;
                color: black !important;
                width: 50mm;
                height: 33mm; /* altura total incluindo espaçamento */
                box-sizing: border-box;
            }
            .thermal-label-name {
                font-size: 7pt;
                font-weight: bold;
                text-align: center;
                margin-bottom: 1mm;
                line-height: 1.1;
                word-break: break-word;
                max-height: 2.2em;
                overflow: hidden;
                width: 100%;
            }
            .thermal-label-image {
                width: 12mm;
                height: 8mm;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 1mm;
            }
            .thermal-label-image img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
            .thermal-barcode {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0;
                width: 100%;
                overflow: hidden;
            }
            .thermal-barcode svg {
                width: 46mm !important;
                height: auto !important;
                max-height: 23mm !important;
            }
        ` : `
            @page { 
                size: A4; 
                margin: 0.5cm; 
            } 
            body { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                margin: 0;
                padding: 0;
            }
            .barcode-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr); 
                gap: 0.5cm; 
                width: 19cm; 
                margin: auto;
            }
            .barcode-item {
                border: 1px solid #ccc;
                padding: 0.25cm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                page-break-inside: avoid !important;
                background-color: white !important;
                color: black !important;
                width: 6cm; 
                height: 3.8cm; 
                box-sizing: border-box;
            }
            .barcode-item-name {
                font-size: 11px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 2px;
                line-height: 1.1;
                word-break: break-word;
                max-height: 2.4em; 
                overflow: hidden;
            }
            .barcode-item-image {
                width: 2cm;
                height: 1.4cm;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 2px;
            }
            .barcode-item-image img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }
            .barcode-barcode {
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 2px 0;
                width: 100%;
                overflow: hidden;
            }
            .barcode-barcode svg {
                width: 100% !important;
                height: 34px;
            }
            .barcode-item-price {
                font-size: 14px;
                font-weight: bold;
                margin-top: 2px;
            }
        `;

        const gridClass = printType === 'thermal' ? 'thermal-grid' : 'barcode-grid';
        // const headerText = printType === 'thermal' ? 
        //     `Etiquetas Térmicas - ${new Date().toLocaleDateString()}` : 
        //     `Etiquetas de Preço - ${new Date().toLocaleDateString()}`;

        printElement.innerHTML = `
            <style>
                ${cssStyles}
            </style>
            <div class="${gridClass}">
                ${labelsHTML}
            </div>
        `;

        // Adicionar ao DOM temporariamente
        document.body.appendChild(printElement);

        // Imprimir
        printJS({
            printable: printElement,
            type: 'html',
            targetStyles: ['*'],
            // header: headerText,
            scanStyles: false,
            onPrintDialogError: (err) => {
                toast({ 
                    title: "Erro de Impressão", 
                    description: "Não foi possível abrir a janela de impressão.", 
                    variant: "destructive" 
                });
                console.error("Print dialog error:", err);
            },
            onPrintSuccess: () => {
                toast({ 
                    title: "Impressão enviada com sucesso!", 
                    description: printType === 'thermal' ? 'Impressora térmica' : 'Folha A4'
                });
            }
        });

        // Remover elemento temporário após impressão
        setTimeout(() => {
            if (document.body.contains(printElement)) {
                document.body.removeChild(printElement);
            }
        }, 1000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container mx-auto p-4 md:p-6"
        >
            <header className="mb-8">
                <div className="flex items-center space-x-3">
                    <FileText size={36} className="text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold">Gerador de Etiquetas</h1>
                        <p className="text-muted-foreground">Crie e imprima etiquetas com código de barras, preço e descrição para seus produtos.</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>1. Selecionar Produtos</CardTitle>
                        <CardDescription>Adicione os produtos para os quais deseja gerar etiquetas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="barcode-quick-search">Busca Rápida por Código de Barras</Label>
                                <div className="relative">
                                    <Input
                                        id="barcode-quick-search"
                                        placeholder="Digite ou leia o código de barras..."
                                        onChange={(e) => handleQuickBarcodeSearch(e.target.value)}
                                        className="pl-8"
                                    />
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2">
                                        <span className="text-xs font-mono bg-gray-100 px-1 rounded text-gray-500">|||</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                                </div>
                            </div>
                            
                            <div>
                                <Label htmlFor="product-select">Selecionar Produto</Label>
                                <ProductSelector
                                    products={allProducts}
                                    selectedProductId={selectedProductId}
                                    onProductSelect={setSelectedProductId}
                                    selectedVariation={selectedVariation}
                                    onVariationSelect={setSelectedVariation}
                                    onShowVariationSelector={handleShowVariationSelector}
                                    isLoading={isLoadingProducts}
                                />
                            </div>
                            
                            {selectedProductId && selectedVariation && (
                                <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-3">
                                        <ProductImage 
                                            product={{ imagem_principal: selectedVariation.imagem_url }} 
                                            className="h-12 w-12" 
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-blue-700 dark:text-blue-300">
                                                Variação selecionada: {selectedVariation.nome}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                R$ {parseFloat(selectedVariation.preco_var || 0).toFixed(2)}
                                            </div>
                                            {selectedVariation.codigo_barras && (
                                                <div className="text-xs font-mono text-muted-foreground mt-1">
                                                    Código: {selectedVariation.codigo_barras}
                                                </div>
                                            )}
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setSelectedVariation(null)}
                                            className="text-destructive"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <Button 
                                    onClick={handleAddProduct} 
                                    disabled={!selectedProductId || isLoadingProducts}
                                    className="w-full"
                                >
                                    <PlusCircle size={16} className="mr-2" />
                                    Adicionar à Lista
                                </Button>
                                
                                {selectedProductId && (() => {
                                    const product = allProducts.find(p => p.id === selectedProductId);
                                    return product?.variacoes_ativa && product?.variacoes?.length > 0 ? (
                                        <Button 
                                            variant="outline"
                                            onClick={() => handleShowVariationSelector(product)}
                                            className="w-full"
                                        >
                                            <CheckSquare size={16} className="mr-2" />
                                            Selecionar Variações ({product.variacoes.length})
                                        </Button>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t">
                            <h3 className="font-semibold text-sm">Lista para Impressão ({(productsToPrint || []).reduce((acc, item) => acc + (item.quantity || 0), 0)} etiquetas)</h3>
                            {productsToPrint.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Adicione produtos à lista.</p>
                            ) : (
                                <ScrollArea className="h-64">
                                <div className="space-y-2 pr-2">
                                {(productsToPrint || []).map(item => (
                                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-md">
                                        <ProductImage product={item.product} className="h-10 w-10 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium break-words" title={item.product?.nome}>
                                                {item.product?.nome}
                                            </p>
                                            {item.product?.variation && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Variação: {item.product.variation.nome}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <div className="flex flex-col items-center">
                                                {(() => {
                                                    const estoqueMax = item.product.variation?.estoque_var || item.product.estoque_atual || item.product.estoque || 0;
                                                    const isEstoqueBaixo = estoqueMax <= 5;
                                                    const isEstoqueCritico = estoqueMax <= 2;
                                                    const isQuantidadeAlta = item.quantity >= estoqueMax * 0.8;
                                                    
                                                    return (
                                                        <>
                                                            <Input 
                                                                type="number" 
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                                                                className={`w-16 h-8 text-sm ${
                                                                    isEstoqueCritico ? 'border-red-500 bg-red-50 dark:bg-red-950/20' :
                                                                    isEstoqueBaixo ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                                                                    isQuantidadeAlta ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''
                                                                }`}
                                                                min="1"
                                                                max={estoqueMax}
                                                            />
                                                            <span className={`text-xs mt-1 ${
                                                                isEstoqueCritico ? 'text-red-600 font-medium' :
                                                                isEstoqueBaixo ? 'text-yellow-600 font-medium' :
                                                                isQuantidadeAlta ? 'text-orange-600' : 'text-muted-foreground'
                                                            }`}>
                                                                {isEstoqueCritico ? '⚠️ Crítico' :
                                                                 isEstoqueBaixo ? '⚠️ Baixo' : 'Máx'}: {estoqueMax}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveProduct(item.id)}>
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                                </ScrollArea>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="space-y-4">
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Tipo de Impressão</Label>
                            <RadioGroup value={printType} onValueChange={setPrintType} className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="a4" id="a4" />
                                    <Label htmlFor="a4" className="text-sm flex items-center gap-2">
                                        <FileText size={16} />
                                        Folha A4
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="thermal" id="thermal" />
                                    <Label htmlFor="thermal" className="text-sm flex items-center gap-2">
                                        <Thermometer size={16} />
                                        Impressora Térmica (50x30mm)
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardFooter>
                    
                    <div className="px-6 pb-6 space-y-3">
                        {printType === 'thermal' && (
                            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                                <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">📄 PDF Térmico - Knup M604</p>
                                <p className="mb-2">Será gerado um PDF <strong>portrait (retrato)</strong> com etiquetas de <strong>50mm x 30mm</strong> e espaçamento de 3mm entre elas.</p>
                                <p className="text-xs">✅ <strong>Correção:</strong> PDF em orientação retrato para evitar corte lateral. Etiquetas empilhadas verticalmente.</p>
                                <p className="text-xs mt-1">Configure sua impressora térmica Knup M604 com largura de 50mm.</p>
                            </div>
                        )}
                        <Button 
                            onClick={printType === 'thermal' ? handleGenerateThermalPDF : handlePrintSheet} 
                            className="w-full" 
                            disabled={(productsToPrint || []).length === 0}
                        >
                            {printType === 'thermal' ? (
                                <>
                                    <Download className="mr-2 h-4 w-4" /> 
                                    Gerar PDF (50mm x 30mm + 3mm espaço)
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-2 h-4 w-4" /> 
                                    Imprimir Folha de Etiquetas (A4)
                                </>
                            )}
                        </Button>
                    </div>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>2. Pré-visualização</CardTitle>
                        <CardDescription>
                            Veja como suas etiquetas irão parecer ({printType === 'thermal' ? 'PDF 50mm x 30mm - impressora térmica' : 'folha A4, 3 colunas'}).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg bg-gray-200 dark:bg-gray-700 p-2 min-h-[400px] overflow-auto">
                            {(productsToPrint || []).length > 0 ? (
                                <div className={printType === 'thermal' ? 'thermal-grid' : 'barcode-grid'} style={printType === 'thermal' ? {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3mm',
                                    width: '100%',
                                    maxWidth: '50mm',
                                    margin: 'auto'
                                } : {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '0.5cm',
                                    width: '19cm',
                                    margin: 'auto'
                                }}>
                                    {(productsToPrint || []).flatMap(item => 
                                        Array(item.quantity).fill(item.product).map((product, index) => (
                                            <BarcodeLabel key={`${item.id}-${index}`} product={product} type={printType} />
                                        ))
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                    <Package size={48} className="mb-4" />
                                    <p>A pré-visualização aparecerá aqui.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Seleção de Variações */}
            <VariationSelector
                product={productForVariationSelector}
                isOpen={variationSelectorOpen}
                onClose={handleVariationSelectorClose}
                onConfirm={handleVariationSelectorConfirm}
            />
        </motion.div>
    );
};

export default BarcodeGeneratorPage;