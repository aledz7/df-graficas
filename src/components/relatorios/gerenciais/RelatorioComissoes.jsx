import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Award, FileDown, CalendarPlus as CalendarIcon, DollarSign, Percent, Printer } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, isValid } from 'date-fns';
import * as XLSX from 'xlsx';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';

const RelatorioComissoes = () => {
  const { toast } = useToast();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [taxaComissao, setTaxaComissao] = useState(10); 
  const [filtros, setFiltros] = useState({
    dataInicio: null,
    dataFim: null,
  });
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

  const getClienteNome = (id, nomeManual) => {
    if (nomeManual) return nomeManual;
    return clientes.find(c => c.id === id)?.nome || 'Cliente não identificado';
  }

  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      const dataVenda = parseISO(venda.data);
      if (!isValid(dataVenda)) return false;
      const { dataInicio, dataFim } = filtros;
      if (dataInicio && dataFim) {
        return isWithinInterval(startOfDay(dataVenda), { start: startOfDay(dataInicio), end: endOfDay(dataFim) });
      }
      if (dataInicio) {
        return startOfDay(dataVenda) >= startOfDay(dataInicio);
      }
      if (dataFim) {
        return startOfDay(dataVenda) <= endOfDay(dataFim);
      }
      return true;
    });
  }, [vendas, filtros]);

  const dadosComissao = useMemo(() => {
    return vendasFiltradas.map(venda => {
      const valorBase = (venda.total || 0) - (venda.desconto || 0);
      const comissao = valorBase * (taxaComissao / 100);
      return {
        ...venda,
        valorBase,
        comissao,
      };
    });
  }, [vendasFiltradas, taxaComissao]);

  const totais = useMemo(() => {
    const totalVendido = dadosComissao.reduce((acc, v) => acc + v.valorBase, 0);
    const totalComissao = dadosComissao.reduce((acc, v) => acc + v.comissao, 0);
    return { totalVendido, totalComissao };
  }, [dadosComissao]);

  const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

  const handleExportPDF = () => {
    const headers = [['Data', 'Cliente', 'Valor Venda', 'Valor Comissão']];
    const data = dadosComissao.map(v => [
      format(parseISO(v.data), 'dd/MM/yyyy'),
      getClienteNome(v.clienteId, v.clienteNome),
      formatCurrency(v.valorBase),
      formatCurrency(v.comissao)
    ]);
    const summary = [
        { label: `Taxa de Comissão Aplicada`, value: `${taxaComissao}%` },
        { label: 'Total Vendido (Base de Cálculo)', value: formatCurrency(totais.totalVendido) },
        { label: 'Total em Comissões', value: formatCurrency(totais.totalComissao) }
    ];
    exportToPdf(`Relatório de Comissões (Taxa: ${taxaComissao}%)`, headers, data, summary, logoUrl, empresaSettings.nomeFantasia);
    toast({ title: "PDF Gerado", description: "O relatório de comissões foi exportado." });
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(dadosComissao.map(v => ({
      Data: format(parseISO(v.data), 'dd/MM/yyyy'),
      Cliente: getClienteNome(v.clienteId, v.clienteNome),
      'Valor Venda': v.valorBase,
      'Taxa Aplicada (%)': taxaComissao,
      'Valor Comissão': v.comissao,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comissoes");
    XLSX.writeFile(workbook, "relatorio_comissoes.xlsx");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Award className="mr-2" /> Relatório de Comissões</CardTitle>
          <CardDescription>Calcule e analise as comissões sobre as vendas realizadas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtros.dataInicio ? format(filtros.dataInicio, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filtros.dataInicio} onSelect={(date) => setFiltros(f => ({ ...f, dataInicio: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtros.dataFim ? format(filtros.dataFim, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={filtros.dataFim} onSelect={(date) => setFiltros(f => ({ ...f, dataFim: date }))} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm font-medium">Taxa de Comissão (%)</label>
              <Input 
                type="number" 
                value={taxaComissao} 
                onChange={(e) => setTaxaComissao(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 10"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleExportPDF}><Printer className="mr-2 h-4 w-4" />Exportar PDF</Button>
            <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" />Exportar Excel</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido (Base de Cálculo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totais.totalVendido)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Comissões</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totais.totalComissao)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Comissões</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>ID Venda</TableHead>
                <TableHead className="text-right">Valor da Venda</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosComissao.map(venda => (
                <TableRow key={venda.id}>
                  <TableCell>{format(parseISO(venda.data), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{getClienteNome(venda.clienteId, venda.clienteNome)}</TableCell>
                  <TableCell>...{venda.id.slice(-6)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(venda.valorBase)}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{formatCurrency(venda.comissao)}</TableCell>
                </TableRow>
              ))}
              {dadosComissao.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">Nenhuma venda encontrada para o período selecionado.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioComissoes;