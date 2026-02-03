import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TrendingUp, PackageSearch, Download, CalendarDays, Filter } from 'lucide-react';
import { format as formatDateFn, isValid } from 'date-fns';
import { exportToExcel } from '@/lib/utils';
import { productCategoryService, produtoService } from '@/services/api';
import api from '@/services/api';
import { marketplaceService } from '@/services/marketplaceService';

// Funções de formatação
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

const formatNumber = (value, decimals = 2) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0);
};

// Função auxiliar para normalizar strings para comparação
const normalizarString = (str) => {
  if (!str) return '';
  return str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
};

// Função auxiliar para verificar se um item corresponde a um produto
const itemCorrespondeAoProduto = (item, produto) => {
  // Primeiro: tentar match por produto_id (mais confiável)
  if (item.produto_id !== null && item.produto_id !== undefined) {
    const itemProdutoId = parseInt(item.produto_id, 10);
    const produtoId = parseInt(produto.id, 10);
    if (!isNaN(itemProdutoId) && !isNaN(produtoId) && itemProdutoId === produtoId) {
      return true;
    }
    // Se o item tem produto_id mas não corresponde, não tentar outras correspondências
    // para evitar matches incorretos
    return false;
  }

  // Segundo: tentar match por código do produto (se ambos existirem)
  if (item.produto_codigo && produto.codigo_produto) {
    const itemCodigo = normalizarString(item.produto_codigo);
    const produtoCodigo = normalizarString(produto.codigo_produto);
    if (itemCodigo && produtoCodigo && itemCodigo === produtoCodigo) {
      return true;
    }
    // Se o item tem código mas não corresponde, não tentar match por nome
    // para evitar matches incorretos
    return false;
  }

  // Terceiro: tentar match por nome do produto (normalizado, case-insensitive)
  // IMPORTANTE: Só usar nome se não houver produto_id nem código, e fazer match exato
  // Além disso, validar que o nome não seja muito genérico (menos de 3 caracteres)
  if (item.produto_nome && produto.nome && !item.produto_id && !item.produto_codigo) {
    const itemNome = normalizarString(item.produto_nome);
    const produtoNome = normalizarString(produto.nome);
    // Match exato apenas (não parcial) e nome deve ter pelo menos 3 caracteres
    if (itemNome && produtoNome && itemNome.length >= 3 && produtoNome.length >= 3 && itemNome === produtoNome) {
      return true;
    }
  }

  return false;
};

const calcularLucratividadeProduto = (produto, todasVendas) => {
  let quantidadeVendidaTotal = 0;
  let faturamentoTotalProduto = 0;
  let custoTotalVendasProduto = 0;

  const precoCustoBase = parseFloat(produto.preco_custo || 0);
  
  // Flag para debug do produto específico
  const isProdutoDebug = produto.nome && produto.nome.toLowerCase().includes('cartão de visita');
  const itensAssociados = [];

  // Processar todas as vendas (PDV, OS, Envelopamentos, Marketplace)
  todasVendas.forEach(venda => {
    if (!venda.itens || !Array.isArray(venda.itens)) return; // Se não há itens, pular

    venda.itens.forEach(item => {
      // Usar função auxiliar para verificar correspondência
      const corresponde = itemCorrespondeAoProduto(item, produto);
      
      if (isProdutoDebug && corresponde) {
        itensAssociados.push({
          item_id: item.produto_id || 'sem_id',
          item_nome: item.produto_nome || 'sem_nome',
          item_codigo: item.produto_codigo || 'sem_codigo',
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          venda_tipo: venda.tipo_venda || 'pdv'
        });
      }
      
      if (corresponde) {
        const quantidade = parseFloat(item.quantidade || 0);
        const precoVendaItem = parseFloat(item.valor_unitario || 0);
        const precoCustoItem = precoCustoBase; // Usar custo atual do produto

        quantidadeVendidaTotal += quantidade;
        faturamentoTotalProduto += quantidade * precoVendaItem;
        custoTotalVendasProduto += quantidade * precoCustoItem;
      }
    });
  });
  
  // Log detalhado para o produto específico
  if (isProdutoDebug && quantidadeVendidaTotal > 0) {
    console.log(`🔍 [DEBUG] Produto "${produto.nome}" (ID: ${produto.id}):`, {
      quantidade_vendida: quantidadeVendidaTotal,
      faturamento: faturamentoTotalProduto,
      itens_associados: itensAssociados
    });
  }

  const precoVendaAtual = parseFloat(produto.preco_venda || 0);
  const lucroBrutoUnitarioAtual = precoVendaAtual - precoCustoBase;
  const margemLucroAtual = precoVendaAtual > 0 ? (lucroBrutoUnitarioAtual / precoVendaAtual) * 100 : 0;
  const lucroTotalRealizado = faturamentoTotalProduto - custoTotalVendasProduto;
  const estoqueAtual = parseFloat(produto.estoque || 0);
  const potencialLucroEstoque = estoqueAtual * lucroBrutoUnitarioAtual;

  return {
    ...produto,
    preco_custo_num: precoCustoBase,
    preco_venda_num: precoVendaAtual,
    lucro_bruto_unitario: lucroBrutoUnitarioAtual,
    margem_lucro_percentual: margemLucroAtual,
    quantidade_vendida: quantidadeVendidaTotal,
    faturamento_total: faturamentoTotalProduto,
    custo_total_vendas: custoTotalVendasProduto,
    lucro_total_realizado: lucroTotalRealizado,
    estoque_atual_num: estoqueAtual,
    potencial_lucro_estoque: potencialLucroEstoque,
  };
};


