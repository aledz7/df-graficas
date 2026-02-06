import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/components/ui/use-toast";
import { Lock, Printer, DollarSign, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { caixaService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const ComprovanteFechamento = React.forwardRef(({ caixa, nomeEmpresa, logoUrl }, ref) => {
  if (!caixa) return null;
  const totalEntradas = caixa.lancamentos?.filter(l => l.tipo === 'entrada' && l.descricao !== 'Abertura de Caixa').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
  const totalSaidas = caixa.lancamentos?.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
  const saldoEsperado = (parseFloat(caixa.valor_abertura) + totalEntradas) - totalSaidas;

  return (
    <div ref={ref} className="p-4 bg-white text-black font-mono text-xs w-[280px]">
      {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain"/>}
      <h2 className="text-center font-bold text-base mb-1">{nomeEmpresa || 'Comprovante'}</h2>
      <h3 className="text-center font-semibold mb-2">Fechamento de Caixa</h3>
      <p>------------------------------------</p>
                      <p>ID Caixa: {caixa.id ? String(caixa.id).slice(-6) : 'N/A'}</p>
      <p>Abertura: {format(new Date(caixa.data_abertura), 'dd/MM/yy HH:mm')}</p>
      <p>Fechamento: {format(new Date(caixa.data_fechamento), 'dd/MM/yy HH:mm')}</p>
      <p>Usuário: {caixa.usuario_fechamento_nome || caixa.usuario_nome}</p>
      <p>------------------------------------</p>
      <p>Valor Abertura: R$ {parseFloat(caixa.valor_abertura).toFixed(2)}</p>
      <p>Total Entradas: R$ {totalEntradas.toFixed(2)}</p>
      <p>Total Saídas:   R$ {totalSaidas.toFixed(2)}</p>
      <p>------------------------------------</p>
      <p>Saldo Esperado: R$ {saldoEsperado.toFixed(2)}</p>
      <p>Valor Informado:R$ {parseFloat(caixa.valor_fechamento_informado).toFixed(2)}</p>
      <p className={`font-bold ${caixa.diferenca !== 0 ? 'text-red-600' : ''}`}>
        Diferença:      R$ {parseFloat(caixa.diferenca).toFixed(2)}
      </p>
      {caixa.observacoes && (
        <>
          <p>------------------------------------</p>
          <p>Observações:</p>
          <p>{caixa.observacoes}</p>
        </>
      )}
      <p>------------------------------------</p>
      <p className="text-center mt-3">Assinatura:</p>
      <br />
      <p className="text-center">____________________</p>
    </div>
  );
});

ComprovanteFechamento.displayName = 'ComprovanteFechamento';

const FechamentoCaixaPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [valorFechamento, setValorFechamento] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [caixaAtual, setCaixaAtual] = useState(null);
    const [resumoCaixa, setResumoCaixa] = useState({ entradas: 0, saidas: 0, saldoEsperado: 0 });
    const [caixaFechado, setCaixaFechado] = useState(null);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const comprovanteRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => comprovanteRef.current,
        onAfterPrint: () => {
        },
        onBeforeGetContent: () => {
        },
        onPrintError: (error) => {
            console.error('Erro na impressão:', error);
            toast({ 
                title: "Erro na Impressão", 
                description: "Não foi possível imprimir o comprovante.", 
                variant: "destructive" 
            });
        },
        removeAfterPrint: false,
        suppressErrors: false
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                // Verificar se há caixa aberto
                const caixaAtual = await caixaService.getCaixaAtual();
                if (caixaAtual) {
                    setCaixaAtual(caixaAtual);
                    
                    // Calcular resumo
                    const entradas = caixaAtual.lancamentos?.filter(l => l.tipo === 'entrada' && l.descricao !== 'Abertura de Caixa').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
                    const saidas = caixaAtual.lancamentos?.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
                    const saldoEsperado = (parseFloat(caixaAtual.valor_abertura) + entradas) - saidas;
                    
                    setResumoCaixa({
                        entradas,
                        saidas,
                        saldoEsperado
                    });
                } else {
                    toast({ title: "Nenhum caixa aberto", description: "Não há sessão de caixa ativa para fechar. Abra um novo caixa primeiro.", variant: "destructive" });
                    navigate('/caixa/abertura-caixa');
                }

                // Carregar configurações da empresa
                const settings = localStorage.getItem('empresaSettings');
                if (settings) {
                    const parsedSettings = JSON.parse(settings);
                    setEmpresaSettings(parsedSettings);
                    setLogoUrl(parsedSettings.logoUrl || '');
                }
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                if (error.response?.status === 404) {
                    toast({ title: "Nenhum caixa aberto", description: "Não há sessão de caixa ativa para fechar. Abra um novo caixa primeiro.", variant: "destructive" });
                    navigate('/caixa/abertura-caixa');
                } else {
                    toast({ 
                        title: 'Erro ao carregar dados', 
                        description: 'Não foi possível verificar o status do caixa.', 
                        variant: 'destructive' 
                    });
                }
            }
        };
        
        loadData();
    }, [navigate, toast]);

    const handleFecharCaixa = async () => {
        if (!valorFechamento || parseFloat(valorFechamento) < 0) {
            toast({ title: 'Valor Inválido', description: 'Por favor, insira um valor válido para o fechamento.', variant: 'destructive' });
            return;
        }

        if (!user || !user.id) {
            toast({ title: 'Erro de Autenticação', description: 'Usuário não identificado. Faça login novamente.', variant: 'destructive' });
            return;
        }

        try {
            const valorFloat = parseFloat(valorFechamento);
            const diferenca = valorFloat - resumoCaixa.saldoEsperado;

            const fechamentoData = {
                valor_fechamento: valorFloat,
                valor_apurado: resumoCaixa.saldoEsperado,
                diferenca: diferenca,
                observacoes: observacoes,
                sessao_id: caixaAtual.id,
                usuario_id: user.id,
                usuario_nome: user.name
            };

            const response = await caixaService.fecharCaixa(fechamentoData);
            
            const caixaFechadoData = {
                ...caixaAtual,
                data_fechamento: response.data.data_fechamento,
                valor_fechamento_informado: response.data.valor_fechamento_informado,
                valor_fechamento_apurado: response.data.valor_fechamento_apurado,
                diferenca: response.data.diferenca,
                observacoes: observacoes,
                usuario_fechamento_id: response.data.usuario_id,
                usuario_fechamento_nome: response.data.usuario_nome,
            };

            setCaixaFechado(caixaFechadoData);
            toast({ title: "Caixa Fechado!", description: `Caixa fechado com R$ ${valorFloat.toFixed(2)}. Diferença: R$ ${diferenca.toFixed(2)}`, className: "bg-green-500 text-white" });
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            
            let errorMessage = 'Erro ao fechar caixa.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({ 
                title: 'Erro ao Fechar Caixa', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        }
    };

    if (caixaFechado) {
        return (
            <div className="p-6 flex justify-center items-center h-full bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center text-2xl text-green-600">
                            <Lock className="mr-2" /> Caixa Fechado com Sucesso!
                        </CardTitle>
                        <CardDescription>
                            Sessão encerrada em {new Date(caixaFechado.data_fechamento).toLocaleString('pt-BR')} por {caixaFechado.usuario_fechamento_nome}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p>Valor Informado: <span className="font-bold">R$ {parseFloat(caixaFechado.valor_fechamento_informado).toFixed(2)}</span></p>
                        <p>Saldo Apurado: <span className="font-bold">R$ {parseFloat(caixaFechado.valor_fechamento_apurado).toFixed(2)}</span></p>
                        <p className={`font-bold ${caixaFechado.diferenca !== 0 ? 'text-red-500' : 'text-green-500'}`}>
                            Diferença: R$ {parseFloat(caixaFechado.diferenca).toFixed(2)}
                        </p>
                        {caixaFechado.observacoes && (
                            <div className="mt-4 p-3 bg-gray-100 rounded">
                                <p className="text-sm font-semibold">Observações:</p>
                                <p className="text-sm">{caixaFechado.observacoes}</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex gap-2">
                        <Button onClick={() => {
                            if (caixaFechado && comprovanteRef.current) {
                                handlePrint();
                            } else {
                                console.error('Dados ou ref não disponíveis para impressão');
                                toast({ 
                                    title: "Erro", 
                                    description: "Componente de impressão não está pronto. Tente novamente.", 
                                    variant: "destructive" 
                                });
                            }
                        }} variant="outline" className="flex-1">
                            <Printer size={16} className="mr-2"/> Imprimir Comprovante
                        </Button>
                        <Button onClick={() => navigate('/caixa/historico-caixa')} className="flex-1">
                            Ver Histórico
                        </Button>
                    </CardFooter>
                </Card>
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <ComprovanteFechamento ref={comprovanteRef} caixa={caixaFechado} nomeEmpresa={empresaSettings.nomeFantasia} logoUrl={logoUrl} />
                </div>
            </div>
        );
    }

    if (!caixaAtual) {
        return (
            <div className="p-6 flex justify-center items-center h-full bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center text-2xl text-yellow-600">
                            <AlertTriangle className="mr-2" /> Carregando...
                        </CardTitle>
                        <CardDescription>Verificando status do caixa...</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 flex justify-center items-center h-full bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <Lock className="mr-2 text-primary"/> Fechamento de Caixa
                    </CardTitle>
                    <CardDescription>Confira os valores e informe o total em caixa para fechar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-md bg-muted/50">
                        <div>
                            <p className="text-sm text-muted-foreground">Abertura:</p>
                            <p className="font-semibold text-lg">R$ {parseFloat(caixaAtual.valor_abertura).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Entradas (Vendas/Suprimentos):</p>
                            <p className="font-semibold text-lg text-green-600">R$ {resumoCaixa.entradas.toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Saídas (Sangrias/Despesas):</p>
                            <p className="font-semibold text-lg text-red-600">R$ {resumoCaixa.saidas.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="valorFechamento">Valor Informado em Caixa (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input 
                                    id="valorFechamento"
                                    type="number"
                                    placeholder="0.00"
                                    value={valorFechamento}
                                    onChange={(e) => setValorFechamento(e.target.value)}
                                    className="pl-10 text-xl font-semibold h-12"
                                    onKeyPress={(e) => e.key === 'Enter' && handleFecharCaixa()}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <Label htmlFor="observacoes">Observações (Opcional)</Label>
                            <Textarea 
                                id="observacoes"
                                placeholder="Observações sobre o fechamento..."
                                value={observacoes}
                                onChange={(e) => setObservacoes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleFecharCaixa} className="w-full h-11 text-lg">Fechar Caixa</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default FechamentoCaixaPage;