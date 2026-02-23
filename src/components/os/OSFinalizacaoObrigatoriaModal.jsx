import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Lightbulb, 
  Printer, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { funcionarioService } from '@/services/api';
import { cn } from '@/lib/utils';

const OSFinalizacaoObrigatoriaModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  ordemServico 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(false);

  // Estados do formulário
  const [temArtePronta, setTemArtePronta] = useState(null);
  const [destino, setDestino] = useState(null);
  const [responsavelCriacao, setResponsavelCriacao] = useState('');
  const [prazoTipo, setPrazoTipo] = useState(null);
  const [prazoData, setPrazoData] = useState(null);
  const [prazoHora, setPrazoHora] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Erros de validação
  const [erros, setErros] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Carregar observações existentes da OS
      setObservacoes(ordemServico?.observacoes_gerais_os || '');
      
      // Carregar funcionários se o modal estiver aberto
      carregarFuncionarios();
    } else {
      // Resetar formulário quando fechar
      setTemArtePronta(null);
      setDestino(null);
      setResponsavelCriacao('');
      setPrazoTipo(null);
      setPrazoData(null);
      setPrazoHora('');
      setObservacoes('');
      setErros({});
    }
  }, [isOpen, ordemServico]);

  const carregarFuncionarios = async () => {
    try {
      setCarregandoFuncionarios(true);
      const response = await funcionarioService.getAll();
      
      let funcionariosData = response.data?.data?.data || response.data?.data || response.data || [];
      if (!Array.isArray(funcionariosData)) {
        funcionariosData = [];
      }
      
      // Filtrar apenas funcionários ativos
      const funcionariosAtivos = funcionariosData.filter(f => 
        f.status === true || f.status === 1 || f.status === 'ativo' || f.is_active === true
      );
      
      setFuncionarios(funcionariosAtivos);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      setFuncionarios([]);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de funcionários.",
        variant: "destructive",
      });
    } finally {
      setCarregandoFuncionarios(false);
    }
  };

  const validarFormulario = () => {
    const novosErros = {};

    // 1. Arte Pronta (obrigatório)
    if (temArtePronta === null) {
      novosErros.temArtePronta = 'Obrigatório informar se a OS possui arte pronta.';
    }

    // 2. Direcionar (obrigatório)
    if (!destino) {
      novosErros.destino = 'Obrigatório escolher para onde irá.';
    } else if (destino === 'CRIACAO' && !responsavelCriacao) {
      novosErros.responsavelCriacao = 'Obrigatório selecionar um responsável para criação.';
    }

    // 3. Prazo (obrigatório)
    if (!prazoTipo) {
      novosErros.prazoTipo = 'Obrigatório definir o tipo de prazo.';
    } else if (prazoTipo === 'ESPECIFICO') {
      if (!prazoData) {
        novosErros.prazoData = 'Obrigatório definir a data do prazo.';
      }
      if (!prazoHora) {
        novosErros.prazoHora = 'Obrigatório definir a hora do prazo.';
      }
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleConfirmar = () => {
    if (!validarFormulario()) {
      toast({
        title: "Campos Obrigatórios",
        description: "Preencha todos os campos obrigatórios antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    // Preparar dados para envio
    const dadosFinalizacao = {
      tem_arte_pronta: temArtePronta === true,
      destino_os: destino,
      prazo_tipo: prazoTipo,
      prazo_datahora: null,
      responsavel_criacao: destino === 'CRIACAO' ? responsavelCriacao : null,
      observacoes: observacoes.trim() || null,
    };

    // Se prazo específico, combinar data e hora
    if (prazoTipo === 'ESPECIFICO' && prazoData && prazoHora) {
      const [hora, minuto] = prazoHora.split(':');
      const dataHora = new Date(prazoData);
      dataHora.setHours(parseInt(hora) || 0, parseInt(minuto) || 0, 0, 0);
      dadosFinalizacao.prazo_datahora = dataHora.toISOString();
    }

    onConfirm(dadosFinalizacao);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Finalizar OS #{ordemServico?.id_os || ordemServico?.id || 'Nova'}</DialogTitle>
          <DialogDescription>
            Preencha os campos obrigatórios para finalizar a Ordem de Serviço
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. ARTE PRONTA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">1️⃣</span>
              <Label className="text-base font-semibold">Arte Pronta</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Esta OS possui arte pronta?
            </p>
            <RadioGroup 
              value={temArtePronta === null ? '' : temArtePronta.toString()} 
              onValueChange={(value) => setTemArtePronta(value === 'true')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="arte-nao" />
                <Label 
                  htmlFor="arte-nao" 
                  className={cn(
                    "cursor-pointer px-4 py-2 rounded-md border-2 transition-colors",
                    temArtePronta === false 
                      ? "bg-yellow-100 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-500" 
                      : "border-gray-300 hover:border-gray-400"
                  )}
                >
                  Não, precisa criar a arte
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="arte-sim" />
                <Label 
                  htmlFor="arte-sim" 
                  className={cn(
                    "cursor-pointer px-4 py-2 rounded-md border-2 transition-colors",
                    temArtePronta === true 
                      ? "bg-yellow-100 border-yellow-500 dark:bg-yellow-900/20 dark:border-yellow-500" 
                      : "border-gray-300 hover:border-gray-400"
                  )}
                >
                  Sim, já possui arte pronta
                </Label>
              </div>
            </RadioGroup>
            {erros.temArtePronta && (
              <p className="text-sm text-destructive">{erros.temArtePronta}</p>
            )}
          </div>

          {/* 2. DIRECIONAR */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">2️⃣</span>
              <Label className="text-base font-semibold">Direcionar</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Para onde deseja direcionar esta OS?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={destino === 'CRIACAO' ? 'default' : 'outline'}
                className={cn(
                  "h-auto py-4 flex flex-col items-center gap-2",
                  destino === 'CRIACAO' && "bg-blue-600 hover:bg-blue-700"
                )}
                onClick={() => setDestino('CRIACAO')}
              >
                <Lightbulb className="h-6 w-6" />
                <span>Setor de Criação (design)</span>
              </Button>
              <Button
                type="button"
                variant={destino === 'PRODUCAO' ? 'default' : 'outline'}
                className={cn(
                  "h-auto py-4 flex flex-col items-center gap-2",
                  destino === 'PRODUCAO' && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setDestino('PRODUCAO')}
              >
                <Printer className="h-6 w-6" />
                <span>Produção</span>
              </Button>
            </div>
            {erros.destino && (
              <p className="text-sm text-destructive">{erros.destino}</p>
            )}

            {/* Campo de responsável (apenas se Criação) */}
            {destino === 'CRIACAO' && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="responsavel">Responsável pela Criação *</Label>
                <Select 
                  value={responsavelCriacao} 
                  onValueChange={setResponsavelCriacao}
                  disabled={carregandoFuncionarios}
                >
                  <SelectTrigger id="responsavel">
                    <SelectValue placeholder={carregandoFuncionarios ? "Carregando..." : "Selecione o responsável"} />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.length > 0 ? (
                      funcionarios.map((funcionario) => (
                        <SelectItem key={funcionario.id} value={String(funcionario.id)}>
                          {funcionario.name || funcionario.nome}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {carregandoFuncionarios ? "Carregando..." : "Nenhum funcionário encontrado"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {erros.responsavelCriacao && (
                  <p className="text-sm text-destructive">{erros.responsavelCriacao}</p>
                )}
              </div>
            )}
          </div>

          {/* 3. PRAZO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">3️⃣</span>
              <Label className="text-base font-semibold">Prazo</Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Como deseja definir o prazo?
            </p>
            <RadioGroup 
              value={prazoTipo || ''} 
              onValueChange={setPrazoTipo}
              className="space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PADRAO" id="prazo-padrao" />
                  <Label htmlFor="prazo-padrao" className="cursor-pointer">
                    Prazo padrão
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ESPECIFICO" id="prazo-especifico" />
                  <Label htmlFor="prazo-especifico" className="cursor-pointer">
                    Prazo específico
                  </Label>
                </div>
                {prazoTipo === 'ESPECIFICO' && (
                  <div className="ml-6 grid grid-cols-2 gap-3 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor="prazo-data">Data *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !prazoData && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {prazoData ? format(prazoData, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={prazoData}
                            onSelect={setPrazoData}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      {erros.prazoData && (
                        <p className="text-xs text-destructive">{erros.prazoData}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prazo-hora">Hora *</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="prazo-hora"
                          type="time"
                          value={prazoHora}
                          onChange={(e) => setPrazoHora(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      {erros.prazoHora && (
                        <p className="text-xs text-destructive">{erros.prazoHora}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </RadioGroup>
            {erros.prazoTipo && (
              <p className="text-sm text-destructive">{erros.prazoTipo}</p>
            )}
          </div>

          {/* 4. OBSERVAÇÕES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">4️⃣</span>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <Label className="text-base font-semibold">Observações</Label>
                <span className="text-xs text-muted-foreground">(Opcional)</span>
              </div>
            </div>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Digite observações adicionais sobre a OS..."
              rows={4}
              className={cn(
                observacoes && "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
              )}
            />
            <p className="text-xs text-muted-foreground">
              As observações já cadastradas na OS foram carregadas automaticamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              'Finalizar e Direcionar OS'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OSFinalizacaoObrigatoriaModal;
