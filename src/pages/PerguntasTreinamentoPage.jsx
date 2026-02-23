import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  GraduationCap, 
  Loader2, 
  Search,
  Eye,
  EyeOff,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { treinamentoService } from '@/services/api';
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

const PerguntasTreinamentoPage = () => {
  const { toast } = useToast();
  const [perguntas, setPerguntas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [perguntaParaExcluir, setPerguntaParaExcluir] = useState(null);
  const [currentPergunta, setCurrentPergunta] = useState({
    id: null,
    pergunta: '',
    resposta: '',
    setor: 'geral',
    nivel: 'iniciante',
    ordem: 0,
    ativo: true,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [setorFiltro, setSetorFiltro] = useState('todos');
  const [nivelFiltro, setNivelFiltro] = useState('todos');

  useEffect(() => {
    loadPerguntas();
  }, [setorFiltro, nivelFiltro, busca]);

  const loadPerguntas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (setorFiltro !== 'todos') params.setor = setorFiltro;
      if (nivelFiltro !== 'todos') params.nivel = nivelFiltro;
      if (busca) params.busca = busca;

      const response = await treinamentoService.getAll(params);
      const perguntasData = response.data?.data?.data || response.data?.data || response.data || [];
      setPerguntas(Array.isArray(perguntasData) ? perguntasData : []);
    } catch (error) {
      console.error('Erro ao carregar perguntas:', error);
      toast({ 
        title: 'Erro ao carregar perguntas', 
        description: 'Não foi possível carregar os dados do servidor.', 
        variant: 'destructive' 
      });
      setPerguntas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (pergunta = null) => {
    if (pergunta) {
      setIsEditing(true);
      setCurrentPergunta({
        id: pergunta.id,
        pergunta: pergunta.pergunta || '',
        resposta: pergunta.resposta || '',
        setor: pergunta.setor || 'geral',
        nivel: pergunta.nivel || 'iniciante',
        ordem: pergunta.ordem || 0,
        ativo: pergunta.ativo !== undefined ? pergunta.ativo : true,
      });
    } else {
      setIsEditing(false);
      setCurrentPergunta({
        id: null,
        pergunta: '',
        resposta: '',
        setor: 'geral',
        nivel: 'iniciante',
        ordem: 0,
        ativo: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentPergunta.pergunta.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'A pergunta não pode ser vazia.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!currentPergunta.resposta.trim()) {
      toast({ 
        title: 'Erro', 
        description: 'A resposta não pode ser vazia.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await treinamentoService.update(currentPergunta.id, currentPergunta);
        toast({ title: 'Sucesso', description: 'Pergunta atualizada com sucesso.' });
      } else {
        await treinamentoService.create(currentPergunta);
        toast({ title: 'Sucesso', description: 'Nova pergunta adicionada com sucesso.' });
      }
      await loadPerguntas();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar pergunta:', error);
      toast({ 
        title: 'Erro ao salvar pergunta', 
        description: error.response?.data?.message || 'Não foi possível salvar os dados no servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!perguntaParaExcluir) return;

    setLoading(true);
    try {
      await treinamentoService.delete(perguntaParaExcluir.id);
      toast({ title: 'Sucesso', description: 'Pergunta removida com sucesso.' });
      setPerguntaParaExcluir(null);
      await loadPerguntas();
    } catch (error) {
      console.error('Erro ao excluir pergunta:', error);
      toast({ 
        title: 'Erro ao excluir pergunta', 
        description: 'Não foi possível excluir a pergunta do servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAtivo = async (pergunta) => {
    setLoading(true);
    try {
      await treinamentoService.update(pergunta.id, { ativo: !pergunta.ativo });
      toast({
        title: "Sucesso",
        description: `Pergunta ${pergunta.ativo ? 'desativada' : 'ativada'}!`,
      });
      await loadPerguntas();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    if (busca) {
      const buscaLower = busca.toLowerCase();
      return (
        p.pergunta?.toLowerCase().includes(buscaLower) ||
        p.resposta?.toLowerCase().includes(buscaLower)
      );
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8"
    >
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GraduationCap className="h-10 w-10 text-primary" />
              <div>
                <CardTitle className="text-3xl font-bold">Perguntas de Treinamento Interno</CardTitle>
                <CardDescription>
                  Cadastre e gerencie as perguntas e respostas para treinamento interno.
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => handleOpenModal()} disabled={loading}>
              <PlusCircle size={18} className="mr-2" /> Nova Pergunta
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
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

          {/* Tabela de Perguntas */}
          <ScrollArea className="h-[calc(100vh-28rem)]">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando perguntas...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(perguntasFiltradas) || perguntasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Nenhuma pergunta encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    perguntasFiltradas.map(pergunta => (
                      <TableRow key={pergunta.id}>
                        <TableCell className="font-medium max-w-md">
                          <div className="truncate" title={pergunta.pergunta}>
                            {pergunta.pergunta}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSetorCor(pergunta.setor)}>
                            {getSetorNome(pergunta.setor)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getNivelCor(pergunta.nivel)}>
                            {getNivelNome(pergunta.nivel)}
                          </Badge>
                        </TableCell>
                        <TableCell>{pergunta.ordem || 0}</TableCell>
                        <TableCell>
                          <Badge variant={pergunta.ativo ? "default" : "secondary"}>
                            {pergunta.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleAtivo(pergunta)} 
                            disabled={loading}
                            title={pergunta.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {pergunta.ativo ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(pergunta)} 
                            disabled={loading}
                            title="Editar"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setPerguntaParaExcluir(pergunta)} 
                            className="text-red-500" 
                            disabled={loading}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Dialog de Criar/Editar */}
          <Dialog open={isModalOpen} onOpenChange={(open) => !loading && setIsModalOpen(open)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Editar Pergunta' : 'Nova Pergunta'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Edite as informações da pergunta de treinamento.' : 'Adicione uma nova pergunta de treinamento ao sistema.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="pergunta-texto">Pergunta *</Label>
                  <Input 
                    id="pergunta-texto" 
                    value={currentPergunta.pergunta} 
                    onChange={(e) => setCurrentPergunta({ ...currentPergunta, pergunta: e.target.value })} 
                    placeholder="Ex: Como calcular o preço de um banner?"
                    maxLength={500}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentPergunta.pergunta.length}/500 caracteres
                  </p>
                </div>
                <div>
                  <Label htmlFor="resposta-texto">Resposta *</Label>
                  <Textarea 
                    id="resposta-texto" 
                    value={currentPergunta.resposta} 
                    onChange={(e) => setCurrentPergunta({ ...currentPergunta, resposta: e.target.value })} 
                    placeholder="Digite a resposta completa..."
                    rows={8}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="setor">Setor *</Label>
                    <Select 
                      value={currentPergunta.setor} 
                      onValueChange={(value) => setCurrentPergunta({ ...currentPergunta, setor: value })}
                      disabled={loading}
                    >
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
                    <Label htmlFor="nivel">Nível *</Label>
                    <Select 
                      value={currentPergunta.nivel} 
                      onValueChange={(value) => setCurrentPergunta({ ...currentPergunta, nivel: value })}
                      disabled={loading}
                    >
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
                    <Label htmlFor="ordem">Ordem de Aprendizado</Label>
                    <Input 
                      id="ordem" 
                      type="number"
                      min="0"
                      value={currentPergunta.ordem} 
                      onChange={(e) => setCurrentPergunta({ ...currentPergunta, ordem: parseInt(e.target.value) || 0 })} 
                      placeholder="0"
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Menor número aparece primeiro
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={currentPergunta.ativo}
                      onChange={(e) => setCurrentPergunta({ ...currentPergunta, ativo: e.target.checked })}
                      className="h-4 w-4"
                      disabled={loading}
                    />
                    <Label htmlFor="ativo" className="cursor-pointer">
                      Ativo (visível para colaboradores)
                    </Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={loading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    isEditing ? 'Atualizar' : 'Criar Pergunta'
                  )}
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
                <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  className="bg-destructive text-destructive-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerguntasTreinamentoPage;
