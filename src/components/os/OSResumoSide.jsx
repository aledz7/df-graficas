import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, Printer, Save, CheckCircle, FileText, RotateCcw, CalendarDays, Sparkles, Percent, Tag, BadgeAlert, AlertTriangle } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiDataManager } from '@/lib/apiDataManager';
import SenhaMasterModal from '@/components/SenhaMasterModal';

const safeParseFloat = (value, defaultValue = 0) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return defaultValue;
  }
  const strValue = String(value).replace(',', '.');
  const num = parseFloat(strValue);
  return isNaN(num) ? defaultValue : num;
};

const OSResumoSide = ({ 
    ordemServico, 
    setOrdemServico, 
    totaisOS, 
    maquinas: maquinasProp,
    acabamentosConfig,
    itemAtual,
    onItemChange,
    isOSFinalizada, 
    onSalvarOrcamento, 
    onFinalizarOS, 
    onAtualizarOSFinalizada,
    onGerarPdf, 
    onImprimir, 
    onNovaOS,
    onUploadArteFinal,
    isSaving, 
    clienteSelecionado,
    checkEstoqueAcabamento, 
    produtosCadastrados,
    viewOnly,
}) => {
    const { toast } = useToast();
    const [maquinas, setMaquinas] = useState([]);
    const [descontoTerceirizadoPercent, setDescontoTerceirizadoPercent] = useState(ordemServico.desconto_terceirizado_percentual || '0');
    const [descontoGeralTipo, setDescontoGeralTipo] = useState(ordemServico.desconto_geral_tipo || 'reais');
    const [descontoGeralValor, setDescontoGeralValor] = useState(ordemServico.desconto_geral_valor || '0');
    const [freteValor, setFreteValor] = useState(ordemServico.frete_valor || '0');
    const [isSenhaModalOpen, setIsSenhaModalOpen] = useState(false);
    const [senhaAction, setSenhaAction] = useState(null); // 'save' | 'updateFinal'

    // Usar as máquinas passadas via props
    useEffect(() => {
        setMaquinas(Array.isArray(maquinasProp) ? maquinasProp : []);
    }, [maquinasProp]);

    useEffect(() => {
        if (clienteSelecionado?.classificacao_cliente === 'Terceirizado' && clienteSelecionado?.desconto_fixo_os_terceirizado) {
            const descPercent = safeParseFloat(clienteSelecionado.desconto_fixo_os_terceirizado, 0);
            setDescontoTerceirizadoPercent(String(descPercent));
            setOrdemServico(prev => ({ ...prev, desconto_terceirizado_percentual: String(descPercent) }));
        } else if (clienteSelecionado?.classificacao_cliente !== 'Terceirizado') {
            setDescontoTerceirizadoPercent('0');
            setOrdemServico(prev => ({ ...prev, desconto_terceirizado_percentual: '0' }));
        } else {
             setDescontoTerceirizadoPercent(String(safeParseFloat(ordemServico.desconto_terceirizado_percentual, 0)));
        }
    }, [clienteSelecionado, setOrdemServico, ordemServico.desconto_terceirizado_percentual]);

    useEffect(() => {
        setDescontoGeralTipo(ordemServico.desconto_geral_tipo || 'percentual');
        setDescontoGeralValor(String(safeParseFloat(ordemServico.desconto_geral_valor, 0)));
    }, [ordemServico.desconto_geral_tipo, ordemServico.desconto_geral_valor]);

    useEffect(() => {
        setFreteValor(String(safeParseFloat(ordemServico.frete_valor, 0)));
    }, [ordemServico.frete_valor]);

    // Atualizar a ordem de serviço quando o tipo de desconto mudar
    useEffect(() => {
        setOrdemServico(prev => ({
            ...prev,
            desconto_geral_tipo: descontoGeralTipo,
            desconto_geral_valor: descontoGeralValor
        }));
    }, [descontoGeralTipo, descontoGeralValor, setOrdemServico]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setOrdemServico(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (date) => {
        setOrdemServico(prev => ({
            ...prev,
            data_previsao_entrega: date ? date.toISOString() : null
        }));
    };

    const handleDateTimeChange = (e) => {
        const { value } = e.target;
        if (value) {
            // Criar data sem conversão de fuso horário
            // O valor vem no formato: YYYY-MM-DDTHH:MM
            const [datePart, timePart] = value.split('T');
            const [year, month, day] = datePart.split('-');
            const [hours, minutes] = timePart.split(':');
            
            // Criar string de data/hora no formato YYYY-MM-DD HH:MM:SS
            const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:00`;

            setOrdemServico(prev => ({
                ...prev,
                data_previsao_entrega: dateTimeString
            }));
        } else {
            setOrdemServico(prev => ({
                ...prev,
                data_previsao_entrega: null
            }));
        }
    };

    const handleMaquinaChange = (value) => {
        setOrdemServico(prev => ({ ...prev, maquina_impressao_id: value }));
    };

    const handleAcabamentoChange = (acabamentoId, checked) => {
        if (!itemAtual) {
            toast({
                title: "Ação Inválida",
                description: "Selecione um item para aplicar acabamentos.",
                variant: "warning"
            });
            return;
        }
        
        if (!Array.isArray(acabamentosConfig)) {
            toast({ title: "Erro", description: "Configuração de acabamentos não disponível.", variant: "destructive" });
            return;
        }
        
        const acabamentoInfo = acabamentosConfig.find(a => a.id === acabamentoId);
        if (!acabamentoInfo) {
            toast({ title: "Erro", description: "Configuração do acabamento não encontrada.", variant: "destructive" });
            return;
        }

        if (checked && !checkEstoqueAcabamento(acabamentoId, itemAtual)) {
            return; 
        }

        const acabamentosAtuais = Array.isArray(itemAtual.acabamentos_selecionados) ? itemAtual.acabamentos_selecionados : [];
        let novosAcabamentos;

        if (checked) {
            novosAcabamentos = [...acabamentosAtuais, { 
                id: acabamentoId, 
                nome: acabamentoInfo.nome_acabamento, 
                valor_m2: safeParseFloat(acabamentoInfo.valor_m2, 0),
                valor_un: safeParseFloat(acabamentoInfo.valor_un, 0),
                tipo_aplicacao: acabamentoInfo.tipo_aplicacao,
            }];
        } else {
            novosAcabamentos = acabamentosAtuais.filter(acab => acab.id !== acabamentoId);
        }
        
        onItemChange('acabamentos_selecionados', novosAcabamentos);
    };

    const handleDescontoTerceirizadoChange = (value) => {
        const percent = safeParseFloat(value, 0);
        if (percent < 0 || percent > 100) {
            toast({ title: "Desconto Inválido", description: "O percentual deve ser entre 0 e 100.", variant: "destructive" });
            return;
        }
        setDescontoTerceirizadoPercent(String(percent));
        setOrdemServico(prev => ({ ...prev, desconto_terceirizado_percentual: String(percent) }));
    };

    const handleDescontoGeralValorChange = (value) => {
        const val = safeParseFloat(value, 0);
        if (descontoGeralTipo === 'percentual' && (val < 0 || val > 100)) {
            toast({ title: "Desconto Inválido", description: "Percentual de desconto deve ser entre 0 e 100.", variant: "destructive" });
            setDescontoGeralValor('0');
            return;
        }
        if (descontoGeralTipo === 'reais' && val < 0) {
            toast({ title: "Desconto Inválido", description: "Valor do desconto não pode ser negativo.", variant: "destructive" });
            setDescontoGeralValor('0');
            return;
        }
        setDescontoGeralValor(String(val));
        // Atualizar a ordem de serviço imediatamente para garantir que o cálculo seja atualizado
        setOrdemServico(prev => ({ 
            ...prev, 
            desconto_geral_valor: String(val),
            desconto_geral_tipo: descontoGeralTipo
        }));
    };

    const handleFreteValorChange = (value) => {
        const val = safeParseFloat(value, 0);
        if (val < 0) {
            toast({ title: "Valor Inválido", description: "O valor do frete não pode ser negativo.", variant: "destructive" });
            setFreteValor('0');
            return;
        }
        setFreteValor(String(val));
        setOrdemServico(prev => ({ ...prev, frete_valor: String(val) }));
    };
    
    // Obter os totais calculados chamando a função
    const totaisCalculados = totaisOS();
    
    // Usar os valores calculados pela função totaisOS para garantir consistência
    const descontoTerceirizadoValorCalculado = totaisCalculados.descontoTerceirizado || 0;
    const descontoGeralValorCalculado = totaisCalculados.descontoGeral || 0;
    const freteValorCalculado = totaisCalculados.frete || 0;
    const totalFinalCalculado = totaisCalculados.totalGeral || 0;

    const subtotalServicosM2Display = (totaisCalculados && typeof totaisCalculados.subtotalServicosM2 === 'number') ? totaisCalculados.subtotalServicosM2.toFixed(2) : '0.00';
    const subtotalProdutosUnidadeDisplay = (totaisCalculados && typeof totaisCalculados.subtotalProdutosUnidade === 'number') ? totaisCalculados.subtotalProdutosUnidade.toFixed(2) : '0.00';
    const totalAcabamentosDisplay = (totaisCalculados && typeof totaisCalculados.totalAcabamentos === 'number') ? totaisCalculados.totalAcabamentos.toFixed(2) : '0.00';
    const totalGeralSemDescontoDisplay = (totaisCalculados && typeof totaisCalculados.subtotalGeral === 'number') ? totaisCalculados.subtotalGeral.toFixed(2) : '0.00';
    const totalFinalDisplay = totalFinalCalculado.toFixed(2);
    const itemAcabamentosSelecionados = itemAtual && Array.isArray(itemAtual.acabamentos_selecionados) ? itemAtual.acabamentos_selecionados : [];

    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const isEditMode = searchParams.get('edit') === 'true';
    const isStatusFinalizada = ['Finalizada', 'Entregue'].includes(ordemServico?.status_os);

    // Saldo pendente para OS finalizada com pagamento parcial
    const pagamentosOS = ordemServico?.pagamentos && Array.isArray(ordemServico.pagamentos) ? ordemServico.pagamentos : [];
    const totalPagoOS = pagamentosOS.reduce((acc, p) => acc + (parseFloat(p.valorFinal ?? p.valor) || 0), 0);
    const faltandoPagar = Math.max(0, totalFinalCalculado - totalPagoOS);
    const temSaldoPendente = isStatusFinalizada && faltandoPagar > 0.01;

    // Validação de campos obrigatórios
    const validarCamposObrigatorios = () => {
        const camposFaltantes = [];
        
        if (!ordemServico.data_previsao_entrega) {
            camposFaltantes.push('Previsão de Entrega');
        }
        
        if (!ordemServico.maquina_impressao_id) {
            camposFaltantes.push('Máquina de Impressão');
        }
        
        if (camposFaltantes.length > 0) {
            toast({
                title: "Campos Obrigatórios",
                description: `Por favor, preencha os seguintes campos: ${camposFaltantes.join(', ')}.`,
                variant: "destructive"
            });
            return false;
        }
        
        return true;
    };

    const handleSalvarComValidacao = () => {
        if (validarCamposObrigatorios()) {
            onSalvarOrcamento();
        }
    };

    const handleFinalizarComValidacao = () => {
        if (validarCamposObrigatorios()) {
            onFinalizarOS();
        }
    };

    const handleAtualizarComValidacao = () => {
        if (validarCamposObrigatorios()) {
            setSenhaAction('updateFinal');
            setIsSenhaModalOpen(true);
        }
    };

    return (
        <ScrollArea className="w-full md:w-96 bg-card border-l p-4 md:p-6 space-y-6">
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center"><DollarSign size={20} className="mr-2 text-primary"/>Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal Serviços (m²):</span> <span className="font-medium">R$ {subtotalServicosM2Display}</span></div>
                    <div className="flex justify-between"><span>Subtotal Produtos (Un):</span> <span className="font-medium">R$ {subtotalProdutosUnidadeDisplay}</span></div>
                    <div className="flex justify-between"><span>Total Acabamentos:</span> <span className="font-medium">R$ {totalAcabamentosDisplay}</span></div>
                    <div className="flex justify-between"><span>Total OS (sem desc.):</span> <span className="font-medium">R$ {totalGeralSemDescontoDisplay}</span></div>

                    {clienteSelecionado?.classificacao_cliente === 'Terceirizado' && (
                        <>
                            <div className="flex justify-between items-center pt-2 border-t">
                                <Label htmlFor="descontoTerceirizado" className="flex items-center text-orange-600 dark:text-orange-400">
                                    <BadgeAlert size={14} className="mr-1"/>Desconto Terceirizado (%):
                                </Label>
                                <Input 
                                    id="descontoTerceirizado"
                                    type="number"
                                    value={descontoTerceirizadoPercent}
                                    onChange={(e) => handleDescontoTerceirizadoChange(e.target.value)}
                                    className="h-8 w-20 text-right border-orange-500 focus:ring-orange-500"
                                    placeholder="0"
                                    min="0" max="100"
                                    disabled={isOSFinalizada || isSaving || viewOnly}
                                />
                            </div>
                            {descontoTerceirizadoValorCalculado > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Valor Desconto Terceirizado:</span>
                                    <span>- R$ {descontoTerceirizadoValorCalculado.toFixed(2)}</span>
                                </div>
                            )}
                        </>
                    )}

                    <div className="pt-2 border-t">
                        <Label className="flex items-center mb-1"><Tag size={14} className="mr-1 text-blue-500"/>Frete:</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={freteValor}
                                onChange={(e) => handleFreteValorChange(e.target.value)}
                                className="h-8 flex-1 text-right"
                                placeholder="0"
                                min="0"
                                disabled={isOSFinalizada || isSaving || viewOnly}
                            />
                        </div>
                                                  {freteValorCalculado > 0 && (
                             <div className="flex justify-between text-green-600 mt-1">
                                 <span>Valor Frete:</span>
                                 <span>+ R$ {freteValorCalculado.toFixed(2)}</span>
                             </div>
                         )}
                    </div>

                    <div className="pt-2 border-t">
                        <Label className="flex items-center mb-1"><Tag size={14} className="mr-1 text-blue-500"/>Desconto Geral na OS:</Label>
                        <div className="flex items-center gap-2">
                            <Select value={descontoGeralTipo} onValueChange={setDescontoGeralTipo} disabled={isOSFinalizada || isSaving || viewOnly}>
                                <SelectTrigger className="h-8 w-[100px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentual" className="text-xs">%</SelectItem>
                                    <SelectItem value="reais" className="text-xs">R$</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="number"
                                value={descontoGeralValor}
                                onChange={(e) => handleDescontoGeralValorChange(e.target.value)}
                                className="h-8 flex-1 text-right"
                                placeholder="0"
                                min="0"
                                max={descontoGeralTipo === 'percentual' ? "100" : undefined}
                                step={descontoGeralTipo === 'percentual' ? "0.1" : "0.01"}
                                disabled={isOSFinalizada || isSaving || viewOnly}
                            />
                        </div>
                         {descontoGeralValorCalculado > 0 && (
                            <div className="flex justify-between text-red-500 mt-1">
                                <span>Valor Desconto Geral:</span>
                                <span>- R$ {descontoGeralValorCalculado.toFixed(2)}</span>
                            </div>
                        )}
                    </div>


                    <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>TOTAL FINAL:</span> <span className="text-primary">R$ {totalFinalDisplay}</span></div>
                </CardContent>
            </Card>

            {itemAtual && (
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center"><Sparkles size={18} className="mr-2 text-yellow-500"/>Acabamentos para Item Atual</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Array.isArray(acabamentosConfig) && acabamentosConfig.filter(acab => acab.ativo).length > 0 ? acabamentosConfig.filter(acab => acab.ativo).map((acabDisp) => {
                      // Buscar produto vinculado apenas se o acabamento tiver produto_vinculado_id configurado
                      const temProdutoVinculado = acabDisp.produto_vinculado_id != null && acabDisp.produto_vinculado_id !== undefined && acabDisp.produto_vinculado_id !== '';
                      const produtosCarregados = Array.isArray(produtosCadastrados) && produtosCadastrados.length > 0;
                      const produtoVinculado = temProdutoVinculado && produtosCarregados ? produtosCadastrados.find(p => String(p.id) === String(acabDisp.produto_vinculado_id)) : null;
                      // Só considerar produto não encontrado se:
                      // - O acabamento TEM produto vinculado configurado
                      // - E produtos foram carregados (não está vazio)
                      // - E produto não foi encontrado na lista
                      // Se produtos ainda não foram carregados, não bloquear (pode estar carregando)
                      const produtoVinculadoNaoEncontrado = temProdutoVinculado && produtosCarregados && !produtoVinculado;
                      const controlarEstoque = produtoVinculado ? (produtoVinculado.controlar_estoque !== false) : true;
                      const estoqueVinculado = produtoVinculado ? safeParseFloat((produtoVinculado.estoque_atual ?? produtoVinculado.estoque) || 0) : Infinity;
                      const semEstoque = produtoVinculado && controlarEstoque && estoqueVinculado <= 0;
                      
                      let valorDisplay = '0.00';
                      let unidadeDisplay = '';
                      if (acabDisp.tipo_aplicacao === 'area_total') {
                        valorDisplay = safeParseFloat(acabDisp.valor_m2 || 0).toFixed(2);
                        unidadeDisplay = '/m²';
                      } else if (acabDisp.tipo_aplicacao === 'metro_linear') {
                        valorDisplay = safeParseFloat(acabDisp.valor_m2 || acabDisp.valor_un || 0).toFixed(2);
                        unidadeDisplay = '/m linear';
                      } else if (acabDisp.tipo_aplicacao === 'unidade') {
                        valorDisplay = safeParseFloat(acabDisp.valor_un || 0).toFixed(2);
                        unidadeDisplay = '/un';
                      }

                      return (
                        <div key={acabDisp.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`acab-resumo-${acabDisp.id}`}
                            checked={itemAcabamentosSelecionados.some(a => a.id === acabDisp.id)}
                            onCheckedChange={(checked) => {
                              handleAcabamentoChange(acabDisp.id, checked);
                            }}
                             disabled={isOSFinalizada || !itemAtual || produtoVinculadoNaoEncontrado || isSaving || viewOnly}
                          />
                          <Label 
                            htmlFor={`acab-resumo-${acabDisp.id}`} 
                            className={`font-normal text-sm px-2 py-1 rounded ${(semEstoque || produtoVinculadoNaoEncontrado) ? 'text-destructive line-through' : ''}`}
                            style={{ 
                              backgroundColor: acabDisp.cor_fundo || '#ffffff',
                              color: acabDisp.cor_fundo && acabDisp.cor_fundo !== '#ffffff' ? '#ffffff' : '#000000'
                            }}
                          >
                            {acabDisp.nome_acabamento} – R$ {valorDisplay}{unidadeDisplay}
                            {semEstoque && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertTriangle size={14} className="inline ml-1 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Produto vinculado ({produtoVinculado?.nome}) sem estoque!</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {produtoVinculadoNaoEncontrado && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <AlertTriangle size={14} className="inline ml-1 text-orange-500" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Produto vinculado não encontrado! Verifique a configuração do acabamento.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                          </Label>
                        </div>
                      );
                    }) : <p className="text-sm text-muted-foreground">Nenhum acabamento ativo configurado.</p>}
                    {itemAtual.subtotal_acabamentos > 0 && (
                        <p className="text-sm font-semibold mt-2 text-right">
                            Total Acabamentos do Item: R$ {(typeof itemAtual.subtotal_acabamentos === 'number' ? itemAtual.subtotal_acabamentos.toFixed(2) : '0.00')}
                        </p>
                    )}
                  </CardContent>
                </Card>
            )}

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-base">Detalhes da OS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label htmlFor="data_previsao_entrega" className="flex items-center">
                            Previsão de Entrega <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                            id="data_previsao_entrega"
                            type="datetime-local"
                            value={ordemServico.data_previsao_entrega ? (() => {
                                // Converter string YYYY-MM-DD HH:MM:SS para formato datetime-local
                                const dateTimeString = ordemServico.data_previsao_entrega;
                                if (dateTimeString.includes('T')) {
                                    // Já está em formato ISO
                                    return new Date(dateTimeString).toISOString().slice(0, 16);
                                } else {
                                    // Está em formato YYYY-MM-DD HH:MM:SS
                                    const [datePart, timePart] = dateTimeString.split(' ');
                                    const [hours, minutes] = timePart.split(':');
                                    return `${datePart}T${hours}:${minutes}`;
                                }
                            })() : ''}
                            onChange={handleDateTimeChange}
                            className={!ordemServico.data_previsao_entrega ? 'border-red-500' : ''}
                            disabled={isOSFinalizada || isSaving || viewOnly}
                            placeholder="dd/mm/aaaa --:--"
                        />
                    </div>
                    <div>
                        <Label htmlFor="maquina_impressao_id" className="flex items-center">
                            Máquina de Impressão <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Select value={ordemServico.maquina_impressao_id || ''} onValueChange={handleMaquinaChange} disabled={isOSFinalizada || isSaving || viewOnly}>
                            <SelectTrigger
                                id="maquina_impressao_id"
                                className={!ordemServico.maquina_impressao_id ? 'border-red-500' : ''}
                            >
                                <SelectValue placeholder="Selecione uma máquina" />
                            </SelectTrigger>
                            <SelectContent>
                                {maquinas.map(maq => <SelectItem key={maq.id} value={maq.id}>{maq.nome}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="observacoes_gerais_os" className="flex items-center">
                            Observações Gerais da OS 
                        </Label>
                        <Textarea 
                            id="observacoes_gerais_os" 
                            name="observacoes_gerais_os" 
                            value={ordemServico.observacoes_gerais_os || ''} 
                            onChange={handleInputChange} 
                            placeholder="Detalhes importantes para a produção ou cliente..." 
                            disabled={isOSFinalizada || isSaving || viewOnly}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-base">Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {isEditMode && isStatusFinalizada ? (
                      <>
                        {temSaldoPendente && (
                          <Button onClick={onFinalizarOS} className="w-full bg-green-600 hover:bg-green-700" disabled={isSaving || viewOnly}>
                            <DollarSign className="mr-2 h-4 w-4"/>{isSaving ? 'Abrindo...' : `Pagar restante (R$ ${faltandoPagar.toFixed(2)})`}
                          </Button>
                        )}
                        <Button onClick={handleAtualizarComValidacao} variant="outline" className="w-full" disabled={isSaving || viewOnly}>
                          <Save className="mr-2 h-4 w-4"/>{isSaving ? 'Atualizando...' : 'Atualizar Orçamento Finalizado'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={handleSalvarComValidacao} variant="outline" className="w-full" disabled={isOSFinalizada || isSaving || viewOnly}>
                          <Save className="mr-2 h-4 w-4"/>{isSaving ? 'Salvando...' : 'Salvar Orçamento'}
                        </Button>
                        <Button onClick={handleFinalizarComValidacao} className="w-full bg-green-600 hover:bg-green-700" disabled={isOSFinalizada || isSaving || viewOnly || (Array.isArray(ordemServico.itens) ? ordemServico.itens : []).length === 0 || (!clienteSelecionado && !ordemServico.cliente_nome_manual)}>
                          <CheckCircle className="mr-2 h-4 w-4"/>{isSaving ? 'Finalizando...' : 'Finalizar e Pagar'}
                        </Button>
                      </>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={onGerarPdf} variant="outline" className="w-full" disabled={isSaving}><FileText className="mr-2 h-4 w-4"/>Gerar PDF</Button>
                        <Button onClick={onImprimir} variant="outline" className="w-full" disabled={isSaving}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
                    </div>
                    <Button onClick={onNovaOS} variant="destructive" className="w-full" disabled={isSaving || viewOnly}><RotateCcw className="mr-2 h-4 w-4"/>Nova OS / Limpar</Button>
                </CardContent>
            </Card>

            {/* Modal de Senha Master para salvar/atualizar */}
            {isSenhaModalOpen && (
              <SenhaMasterModal
                isOpen={isSenhaModalOpen}
                onClose={() => setIsSenhaModalOpen(false)}
                onSuccess={() => {
                  setIsSenhaModalOpen(false);
                  // Só usamos para atualizar OS finalizada
                  onAtualizarOSFinalizada && onAtualizarOSFinalizada();
                  setSenhaAction(null);
                }}
                title="Senha Master"
                description="Informe a senha master para confirmar a atualização da OS finalizada."
              />
            )}
        </ScrollArea>
    );
};

export default OSResumoSide;