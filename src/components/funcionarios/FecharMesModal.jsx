import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Calendar, AlertTriangle, Loader2, Info, RotateCcw, Settings, History, Clock, User } from 'lucide-react';
import { funcionarioService } from '@/services/funcionarioService';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const FecharMesModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
    const [activeTab, setActiveTab] = useState('fechar');
    const [dia, setDia] = useState('');
    const [mes, setMes] = useState('');
    const [ano, setAno] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [mesFechadoInfo, setMesFechadoInfo] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [reabrindo, setReabrindo] = useState(false);
    
    // Configuração de fechamento automático
    const [configuracao, setConfiguracao] = useState(null);
    const [diaFechamento, setDiaFechamento] = useState(25);
    const [fechamentoAtivo, setFechamentoAtivo] = useState(false);
    const [salvandoConfig, setSalvandoConfig] = useState(false);
    
    // Histórico de fechamentos
    const [historico, setHistorico] = useState([]);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);
    const [executandoAutomatico, setExecutandoAutomatico] = useState(false);
    

    // Definir valores padrão para o mês atual
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            setDia(String(now.getDate()).padStart(2, '0'));
            setMes(String(now.getMonth() + 1).padStart(2, '0'));
            setAno(String(now.getFullYear()));
            setObservacoes('');
            setMesFechadoInfo(null);
            
            // Carregar configuração e histórico
            carregarConfiguracao();
            carregarHistorico();
        }
    }, [isOpen]);

    // Verificar se o mês já foi fechado quando mudar mes ou ano
    useEffect(() => {
        const verificarMes = async () => {
            if (!mes || !ano || mes < 1 || mes > 12) return;
            
            setVerificando(true);
            try {
                const response = await funcionarioService.verificarMesFechado(parseInt(mes), parseInt(ano));
                if (response.data?.fechado) {
                    setMesFechadoInfo(response.data);
                } else {
                    setMesFechadoInfo(null);
                }
            } catch (error) {
                console.error('Erro ao verificar mês:', error);
            } finally {
                setVerificando(false);
            }
        };

        if (isOpen && mes && ano && activeTab === 'fechar') {
            verificarMes();
        }
    }, [mes, ano, isOpen, activeTab]);

    const carregarConfiguracao = async () => {
        try {
            const response = await funcionarioService.getConfiguracaoFechamentoMes();
            if (response.data) {
                setConfiguracao(response.data);
                setDiaFechamento(response.data.dia_fechamento || 25);
                setFechamentoAtivo(response.data.ativo || false);
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
        }
    };

    const carregarHistorico = async () => {
        setCarregandoHistorico(true);
        try {
            const response = await funcionarioService.getHistoricoFechamentosResumido();
            if (response.data) {
                setHistorico(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            setHistorico([]);
        } finally {
            setCarregandoHistorico(false);
        }
    };


    const salvarConfiguracao = async () => {
        setSalvandoConfig(true);
        try {
            await funcionarioService.updateConfiguracaoFechamentoMes({
                dia_fechamento: diaFechamento,
                ativo: fechamentoAtivo
            });
            
            toast({
                title: 'Configuração salva!',
                description: `Fechamento automático ${fechamentoAtivo ? 'ativado' : 'desativado'} para o dia ${diaFechamento} de cada mês.`,
                variant: 'default'
            });
            
            carregarConfiguracao();
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            toast({
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar a configuração. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setSalvandoConfig(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!dia || !mes || !ano) return;
        
        const anoInt = parseInt(ano);
        const observacoesValue = observacoes.trim() === '' ? null : observacoes;
        
        await onConfirm(parseInt(dia), parseInt(mes), anoInt, observacoesValue);
        
        // Recarregar histórico após fechamento
        carregarHistorico();
    };

    const handleReabrirMes = async () => {
        if (!mes || !ano) return;
        
        try {
            setReabrindo(true);
            const response = await funcionarioService.reabrirMes(parseInt(mes), parseInt(ano));
            
            toast({
                title: 'Mês reaberto com sucesso!',
                description: response.message || `${response.data?.holerites_reabertos || 0} holerites reabertos.`,
                variant: 'default'
            });
            
            const verificarResponse = await funcionarioService.verificarMesFechado(parseInt(mes), parseInt(ano));
            setMesFechadoInfo(verificarResponse.data);
            
            // Recarregar histórico
            carregarHistorico();
            
        } catch (error) {
            console.error('Erro ao reabrir mês:', error);
            toast({
                title: 'Erro ao reabrir mês',
                description: error.response?.data?.message || 'Não foi possível reabrir o mês. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setReabrindo(false);
        }
    };

    const getMesNome = (mesNumero) => {
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return meses[mesNumero - 1] || '';
    };

    const getTipoBadge = (tipo) => {
        const tipos = {
            'fechamento': { color: 'bg-red-100 text-red-800', label: 'Fechamento' },
            'abertura': { color: 'bg-green-100 text-green-800', label: 'Abertura' },
            'reabertura': { color: 'bg-yellow-100 text-yellow-800', label: 'Reabertura' }
        };
        return tipos[tipo] || tipos['fechamento'];
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Gerenciar Fechamento de Mês
                    </DialogTitle>
                </DialogHeader>


                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="fechar">
                            <Calendar className="h-4 w-4 mr-2" />
                            Fechar Mês
                        </TabsTrigger>
                        <TabsTrigger value="configuracao">
                            <Settings className="h-4 w-4 mr-2" />
                            Configuração
                        </TabsTrigger>
                        <TabsTrigger value="historico">
                            <History className="h-4 w-4 mr-2" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>

                    {/* Aba de Fechar Mês */}
                    <TabsContent value="fechar" className="space-y-4">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <p className="font-medium">Atenção!</p>
                                    <p>Esta ação irá gerar holerites para todos os funcionários ativos e zerar os vales e faltas para o próximo mês.</p>
                                </div>
                            </div>

                            {mesFechadoInfo && (
                                <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                                    mesFechadoInfo.fechado 
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                        : mesFechadoInfo.nao_disponivel
                                        ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                }`}>
                                    <Info className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                        mesFechadoInfo.fechado 
                                            ? 'text-red-600 dark:text-red-400'
                                            : mesFechadoInfo.nao_disponivel
                                            ? 'text-gray-600 dark:text-gray-400'
                                            : 'text-green-600 dark:text-green-400'
                                    }`} />
                                    <div className={`text-sm ${
                                        mesFechadoInfo.fechado 
                                            ? 'text-red-800 dark:text-red-200'
                                            : mesFechadoInfo.nao_disponivel
                                            ? 'text-gray-800 dark:text-gray-200'
                                            : 'text-green-800 dark:text-green-200'
                                    }`}>
                                        <p className="font-medium">
                                            {mesFechadoInfo.fechado 
                                                ? 'Mês já fechado!' 
                                                : mesFechadoInfo.nao_disponivel
                                                ? 'Mês não disponível!'
                                                : 'Mês está aberto!'
                                            }
                                        </p>
                                        <p>{mesFechadoInfo.mensagem}</p>
                                        <div className="mt-2 space-y-1">
                                            {mesFechadoInfo.data_abertura && (
                                                <p>
                                                    <strong>Aberto em:</strong> {new Date(mesFechadoInfo.data_abertura).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            )}
                                            {mesFechadoInfo.fechado && mesFechadoInfo.data_fechamento && (
                                                <p>
                                                    <strong>Fechado em:</strong> {new Date(mesFechadoInfo.data_fechamento).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                    {mesFechadoInfo.usuario_fechamento && (
                                                        <> por <strong>{mesFechadoInfo.usuario_fechamento}</strong></>
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                        {mesFechadoInfo.fechado && (
                                            <p className="mt-2 text-xs">
                                                Use o botão "Reabrir Mês" para desfazer o fechamento.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="dia">Dia</Label>
                                    <Input
                                        id="dia"
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={dia}
                                        onChange={(e) => setDia(e.target.value)}
                                        placeholder="DD"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="mes">Mês</Label>
                                    <Input
                                        id="mes"
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={mes}
                                        onChange={(e) => setMes(e.target.value)}
                                        placeholder="MM"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="ano">Ano</Label>
                                    <Input
                                        id="ano"
                                        type="number"
                                        min="2020"
                                        max="2030"
                                        value={ano}
                                        onChange={(e) => setAno(e.target.value)}
                                        placeholder="AAAA"
                                        required
                                    />
                                </div>
                            </div>

                            {dia && mes && ano && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        <strong>Período selecionado:</strong> {getMesNome(parseInt(mes))} de {ano}
                                    </p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                        <strong>Data de fechamento:</strong> {dia.padStart(2, '0')}/{mes.padStart(2, '0')}/{ano}
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="observacoes">Observações (opcional)</Label>
                                <Textarea
                                    id="observacoes"
                                    value={observacoes}
                                    onChange={(e) => setObservacoes(e.target.value)}
                                    placeholder="Adicione observações sobre o fechamento do mês..."
                                    rows={3}
                                />
                            </div>

                            <DialogFooter className="flex gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading || reabrindo}>
                                    Cancelar
                                </Button>
                                
                                {mesFechadoInfo?.fechado === true && (
                                    <Button 
                                        type="button"
                                        variant="destructive"
                                        onClick={handleReabrirMes}
                                        disabled={isLoading || reabrindo || verificando}
                                    >
                                        {reabrindo ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Reabrindo...
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Reabrir Mês
                                            </>
                                        )}
                                    </Button>
                                )}
                                
                                <Button 
                                    type="submit" 
                                    disabled={isLoading || !dia || !mes || !ano || (mesFechadoInfo?.fechado === true) || (mesFechadoInfo?.nao_disponivel === true) || verificando || reabrindo}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Fechando...
                                        </>
                                    ) : (
                                        <>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            Fechar Mês
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </TabsContent>

                    {/* Aba de Configuração */}
                    <TabsContent value="configuracao" className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium">Fechamento Automático</p>
                                <p>Configure o dia do mês para fechamento automático. O sistema irá fechar automaticamente quando chegar na data configurada.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="dia-fechamento">Dia do Mês para Fechamento</Label>
                                <Input
                                    id="dia-fechamento"
                                    type="number"
                                    min="1"
                                    max="31"
                                    value={diaFechamento}
                                    onChange={(e) => setDiaFechamento(parseInt(e.target.value))}
                                    placeholder="Digite o dia (1-31)"
                                    className="mt-1"
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    O sistema fechará automaticamente todo dia {diaFechamento} de cada mês
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex-1">
                                    <Label htmlFor="fechamento-ativo" className="text-base font-medium">
                                        Ativar Fechamento Automático
                                    </Label>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Quando ativado, o mês será fechado automaticamente no dia configurado
                                    </p>
                                </div>
                                <Switch
                                    id="fechamento-ativo"
                                    checked={fechamentoAtivo}
                                    onCheckedChange={setFechamentoAtivo}
                                />
                            </div>

                            {fechamentoAtivo && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-green-600" />
                                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                            Fechamento automático ativo para o dia {diaFechamento}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            {/* <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                        Testar Fechamento Automático
                                    </p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        Execute o fechamento automático manualmente para testar se está funcionando
                                    </p>
                                </div>
                                <Button 
                                    onClick={async () => {
                                        setExecutandoAutomatico(true);
                                        try {
                                            await funcionarioService.executarFechamentoAutomatico();
                                            toast({
                                                title: 'Fechamento executado!',
                                                description: 'O fechamento automático foi executado. Verifique o histórico para detalhes.',
                                                variant: 'default'
                                            });
                                            carregarHistorico();
                                        } catch (error) {
                                            toast({
                                                title: 'Erro ao executar',
                                                description: error.response?.data?.message || 'Não foi possível executar o fechamento automático.',
                                                variant: 'destructive'
                                            });
                                        } finally {
                                            setExecutandoAutomatico(false);
                                        }
                                    }}
                                    disabled={executandoAutomatico}
                                    variant="outline"
                                    size="sm"
                                >
                                    {executandoAutomatico ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Executando...
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="mr-2 h-4 w-4" />
                                            Executar Agora
                                        </>
                                    )}
                                </Button>
                            </div> */}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button onClick={salvarConfiguracao} disabled={salvandoConfig}>
                                {salvandoConfig ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Salvar Configuração
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    {/* Aba de Histórico */}
                    <TabsContent value="historico" className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                            <History className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-purple-800 dark:text-purple-200">
                                <p className="font-medium">Histórico de Fechamentos e Aberturas</p>
                                <p>Veja quando cada mês foi fechado e aberto, e por qual usuário.</p>
                            </div>
                        </div>

                        <ScrollArea className="h-[400px] pr-4">
                            {carregandoHistorico ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="ml-2">Carregando histórico...</span>
                                </div>
                            ) : historico.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                    <p>Nenhum registro no histórico ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historico.map((item) => {
                                        const tipoBadge = getTipoBadge(item.tipo);
                                        return (
                                            <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={tipoBadge.color}>
                                                            {tipoBadge.label}
                                                        </Badge>
                                                        {item.automatico && (
                                                            <Badge variant="outline" className="text-xs">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                Automático
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold text-lg">
                                                            {getMesNome(item.mes)} de {item.ano}
                                                        </p>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                {tipoBadge.label === 'Fechamento' ? 'Fechado em:' : 
                                                                 tipoBadge.label === 'Abertura' ? 'Aberto em:' : 'Reaberto em:'}
                                                            </p>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {new Date(item.data_acao).toLocaleString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: '2-digit',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-1">Holerites:</p>
                                                            <p className="font-medium">{item.quantidade_holerites} afetado(s)</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 dark:text-gray-400 mb-1">Responsável:</p>
                                                            <div className="flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                <span className="font-medium">
                                                                    {item.usuario ? item.usuario.name : 'Sistema'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {item.observacoes && (
                                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                                {item.observacoes}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>

                        <DialogFooter>
                            <Button type="button" onClick={onClose}>
                                Fechar
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default FecharMesModal;
