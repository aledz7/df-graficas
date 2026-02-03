import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Printer, Calendar, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { caixaService } from '@/services/api';
import { motion } from 'framer-motion';

const ComprovanteCaixaDetalhado = React.forwardRef(({ caixa, nomeEmpresa, logoUrl }, ref) => {
  if (!caixa) return null;

  const totalEntradas = caixa.lancamentos?.filter(l => l.tipo === 'entrada' && l.descricao !== 'Abertura de Caixa').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
  const totalSaidas = caixa.lancamentos?.filter(l => l.tipo === 'saida').reduce((acc, l) => acc + parseFloat(l.valor), 0) || 0;
  const saldoEsperado = (parseFloat(caixa.valor_abertura) + totalEntradas) - totalSaidas;

  return (
    <div ref={ref} className="p-6 bg-white text-black printable-content-detailed w-[700px]">
      {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 mx-auto mb-4 object-contain"/>}
      <h2 className="text-center font-bold text-xl mb-2">{nomeEmpresa || 'Detalhes do Caixa'}</h2>
      <h3 className="text-center font-semibold text-lg mb-4">Sessão ID: {caixa.id.slice(-8)}</h3>
      
      <div className="grid grid-cols-2 gap-x-4 mb-4 text-sm">
        <p><strong>Abertura:</strong> {format(new Date(caixa.data_abertura), 'dd/MM/yyyy HH:mm')}</p>
        <p><strong>Fechamento:</strong> {caixa.data_fechamento ? format(new Date(caixa.data_fechamento), 'dd/MM/yyyy HH:mm') : 'Em Aberto'}</p>
        <p><strong>Usuário Abertura:</strong> {caixa.usuario_nome}</p>
        <p><strong>Usuário Fechamento:</strong> {caixa.usuario_fechamento_nome || 'N/A'}</p>
      </div>

      <hr className="my-3"/>
      <h4 className="font-semibold mb-2 text-base">Resumo Financeiro:</h4>
      <table className="w-full text-sm mb-4">
        <tbody>
          <tr><td className="py-0.5">Valor Abertura:</td><td className="text-right py-0.5">R$ {parseFloat(caixa.valor_abertura).toFixed(2)}</td></tr>
          <tr><td className="py-0.5">Total Entradas:</td><td className="text-right py-0.5 text-green-600">R$ {totalEntradas.toFixed(2)}</td></tr>
          <tr><td className="py-0.5">Total Saídas:</td><td className="text-right py-0.5 text-red-600">R$ {totalSaidas.toFixed(2)}</td></tr>
          <tr className="font-bold border-t"><td className="py-0.5">Saldo Esperado:</td><td className="text-right py-0.5">R$ {saldoEsperado.toFixed(2)}</td></tr>
          {caixa.data_fechamento && (
            <>
              <tr><td className="py-0.5">Valor Informado (Fechamento):</td><td className="text-right py-0.5">R$ {parseFloat(caixa.valor_fechamento_informado).toFixed(2)}</td></tr>
              <tr className={`font-bold ${caixa.diferenca !== 0 ? 'text-red-700' : ''}`}>
                <td className="py-0.5">Diferença:</td>
                <td className="text-right py-0.5">R$ {parseFloat(caixa.diferenca).toFixed(2)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      
      {caixa.observacoes && caixa.data_fechamento && (
        <>
          <hr className="my-3"/>
          <h4 className="font-semibold mb-2 text-base">Observações do Fechamento:</h4>
          <p className="text-sm mb-4 whitespace-pre-wrap">{caixa.observacoes}</p>
        </>
      )}

      {caixa.lancamentos && caixa.lancamentos.length > 0 && (
        <>
          <hr className="my-3"/>
          <h4 className="font-semibold mb-2 text-base">Lançamentos Detalhados:</h4>
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Data/Hora</th>
                <th className="text-left py-1">Descrição</th>
                <th className="text-right py-1">Valor</th>
              </tr>
            </thead>
            <tbody>
              {caixa.lancamentos.sort((a,b) => new Date(a.data_operacao) - new Date(b.data_operacao)).map(l => (
                <TableRow key={l.id} className="border-b">
                  <td className="py-1">{format(new Date(l.data_operacao), 'dd/MM HH:mm')}</td>
                  <td className="py-1">{l.descricao} ({l.categoria_nome || l.categoria_id})</td>
                  <td className={`text-right py-1 ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                    {l.tipo === 'entrada' ? '+' : '-'}R$ {Math.abs(parseFloat(l.valor)).toFixed(2)}
                  </td>
                </TableRow>
              ))}
            </tbody>
          </table>
        </>
      )}
      
      <p className="text-xs text-center mt-6">Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
    </div>
  );
});

const HistoricoCaixaPage = () => {
    const [historicoCaixas, setHistoricoCaixas] = useState([]);
    const [caixaSelecionado, setCaixaSelecionado] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const comprovanteRef = useRef();
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

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
                // Carregar histórico de caixas
                const historico = await caixaService.getHistoricoCaixas();
                setHistoricoCaixas(historico);

                // Carregar configurações da empresa
                const settings = localStorage.getItem('empresaSettings');
                if (settings) {
                    const parsedSettings = JSON.parse(settings);
                    setEmpresaSettings(parsedSettings);
                    setLogoUrl(parsedSettings.logoUrl || '');
                }
            } catch (error) {
                console.error('Erro ao carregar histórico:', error);
            }
        };

        loadData();
    }, []);

    const handleVerDetalhes = async (sessaoId) => {
        try {
            const detalhes = await caixaService.getSessaoCaixa(sessaoId);
            setCaixaSelecionado(detalhes);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        }
    };

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <Calendar size={28} className="text-primary"/>
                        <div>
                            <CardTitle className="text-2xl">Histórico de Caixas</CardTitle>
                            <CardDescription>Visualize todas as sessões de caixa abertas e fechadas.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Layout Mobile - Cards */}
                    <div className="md:hidden">
                        <ScrollArea className="h-[calc(100vh-16rem)]">
                            {historicoCaixas.length > 0 ? (
                                <div className="space-y-3">
                                    {historicoCaixas.map(caixa => (
                                        <motion.div
                                            key={caixa.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm">ID: {caixa.id ? String(caixa.id).slice(-6) : 'N/A'}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {caixa.data_fechamento ? (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                                Fechado
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                                                                Em Aberto
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className="text-lg font-bold text-blue-600">
                                                        R$ {parseFloat(caixa.valor_abertura).toFixed(2)}
                                                    </p>
                                                    {caixa.diferenca !== 0 && caixa.diferenca != null && (
                                                        <p className={`text-sm font-semibold ${caixa.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            Diferença: R$ {parseFloat(caixa.diferenca).toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Abertura</p>
                                                        <p className="text-sm">{format(new Date(caixa.data_abertura), 'dd/MM/yy HH:mm')}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Fechamento</p>
                                                        <p className="text-sm">
                                                            {caixa.data_fechamento ? format(new Date(caixa.data_fechamento), 'dd/MM/yy HH:mm') : 'Em Aberto'}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Usuário</p>
                                                    <p className="text-sm break-words">{caixa.usuario_fechamento_nome || caixa.usuario_nome}</p>
                                                </div>
                                                
                                                {caixa.valor_fechamento_informado && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Valor Fechamento</p>
                                                        <p className="text-sm font-semibold">R$ {parseFloat(caixa.valor_fechamento_informado).toFixed(2)}</p>
                                                    </div>
                                                )}
                                                
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => handleVerDetalhes(caixa.id)}
                                                        className="flex-1"
                                                    >
                                                        <Eye size={14} className="mr-1"/>
                                                        Ver Detalhes
                                                    </Button>
                                                    {caixa.data_fechamento && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => {
                                                                setCaixaSelecionado(caixa);
                                                                if (comprovanteRef.current) {
                                                                    setTimeout(() => handlePrint(), 100);
                                                                } else {
                                                                    toast({ 
                                                                        title: "Erro", 
                                                                        description: "Componente de impressão não está pronto. Tente novamente.", 
                                                                        variant: "destructive" 
                                                                    });
                                                                }
                                                            }}
                                                            className="flex-1"
                                                        >
                                                            <Printer size={14} className="mr-1"/>
                                                            Imprimir
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Calendar size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                    <p>Nenhum histórico de caixa encontrado.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Layout Desktop - Tabela */}
                    <div className="hidden md:block">
                        <ScrollArea className="h-[calc(100vh-16rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID Caixa</TableHead>
                                        <TableHead>Abertura</TableHead>
                                        <TableHead>Fechamento</TableHead>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead className="text-right">Valor Abertura</TableHead>
                                        <TableHead className="text-right">Valor Fechamento</TableHead>
                                        <TableHead className="text-right">Diferença</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historicoCaixas.length > 0 ? historicoCaixas.map(caixa => (
                                        <TableRow key={caixa.id}>
                                            <TableCell className="font-mono">{caixa.id ? String(caixa.id).slice(-6) : 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(caixa.data_abertura), 'dd/MM/yy HH:mm')}</TableCell>
                                            <TableCell>{caixa.data_fechamento ? format(new Date(caixa.data_fechamento), 'dd/MM/yy HH:mm') : <span className="text-yellow-600 font-semibold">Em Aberto</span>}</TableCell>
                                            <TableCell>{caixa.usuario_fechamento_nome || caixa.usuario_nome}</TableCell>
                                            <TableCell className="text-right">R$ {parseFloat(caixa.valor_abertura).toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{caixa.valor_fechamento_informado ? `R$ ${parseFloat(caixa.valor_fechamento_informado).toFixed(2)}` : '-'}</TableCell>
                                            <TableCell className={`text-right font-bold ${caixa.diferenca > 0 ? 'text-green-600' : caixa.diferenca < 0 ? 'text-red-600' : ''}`}>
                                                {caixa.diferenca != null ? `R$ ${parseFloat(caixa.diferenca).toFixed(2)}` : '-'}
                                                {caixa.diferenca !== 0 && caixa.diferenca != null && <AlertTriangle className="inline ml-1 h-4 w-4 text-yellow-500" title={`Diferença de R$ ${parseFloat(caixa.diferenca).toFixed(2)}`} />}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        onClick={() => handleVerDetalhes(caixa.id)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {caixa.data_fechamento && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => {
                                                                setCaixaSelecionado(caixa);
                                                                if (comprovanteRef.current) {
                                                                    setTimeout(() => handlePrint(), 100);
                                                                } else {
                                                                    toast({ 
                                                                        title: "Erro", 
                                                                        description: "Componente de impressão não está pronto. Tente novamente.", 
                                                                        variant: "destructive" 
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Nenhum histórico de caixa encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Detalhes */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Sessão de Caixa</DialogTitle>
                    </DialogHeader>
                    {caixaSelecionado && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-semibold">ID da Sessão:</p>
                                    <p className="text-lg font-mono">{caixaSelecionado.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Status:</p>
                                    <p className={`text-lg ${caixaSelecionado.status === 'aberto' ? 'text-green-600' : 'text-blue-600'}`}>
                                        {caixaSelecionado.status === 'aberto' ? 'Em Aberto' : 'Fechado'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Abertura:</p>
                                    <p className="text-lg">{format(new Date(caixaSelecionado.data_abertura), 'dd/MM/yyyy HH:mm')}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Usuário Abertura:</p>
                                    <p className="text-lg">{caixaSelecionado.usuario_nome}</p>
                                </div>
                                {caixaSelecionado.data_fechamento && (
                                    <>
                                        <div>
                                            <p className="text-sm font-semibold">Fechamento:</p>
                                            <p className="text-lg">{format(new Date(caixaSelecionado.data_fechamento), 'dd/MM/yyyy HH:mm')}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Usuário Fechamento:</p>
                                            <p className="text-lg">{caixaSelecionado.usuario_fechamento_nome}</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                                <div>
                                    <p className="text-sm text-muted-foreground">Valor Abertura:</p>
                                    <p className="font-semibold text-lg">R$ {parseFloat(caixaSelecionado.valor_abertura).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Entradas:</p>
                                    <p className="font-semibold text-lg text-green-600">R$ {caixaSelecionado.total_entradas.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Saídas:</p>
                                    <p className="font-semibold text-lg text-red-600">R$ {caixaSelecionado.total_saidas.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Saldo Esperado:</p>
                                    <p className="font-bold text-xl text-blue-600">R$ {caixaSelecionado.saldo_esperado.toFixed(2)}</p>
                                </div>
                                {caixaSelecionado.valor_fechamento_informado && (
                                    <>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Valor Informado:</p>
                                            <p className="font-semibold text-lg">R$ {parseFloat(caixaSelecionado.valor_fechamento_informado).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Diferença:</p>
                                            <p className={`font-bold text-lg ${caixaSelecionado.diferenca !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                R$ {parseFloat(caixaSelecionado.diferenca).toFixed(2)}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {caixaSelecionado.observacoes && (
                                <div>
                                    <p className="text-sm font-semibold mb-2">Observações:</p>
                                    <p className="text-sm p-3 bg-gray-100 rounded">{caixaSelecionado.observacoes}</p>
                                </div>
                            )}

                            {caixaSelecionado.lancamentos && caixaSelecionado.lancamentos.length > 0 && (
                                <div>
                                    <p className="text-sm font-semibold mb-2">Lançamentos ({caixaSelecionado.lancamentos.length}):</p>
                                    <div className="max-h-60 overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Data/Hora</TableHead>
                                                    <TableHead>Descrição</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {caixaSelecionado.lancamentos.sort((a,b) => new Date(a.data_operacao) - new Date(b.data_operacao)).map(l => (
                                                    <TableRow key={l.id}>
                                                        <TableCell className="text-xs">{format(new Date(l.data_operacao), 'dd/MM HH:mm')}</TableCell>
                                                        <TableCell className="text-xs">{l.descricao}</TableCell>
                                                        <TableCell className="text-xs">
                                                            <span className={`px-2 py-1 rounded text-xs ${l.tipo === 'entrada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className={`text-right text-xs font-medium ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                                            R$ {parseFloat(l.valor).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Fechar</Button>
                        </DialogClose>
                        {caixaSelecionado?.data_fechamento && (
                            <Button 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    if (comprovanteRef.current) {
                                        setTimeout(() => handlePrint(), 100);
                                    } else {
                                        toast({ 
                                            title: "Erro", 
                                            description: "Componente de impressão não está pronto. Tente novamente.", 
                                            variant: "destructive" 
                                        });
                                    }
                                }}
                            >
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir Comprovante
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Componente oculto para impressão */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <ComprovanteCaixaDetalhado 
                    ref={comprovanteRef} 
                    caixa={caixaSelecionado} 
                    nomeEmpresa={empresaSettings.nomeFantasia} 
                    logoUrl={logoUrl} 
                />
            </div>
        </div>
    );
};

export default HistoricoCaixaPage;