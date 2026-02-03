import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { History, Trash2, Loader, RotateCcw, FileText, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { calculoSavadoService } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

const CalculadoraHistoricoPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [calculosSalvos, setCalculosSalvos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [calculoParaAcao, setCalculoParaAcao] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [calculoDetalhado, setCalculoDetalhado] = useState(null);

    const loadCalculos = async () => {
        setIsLoading(true);
        try {
            
            // Usar a nova API de cálculos salvos
            const response = await calculoSavadoService.getAll();   
            
            if (response.data && response.data.success) {
                const calculosArray = response.data.data || [];
                
                // Ordenar por data de criação (mais recente primeiro)
                const calculosOrdenados = calculosArray.sort((a, b) => {
                    const dataA = new Date(a.data_criacao || a.created_at);
                    const dataB = new Date(b.data_criacao || b.created_at);
                    return dataB - dataA;
                });
                
                setCalculosSalvos(calculosOrdenados);
            } else {
                setCalculosSalvos([]);
            }
        } catch (error) {
            console.error('Erro detalhado ao carregar cálculos salvos:', error);
            console.error('Mensagem do erro:', error.message);
            console.error('Resposta do erro:', error.response?.data);
            console.error('Status do erro:', error.response?.status);
            
            toast({ 
                title: 'Erro ao carregar', 
                description: `Não foi possível carregar os cálculos salvos: ${error.message}`, 
                variant: 'destructive' 
            });
            setCalculosSalvos([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCalculos();
    }, []);

    const handleDeleteConfirm = async () => {
        if (!calculoParaAcao) return;
        try {
            // Excluir via API
            await calculoSavadoService.delete(calculoParaAcao.id);
            
            // Atualizar estado local
            const novosCalculos = calculosSalvos.filter(c => c.id !== calculoParaAcao.id);
            setCalculosSalvos(novosCalculos);
            
            toast({ title: 'Cálculo Excluído', description: `O cálculo "${calculoParaAcao.nome}" foi removido.`, variant: 'destructive'});
        } catch (error) {
            console.error('Erro ao excluir cálculo:', error);
            toast({ 
                title: 'Erro ao excluir', 
                description: 'Não foi possível excluir o cálculo. Tente novamente.', 
                variant: 'destructive' 
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setCalculoParaAcao(null);
        }
    };
    
    const handleLoadCalculo = (calculo) => {

        setCalculoDetalhado(calculo);
        setIsDetailDialogOpen(true);
    }
    
    const handleContinuarEdicao = () => {
        if (calculoDetalhado) {
            // Preparar os dados no formato esperado pela calculadora
            const dadosParaCarregar = {
                id: calculoDetalhado.id,
                nome: calculoDetalhado.nome,
                config: calculoDetalhado.dados_calculo?.config || {},
                cliente: calculoDetalhado.dados_calculo?.cliente || {},
                dados_calculo: calculoDetalhado.dados_calculo || {}
            };
            navigate('/ferramentas/calculadora-metricas', { state: { calculoParaCarregar: dadosParaCarregar } });
        }
    }
    
    const handleGerarOrdemServico = () => {
        if (calculoDetalhado) {
            const dadosParaTransferir = {
                dadosCalculo: calculoDetalhado,
                cliente: calculoDetalhado.dados_calculo?.cliente || {},
                valorTotal: calculoDetalhado.resultado || 0,
                valorMaterial: calculoDetalhado.dados_calculo?.resultado?.valorMaterial || 0,
                valorServicos: calculoDetalhado.dados_calculo?.resultado?.valorServicos || 0,
                descricao: `Orçamento: ${calculoDetalhado.nome} - Material: ${calculoDetalhado.dados_calculo?.config?.material?.nome || 'Não especificado'}`,
                fromCalculadora: true,
                // Enviar explicitamente os itens/produtos e serviços adicionais da nova estrutura
                itens: calculoDetalhado.dados_calculo?.itens || [],
                produtos: calculoDetalhado.dados_calculo?.produtos || [],
                servicosAdicionais: calculoDetalhado.dados_calculo?.servicos_adicionais || []
            };
            
            // Fechar o modal antes de navegar
            setIsDetailDialogOpen(false);
            setCalculoDetalhado(null);
            
            navigate('/operacional/ordens-servico', { state: dadosParaTransferir });
            toast({ title: "Dados transferidos", description: "Os dados foram transferidos para a nova Ordem de Serviço." });
        }
    }

    if(isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader className="animate-spin" /></div>
    }

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <History size={28} className="text-primary"/>
                            <div>
                                <CardTitle className="text-2xl">Histórico de Orçamentos da Calculadora</CardTitle>
                                <CardDescription>Visualize, carregue ou exclua orçamentos salvos.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            {calculosSalvos.length > 0 ? (
                                <div className="space-y-3">
                                    {calculosSalvos.map(calc => (
                                        <Card key={calc.id} className="hover:bg-muted/50 transition-colors">
                                            <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div className="flex-1">
                                                    <p className="font-bold text-lg">{calc.nome}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Salvo em: {format(new Date(calc.data_criacao || calc.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                                    </p>
                                                    
                                                    {calc.dados_calculo?.cliente && (calc.dados_calculo.cliente.nome || calc.dados_calculo.cliente.telefone || calc.dados_calculo.cliente.email) && (
                                                        <div className="mt-1 text-sm border-l-2 border-primary pl-2">
                                                            {calc.dados_calculo.cliente.nome && <p><span className="font-medium">Cliente:</span> {calc.dados_calculo.cliente.nome}</p>}
                                                            {calc.dados_calculo.cliente.telefone && <p><span className="font-medium">Tel:</span> {calc.dados_calculo.cliente.telefone}</p>}
                                                            {calc.dados_calculo.cliente.email && <p><span className="font-medium">Email:</span> {calc.dados_calculo.cliente.email}</p>}
                                                        </div>
                                                    )}
                                                    
                                                    <p className="font-semibold text-primary text-xl mt-2">
                                                        R$ {Number(calc.resultado || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleLoadCalculo(calc)}>
                                                        <RotateCcw size={14} className="mr-2"/> Carregar
                                                    </Button>
                                                    <Button variant="destructive" size="icon" onClick={() => { setCalculoParaAcao(calc); setIsDeleteDialogOpen(true); }}>
                                                        <Trash2 size={16}/>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-muted-foreground">Nenhum orçamento salvo encontrado.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
            
            {/* Dialog de detalhes do orçamento */}
            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-4 sm:p-6">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="text-lg sm:text-xl flex items-center">
                            <FileText className="mr-2" /> Detalhes do Orçamento
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Visualize todos os detalhes do orçamento ou gere uma ordem de serviço.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {calculoDetalhado && (
                        <div className="flex-1 min-h-0">
                            <ScrollArea className="h-[50vh] sm:h-[400px]">
                                <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4 pb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <Card>
                                    <CardHeader className="pb-2 p-3 sm:p-4">
                                        <CardTitle className="text-base sm:text-lg">Informações Gerais</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Nome do Orçamento</Label>
                                            <p className="text-sm sm:text-base break-words">{calculoDetalhado.nome}</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Data de Criação</Label>
                                            <p>{format(new Date(calculoDetalhado.data_criacao || calculoDetalhado.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Valor Total</Label>
                                            <p className="text-lg sm:text-xl font-bold text-primary">R$ {Number(calculoDetalhado.resultado || 0).toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader className="pb-2 p-3 sm:p-4">
                                        <CardTitle className="text-base sm:text-lg">Dados do Cliente</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                                        {calculoDetalhado.dados_calculo?.cliente ? (
                                            <>
                                                <div>
                                                    <Label className="font-medium text-xs sm:text-sm">Nome</Label>
                                                    <p className="text-sm sm:text-base break-words">{calculoDetalhado.dados_calculo.cliente.nome || 'Não informado'}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-medium text-xs sm:text-sm">Telefone</Label>
                                                    <p className="text-sm sm:text-base">{calculoDetalhado.dados_calculo.cliente.telefone || 'Não informado'}</p>
                                                </div>
                                                <div>
                                                    <Label className="font-medium text-xs sm:text-sm">E-mail</Label>
                                                    <p className="text-sm sm:text-base break-all">{calculoDetalhado.dados_calculo.cliente.email || 'Não informado'}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground">Nenhum dado de cliente informado.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                <Card>
                                    <CardHeader className="pb-2 p-3 sm:p-4">
                                        <CardTitle className="text-base sm:text-lg">Configurações</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Tamanho do Arquivo</Label>
                                            <p className="text-sm sm:text-base">{calculoDetalhado.dados_calculo?.config?.tamanhoArquivoCm?.altura || '0'} x {calculoDetalhado.dados_calculo?.config?.tamanhoArquivoCm?.largura || '0'} cm</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Área de Impressão</Label>
                                            <p className="text-sm sm:text-base">{calculoDetalhado.dados_calculo?.config?.areaImpressaoM?.altura || '0'} x {calculoDetalhado.dados_calculo?.config?.areaImpressaoM?.largura || '0'} m</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Material</Label>
                                            <p className="text-sm sm:text-base break-words">{calculoDetalhado.dados_calculo?.config?.material?.nome || 'Não especificado'}</p>
                                            {calculoDetalhado.dados_calculo?.config?.material && (
                                                <p className="text-sm text-muted-foreground">
                                                    R$ {calculoDetalhado.dados_calculo.config.material.preco_venda} / {calculoDetalhado.dados_calculo.config.material.unidade_medida}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader className="pb-2 p-3 sm:p-4">
                                        <CardTitle className="text-base sm:text-lg">Detalhes do Cálculo</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 p-3 sm:p-4 pt-0">
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Quantidade de Adesivos</Label>
                                            <p className="text-sm sm:text-base font-semibold">{calculoDetalhado.dados_calculo?.resultado?.quantidade || 0}</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Valor do Material</Label>
                                            <p className="text-sm sm:text-base font-semibold">R$ {Number(calculoDetalhado.dados_calculo?.resultado?.valorMaterial || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Valor dos Serviços</Label>
                                            <p className="text-sm sm:text-base font-semibold">R$ {Number(calculoDetalhado.dados_calculo?.resultado?.valorServicos || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <Label className="font-medium text-xs sm:text-sm">Valor por Unidade</Label>
                                            <p className="text-sm sm:text-base font-semibold">R$ {Number(calculoDetalhado.dados_calculo?.resultado?.valorUnidade || 0).toFixed(2)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            {calculoDetalhado.dados_calculo?.servicos_adicionais?.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-2 p-3 sm:p-4">
                                        <CardTitle className="text-base sm:text-lg">Serviços Adicionais</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-4 pt-0">
                                        <div className="space-y-1">
                                            {calculoDetalhado.dados_calculo.servicos_adicionais.map((servico, index) => (
                                                <div key={index} className="flex justify-between gap-2 text-sm">
                                                    <span className="break-words">{servico.nome || servico.nome_servico || 'Serviço sem nome'}</span>
                                                    <span className="whitespace-nowrap font-medium">R$ {Number(servico.preco || servico.valor || servico.valor_m2 || 0).toFixed(2)}/m²</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                        </ScrollArea>
                        </div>
                    )}
                    
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 flex-shrink-0 mt-4 pt-4 border-t">
                        <DialogClose asChild>
                            <Button variant="ghost" className="w-full sm:w-auto order-last sm:order-first">Fechar</Button>
                        </DialogClose>
                        <Button 
                            variant="outline" 
                            className="w-full sm:w-auto" 
                            onClick={handleContinuarEdicao}
                        >
                            <RotateCcw size={16} className="mr-2"/> Continuar Edição
                        </Button>
                        <Button 
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700" 
                            onClick={handleGerarOrdemServico}
                        >
                            <ClipboardList size={16} className="mr-2"/> Gerar Ordem de Serviço
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o orçamento "{calculoParaAcao?.nome}"?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default CalculadoraHistoricoPage;