const RelatorioLucratividadeProdutosPage = () => {
  const { toast } = useToast();
  const [produtos, setProdutos] = useState([]);
  const [allProdutosComLucratividade, setAllProdutosComLucratividade] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroNome, setFiltroNome] = useState('');
  // Inicializar com a data atual (hoje)
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filteredAndSortedProdutos, setFilteredAndSortedProdutos] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Carregar produtos da API Laravel com per_page alto para trazer todos
        const produtosResponse = await produtoService.getAll('?per_page=10000');

        // A API retorna dados paginados, então precisamos acessar response.data.data
        const produtosData = produtosResponse?.data?.data || produtosResponse?.data || [];

        if (!Array.isArray(produtosData) || produtosData.length === 0) {
          throw new Error("Nenhum produto encontrado na API");
        }

        const storedProdutos = produtosData;

        // Carregar categorias da API
        const categoriasResponse = await productCategoryService.getAll();
        const categoriasData = categoriasResponse?.data || [];
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);

        // BUSCAR DIRETAMENTE DA TABELA itens_venda com filtro de data se aplicável
        let urlParams = '?per_page=10000';
        const temFiltroData = dateRange?.from && dateRange?.to && isValid(dateRange.from) && isValid(dateRange.to);
        
        // Sempre aplicar filtro de data - se não houver filtro definido, usar data de hoje
        let dataInicio, dataFim;
        if (temFiltroData) {
          dataInicio = formatDateFn(dateRange.from, 'yyyy-MM-dd');
          dataFim = formatDateFn(dateRange.to, 'yyyy-MM-dd');
        } else {
          // Se não há filtro, usar data de hoje como padrão
          const hoje = new Date();
          dataInicio = formatDateFn(hoje, 'yyyy-MM-dd');
          dataFim = formatDateFn(hoje, 'yyyy-MM-dd');
        }
        
        // IMPORTANTE: Filtrar por data de VENDA (created_at do item), não por data de PAGAMENTO
        // Isso garante que apenas produtos realmente vendidos no período apareçam
        urlParams += `&data_inicio=${dataInicio}&data_fim=${dataFim}&filtrar_por_data_venda=true`;
        console.log('📅 Filtro de data aplicado (por data de VENDA):', { dataInicio, dataFim, temFiltroDataDefinido: temFiltroData });

        const itensResponse = await api.get(`/api/itens-venda${urlParams}`);
        console.log('📋 Resposta completa da API:', itensResponse);
        console.log('📋 Resposta data:', itensResponse?.data);

        // A API retorna array direto
        const todosItensVenda = Array.isArray(itensResponse?.data) ? itensResponse.data : [];

        console.log(`📋 Total itens da tabela itens_venda${temFiltroData ? ' (filtrado por data)' : ''}:`, todosItensVenda.length);
        
        // Verificar se há itens do produto específico "Cartão de visita" para debug
        const itensCartaoVisita = todosItensVenda.filter(item => 
          item.produto_nome && item.produto_nome.toLowerCase().includes('cartão de visita')
        );
        if (itensCartaoVisita.length > 0) {
          console.log('🔍 [DEBUG] Itens de "Cartão de visita" retornados pela API:', {
            quantidade: itensCartaoVisita.length,
            itens: itensCartaoVisita.map(i => ({
              id: i.id,
              produto_id: i.produto_id,
              produto_nome: i.produto_nome,
              produto_codigo: i.produto_codigo,
              quantidade: i.quantidade,
              venda_id: i.venda_id,
              tipo_venda: i.tipo_venda
            }))
          });
        }
        if (todosItensVenda.length > 0) {
          console.log('📋 Primeiro item completo:', JSON.stringify(todosItensVenda[0], null, 2));
          console.log('📋 Campos disponíveis no primeiro item:', Object.keys(todosItensVenda[0]));

          // Verificar se tem tipo_venda e venda_referencia_id
          const temTipoVenda = todosItensVenda.some(i => i.tipo_venda !== undefined);
          const temVendaReferenciaId = todosItensVenda.some(i => i.venda_referencia_id !== undefined);
          console.log('📋 Tem campo tipo_venda?', temTipoVenda);
          console.log('📋 Tem campo venda_referencia_id?', temVendaReferenciaId);

          // Contar itens por tipo (se o campo existir)
          if (temTipoVenda) {
            const tipos = todosItensVenda.map(i => i.tipo_venda || 'pdv').filter((v, i, a) => a.indexOf(v) === i);
            console.log('📋 Tipos de itens encontrados:', tipos);
          }

          // Contar itens com produto_id null vs não-null
          const comProdutoId = todosItensVenda.filter(i => i.produto_id !== null && i.produto_id !== undefined).length;
          const semProdutoId = todosItensVenda.length - comProdutoId;
          console.log('📋 Itens COM produto_id:', comProdutoId);
          console.log('📋 Itens SEM produto_id:', semProdutoId);
        }

        // Contar por tipo (com fallback para 'pdv' se não existir)
        const countByTipo = todosItensVenda.reduce((acc, item) => {
          const tipo = item.tipo_venda || 'pdv';
          acc[tipo] = (acc[tipo] || 0) + 1;
          return acc;
        }, {});
        console.log('📋 Itens por tipo_venda:', countByTipo);

        // Converter itens_venda para o formato esperado pela função calcularLucratividadeProduto
        // Agrupar por venda_referencia_id (se existir) ou venda_id e tipo_venda
        const itensAgrupadosPorVenda = {};
        let itensSemIdentificacao = 0;

        todosItensVenda.forEach((item, index) => {
          // Pular itens que não têm nenhuma forma de identificação (nem produto_id, nem produto_nome, nem produto_codigo)
          if (!item.produto_id && !item.produto_nome && !item.produto_codigo) {
            itensSemIdentificacao++;
            if (index < 5) { // Log apenas os primeiros 5 para não poluir o console
              console.log('⚠️ Item sem identificação:', {
                id: item.id,
                venda_id: item.venda_id,
                tipo_venda: item.tipo_venda,
                valor_total: item.valor_total
              });
            }
            return; // Pular este item, ele não pode ser associado a nenhum produto
          }

          // Para OS, Marketplace e Envelopamento, usar venda_referencia_id ou venda_id se não houver
          // Se não houver venda_referencia_id, tentar inferir pelo tipo_venda
          let referenciaId = item.venda_referencia_id;
          if (!referenciaId && item.venda_id) {
            referenciaId = item.venda_id;
          }
          if (!referenciaId && item.id) {
            referenciaId = item.id;
          }

          // Determinar tipo de venda - se não existir, inferir se possível
          let tipoVenda = item.tipo_venda;
          if (!tipoVenda) {
            // Se não tem tipo_venda definido, assume PDV (venda normal)
            tipoVenda = 'pdv';
          }

          const chaveVenda = `${tipoVenda}-${referenciaId}`;

          if (!itensAgrupadosPorVenda[chaveVenda]) {
            itensAgrupadosPorVenda[chaveVenda] = {
              tipo_venda: tipoVenda,
              itens: []
            };
          }

          itensAgrupadosPorVenda[chaveVenda].itens.push({
            produto_id: item.produto_id || null,
            produto_nome: item.produto_nome || null,
            produto_codigo: item.produto_codigo || null,
            quantidade: item.quantidade || 0,
            valor_unitario: item.valor_unitario || 0
          });
        });

        if (itensSemIdentificacao > 0) {
          console.warn(`⚠️ ${itensSemIdentificacao} item(ns) de venda não puderam ser identificados (sem produto_id, produto_nome ou produto_codigo)`);
        }

        const todasVendas = Object.values(itensAgrupadosPorVenda);
        console.log('📊 Total de vendas processadas:', todasVendas.length);

        // Debug: contar vendas e itens por tipo
        const countByType = {
          pdv: todasVendas.filter(v => v.tipo_venda === 'pdv' || !v.tipo_venda).length,
          os: todasVendas.filter(v => v.tipo_venda === 'os').length,
          envelopamento: todasVendas.filter(v => v.tipo_venda === 'envelopamento').length,
          marketplace: todasVendas.filter(v => v.tipo_venda === 'marketplace').length,
          total: todasVendas.length
        };
        console.log('📊 Vendas agrupadas por tipo:', countByType);

        let totalItensPorTipo = { pdv: 0, os: 0, envelopamento: 0, marketplace: 0 };
        let totalValorPorTipo = { pdv: 0, os: 0, envelopamento: 0, marketplace: 0 };
        todasVendas.forEach(v => {
          const tipo = v.tipo_venda || 'pdv';
          if (totalItensPorTipo[tipo] !== undefined) {
            const qtdItens = v.itens?.length || 0;
            totalItensPorTipo[tipo] += qtdItens;
            // Calcular valor total por tipo
            v.itens?.forEach(item => {
              totalValorPorTipo[tipo] += (parseFloat(item.quantidade || 0) * parseFloat(item.valor_unitario || 0));
            });
          }
        });
        console.log('📊 Total itens por tipo:', totalItensPorTipo);
        console.log('📊 Total valor por tipo:', totalValorPorTipo);

        // Debug: mostrar amostra de vendas de OS e Envelopamento
        const vendasOS = todasVendas.filter(v => v.tipo_venda === 'os').slice(0, 2);
        const vendasEnvelopamento = todasVendas.filter(v => v.tipo_venda === 'envelopamento').slice(0, 2);
        if (vendasOS.length > 0) {
          console.log('📊 Exemplo de vendas OS:', vendasOS);
        }
        if (vendasEnvelopamento.length > 0) {
          console.log('📊 Exemplo de vendas Envelopamento:', vendasEnvelopamento);
        }

        // Calcular lucratividade apenas para produtos que têm vendas no período retornado pela API
        // A API já filtra por data quando há filtro de data, então todasVendas já contém apenas vendas do período
        const produtosComLucratividade = storedProdutos.map(p => calcularLucratividadeProduto(p, todasVendas));

        // Filtrar apenas produtos que realmente foram vendidos no período
        // A API já retorna apenas itens do período filtrado, então produtos sem vendas aqui não foram vendidos no período
        const produtosFiltrados = produtosComLucratividade.filter(p => {
          const qtdVendida = parseFloat(p.quantidade_vendida || 0);
          const faturamento = parseFloat(p.faturamento_total || 0);
          // Apenas produtos com vendas reais no período devem aparecer
          // Se quantidade > 0 E faturamento > 0, significa que houve venda no período
          // Usar E (&&) ao invés de OU (||) para garantir que realmente houve venda
          const temVenda = qtdVendida > 0 && faturamento > 0;
          
          // Log para debug se produto tem nome suspeito
          if (p.nome && p.nome.toLowerCase().includes('cartão de visita')) {
            console.log(`🔍 [Debug] Produto "${p.nome}": qtd=${qtdVendida}, faturamento=${faturamento}, temVenda=${temVenda}`);
          }
          
          return temVenda;
        });

        console.log(`📊 Total produtos calculados: ${produtosComLucratividade.length}, produtos com vendas no período: ${produtosFiltrados.length}`);
        console.log(`📊 Período filtrado: ${dateRange?.from ? formatDateFn(dateRange.from, 'dd/MM/yyyy') : 'N/A'} - ${dateRange?.to ? formatDateFn(dateRange.to, 'dd/MM/yyyy') : 'N/A'}`);

        setAllProdutosComLucratividade(produtosFiltrados);
        setProdutos(produtosFiltrados);
      } catch (error) {
        console.error("Erro ao carregar dados para relatório:", error);
        toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast, dateRange]);

  useEffect(() => {
    // Quando o dateRange muda, o loadData principal já recarrega tudo com os dados corretos
    // e já filtra produtos sem vendas. Aqui apenas aplicamos os filtros de nome e categoria
    let itensFiltrados = [...allProdutosComLucratividade];

    // Aplicar filtro de nome
    if (filtroNome) {
      itensFiltrados = itensFiltrados.filter(p =>
        p.nome.toLowerCase().includes(filtroNome.toLowerCase()) ||
        (p.codigo_produto && p.codigo_produto.toLowerCase().includes(filtroNome.toLowerCase()))
      );
    }

    // Aplicar filtro de categoria
    if (filtroCategoria !== 'all') {
      itensFiltrados = itensFiltrados.filter(p => p.categoria === filtroCategoria);
    }

    // Ordenar por lucro total realizado (maior primeiro)
    const sorted = itensFiltrados.sort((a, b) => b.lucro_total_realizado - a.lucro_total_realizado);
    setFilteredAndSortedProdutos(sorted);
  }, [allProdutosComLucratividade, filtroNome, filtroCategoria]);


  const handleExport = () => {
    if (filteredAndSortedProdutos.length === 0) {
      toast({ title: "Nenhum dado para exportar", description: "Ajuste os filtros ou adicione produtos.", variant: "default" });
      return;
    }
    const dataToExport = filteredAndSortedProdutos.map(p => ({
      'Código': p.codigo_produto,
      'Nome': p.nome,
      'Categoria': Array.isArray(categorias) ? categorias.find(c => c.id === p.categoria)?.name || p.categoria || 'N/A' : p.categoria || 'N/A',
      'Preço Custo (R$)': formatNumber(p.preco_custo_num, 2),
      'Preço Venda (R$)': formatNumber(p.preco_venda_num, 2),
      'Lucro Unitário (R$)': formatNumber(p.lucro_bruto_unitario, 2),
      'Margem Lucro (%)': formatNumber(p.margem_lucro_percentual, 2),
      'Qtd. Vendida': p.quantidade_vendida,
      'Faturamento Total (R$)': formatNumber(p.faturamento_total, 2),
      'Custo Total Vendas (R$)': formatNumber(p.custo_total_vendas, 2),
      'Lucro Total Realizado (R$)': formatNumber(p.lucro_total_realizado, 2),
      'Estoque Atual': p.estoque_atual_num,
      'Potencial Lucro Estoque (R$)': formatNumber(p.potencial_lucro_estoque, 2),
    }));
    exportToExcel(dataToExport, 'Lucratividade_Produtos', `Relatorio_Lucratividade_Produtos_${formatDateFn(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: "Exportado!", description: "O relatório de lucratividade foi exportado para Excel." });
  };

  const totalLucroRealizado = useMemo(() => {
    return filteredAndSortedProdutos.reduce((sum, p) => sum + p.lucro_total_realizado, 0);
  }, [filteredAndSortedProdutos]);

  const totalFaturamento = useMemo(() => {
    return filteredAndSortedProdutos.reduce((sum, p) => sum + p.faturamento_total, 0);
  }, [filteredAndSortedProdutos]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><PackageSearch size={48} className="animate-pulse text-primary" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 md:p-6"
    >
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <TrendingUp size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Relatório de Lucratividade por Produto</h1>
            <p className="text-muted-foreground">Analise o desempenho e a rentabilidade de cada produto.</p>
          </div>
        </div>
      </header>

      <Card className="mb-6 shadow-lg border-border">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div>
            <CardTitle className="text-xl">Filtros e Opções</CardTitle>
            <CardDescription>Refine sua busca para encontrar os dados desejados.</CardDescription>
          </div>
          <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" /> Exportar para Excel
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="filtro-nome">Nome ou Código do Produto</Label>
            <Input
              id="filtro-nome"
              placeholder="Buscar por nome ou código..."
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
            />
          </div>
          {/* <div>
            <Label htmlFor="filtro-categoria">Categoria</Label>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger id="filtro-categoria">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Array.isArray(categorias) && categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div> */}
          <div>
            <Label htmlFor="date-range-lucratividade">Período de Pagamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range-lucratividade"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from && isValid(dateRange.from) ?
                    (dateRange?.to && isValid(dateRange.to) ? `${formatDateFn(dateRange.from, "dd/MM/yy")} - ${formatDateFn(dateRange.to, "dd/MM/yy")}` : formatDateFn(dateRange.from, "dd/MM/yy"))
                    : "Todo o período"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    if (range?.from && !isValid(range.from)) range.from = undefined;
                    if (range?.to && !isValid(range.to)) range.to = undefined;
                    setDateRange(range || { from: undefined, to: undefined });
                  }}
                  numberOfMonths={2}
                />
                {(dateRange?.from || dateRange?.to) && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setDateRange({ from: undefined, to: undefined })}>Limpar Datas</Button>}
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">Filtra produtos por data de pagamento das vendas</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 bg-gradient-to-r from-primary/80 to-primary text-primary-foreground shadow-xl">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-around items-center text-center sm:text-left gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider opacity-80">Faturamento Total (Filtrado)</p>
            <p className="text-3xl font-bold">{formatCurrency(totalFaturamento)}</p>
          </div>
          <div className="h-12 w-px bg-primary-foreground/30 hidden sm:block"></div>
          <div>
            <p className="text-sm uppercase tracking-wider opacity-80">Lucro Total Realizado (Filtrado)</p>
            <p className="text-3xl font-bold">{formatCurrency(totalLucroRealizado)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Resultados da Análise de Lucratividade</CardTitle>
          <CardDescription>
            {filteredAndSortedProdutos.length > 0
              ? `Exibindo ${filteredAndSortedProdutos.length} produto(s) ordenados por maior lucro realizado.`
              : "Nenhum produto encontrado para os filtros selecionados."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Layout */}
          <div className="md:hidden">
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-3 p-4">
                {filteredAndSortedProdutos.map((p, index) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm break-words">
                          {p.nome}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {p.codigo_produto}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Custo Unit.</p>
                          <p className="text-sm font-medium">{formatCurrency(p.preco_custo_num)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Venda Unit.</p>
                          <p className="text-sm font-medium">{formatCurrency(p.preco_venda_num)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Lucro Unit.</p>
                          <p className="text-sm font-bold text-green-600">{formatCurrency(p.lucro_bruto_unitario)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Margem</p>
                          <p className="text-sm font-medium">{formatNumber(p.margem_lucro_percentual, 1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Qtd. Vendida</p>
                          <p className="text-sm font-medium">{p.quantidade_vendida}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Estoque</p>
                          <p className="text-sm font-medium">{p.estoque_atual_num}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Faturamento:</span>
                          <span className="text-sm font-medium">{formatCurrency(p.faturamento_total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Custo Vendas:</span>
                          <span className="text-sm font-medium text-red-600">{formatCurrency(p.custo_total_vendas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Lucro Total:</span>
                          <span className="text-lg font-bold text-primary">{formatCurrency(p.lucro_total_realizado)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Lucro Pot. Est.:</span>
                          <span className="text-sm font-medium text-blue-600">{formatCurrency(p.potencial_lucro_estoque)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:block">
            <ScrollArea className="h-[600px] w-full">
              <div className="overflow-x-auto">
                <Table className="min-w-[1200px]">
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-[200px]">Produto</TableHead>
                      <TableHead className="text-right">Custo Unit. (R$)</TableHead>
                      <TableHead className="text-right">Venda Unit. (R$)</TableHead>
                      <TableHead className="text-right">Lucro Unit. (R$)</TableHead>
                      <TableHead className="text-right">Margem (%)</TableHead>
                      <TableHead className="text-right">Qtd. Vendida</TableHead>
                      <TableHead className="text-right">Faturamento (R$)</TableHead>
                      <TableHead className="text-right">Custo Vendas (R$)</TableHead>
                      <TableHead className="text-right text-primary font-semibold">Lucro Total (R$)</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Lucro Pot. Est. (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedProdutos.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.nome}</div>
                          <div className="text-xs text-muted-foreground">{p.codigo_produto}</div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(p.preco_custo_num)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.preco_venda_num)}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(p.lucro_bruto_unitario)}</TableCell>
                        <TableCell className="text-right">{formatNumber(p.margem_lucro_percentual, 1)}%</TableCell>
                        <TableCell className="text-right">{p.quantidade_vendida}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.faturamento_total)}</TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400">{formatCurrency(p.custo_total_vendas)}</TableCell>
                        <TableCell className="text-right text-primary font-bold">{formatCurrency(p.lucro_total_realizado)}</TableCell>
                        <TableCell className="text-right">{p.estoque_atual_num}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.potencial_lucro_estoque)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </CardContent>
        {filteredAndSortedProdutos.length === 0 && (
          <CardFooter className="justify-center py-8">
            <div className="text-center text-muted-foreground">
              <Filter size={32} className="mx-auto mb-2 opacity-50" />
              <p>Não há dados para exibir com os filtros atuais.</p>
            </div>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};

export default RelatorioLucratividadeProdutosPage;