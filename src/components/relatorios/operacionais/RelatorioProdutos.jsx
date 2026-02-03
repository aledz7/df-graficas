import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Printer, Package, AlertTriangle } from 'lucide-react';
import { safeJsonParse } from "@/lib/utils";
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';
import { produtoService } from '@/services/api';
import { motion } from 'framer-motion';

const RelatorioProdutos = () => {
    const { toast } = useToast();
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                
                // Carregar produtos da API
                let produtosData = [];
                try {
                    console.log('🔄 Carregando produtos da API...');
                    const response = await produtoService.getAll('?per_page=10000');
                    console.log('📦 Resposta da API produtos:', response);
                    produtosData = response.data?.data || response.data || response || [];
                    console.log('📦 Produtos da API:', produtosData.length, produtosData);
                } catch (apiError) {
                    console.error('❌ Erro ao carregar produtos da API:', apiError);
                    const storedProdutos = await apiDataManager.getItem('produtos');
                    produtosData = safeJsonParse(storedProdutos, []);
                }

                const [settings, logo] = await Promise.all([
                    apiDataManager.getItem('empresaSettings'),
                    apiDataManager.getItem('logoUrl')
                ]);
                
                setEmpresaSettings(safeJsonParse(settings, {}));
                setLogoUrl(logo || '');
                
                const produtosParsed = Array.isArray(produtosData) ? produtosData : [];
                console.log('✅ Produtos carregados:', produtosParsed.length);
                setProdutos(produtosParsed);
                
            } catch(error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, []);

    const processedData = useMemo(() => {
        if (loading) return [];
        
        console.log('🔄 Processando dados...');
        console.log('📊 Produtos:', produtos.length, produtos);
        
        // Garantir que produtos seja um array
        const produtosArray = Array.isArray(produtos) ? produtos : [];
        
        // Criar lista com todos os produtos
        const todosProdutos = produtosArray.map(produto => {
            return {
                id: produto.id,
                nome: produto.nome,
                precoVenda: Number(produto.preco_venda) || 0,
                estoqueAtual: Number(produto.estoque) || 0,
                estoqueMinimo: Number(produto.estoque_minimo) || 0,
                estoqueBaixo: (Number(produto.estoque) || 0) <= (Number(produto.estoque_minimo) || 0)
            };
        });

        console.log('✅ Dados processados:', todosProdutos.length, todosProdutos);
        return todosProdutos.sort((a, b) => a.nome.localeCompare(b.nome));

    }, [produtos, loading]);

    const handleExportPdf = () => {
        const headers = ["Produto", "Estoque Atual", "Estoque Mínimo", "Valor Unitário (R$)"];
        const data = processedData.map(item => [
            item.nome,
            item.estoqueAtual,
            item.estoqueMinimo,
            item.precoVenda.toFixed(2)
        ]);
        const summary = [
            { label: 'Total de Produtos', value: processedData.length },
            { label: 'Produtos com Estoque Baixo', value: processedData.filter(item => item.estoqueBaixo).length },
            { label: 'Valor Total em Estoque', value: `R$ ${processedData.reduce((acc, item) => acc + (item.precoVenda * item.estoqueAtual), 0).toFixed(2)}` }
        ];
        exportToPdf('Relatório de Produtos', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de produtos foi exportado." });
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Relatório de Produtos e Estoque</CardTitle>
                        <CardDescription>Lista de produtos com estoque e valores unitários.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleExportPdf}><Printer size={16} className="mr-2"/> Exportar PDF</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[60vh]">
                    {/* Layout Mobile - Cards */}
                    <div className="md:hidden">
                        {loading ? (
                            <div className="flex items-center justify-center h-24">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                    <p>Carregando dados...</p>
                                </div>
                            </div>
                        ) : processedData.length > 0 ? (
                            <div className="space-y-3">
                                {processedData.map(item => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors ${item.estoqueBaixo ? "border-l-4 border-l-red-500 bg-red-50" : ""}`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm break-words">{item.nome}</h3>
                                                {item.estoqueBaixo && (
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                                        <Badge variant="destructive" className="text-xs">
                                                            Estoque Baixo
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right ml-3">
                                                <p className="text-lg font-bold text-green-600">
                                                    R$ {item.precoVenda.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Estoque Atual</p>
                                                    <p className={`text-sm font-semibold ${item.estoqueBaixo ? "text-red-600" : ""}`}>
                                                        {item.estoqueAtual}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Estoque Mínimo</p>
                                                    <p className="text-sm">{item.estoqueMinimo}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Package size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                <p>Nenhum produto encontrado.</p>
                            </div>
                        )}
                    </div>

                    {/* Layout Desktop - Tabela */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-center">Estoque Atual</TableHead>
                                    <TableHead className="text-center">Estoque Mínimo</TableHead>
                                    <TableHead className="text-right">Valor Unitário</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">Carregando dados...</TableCell>
                                    </TableRow>
                                ) : processedData.length > 0 ? processedData.map(item => (
                                    <TableRow key={item.id} className={item.estoqueBaixo ? "bg-red-50 border-l-4 border-l-red-500" : ""}>
                                        <TableCell className="font-medium">{item.nome}</TableCell>
                                        <TableCell className={`text-center ${item.estoqueBaixo ? "text-red-600 font-semibold" : ""}`}>
                                            {item.estoqueAtual}
                                        </TableCell>
                                        <TableCell className="text-center">{item.estoqueMinimo}</TableCell>
                                        <TableCell className="text-right font-bold">R$ {item.precoVenda.toFixed(2)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">Nenhum produto encontrado.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default RelatorioProdutos;