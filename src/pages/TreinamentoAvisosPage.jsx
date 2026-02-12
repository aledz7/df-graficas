import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Loader2,
  Settings,
  Plus
} from 'lucide-react';
import { treinamentoService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const TreinamentoAvisosPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('pendente');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [regras, setRegras] = useState([]);
  const [dialogRegraOpen, setDialogRegraOpen] = useState(false);
  const [regraEditando, setRegraEditando] = useState(null);
  const [formRegra, setFormRegra] = useState({
    nome: '',
    tipo: 'treinamento_atrasado',
    nivel_alvo: '',
    setor_alvo: 'todos',
    prazo_dias: 7,
    ativo: true,
    notificar_colaborador: true,
    notificar_gestor: true,
    mensagem_personalizada: '',
  });

  useEffect(() => {
    carregarAvisos();
    if (user?.is_admin) {
      carregarRegras();
    }
  }, [statusFiltro, tipoFiltro]);

  const carregarAvisos = async () => {
    setLoading(true);
    try {
      const params = { status: statusFiltro };
      if (tipoFiltro !== 'todos') {
        params.tipo = tipoFiltro;
      }
      const response = await treinamentoService.getAvisos(params);
      if (response.data.success) {
        setAvisos(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar avisos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os avisos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarRegras = async () => {
    try {
      const response = await treinamentoService.getRegrasAlerta();
      if (response.data.success) {
        setRegras(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar regras:', error);
    }
  };

  const marcarComoResolvido = async (avisoId) => {
    try {
      const response = await treinamentoService.marcarAvisoResolvido(avisoId);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Aviso marcado como resolvido",
        });
        carregarAvisos();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao marcar como resolvido",
        variant: "destructive",
      });
    }
  };

  const executarVerificacoes = async () => {
    if (!user?.is_admin) return;

    setLoading(true);
    try {
      const response = await treinamentoService.executarVerificacoesAvisos();
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Verificações executadas com sucesso",
        });
        carregarAvisos();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao executar verificações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarRegra = async () => {
    if (!formRegra.nome || !formRegra.prazo_dias) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const dados = {
        ...formRegra,
        id: regraEditando?.id || null,
      };
      await treinamentoService.salvarRegraAlerta(dados);
      toast({
        title: "Sucesso",
        description: regraEditando ? "Regra atualizada!" : "Regra criada!",
      });
      setDialogRegraOpen(false);
      setRegraEditando(null);
      setFormRegra({
        nome: '',
        tipo: 'treinamento_atrasado',
        nivel_alvo: '',
        setor_alvo: 'todos',
        prazo_dias: 7,
        ativo: true,
        notificar_colaborador: true,
        notificar_gestor: true,
        mensagem_personalizada: '',
      });
      carregarRegras();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar regra",
        variant: "destructive",
      });
    }
  };

  const abrirDialogRegra = (regra = null) => {
    if (regra) {
      setRegraEditando(regra);
      setFormRegra({
        nome: regra.nome,
        tipo: regra.tipo,
        nivel_alvo: regra.nivel_alvo || '',
        setor_alvo: regra.setor_alvo,
        prazo_dias: regra.prazo_dias,
        ativo: regra.ativo,
        notificar_colaborador: regra.notificar_colaborador,
        notificar_gestor: regra.notificar_gestor,
        mensagem_personalizada: regra.mensagem_personalizada || '',
      });
    } else {
      setRegraEditando(null);
      setFormRegra({
        nome: '',
        tipo: 'treinamento_atrasado',
        nivel_alvo: '',
        setor_alvo: 'todos',
        prazo_dias: 7,
        ativo: true,
        notificar_colaborador: true,
        notificar_gestor: true,
        mensagem_personalizada: '',
      });
    }
    setDialogRegraOpen(true);
  };

  const getTipoNome = (tipo) => {
    const tipos = {
      nivel_nao_concluido: 'Nível Não Concluído',
      treinamento_atrasado: 'Treinamento Atrasado',
      setor_incompleto: 'Setor Incompleto',
    };
    return tipos[tipo] || tipo;
  };

  const getStatusCor = (status) => {
    const cores = {
      pendente: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      resolvido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      ignorado: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return cores[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avisos de Treinamento</h1>
          <p className="text-muted-foreground mt-1">
            Central de avisos sobre atrasos no treinamento
          </p>
        </div>
        {user?.is_admin && (
          <div className="flex items-center gap-2">
            <Dialog open={dialogRegraOpen} onOpenChange={setDialogRegraOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => abrirDialogRegra()}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Regras
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {regraEditando ? 'Editar Regra' : 'Nova Regra de Alerta'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure quando o sistema deve gerar avisos de treinamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Nome da Regra *</Label>
                    <Input
                      value={formRegra.nome}
                      onChange={(e) => setFormRegra({ ...formRegra, nome: e.target.value })}
                      placeholder="Ex: Nível 1 em 7 dias"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo *</Label>
                      <Select value={formRegra.tipo} onValueChange={(v) => setFormRegra({ ...formRegra, tipo: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nivel_nao_concluido">Nível Não Concluído</SelectItem>
                          <SelectItem value="treinamento_atrasado">Treinamento Atrasado</SelectItem>
                          <SelectItem value="setor_incompleto">Setor Incompleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prazo (dias) *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formRegra.prazo_dias}
                        onChange={(e) => setFormRegra({ ...formRegra, prazo_dias: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {formRegra.tipo === 'nivel_nao_concluido' && (
                    <div>
                      <Label>Nível Alvo *</Label>
                      <Select value={formRegra.nivel_alvo} onValueChange={(v) => setFormRegra({ ...formRegra, nivel_alvo: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediario">Intermediário</SelectItem>
                          <SelectItem value="avancado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Setor Alvo *</Label>
                    <Select value={formRegra.setor_alvo} onValueChange={(v) => setFormRegra({ ...formRegra, setor_alvo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="atendimento">Atendimento</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="geral">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="notificar_colaborador"
                        checked={formRegra.notificar_colaborador}
                        onChange={(e) => setFormRegra({ ...formRegra, notificar_colaborador: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="notificar_colaborador" className="cursor-pointer">
                        Notificar Colaborador
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="notificar_gestor"
                        checked={formRegra.notificar_gestor}
                        onChange={(e) => setFormRegra({ ...formRegra, notificar_gestor: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="notificar_gestor" className="cursor-pointer">
                        Notificar Gestor
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label>Mensagem Personalizada (opcional)</Label>
                    <Textarea
                      value={formRegra.mensagem_personalizada}
                      onChange={(e) => setFormRegra({ ...formRegra, mensagem_personalizada: e.target.value })}
                      rows={3}
                      placeholder="Deixe em branco para usar mensagem padrão"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogRegraOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={salvarRegra}>
                    {regraEditando ? 'Atualizar' : 'Criar'} Regra
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={executarVerificacoes} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Executar Verificações
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Label>Status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                  <SelectItem value="ignorado">Ignorados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label>Tipo</Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nivel_nao_concluido">Nível Não Concluído</SelectItem>
                  <SelectItem value="treinamento_atrasado">Treinamento Atrasado</SelectItem>
                  <SelectItem value="setor_incompleto">Setor Incompleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Avisos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Avisos
            {avisos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {avisos.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : avisos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aviso encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {avisos.map((aviso) => (
                <div
                  key={aviso.id}
                  className={`border rounded-lg p-4 ${
                    aviso.status === 'pendente' 
                      ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' 
                      : 'bg-white dark:bg-gray-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {aviso.status === 'pendente' ? (
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        <h3 className="font-semibold">{aviso.titulo}</h3>
                        <Badge className={getStatusCor(aviso.status)}>
                          {aviso.status}
                        </Badge>
                        <Badge variant="outline">
                          {getTipoNome(aviso.tipo)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{aviso.mensagem}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Colaborador: {aviso.usuario?.name || 'N/A'}</span>
                        {aviso.dias_atraso > 0 && (
                          <span>Atraso: {aviso.dias_atraso} dias</span>
                        )}
                        {aviso.data_limite && (
                          <span>Limite: {format(new Date(aviso.data_limite), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        )}
                        <span>
                          Criado {formatDistanceToNow(new Date(aviso.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {aviso.status === 'resolvido' && aviso.data_resolucao && (
                        <p className="text-xs text-green-600 mt-2">
                          Resolvido em {format(new Date(aviso.data_resolucao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          {aviso.resolvido_por && ` por ${aviso.resolvido_por.name}`}
                        </p>
                      )}
                    </div>
                    {aviso.status === 'pendente' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => marcarComoResolvido(aviso.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Marcar como Resolvido
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regras de Alerta (apenas admin) */}
      {user?.is_admin && regras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Regras de Alerta Configuradas</CardTitle>
            <CardDescription>
              Regras que geram avisos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {regras.map((regra) => (
                <div key={regra.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{regra.nome}</span>
                      {regra.ativo ? (
                        <Badge variant="default">Ativa</Badge>
                      ) : (
                        <Badge variant="outline">Inativa</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getTipoNome(regra.tipo)} - Prazo: {regra.prazo_dias} dias
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => abrirDialogRegra(regra)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TreinamentoAvisosPage;
