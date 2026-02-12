import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3
} from 'lucide-react';
import { treinamentoService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TreinamentoInternoPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [perguntas, setPerguntas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('todos');
  const [nivelFiltro, setNivelFiltro] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [perguntaEditando, setPerguntaEditando] = useState(null);
  const [perguntaParaExcluir, setPerguntaParaExcluir] = useState(null);
  const [estatisticas, setEstatisticas] = useState(null);
  const [mostrarEstatisticas, setMostrarEstatisticas] = useState(false);

  // Formulário
  const [formData, setFormData] = useState({
    pergunta: '',
    resposta: '',
    setor: 'geral',
    nivel: 'iniciante',
    ordem: 0,
    ativo: true,
  });

  useEffect(() => {
    carregarPerguntas();
    if (user?.is_admin) {
      carregarEstatisticas();
    }
  }, [setorFiltro, nivelFiltro, busca]);

  const carregarPerguntas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (setorFiltro !== 'todos') params.setor = setorFiltro;
      if (nivelFiltro !== 'todos') params.nivel = nivelFiltro;
      if (busca) params.busca = busca;
      if (user?.is_admin) {
        params.ativo = true; // Admin vê todas, mas pode filtrar
      }

      const response = await treinamentoService.getAll(params);
      if (response.data.success) {
        setPerguntas(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as perguntas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      const response = await treinamentoService.getEstatisticas();
      if (response.data.success) {
        setEstatisticas(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const abrirDialog = (pergunta = null) => {
    if (pergunta) {
      setPerguntaEditando(pergunta);
      setFormData({
        pergunta: pergunta.pergunta,
        resposta: pergunta.resposta,
        setor: pergunta.setor,
        nivel: pergunta.nivel,
        ordem: pergunta.ordem,
        ativo: pergunta.ativo,
      });
    } else {
      setPerguntaEditando(null);
      setFormData({
        pergunta: '',
        resposta: '',
        setor: 'geral',
        nivel: 'iniciante',
        ordem: 0,
        ativo: true,
      });
    }
    setDialogOpen(true);
  };

  const salvarPergunta = async () => {
    if (!formData.pergunta || !formData.resposta) {
      toast({
        title: "Erro",
        description: "Preencha a pergunta e a resposta",
        variant: "destructive",
      });
      return;
    }

    try {
      if (perguntaEditando) {
        await treinamentoService.update(perguntaEditando.id, formData);
        toast({
          title: "Sucesso",
          description: "Pergunta atualizada!",
        });
      } else {
        await treinamentoService.create(formData);
        toast({
          title: "Sucesso",
          description: "Pergunta criada!",
        });
      }
      setDialogOpen(false);
      carregarPerguntas();
      if (user?.is_admin) {
        carregarEstatisticas();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar pergunta",
        variant: "destructive",
      });
    }
  };

  const excluirPergunta = async () => {
    if (!perguntaParaExcluir) return;

    try {
      await treinamentoService.delete(perguntaParaExcluir.id);
      toast({
        title: "Sucesso",
        description: "Pergunta excluída!",
      });
      setPerguntaParaExcluir(null);
      carregarPerguntas();
      if (user?.is_admin) {
        carregarEstatisticas();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir pergunta",
        variant: "destructive",
      });
    }
  };

  const toggleAtivo = async (pergunta) => {
    try {
      await treinamentoService.update(pergunta.id, { ativo: !pergunta.ativo });
      toast({
        title: "Sucesso",
        description: `Pergunta ${pergunta.ativo ? 'desativada' : 'ativada'}!`,
      });
      carregarPerguntas();
      if (user?.is_admin) {
        carregarEstatisticas();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status",
        variant: "destructive",
      });
    }
  };

  const getSetorNome = (setor) => {
    const setores = {
      atendimento: 'Atendimento',
      vendas: 'Vendas',
      producao: 'Produção',
      design: 'Design',
      financeiro: 'Financeiro',
      geral: 'Geral',
    };
    return setores[setor] || setor;
  };

  const getNivelNome = (nivel) => {
    const niveis = {
      iniciante: 'Iniciante',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
    };
    return niveis[nivel] || nivel;
  };

  const getSetorCor = (setor) => {
    const cores = {
      atendimento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      vendas: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      producao: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      design: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      financeiro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      geral: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return cores[setor] || 'bg-gray-100 text-gray-800';
  };

  const getNivelCor = (nivel) => {
    const cores = {
      iniciante: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      intermediario: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      avancado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return cores[nivel] || 'bg-gray-100 text-gray-800';
  };

  const perguntasFiltradas = perguntas.filter(p => {
    if (!user?.is_admin && !p.ativo) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Treinamento Interno</h1>
          <p className="text-muted-foreground mt-1">
            Perguntas e respostas para treinar novos colaboradores
          </p>
        </div>
        {user?.is_admin && (
          <Button onClick={() => abrirDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pergunta
          </Button>
        )}
      </div>

      {/* Estatísticas (apenas admin) */}
      {user?.is_admin && estatisticas && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Estatísticas
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMostrarEstatisticas(!mostrarEstatisticas)}
              >
                {mostrarEstatisticas ? <ChevronUp /> : <ChevronDown />}
              </Button>
            </div>
          </CardHeader>
          {mostrarEstatisticas && (
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{estatisticas.total}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas.ativos}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativas</p>
                  <p className="text-2xl font-bold text-gray-600">{estatisticas.inativos}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Por Setor</p>
                  <div className="space-y-1 mt-2">
                    {Object.entries(estatisticas.por_setor || {}).map(([setor, total]) => (
                      <div key={setor} className="flex justify-between text-sm">
                        <span>{getSetorNome(setor)}:</span>
                        <span className="font-semibold">{total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por palavra-chave..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Setores</SelectItem>
                  <SelectItem value="atendimento">Atendimento</SelectItem>
                  <SelectItem value="vendas">Vendas</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nível</Label>
              <Select value={nivelFiltro} onValueChange={setNivelFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Níveis</SelectItem>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediario">Intermediário</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perguntas */}
      <Card>
        <CardHeader>
          <CardTitle>
            Perguntas e Respostas
            {perguntasFiltradas.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {perguntasFiltradas.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : perguntasFiltradas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma pergunta encontrada</p>
              {user?.is_admin && (
                <Button className="mt-4" onClick={() => abrirDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Pergunta
                </Button>
              )}
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {perguntasFiltradas.map((pergunta) => (
                <AccordionItem key={pergunta.id} value={`pergunta-${pergunta.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pergunta.pergunta}</span>
                            {!pergunta.ativo && user?.is_admin && (
                              <Badge variant="outline" className="text-xs">
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className={getSetorCor(pergunta.setor)}>
                              {getSetorNome(pergunta.setor)}
                            </Badge>
                            <Badge variant="outline" className={getNivelCor(pergunta.nivel)}>
                              {getNivelNome(pergunta.nivel)}
                            </Badge>
                            {pergunta.ordem > 0 && (
                              <span className="text-xs">Ordem: {pergunta.ordem}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm font-medium mb-2">Resposta:</p>
                        <p className="whitespace-pre-wrap">{pergunta.resposta}</p>
                      </div>
                      {user?.is_admin && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAtivo(pergunta)}
                          >
                            {pergunta.ativo ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirDialog(pergunta)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPerguntaParaExcluir(pergunta)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {perguntaEditando ? 'Editar Pergunta' : 'Nova Pergunta'}
            </DialogTitle>
            <DialogDescription>
              Crie uma pergunta e resposta para o treinamento interno
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Pergunta *</Label>
              <Input
                value={formData.pergunta}
                onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
                placeholder="Ex: Como calcular o preço de um banner?"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.pergunta.length}/500 caracteres
              </p>
            </div>
            <div>
              <Label>Resposta *</Label>
              <Textarea
                value={formData.resposta}
                onChange={(e) => setFormData({ ...formData, resposta: e.target.value })}
                placeholder="Digite a resposta completa..."
                rows={8}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Setor *</Label>
                <Select value={formData.setor} onValueChange={(v) => setFormData({ ...formData, setor: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendimento">Atendimento</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nível *</Label>
                <Select value={formData.nivel} onValueChange={(v) => setFormData({ ...formData, nivel: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediario">Intermediário</SelectItem>
                    <SelectItem value="avancado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ordem de Aprendizado</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Menor número aparece primeiro
                </p>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="ativo" className="cursor-pointer">
                  Ativo (visível para colaboradores)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarPergunta}>
              {perguntaEditando ? 'Atualizar' : 'Criar'} Pergunta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!perguntaParaExcluir} onOpenChange={() => setPerguntaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pergunta "{perguntaParaExcluir?.pergunta}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirPergunta} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TreinamentoInternoPage;
