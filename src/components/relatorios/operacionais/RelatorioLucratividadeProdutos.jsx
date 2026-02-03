import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Percent, Package, Filter, Printer, FileDown, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency, safeJsonParse } from '@/lib/utils';
import { exportToPdf } from '@/lib/reportGenerator';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/ui/use-toast';

const RelatorioLucratividadeProdutos = () => {
    const { toast } = useToast();
    const [produtos, setProdutos] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'lucroAbsolutoTotal', direction: 'descending' });
    const [lucratividadeBase, setLucratividadeBase] = useState('custo'); 
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
            const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
            const logo = await apiDataManager.getItem('logoUrl') || '';
            setEmpresaSettings(settings);
            setLogoUrl(logo);
        
            } catch(error) {
            }
        };
        
        loadData();
    }, []);

    const dadosLucratividade = useMemo(() => {
        return produtos
            .filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || p.codigo_produto?.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(p => {
                const custo = parseFloat(p.preco_custo || 0);
                const venda = parseFloat(p.preco_venda || 0);
                const estoque = parseFloat(p.estoque || 0);

                const lucroAbsolutoUnitario = venda - custo;
                let lucratividadePercentual = 0;
                if (lucratividadeBase === 'custo' && custo > 0) {
                    lucratividadePercentual = (lucroAbsolutoUnitario / custo) * 100;
                } else if (lucratividadeBase === 'venda' && venda > 0) {
                    lucratividadePercentual = (lucroAbsolutoUnitario / venda) * 100;
                }
                
                const valorTotalEstoqueCusto = custo * estoque;
                const valorTotalEstoqueVenda = venda * estoque;
                const lucroAbsolutoTotal = lucroAbsolutoUnitario * estoque;

                return {
                    ...p,
                    custo,
                    venda,
                    estoque,
                    lucroAbsolutoUnitario,
                    lucratividadePercentual,
                    valorTotalEstoqueCusto,
                    valorTotalEstoqueVenda,
                    lucroAbsolutoTotal,
                };
            })
            .sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
    }, [produtos, searchTerm, sortConfig, lucratividadeBase]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? <TrendingUp className="h-4 w-4 inline ml-1" /> : <TrendingDown className="h-4 w-4 inline ml-1" />;
        }
        return null;
    };
    
    const handleExportPDF = () => {
        const headers = [
            ["Produto", "Cód.", "Custo (R$)", "Venda (R$)", "Lucro Unit. (R$)", `Lucrativ. % (${lucratividadeBase})`, "Estoque", "Custo Total Est. (R$)", "Venda Total Est. (R$)", "Lucro Total Est. (R$)"]
        ];
        const data = dadosLucratividade.map(p => [
            p.nome,
            p.codigo_produto || '-',
            p.custo.toFixed(2),
            p.venda.toFixed(2),
            p.lucroAbsolutoUnitario.toFixed(2),
            p.lucratividadePercentual.toFixed(2) + '%',
            p.estoque,
            p.valorTotalEstoqueCusto.toFixed(2),
            p.valorTotalEstoqueVenda.toFixed(2),
            p.lucroAbsolutoTotal.toFixed(2)
        ]);
        const summary = [
            { label: 'Total de Produtos Listados', value: dadosLucratividade.length },
            { label: 'Valor Total em Estoque (Custo)', value: formatCurrency(dadosLucratividade.reduce((sum, p) => sum + p.valorTotalEstoqueCusto, 0)) },
            { label: 'Valor Total em Estoque (Venda)', value: formatCurrency(dadosLucratividade.reduce((sum, p) => sum + p.valorTotalEstoqueVenda, 0)) },
            { label: 'Potencial de Lucro Total em Estoque', value: formatCurrency(dadosLucratividade.reduce((sum, p) => sum + p.lucroAbsolutoTotal, 0)) }
        ];
        exportToPdf('Relatório de Lucratividade de Produtos', headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
        toast({ title: "PDF Gerado", description: "O relatório de lucratividade foi exportado." });
    };

    const handleExportExcel = () => {
        const worksheetData = dadosLucratividade.map(p => ({
            'Produto': p.nome,
            'Código': p.codigo_produto || '-',
            'Custo (R$)': p.custo,
            'Venda (R$)': p.venda,
            'Lucro Unit. (R$)': p.lucroAbsolutoUnitario,
            [`Lucratividade % (${lucratividadeBase})`]: p.lucratividadePercentual,
            'Estoque': p.estoque,
            'Custo Total Estoque (R$)': p.valorTotalEstoqueCusto,
            'Venda Total Estoque (R$)': p.valorTotalEstoqueVenda,
            'Lucro Total Estoque (R$)': p.lucroAbsolutoTotal,
        }));
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "LucratividadeProdutos");
        XLSX.writeFile(workbook, "relatorio_lucratividade_produtos.xlsx");
        toast({ title: "Excel Gerado", description: "O relatório de lucratividade foi exportado para Excel." });
    };

    return (
        <div className="space-y-6 p-1 md:p-0">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center"><DollarSign className="mr-2 text-green-500" /> Relatório de Lucratividade de Produtos</CardTitle>
                            <CardDescription>Analise o desempenho e potencial de lucro de cada produto.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                             <Button onClick={handleExportPDF} variant="outline" className="w-full sm:w-auto"><Printer className="mr-2 h-4 w-4" /> PDF</Button>
                             <Button onClick={handleExportExcel} variant="outline" className="w-full sm:w-auto"><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                        </div>
                    </div>
                     <div className="mt-4 flex flex-col md:flex-row gap-3 items-end">
                        <div className="flex-grow w-full md:w-auto">
                            <Label htmlFor="search-lucratividade" className="sr-only">Buscar</Label>
                            <Input
                                id="search-lucratividade"
                                placeholder="Buscar por nome ou código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="w-full md:w-auto md:min-w-[200px]">
                             <Label htmlFor="lucratividade-base">Calcular Lucratividade sobre:</Label>
                             <Select value={lucratividadeBase} onValueChange={setLucratividadeBase}>
                                <SelectTrigger id="lucratividade-base">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custo">Preço de Custo</SelectItem>
                                    <SelectItem value="venda">Preço de Venda</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[calc(100vh-26rem)] lg:h-[calc(100vh-22rem)]">
                        <Table>
                            <TableHeader className="sticky top-0 bg-card z-10">
                                <TableRow>
                                    <TableHead onClick={() => requestSort('nome')} className="cursor-pointer hover:bg-muted/50">Produto {getSortIndicator('nome')}</TableHead>
                                    <TableHead onClick={() => requestSort('custo')} className="cursor-pointer hover:bg-muted/50 text-right">Custo {getSortIndicator('custo')}</TableHead>
                                    <TableHead onClick={() => requestSort('venda')} className="cursor-pointer hover:bg-muted/50 text-right">Venda {getSortIndicator('venda')}</TableHead>
                                    <TableHead onClick={() => requestSort('lucroAbsolutoUnitario')} className="cursor-pointer hover:bg-muted/50 text-right">Lucro Unit. {getSortIndicator('lucroAbsolutoUnitario')}</TableHead>
                                    <TableHead onClick={() => requestSort('lucratividadePercentual')} className="cursor-pointer hover:bg-muted/50 text-right">Lucrativ. % {getSortIndicator('lucratividadePercentual')}</TableHead>
                                    <TableHead onClick={() => requestSort('estoque')} className="cursor-pointer hover:bg-muted/50 text-center">Estoque {getSortIndicator('estoque')}</TableHead>
                                    <TableHead onClick={() => requestSort('lucroAbsolutoTotal')} className="cursor-pointer hover:bg-muted/50 text-right">Lucro Pot. Total {getSortIndicator('lucroAbsolutoTotal')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dadosLucratividade.map(p => (
                                    <TableRow key={p.id} className={p.lucroAbsolutoUnitario < 0 ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : p.lucratividadePercentual > 100 ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' : 'hover:bg-muted/50'}>
                                        <TableCell>
                                            <div className="font-medium">{p.nome}</div>
                                            <div className="text-xs text-muted-foreground">{p.codigo_produto}</div>
                                            {p.lucroAbsolutoUnitario < 0 && <div className="text-xs text-red-600 flex items-center"><AlertTriangle size={12} className="mr-1"/> Prejuízo unitário</div>}
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.custo)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.venda)}</TableCell>
                                        <TableCell className={`text-right font-semibold ${p.lucroAbsolutoUnitario < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(p.lucroAbsolutoUnitario)}</TableCell>
                                        <TableCell className={`text-right font-semibold ${p.lucratividadePercentual < 0 ? 'text-red-600' : 'text-green-600'}`}>{p.lucratividadePercentual.toFixed(2)}%</TableCell>
                                        <TableCell className="text-center">{p.estoque}</TableCell>
                                        <TableCell className={`text-right font-bold ${p.lucroAbsolutoTotal < 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(p.lucroAbsolutoTotal)}</TableCell>
                                    </TableRow>
                                ))}
                                {dadosLucratividade.length === 0 && (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24">Nenhum produto encontrado.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
                     <p className="text-xs text-muted-foreground">
                        Lucratividade % calculada sobre: <span className="font-semibold">{lucratividadeBase === 'custo' ? 'Preço de Custo' : 'Preço de Venda'}</span>.
                    </p>
                    <p className="text-sm font-semibold">
                        Potencial de Lucro Total (Estoque): <span className="text-green-600">{formatCurrency(dadosLucratividade.reduce((sum, p) => sum + p.lucroAbsolutoTotal, 0))}</span>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default RelatorioLucratividadeProdutos;