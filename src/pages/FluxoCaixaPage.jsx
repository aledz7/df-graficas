import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, FileText } from 'lucide-react';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import FluxoCaixaFilters from '@/components/fluxo-caixa/FluxoCaixaFilters';
import FluxoCaixaSummary from '@/components/fluxo-caixa/FluxoCaixaSummary';
import FluxoCaixaTable from '@/components/fluxo-caixa/FluxoCaixaTable';
import NovoLancamentoModal from '@/components/fluxo-caixa/NovoLancamentoModal';
import RelatorioFluxoCaixa from '@/components/fluxo-caixa/RelatorioFluxoCaixa';
import SenhaMasterModal from '@/components/SenhaMasterModal';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { lancamentoCaixaService, contaReceberService, contaPagarService } from '@/services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FluxoCaixaPage = () => {
  const { toast } = useToast();
  const [lancamentos, setLancamentos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState(null);
  const [empresa, setEmpresa] = useState({});
  const [logoUrl, setLogoUrl] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSenhaMasterModalOpen, setIsSenhaMasterModalOpen] = useState(false);
  const [pendingEditLancamento, setPendingEditLancamento] = useState(null);

  // Projeção de Saldo
  const [saldoInicialConta, setSaldoInicialConta] = useState(() => {
    const saved = localStorage.getItem('fluxocaixa_saldo_inicial');
    const legado = localStorage.getItem('fluxocaixa_saldo_atual');
    const valorSalvo = saved ?? legado;
    return valorSalvo !== null ? parseFloat(valorSalvo) : 0;
  });
  const [totalAReceber, setTotalAReceber] = useState(0);
  const [totalAPagar, setTotalAPagar] = useState(0);
  const [isLoadingProjecao, setIsLoadingProjecao] = useState(false);

  const today = new Date();
  const [dataSelecionada, setDataSelecionada] = useState(today);
  const [filtroTipo, setFiltroTipo] = useState('todos'); 
  const [filtroDescricao, setFiltroDescricao] = useState('');
  
  const relatorioRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => {
      if (relatorioRef.current) {
        return relatorioRef.current;
      }
      console.error('Referência do relatório não encontrada');
      return null;
    },
    documentTitle: `Relatorio_Fluxo_Caixa_${format(dataSelecionada, 'dd-MM-yyyy')}`,
    onBeforeGetContent: () => {
    },
    onPrintError: (error) => {
      console.error('Erro na impressão:', error);
      toast({ 
        title: "Erro na Impressão", 
        description: "Não foi possível gerar o PDF. Verifique se há dados para imprimir.", 
        variant: "destructive" 
      });
    },
    onAfterPrint: () => {
    }
  });

  // Função para buscar lançamentos da API
  const buscarLancamentos = async (data) => {
    try {
      setIsLoading(true);
      const dataFormatada = format(data, 'yyyy-MM-dd');
      const response = await lancamentoCaixaService.getByDate(dataFormatada);
      
      if (response.data && Array.isArray(response.data.data)) {
        setLancamentos(response.data.data);
      } else {
        setLancamentos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar lançamentos:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao buscar lançamentos do caixa.", 
        variant: "destructive" 
      });
      setLancamentos([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar totais pendentes para projeção de saldo (independente de período)
  const buscarTotaisPendentes = async () => {
    try {
      setIsLoadingProjecao(true);
      const [receber, pagar] = await Promise.all([
        contaReceberService.totaisPendentes(),
        contaPagarService.estatisticas(),
      ]);

      const totalReceber = receber?.data?.data?.total_a_receber
        ?? receber?.data?.total_a_receber
        ?? 0;

      const totalPagar = pagar?.data?.data?.total_pendente
        ?? pagar?.data?.total_pendente
        ?? 0;

      setTotalAReceber(parseFloat(totalReceber) || 0);
      setTotalAPagar(parseFloat(totalPagar) || 0);
    } catch (error) {
      console.error('Erro ao buscar totais pendentes para projeção:', error);
    } finally {
      setIsLoadingProjecao(false);
    }
  };

  const handleSaldoInicialChange = (novoSaldo) => {
    const valor = parseFloat(novoSaldo) || 0;
    setSaldoInicialConta(valor);
    localStorage.setItem('fluxocaixa_saldo_inicial', String(valor));
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedCategorias = await apiDataManager.getItem('categoriasFluxoCaixa');
        const parsedCategorias = safeJsonParse(storedCategorias, []);
        if (parsedCategorias.length === 0) {
          const categoriasPadrao = [
            { id: 'cat-vendas', nome: 'Vendas de Produtos/Serviços', tipo: 'entrada', padrao: true },
            { id: 'cat-suprimento', nome: 'Suprimento de Caixa', tipo: 'entrada', padrao: true },
            { id: 'cat-contas-receber', nome: 'Recebimento de Contas', tipo: 'entrada', padrao: true },
            { id: 'cat-aluguel', nome: 'Aluguel', tipo: 'saida', padrao: true },
            { id: 'cat-salarios', nome: 'Salários e Pró-labore', tipo: 'saida', padrao: true },
            { id: 'cat-fornecedores', nome: 'Pagamento Fornecedores', tipo: 'saida', padrao: true },
            { id: 'cat-impostos', nome: 'Impostos e Taxas', tipo: 'saida', padrao: true },
            { id: 'cat-despesas-adm', nome: 'Despesas Administrativas', tipo: 'saida', padrao: true },
            { id: 'cat-marketing', nome: 'Marketing e Publicidade', tipo: 'saida', padrao: true },
            { id: 'cat-sangria', nome: 'Sangria de Caixa', tipo: 'saida', padrao: true },
            { id: 'cat-contas-pagar', nome: 'Pagamento de Contas', tipo: 'saida', padrao: true },
            { id: 'cat-outras-entradas', nome: 'Outras Entradas', tipo: 'entrada', padrao: true },
            { id: 'cat-outras-saidas', nome: 'Outras Saídas', tipo: 'saida', padrao: true },
          ];
          setCategorias(categoriasPadrao);
          await apiDataManager.setItem('categoriasFluxoCaixa', categoriasPadrao);
        } else {
          setCategorias(parsedCategorias);
        }

        const storedEmpresa = await apiDataManager.getItem('empresaSettings');
        const parsedEmpresa = safeJsonParse(storedEmpresa, {});
        setEmpresa(parsedEmpresa);
        
        const storedLogoUrl = await apiDataManager.getItem('logoUrl') || '';
        setLogoUrl(storedLogoUrl);
        
        setIsInitialized(true);
        // Buscar totais pendentes para projeção
        buscarTotaisPendentes();
      } catch (error) {
        console.error('Erro ao carregar dados do fluxo de caixa:', error);
        toast({ 
          title: "Erro", 
          description: "Erro ao carregar dados do fluxo de caixa.", 
          variant: "destructive" 
        });
        setIsInitialized(true);
      }
    };
    
    loadData();
  }, [toast]);

  // Buscar lançamentos quando a data mudar
  useEffect(() => {
    if (isInitialized) {
      buscarLancamentos(dataSelecionada);
    }
  }, [dataSelecionada, isInitialized]);

  const handleSaveLancamento = async (lancamentoData) => {
    // Recarregar lançamentos da data atual após salvar
    await buscarLancamentos(dataSelecionada);
    setEditingLancamento(null);
  };

  const handleEditLancamento = (lancamento) => {
    // Armazenar o lançamento pendente e abrir modal de senha master
    setPendingEditLancamento(lancamento);
    setIsSenhaMasterModalOpen(true);
  };

  const handleSenhaMasterSuccess = () => {
    // Após validar a senha, abrir o modal de edição
    if (pendingEditLancamento) {
      setEditingLancamento(pendingEditLancamento);
      setIsModalOpen(true);
      setPendingEditLancamento(null);
    }
  };

  const handleSenhaMasterClose = () => {
    // Limpar o lançamento pendente ao cancelar
    setIsSenhaMasterModalOpen(false);
    setPendingEditLancamento(null);
  };

  const handleDeleteLancamento = async (id) => {
    if(window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      try {
        await lancamentoCaixaService.delete(id);
        toast({ title: "Lançamento Excluído", description: "O lançamento foi removido com sucesso." });
        // Recarregar lançamentos da data atual
        await buscarLancamentos(dataSelecionada);
      } catch (error) {
        console.error('Erro ao excluir lançamento:', error);
        toast({ 
          title: "Erro", 
          description: "Erro ao excluir lançamento.", 
          variant: "destructive" 
        });
      }
    }
  };
  
  const todosLancamentosDoDia = useMemo(() => {
    if (!Array.isArray(lancamentos)) return [];
    
    return lancamentos.filter(l => {
        const tipoMatch = filtroTipo === 'todos' || l.tipo === filtroTipo;
        const descricaoMatch = filtroDescricao === '' || l.descricao.toLowerCase().includes(filtroDescricao.toLowerCase());
        return tipoMatch && descricaoMatch;
      })
      .sort((a, b) => parseISO(b.data) - parseISO(a.data));
  }, [lancamentos, filtroTipo, filtroDescricao]);

  const totaisDoDia = useMemo(() => {
    const totalEntradas = todosLancamentosDoDia.filter(l => l.tipo === 'entrada').reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const totalSaidas = todosLancamentosDoDia.filter(l => l.tipo === 'saida').reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const saldoDoDia = totalEntradas - totalSaidas;
    return { totalEntradas, totalSaidas, saldoDoDia };
  }, [todosLancamentosDoDia]);

  const totaisPorFormaPagamento = useMemo(() => {
    return todosLancamentosDoDia
      .filter(l => l.tipo === 'entrada' && l.forma_pagamento)
      .reduce((acc, l) => {
        const forma = l.forma_pagamento;
        acc[forma] = (acc[forma] || 0) + parseFloat(l.valor);
        return acc;
      }, {});
  }, [todosLancamentosDoDia]);

  const totaisPorConta = useMemo(() => {
    return todosLancamentosDoDia
      .filter(l => l.tipo === 'entrada')
      .reduce((acc, l) => {
        const contaNome = l.conta_nome || l.conta?.nome || 'Sem conta';
        const contaId = l.conta_id || 'sem-conta';
        const key = `${contaId}`;
        
        if (!acc[key]) {
          acc[key] = {
            nome: contaNome,
            total: 0
          };
        }
        acc[key].total += parseFloat(l.valor);
        return acc;
      }, {});
  }, [todosLancamentosDoDia]);

  const saldoAtualCalculado = useMemo(() => {
    const totalEntradas = lancamentos
      .filter((l) => l.tipo === 'entrada')
      .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);
    const totalSaidas = lancamentos
      .filter((l) => l.tipo === 'saida')
      .reduce((acc, curr) => acc + parseFloat(curr.valor || 0), 0);

    return saldoInicialConta + totalEntradas - totalSaidas;
  }, [lancamentos, saldoInicialConta]);


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">Acompanhe suas entradas, saídas e saldo financeiro do dia.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => { setEditingLancamento(null); setIsModalOpen(true); }}>
                <PlusCircle className="mr-2 h-5 w-5" /> Novo Lançamento Manual
            </Button>
            <Button 
              onClick={() => {
                if (todosLancamentosDoDia.length === 0) {
                  toast({ 
                    title: "Nenhum Dado", 
                    description: "Não há lançamentos para gerar o relatório do dia.", 
                    variant: "destructive" 
                  });
                  return;
                }
                
                // Gerar PDF usando o componente RelatorioFluxoCaixa
                const relatorioElement = relatorioRef.current;
                if (!relatorioElement) {
                  toast({ 
                    title: "Erro", 
                    description: "Não foi possível gerar o PDF. Tente novamente.", 
                    variant: "destructive" 
                  });
                  return;
                }

                html2canvas(relatorioElement, { 
                  scale: 2, 
                  useCORS: true, 
                  logging: false,
                  backgroundColor: '#ffffff',
                  onclone: (document) => {
                    // Forçar tema claro para o PDF
                    relatorioElement.style.backgroundColor = '#ffffff';
                    relatorioElement.style.color = '#000000';
                    
                    // Aplicar estilos claros em todos os cards
                    const cards = relatorioElement.querySelectorAll('[class*="card"], [class*="Card"]');
                    cards.forEach(card => {
                      card.style.backgroundColor = '#ffffff';
                      card.style.color = '#000000';
                      card.style.borderColor = '#e5e7eb';
                    });
                    
                    // Aplicar estilos claros nos headers dos cards
                    const cardHeaders = relatorioElement.querySelectorAll('[class*="card-header"], [class*="CardHeader"]');
                    cardHeaders.forEach(header => {
                      header.style.backgroundColor = '#f8fafc';
                      header.style.color = '#000000';
                      header.style.borderColor = '#e5e7eb';
                    });
                    
                    // Aplicar estilos claros no conteúdo dos cards
                    const cardContents = relatorioElement.querySelectorAll('[class*="card-content"], [class*="CardContent"]');
                    cardContents.forEach(content => {
                      content.style.backgroundColor = '#ffffff';
                      content.style.color = '#000000';
                    });
                    
                    // Aplicar estilos claros nas tabelas
                    const tables = relatorioElement.querySelectorAll('table');
                    tables.forEach(table => {
                      table.style.backgroundColor = '#ffffff';
                      table.style.color = '#000000';
                    });
                    
                    // Aplicar estilos claros nas células da tabela
                    const tableCells = relatorioElement.querySelectorAll('td, th');
                    tableCells.forEach(cell => {
                      cell.style.backgroundColor = '#ffffff';
                      cell.style.color = '#000000';
                      cell.style.borderColor = '#e5e7eb';
                    });
                    
                    // Aplicar estilos claros nas linhas da tabela
                    const tableRows = relatorioElement.querySelectorAll('tr');
                    tableRows.forEach(row => {
                      row.style.backgroundColor = '#ffffff';
                      row.style.color = '#000000';
                    });
                    
                    // Aplicar estilos claros em todos os textos
                    const allTextElements = relatorioElement.querySelectorAll('*');
                    allTextElements.forEach(element => {
                      if (element.style) {
                        element.style.color = '#000000';
                      }
                    });
                    
                    // Forçar fundo branco em elementos com classes dark
                    const darkElements = relatorioElement.querySelectorAll('[class*="dark:"]');
                    darkElements.forEach(element => {
                      element.style.backgroundColor = '#ffffff';
                      element.style.color = '#000000';
                    });
                  }
                }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = pdf.internal.pageSize.getHeight();
                  const canvasWidth = canvas.width;
                  const canvasHeight = canvas.height;
                  const ratio = canvasWidth / canvasHeight;
                  let imgWidth = pdfWidth - 20;
                  let imgHeight = imgWidth / ratio;
                  
                  if (imgHeight > pdfHeight - 20) {
                    imgHeight = pdfHeight - 20;
                    imgWidth = imgHeight * ratio;
                  }
                  
                  const x = (pdfWidth - imgWidth) / 2;
                  const y = 10;
                  
                  pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST');
                  pdf.save(`Relatorio_Fluxo_Caixa_${format(dataSelecionada, 'dd-MM-yyyy')}.pdf`);
                  
                  toast({ 
                    title: "PDF Gerado", 
                    description: "O relatório PDF foi baixado com sucesso!", 
                  });
                }).catch(err => {
                  console.error("Erro ao gerar PDF:", err);
                  toast({ 
                    title: "Erro", 
                    description: "Erro ao gerar o PDF. Tente novamente.", 
                    variant: "destructive" 
                  });
                });
              }} 
              variant="outline"
              disabled={todosLancamentosDoDia.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" /> 
              Gerar PDF do Dia
            </Button>
        </div>
      </div>

      <FluxoCaixaFilters
        dataSelecionada={dataSelecionada}
        setDataSelecionada={setDataSelecionada}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroDescricao={filtroDescricao}
        setFiltroDescricao={setFiltroDescricao}
      />

      <FluxoCaixaSummary 
        totaisDoDia={totaisDoDia}
        totaisPorFormaPagamento={totaisPorFormaPagamento}
        totaisPorConta={totaisPorConta}
        saldoAtual={saldoAtualCalculado}
        saldoInicial={saldoInicialConta}
        onSaldoInicialChange={handleSaldoInicialChange}
        totalAReceber={totalAReceber}
        totalAPagar={totalAPagar}
        isLoadingProjecao={isLoadingProjecao}
        onRefreshProjecao={buscarTotaisPendentes}
      />
      
      <FluxoCaixaTable 
        lancamentos={todosLancamentosDoDia}
        dataSelecionada={dataSelecionada}
        onEdit={handleEditLancamento}
        onDelete={handleDeleteLancamento}
        isLoading={isLoading}
      />

      {/* Componente de relatório para impressão - sempre renderizado mas oculto */}
      {todosLancamentosDoDia.length > 0 && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <RelatorioFluxoCaixa
            ref={relatorioRef}
            lancamentos={todosLancamentosDoDia}
            data={dataSelecionada}
            totais={totaisDoDia}
            totaisPorFormaPagamento={totaisPorFormaPagamento}
            totaisPorConta={totaisPorConta}
            empresa={empresa}
            logoUrl={logoUrl}
          />
        </div>
      )}

      <NovoLancamentoModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onSave={handleSaveLancamento}
        categorias={categorias}
        lancamentoInicial={editingLancamento}
      />

      <SenhaMasterModal
        isOpen={isSenhaMasterModalOpen}
        onClose={handleSenhaMasterClose}
        onSuccess={handleSenhaMasterSuccess}
        title="Senha Master Necessária"
        description="Para editar lançamentos no fluxo de caixa, é necessário informar a senha master do sistema."
      />
    </motion.div>
  );
};

export default FluxoCaixaPage;