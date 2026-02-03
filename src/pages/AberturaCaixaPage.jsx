import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, CheckCircle, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { caixaService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const ComprovanteAbertura = React.forwardRef(({ caixa, nomeEmpresa, logoUrl, vendedorAtual }, ref) => {
  return (
    <div ref={ref} className="p-4 bg-white text-black font-mono text-xs w-[280px]" style={{ minHeight: '200px', width: '280px' }}>
      {logoUrl && <img src={logoUrl} alt="Logo" className="h-10 mx-auto mb-2 object-contain"/>}
      <h2 className="text-center font-bold text-base mb-1">{nomeEmpresa || 'Comprovante'}</h2>
      <h3 className="text-center font-semibold mb-2">Abertura de Caixa</h3>
      <p>------------------------------------</p>
      <p>Data: {caixa?.data_abertura ? format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}</p>
                      <p>ID Caixa: {caixa?.id ? String(caixa.id).slice(-6) : 'N/A'}</p>
      <p>Usuário: {vendedorAtual?.nome || caixa?.usuario_nome || caixa?.id_usuario || 'N/A'}</p>
      <p>------------------------------------</p>
      <p className="font-bold text-lg">VALOR ABERTURA: R$ {caixa?.valor_abertura ? parseFloat(caixa.valor_abertura).toFixed(2) : '0.00'}</p>
      <p>------------------------------------</p>
      <p className="text-xs text-center mt-4">Assinatura do Responsável:</p>
      <br />
      <p className="text-center">____________________</p>
    </div>
  );
});

ComprovanteAbertura.displayName = 'ComprovanteAbertura';

const AberturaCaixaPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [valorAbertura, setValorAbertura] = useState('');
    const [caixaAberto, setCaixaAberto] = useState(null);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const comprovanteRef = useRef();

    const handlePrint = useReactToPrint({
        content: () => comprovanteRef.current,
        onAfterPrint: () => {
            // Impressão concluída
        },
        onBeforeGetContent: () => {
            // Preparando conteúdo para impressão...
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
                    setCaixaAberto(caixaAtual);
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
                // Se não há caixa aberto, não é um erro
                if (error.response?.status !== 404) {
                    toast({ 
                        title: 'Erro ao carregar dados', 
                        description: 'Não foi possível verificar o status do caixa.', 
                        variant: 'destructive' 
                    });
                }
            }
        };

        loadData();
    }, [toast]);

    const handleAbrirCaixa = async () => {
        if (!valorAbertura || parseFloat(valorAbertura) <= 0) {
            toast({ title: 'Valor Inválido', description: 'Por favor, insira um valor positivo.', variant: 'destructive' });
            return;
        }

        if (!user || !user.id) {
            toast({ title: 'Erro de Autenticação', description: 'Usuário não identificado. Faça login novamente.', variant: 'destructive' });
            return;
        }

        try {
            const valorFloat = parseFloat(valorAbertura);
            
            const aberturaData = {
                valor_abertura: valorFloat,
                usuario_id: user.id,
                usuario_nome: user.name
            };

            const response = await caixaService.abrirCaixa(aberturaData);
            
            setCaixaAberto({
                id: response.data.id,
                data_abertura: response.data.data_abertura,
                valor_abertura: response.data.valor_abertura,
                usuario_id: response.data.usuario_id,
                usuario_nome: response.data.usuario_nome
            });

            toast({ 
                title: 'Caixa Aberto!', 
                description: `Caixa aberto com R$ ${parseFloat(valorAbertura).toFixed(2)}.`, 
                className: "bg-green-500 text-white" 
            });
            
            navigate('/caixa/fluxo-caixa');
        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            
            let errorMessage = 'Erro ao abrir caixa.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({ 
                title: 'Erro ao Abrir Caixa', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        }
    };

    if (caixaAberto) {
        return (
            <div className="p-6 flex justify-center items-center h-full bg-gray-50 dark:bg-gray-900">
                <Card className="w-full max-w-md text-center shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center text-2xl text-green-600">
                            <CheckCircle className="mr-2" /> Caixa já está Aberto!
                        </CardTitle>
                        <CardDescription>
                            Sessão iniciada em {new Date(caixaAberto.data_abertura).toLocaleString('pt-BR')} por {caixaAberto.usuario_nome}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg">Valor de abertura: <span className="font-bold">R$ {parseFloat(caixaAberto.valor_abertura).toFixed(2)}</span></p>
                        <p className="text-muted-foreground mt-2">Para fechar o caixa ou ver os detalhes, vá para a página de Fechamento de Caixa.</p>
                        <div className="flex gap-2 mt-4">
                            <Button onClick={() => {
                                
                                if (caixaAberto && comprovanteRef.current) {
                                    handlePrint();
                                } else {
                                    toast({ 
                                        title: "Erro", 
                                        description: "Componente de impressão não está pronto. Tente novamente.", 
                                        variant: "destructive" 
                                    });
                                }
                            }} variant="outline" className="flex-1"><Printer size={16} className="mr-2"/> Imprimir Comprovante</Button>
                            <Button onClick={() => navigate('/caixa/fechamento-caixa')} className="flex-1">Fechar Caixa</Button>
                        </div>
                    </CardContent>
                </Card>
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                    <ComprovanteAbertura ref={comprovanteRef} caixa={caixaAberto} nomeEmpresa={empresaSettings.nomeFantasia} logoUrl={logoUrl} vendedorAtual={user} />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 flex justify-center items-center h-full bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl">
                        <DollarSign className="mr-2 text-primary"/> Abertura de Caixa
                    </CardTitle>
                    <CardDescription>Informe o valor inicial (suprimento) para começar o dia.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="valorAbertura">Valor Inicial (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                id="valorAbertura"
                                type="number"
                                placeholder="0.00"
                                value={valorAbertura}
                                onChange={(e) => setValorAbertura(e.target.value)}
                                className="pl-10 text-xl font-semibold h-12"
                                onKeyPress={(e) => e.key === 'Enter' && handleAbrirCaixa()}
                            />
                        </div>
                    </div>
                    <Button onClick={handleAbrirCaixa} className="w-full h-11 text-lg">Abrir Caixa</Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default AberturaCaixaPage;