import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileText, FileCheck, Receipt, Building2, User, Package, 
  Loader2, CheckCircle, XCircle, AlertTriangle, Download,
  ExternalLink, RefreshCw, Ban, ArrowLeft, ArrowRight, Send
} from 'lucide-react';
import { notaFiscalService } from '@/services/api';

const STATUS_LABELS = {
  processando_autorizacao: { label: 'Processando', color: 'bg-yellow-500', icon: Loader2 },
  autorizada: { label: 'Autorizada', color: 'bg-green-500', icon: CheckCircle },
  erro_autorizacao: { label: 'Erro', color: 'bg-red-500', icon: XCircle },
  cancelada: { label: 'Cancelada', color: 'bg-gray-500', icon: Ban },
};

const EmitirNotaFiscalModal = ({ 
  isOpen, 
  onClose, 
  ordemServico, 
  clienteSelecionado 
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1=tipo, 2=revisao, 3=resultado
  const [tipoNota, setTipoNota] = useState(null); // 'nfe' ou 'nfse'
  const [isEmitindo, setIsEmitindo] = useState(false);
  const [notasExistentes, setNotasExistentes] = useState([]);
  const [notaEmitida, setNotaEmitida] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isCancelando, setIsCancelando] = useState(false);
  const [justificativaCancelamento, setJustificativaCancelamento] = useState('');
  const [showCancelar, setShowCancelar] = useState(false);
  const pollingRef = useRef(null);
  const [loadingNotas, setLoadingNotas] = useState(false);

  // Dados adicionais editáveis
  const [dadosAdicionais, setDadosAdicionais] = useState({
    natureza_operacao: 'Venda',
    presenca_comprador: '1',
  });

  // Carregar notas existentes ao abrir
  useEffect(() => {
    if (isOpen && ordemServico?.id) {
      carregarNotasExistentes();
      setStep(1);
      setTipoNota(null);
      setNotaEmitida(null);
      setShowCancelar(false);
      setJustificativaCancelamento('');
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, ordemServico?.id]);

  const carregarNotasExistentes = async () => {
    if (!ordemServico?.id) return;
    setLoadingNotas(true);
    try {
      const res = await notaFiscalService.porOrdemServico(ordemServico.id);
      setNotasExistentes(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar notas:', err);
    } finally {
      setLoadingNotas(false);
    }
  };

  const iniciarPolling = useCallback((notaId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPolling(true);
    
    let tentativas = 0;
    const maxTentativas = 12; // 60s (5s * 12)

    pollingRef.current = setInterval(async () => {
      tentativas++;
      try {
        const res = await notaFiscalService.consultar(notaId);
        const nota = res.nota_fiscal;
        setNotaEmitida(nota);

        if (nota.status !== 'processando_autorizacao' || tentativas >= maxTentativas) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsPolling(false);

          if (nota.status === 'autorizada') {
            toast({ title: 'Nota Fiscal Autorizada!', description: `${nota.tipo === 'nfse' ? 'NFSe' : 'NFe'} nº ${nota.numero || '-'} autorizada com sucesso.` });
          } else if (nota.status === 'erro_autorizacao') {
            toast({ title: 'Erro na Autorização', description: nota.mensagem_erro || 'A nota fiscal foi rejeitada.', variant: 'destructive' });
          } else if (tentativas >= maxTentativas) {
            toast({ title: 'Tempo Esgotado', description: 'A nota ainda está sendo processada. Consulte novamente em instantes.', variant: 'default' });
          }
          carregarNotasExistentes();
        }
      } catch (err) {
        console.error('Erro no polling:', err);
        if (tentativas >= maxTentativas) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setIsPolling(false);
        }
      }
    }, 5000);
  }, [toast]);

  const handleEmitir = async () => {
    if (!tipoNota || !ordemServico?.id) return;

    setIsEmitindo(true);
    try {
      const res = await notaFiscalService.emitir({
        ordem_servico_id: ordemServico.id,
        tipo: tipoNota,
        dados_adicionais: dadosAdicionais,
      });

      const nota = res.nota_fiscal;
      setNotaEmitida(nota);
      setStep(3);
      
      toast({ title: 'Nota Enviada', description: 'A nota fiscal foi enviada para processamento.' });
      
      // Iniciar polling para verificar autorização
      if (nota?.id) {
        iniciarPolling(nota.id);
      }
    } catch (err) {
      const errorData = err?.response?.data;
      const msg = errorData?.message || 'Erro ao emitir nota fiscal.';
      const dadosApi = errorData?.dados?.mensagem;
      
      // Construir mensagem detalhada
      let descricao = msg;
      if (dadosApi && dadosApi !== msg) {
        descricao = `${msg}\n\nDetalhe da API: ${dadosApi}`;
      }
      
      toast({ title: 'Erro ao Emitir', description: descricao, variant: 'destructive', duration: 12000 });
      
      // Se já existe nota para esta OS
      if (errorData?.nota_fiscal) {
        setNotaEmitida(errorData.nota_fiscal);
        setStep(3);
      }
    } finally {
      setIsEmitindo(false);
    }
  };

  const handleConsultar = async (notaId) => {
    try {
      const res = await notaFiscalService.consultar(notaId);
      const nota = res.nota_fiscal;
      setNotaEmitida(nota);
      setStep(3);
      
      if (nota.status === 'autorizada') {
        toast({ title: 'Nota Autorizada', description: `${nota.tipo === 'nfse' ? 'NFSe' : 'NFe'} autorizada.` });
      } else if (nota.status === 'processando_autorizacao') {
        toast({ title: 'Em Processamento', description: 'A nota ainda está sendo processada.' });
        iniciarPolling(nota.id);
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao consultar nota fiscal.', variant: 'destructive' });
    }
  };

  const handleCancelar = async () => {
    if (!notaEmitida?.id || justificativaCancelamento.length < 15) {
      toast({ title: 'Justificativa Obrigatória', description: 'Informe uma justificativa com no mínimo 15 caracteres.', variant: 'destructive' });
      return;
    }

    setIsCancelando(true);
    try {
      await notaFiscalService.cancelar(notaEmitida.id, justificativaCancelamento);
      toast({ title: 'Nota Cancelada', description: 'A nota fiscal foi cancelada com sucesso.' });
      setShowCancelar(false);
      setJustificativaCancelamento('');
      carregarNotasExistentes();
      // Atualizar nota exibida
      const res = await notaFiscalService.consultar(notaEmitida.id);
      setNotaEmitida(res.nota_fiscal);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao cancelar nota fiscal.';
      toast({ title: 'Erro ao Cancelar', description: msg, variant: 'destructive' });
    } finally {
      setIsCancelando(false);
    }
  };

  const nomeCliente = clienteSelecionado?.nome_completo || clienteSelecionado?.apelido_fantasia || ordemServico?.cliente_info?.nome || 'Não informado';
  const cpfCnpjCliente = clienteSelecionado?.cpf_cnpj || ordemServico?.cliente_info?.cpf_cnpj || '';
  const valorTotalOS = parseFloat(ordemServico?.valor_total_os || 0);

  const renderStep1 = () => (
    <div className="space-y-4">
      {/* Notas já emitidas */}
      {notasExistentes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Notas já emitidas para esta OS:</h4>
          {notasExistentes.map((nota) => {
            const statusInfo = STATUS_LABELS[nota.status] || STATUS_LABELS.processando_autorizacao;
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={nota.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleConsultar(nota.id)}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${nota.status === 'autorizada' ? 'text-green-500' : nota.status === 'erro_autorizacao' ? 'text-red-500' : nota.status === 'cancelada' ? 'text-gray-500' : 'text-yellow-500 animate-spin'}`} />
                    <span className="font-medium">{nota.tipo === 'nfse' ? 'NFSe' : 'NFe'}</span>
                    {nota.numero && <span className="text-muted-foreground">nº {nota.numero}</span>}
                    <Badge variant="outline" className="text-xs">{statusInfo.label}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    R$ {parseFloat(nota.valor_total || 0).toFixed(2)}
                  </span>
                </CardContent>
              </Card>
            );
          })}
          <Separator className="my-3" />
        </div>
      )}

      <h4 className="text-sm font-medium">Selecione o tipo de nota fiscal:</h4>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Card NFe */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary/50 ${tipoNota === 'nfe' ? 'border-primary ring-2 ring-primary/20' : ''}`}
          onClick={() => setTipoNota('nfe')}
        >
          <CardContent className="p-4 text-center space-y-2">
            <FileText className={`h-10 w-10 mx-auto ${tipoNota === 'nfe' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="font-semibold">NFe</h3>
            <p className="text-xs text-muted-foreground">Nota Fiscal Eletronica</p>
            <p className="text-xs text-muted-foreground">Para venda de produtos e mercadorias</p>
          </CardContent>
        </Card>

        {/* Card NFSe */}
        <Card 
          className={`cursor-pointer transition-all hover:border-primary/50 ${tipoNota === 'nfse' ? 'border-primary ring-2 ring-primary/20' : ''}`}
          onClick={() => setTipoNota('nfse')}
        >
          <CardContent className="p-4 text-center space-y-2">
            <FileCheck className={`h-10 w-10 mx-auto ${tipoNota === 'nfse' ? 'text-primary' : 'text-muted-foreground'}`} />
            <h3 className="font-semibold">NFSe</h3>
            <p className="text-xs text-muted-foreground">Nota Fiscal de Servico</p>
            <p className="text-xs text-muted-foreground">Para prestacao de servicos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-4 pr-4">
        {/* Resumo da OS */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Resumo da Emissao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <Badge>{tipoNota === 'nfse' ? 'NFSe - Nota de Servico' : 'NFe - Nota Fiscal Eletronica'}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">OS:</span>
              <span className="font-medium">#{ordemServico?.id_os || ordemServico?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-semibold text-green-600">R$ {valorTotalOS.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Destinatário/Tomador */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> {tipoNota === 'nfse' ? 'Tomador' : 'Destinatario'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome:</span>
              <span>{nomeCliente}</span>
            </div>
            {cpfCnpjCliente && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPF/CNPJ:</span>
                <span>{cpfCnpjCliente}</span>
              </div>
            )}
            {clienteSelecionado?.cidade && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cidade/UF:</span>
                <span>{clienteSelecionado.cidade}/{clienteSelecionado.estado}</span>
              </div>
            )}
            {!cpfCnpjCliente && (
              <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" /> CPF/CNPJ do cliente nao informado. Pode causar erro na emissao.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4" /> Itens ({(ordemServico?.itens || []).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(ordemServico?.itens || []).map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed last:border-0">
                <span className="truncate flex-1 mr-2">{item.nome_servico_produto || 'Item'}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {parseFloat(item.quantidade || 0)} x R$ {parseFloat(item.valor_unitario || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Campos editáveis */}
        {tipoNota === 'nfe' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados da NFe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Natureza da Operacao</Label>
                <Input 
                  value={dadosAdicionais.natureza_operacao || 'Venda'}
                  onChange={(e) => setDadosAdicionais(prev => ({ ...prev, natureza_operacao: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Presenca do Comprador</Label>
                <Select 
                  value={dadosAdicionais.presenca_comprador || '1'}
                  onValueChange={(v) => setDadosAdicionais(prev => ({ ...prev, presenca_comprador: v }))}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Nao se aplica</SelectItem>
                    <SelectItem value="1">Operacao presencial</SelectItem>
                    <SelectItem value="2">Internet</SelectItem>
                    <SelectItem value="3">Teleatendimento</SelectItem>
                    <SelectItem value="9">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  const renderStep3 = () => {
    if (!notaEmitida) return null;

    const statusInfo = STATUS_LABELS[notaEmitida.status] || STATUS_LABELS.processando_autorizacao;
    const StatusIcon = statusInfo.icon;
    const isProcessando = notaEmitida.status === 'processando_autorizacao';
    const isAutorizada = notaEmitida.status === 'autorizada';
    const isErro = notaEmitida.status === 'erro_autorizacao';

    return (
      <div className="space-y-4">
        {/* Status */}
        <div className="text-center space-y-2">
          <StatusIcon className={`h-12 w-12 mx-auto ${isAutorizada ? 'text-green-500' : isErro ? 'text-red-500' : isProcessando ? 'text-yellow-500 animate-spin' : 'text-gray-500'}`} />
          <h3 className="text-lg font-semibold">
            {isProcessando && 'Processando...'}
            {isAutorizada && 'Nota Fiscal Autorizada!'}
            {isErro && 'Erro na Autorizacao'}
            {notaEmitida.status === 'cancelada' && 'Nota Cancelada'}
          </h3>
          <Badge className={statusInfo.color + ' text-white'}>{statusInfo.label}</Badge>
        </div>

        {/* Detalhes */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span>{notaEmitida.tipo === 'nfse' ? 'NFSe' : 'NFe'}</span>
            </div>
            {notaEmitida.numero && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numero:</span>
                <span className="font-semibold">{notaEmitida.numero}</span>
              </div>
            )}
            {notaEmitida.serie && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serie:</span>
                <span>{notaEmitida.serie}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold text-green-600">R$ {parseFloat(notaEmitida.valor_total || 0).toFixed(2)}</span>
            </div>
            {notaEmitida.chave_nfe && (
              <div>
                <span className="text-muted-foreground text-xs">Chave de Acesso:</span>
                <p className="text-xs font-mono break-all mt-0.5">{notaEmitida.chave_nfe}</p>
              </div>
            )}
            {notaEmitida.protocolo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Protocolo:</span>
                <span className="text-xs font-mono">{notaEmitida.protocolo}</span>
              </div>
            )}
            {isErro && notaEmitida.mensagem_erro && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-red-700 dark:text-red-300 text-xs">
                <p className="font-semibold">Motivo da rejeicao:</p>
                <p>{notaEmitida.mensagem_erro}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="space-y-2">
          {isProcessando && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando autorizacao automaticamente...</span>
            </div>
          )}

          {isAutorizada && (
            <div className="grid grid-cols-2 gap-2">
              {notaEmitida.caminho_danfe && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={notaEmitida.caminho_danfe} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> PDF / DANFE
                  </a>
                </Button>
              )}
              {notaEmitida.caminho_xml_nota_fiscal && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={notaEmitida.caminho_xml_nota_fiscal} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" /> XML
                  </a>
                </Button>
              )}
              {notaEmitida.url_nota_fiscal && (
                <Button variant="outline" size="sm" className="w-full col-span-2" asChild>
                  <a href={notaEmitida.url_nota_fiscal} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ver Nota Fiscal
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Consultar manualmente */}
          {!isPolling && (isProcessando || isErro) && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={() => handleConsultar(notaEmitida.id)}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Consultar Novamente
            </Button>
          )}

          {/* Cancelar nota */}
          {isAutorizada && !showCancelar && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" 
              onClick={() => setShowCancelar(true)}
            >
              <Ban className="mr-2 h-4 w-4" /> Cancelar Nota Fiscal
            </Button>
          )}

          {showCancelar && (
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="p-3 space-y-2">
                <Label className="text-xs text-red-600">Justificativa do cancelamento (min. 15 caracteres):</Label>
                <Textarea 
                  value={justificativaCancelamento}
                  onChange={(e) => setJustificativaCancelamento(e.target.value)}
                  placeholder="Informe o motivo do cancelamento..."
                  className="text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleCancelar}
                    disabled={isCancelando || justificativaCancelamento.length < 15}
                  >
                    {isCancelando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                    Confirmar Cancelamento
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowCancelar(false); setJustificativaCancelamento(''); }}>
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Emitir nova nota (se erro ou cancelada) */}
          {(isErro || notaEmitida.status === 'cancelada') && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setStep(1); setNotaEmitida(null); }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Emitir Nova Nota
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {step === 1 && 'Emitir Nota Fiscal'}
            {step === 2 && 'Revisar Dados'}
            {step === 3 && 'Resultado da Emissao'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Escolha o tipo de nota fiscal para emissao.'}
            {step === 2 && 'Revise os dados antes de enviar para processamento.'}
            {step === 3 && 'Acompanhe o status da nota fiscal emitida.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loadingNotas ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </>
          )}
        </div>

        {step !== 3 && (
          <DialogFooter className="gap-2 sm:gap-0">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} disabled={isEmitindo}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => setStep(2)} disabled={!tipoNota}>
                Proximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {step === 2 && (
              <Button onClick={handleEmitir} disabled={isEmitindo} className="bg-green-600 hover:bg-green-700">
                {isEmitindo ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Emitindo...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Emitir Nota Fiscal</>
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmitirNotaFiscalModal;
