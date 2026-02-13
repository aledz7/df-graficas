import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { FileDown, CalendarIcon, Loader2, Filter, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { exportToPdf } from '@/lib/reportGenerator';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { vendaService, osService, contaPagarService, contaReceberService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';
import { motion } from 'framer-motion';

const RelatorioDRE = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [empresaSettings, setEmpresaSettings] = useState({});
  const [logoUrl, setLogoUrl] = useState('');
  
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);
  const [currentMonthInicio, setCurrentMonthInicio] = useState(new Date());
  const [currentMonthFim, setCurrentMonthFim] = useState(new Date());

  // Dados do DRE
  const [receitas, setReceitas] = useState({
    vendasPDV: 0,
    vendasOS: 0,
    vendasEnvelopamento: 0,
    recebimentos: 0,
    total: 0
  });
  const [custos, setCustos] = useState({
    cmv: 0,
    total: 0
  });
  const [despesas, setDespesas] = useState({
    operacionais: 0,
    administrativas: 0,
    financeiras: 0,
    total: 0
  });
  const [resultado, setResultado] = useState({
    bruto: 0,
    operacional: 0,
    liquido: 0
  });

  // Inicializar datas
  useEffect(() => {
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    setFiltroDataInicio(formatarDataParaDDMMAAAA(primeiroDiaMes));
    setFiltroDataFim(formatarDataParaDDMMAAAA(ultimoDiaMes));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
        const logo = await apiDataManager.getItem('logoUrl') || '';
        setEmpresaSettings(settings);
        setLogoUrl(logo);
      } catch(error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };
    
    loadData();
  }, []);

  useEffect(() => {
    if (filtroDataInicio && filtroDataFim) {
      carregarDadosDRE();
    }
  }, [filtroDataInicio, filtroDataFim]);

  const formatarDataParaDDMMAAAA = (data) => {
    if (!data) return '';
    const d = data instanceof Date ? data : new Date(data);
    if (!isValid(d)) return '';
    return format(d, 'dd/MM/yyyy');
  };

  const formatarDataParaYYYYMMDD = (dataStr) => {
    if (!dataStr) return null;
    const partes = dataStr.split('/');
    if (partes.length !== 3) return null;
    const [dia, mes, ano] = partes;
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    if (!isValid(data)) return null;
    return format(data, 'yyyy-MM-dd');
  };

  const carregarDadosDRE = async () => {
    setLoading(true);
    try {
      const dataInicio = formatarDataParaYYYYMMDD(filtroDataInicio);
      const dataFim = formatarDataParaYYYYMMDD(filtroDataFim);

      if (!dataInicio || !dataFim) {
        toast({
          title: "Erro",
          description: "Por favor, selecione datas válidas.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Carregar receitas (vendas)
      const [vendasPDV, vendasOS, vendasEnvelopamento, recebimentos, contasPagar] = await Promise.all([
        vendaService.getRelatorioFaturamento({ data_inicio: dataInicio, data_fim: dataFim }),
        osService.getAll({ data_inicio: dataInicio, data_fim: dataFim }).catch(() => ({ data: [] })),
        Promise.resolve({ data: [] }), // Envelopamento - implementar se necessário
        contaReceberService.getAll({ data_inicio: dataInicio, data_fim: dataFim }).catch(() => ({ data: [] })),
        contaPagarService.getAll({ data_inicio: dataInicio, data_fim: dataFim }).catch(() => ({ data: [] }))
      ]);

      // Processar receitas do PDV
      const vendasPDVData = vendasPDV.data?.data || vendasPDV.data || [];
      const receitasPDV = Array.isArray(vendasPDVData) 
        ? vendasPDVData.reduce((acc, v) => acc + (parseFloat(v.total) || 0) - (parseFloat(v.desconto) || 0), 0)
        : 0;

      // Processar receitas de OS
      const osData = vendasOS.data || [];
      const receitasOS = Array.isArray(osData)
        ? osData.reduce((acc, os) => acc + (parseFloat(os.valor_total_os) || 0), 0)
        : 0;

      // Processar recebimentos
      const recebimentosData = recebimentos.data || [];
      const receitasRecebimentos = Array.isArray(recebimentosData)
        ? recebimentosData.reduce((acc, r) => acc + (parseFloat(r.valor) || 0), 0)
        : 0;

      const totalReceitas = receitasPDV + receitasOS + receitasRecebimentos;

      // Processar despesas (contas a pagar pagas)
      const contasPagarData = contasPagar.data || [];
      const despesasTotal = Array.isArray(contasPagarData)
        ? contasPagarData
            .filter(cp => cp.status === 'pago' || cp.pago)
            .reduce((acc, cp) => acc + (parseFloat(cp.valor) || 0), 0)
        : 0;

      // Calcular CMV (Custo das Mercadorias Vendidas) - simplificado
      // Em um sistema completo, isso viria do estoque/custos dos produtos vendidos
      const cmv = 0; // TODO: Implementar cálculo de CMV baseado nos produtos vendidos

      // Calcular resultados
      const resultadoBruto = totalReceitas - cmv;
      const resultadoOperacional = resultadoBruto - despesasTotal;
      const resultadoLiquido = resultadoOperacional;

      setReceitas({
        vendasPDV: receitasPDV,
        vendasOS: receitasOS,
        vendasEnvelopamento: 0,
        recebimentos: receitasRecebimentos,
        total: totalReceitas
      });

      setCustos({
        cmv: cmv,
        total: cmv
      });

      setDespesas({
        operacionais: despesasTotal * 0.6, // Estimativa
        administrativas: despesasTotal * 0.3, // Estimativa
        financeiras: despesasTotal * 0.1, // Estimativa
        total: despesasTotal
      });

      setResultado({
        bruto: resultadoBruto,
        operacional: resultadoOperacional,
        liquido: resultadoLiquido
      });

    } catch (error) {
      console.error('Erro ao carregar dados DRE:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do DRE.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    const headers = [
      ["Demonstração do Resultado do Exercício (DRE)"],
      [`Período: ${filtroDataInicio} a ${filtroDataFim}`],
      [""],
      ["RECEITAS", ""],
      ["Vendas PDV", formatCurrency(receitas.vendasPDV)],
      ["Vendas O.S", formatCurrency(receitas.vendasOS)],
      ["Recebimentos", formatCurrency(receitas.recebimentos)],
      ["Total de Receitas", formatCurrency(receitas.total)],
      [""],
      ["(-) CUSTOS", ""],
      ["CMV - Custo das Mercadorias Vendidas", formatCurrency(custos.cmv)],
      ["Total de Custos", formatCurrency(custos.total)],
      [""],
      ["RESULTADO BRUTO", formatCurrency(resultado.bruto)],
      [""],
      ["(-) DESPESAS", ""],
      ["Despesas Operacionais", formatCurrency(despesas.operacionais)],
      ["Despesas Administrativas", formatCurrency(despesas.administrativas)],
      ["Despesas Financeiras", formatCurrency(despesas.financeiras)],
      ["Total de Despesas", formatCurrency(despesas.total)],
      [""],
      ["RESULTADO OPERACIONAL", formatCurrency(resultado.operacional)],
      ["RESULTADO LÍQUIDO", formatCurrency(resultado.liquido)]
    ];

    const data = headers.map(h => [h[0] || '', h[1] || '']);

    exportToPdf('DRE - Demonstração do Resultado do Exercício', [["Item", "Valor"]], data, [], logoUrl, empresaSettings.nomeFantasia);
    toast({ title: "PDF Gerado", description: "O relatório DRE foi exportado." });
  };

  const handleExportExcel = () => {
    const data = [
      ["Demonstração do Resultado do Exercício (DRE)"],
      [`Período: ${filtroDataInicio} a ${filtroDataFim}`],
      [""],
      ["RECEITAS", ""],
      ["Vendas PDV", receitas.vendasPDV],
      ["Vendas O.S", receitas.vendasOS],
      ["Recebimentos", receitas.recebimentos],
      ["Total de Receitas", receitas.total],
      [""],
      ["(-) CUSTOS", ""],
      ["CMV - Custo das Mercadorias Vendidas", custos.cmv],
      ["Total de Custos", custos.total],
      [""],
      ["RESULTADO BRUTO", resultado.bruto],
      [""],
      ["(-) DESPESAS", ""],
      ["Despesas Operacionais", despesas.operacionais],
      ["Despesas Administrativas", despesas.administrativas],
      ["Despesas Financeiras", despesas.financeiras],
      ["Total de Despesas", despesas.total],
      [""],
      ["RESULTADO OPERACIONAL", resultado.operacional],
      ["RESULTADO LÍQUIDO", resultado.liquido]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DRE");
    XLSX.writeFile(workbook, `dre_${filtroDataInicio.replace(/\//g, '-')}_${filtroDataFim.replace(/\//g, '-')}.xlsx`);
    toast({ title: "Excel Gerado", description: "O relatório DRE foi exportado." });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            DRE - Demonstração do Resultado do Exercício
          </CardTitle>
          <CardDescription>
            Análise completa de receitas, custos, despesas e resultado do período
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover open={showDataInicioPicker} onOpenChange={setShowDataInicioPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroDataInicio || "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroDataInicio ? parseISO(formatarDataParaYYYYMMDD(filtroDataInicio)) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFiltroDataInicio(formatarDataParaDDMMAAAA(date));
                        setShowDataInicioPicker(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover open={showDataFimPicker} onOpenChange={setShowDataFimPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filtroDataFim || "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filtroDataFim ? parseISO(formatarDataParaYYYYMMDD(filtroDataFim)) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFiltroDataFim(formatarDataParaDDMMAAAA(date));
                        setShowDataFimPicker(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex gap-2">
            <Button onClick={handleExportPdf} disabled={loading}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={handleExportExcel} disabled={loading} variant="outline">
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          {/* Tabela DRE */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[400px]">Descrição</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Receitas */}
                  <TableRow className="bg-blue-50 dark:bg-blue-900/20 font-bold">
                    <TableCell colSpan={2}>RECEITAS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Vendas PDV</TableCell>
                    <TableCell className="text-right">{formatCurrency(receitas.vendasPDV)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Vendas O.S</TableCell>
                    <TableCell className="text-right">{formatCurrency(receitas.vendasOS)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Recebimentos</TableCell>
                    <TableCell className="text-right">{formatCurrency(receitas.recebimentos)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total de Receitas</TableCell>
                    <TableCell className="text-right">{formatCurrency(receitas.total)}</TableCell>
                  </TableRow>

                  {/* Custos */}
                  <TableRow className="bg-red-50 dark:bg-red-900/20 font-bold">
                    <TableCell colSpan={2}>(-) CUSTOS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">CMV - Custo das Mercadorias Vendidas</TableCell>
                    <TableCell className="text-right">{formatCurrency(custos.cmv)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total de Custos</TableCell>
                    <TableCell className="text-right">{formatCurrency(custos.total)}</TableCell>
                  </TableRow>

                  {/* Resultado Bruto */}
                  <TableRow className="bg-green-50 dark:bg-green-900/20 font-bold">
                    <TableCell>RESULTADO BRUTO</TableCell>
                    <TableCell className="text-right">{formatCurrency(resultado.bruto)}</TableCell>
                  </TableRow>

                  {/* Despesas */}
                  <TableRow className="bg-orange-50 dark:bg-orange-900/20 font-bold">
                    <TableCell colSpan={2}>(-) DESPESAS</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Despesas Operacionais</TableCell>
                    <TableCell className="text-right">{formatCurrency(despesas.operacionais)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Despesas Administrativas</TableCell>
                    <TableCell className="text-right">{formatCurrency(despesas.administrativas)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Despesas Financeiras</TableCell>
                    <TableCell className="text-right">{formatCurrency(despesas.financeiras)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total de Despesas</TableCell>
                    <TableCell className="text-right">{formatCurrency(despesas.total)}</TableCell>
                  </TableRow>

                  {/* Resultado Operacional */}
                  <TableRow className="bg-yellow-50 dark:bg-yellow-900/20 font-bold">
                    <TableCell>RESULTADO OPERACIONAL</TableCell>
                    <TableCell className="text-right">{formatCurrency(resultado.operacional)}</TableCell>
                  </TableRow>

                  {/* Resultado Líquido */}
                  <TableRow className="bg-purple-50 dark:bg-purple-900/20 font-bold text-lg">
                    <TableCell>RESULTADO LÍQUIDO</TableCell>
                    <TableCell className={`text-right ${resultado.liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(resultado.liquido)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioDRE;
