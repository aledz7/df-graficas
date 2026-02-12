import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  User,
  ArrowRight,
  Star,
  Filter
} from 'lucide-react';
import { posVendaService } from '@/services/api';
import { userService } from '@/services/userService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tiposPosVenda = [
  { value: 'satisfacao', label: 'Satisfação', color: 'bg-blue-100 text-blue-800' },
  { value: 'reclamacao', label: 'Reclamação', color: 'bg-red-100 text-red-800' },
  { value: 'elogio', label: 'Elogio', color: 'bg-green-100 text-green-800' },
  { value: 'ajuste_retrabalho', label: 'Ajuste / Retrabalho', color: 'bg-orange-100 text-orange-800' },
  { value: 'nova_oportunidade', label: 'Nova Oportunidade', color: 'bg-purple-100 text-purple-800' },
  { value: 'outro', label: 'Outro', color: 'bg-gray-100 text-gray-800' },
];

const statusPosVenda = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  { value: 'resolvido', label: 'Resolvido', color: 'bg-green-100 text-green-800' },
];

const PosVendaPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [posVendas, setPosVendas] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetalhesDialogOpen, setIsDetalhesDialogOpen] = useState(false);
  const [selectedPosVenda, setSelectedPosVenda] = useState(null);
  const [filtros, setFiltros] = useState({
    status: '',
    tipo: '',
    vendedor_id: '',
    responsavel_id: '',
  });
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({
    cliente_id: '',
    venda_id: '',
    vendedor_id: '',
    tipo: 'satisfacao',
    observacao: '',
    nota_satisfacao: null,
  });

  const fetchPosVendas = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filtros };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const response = await posVendaService.getAll(params);
      if (response.data.success) {
        setPosVendas(response.data.data.data || response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pós-vendas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pós-vendas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filtros, toast]);

  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await userService.getAll();
      if (response.data) {
        const usuariosList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.data || []);
        setUsuarios(usuariosList);
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    }
  }, []);

  useEffect(() => {
    fetchPosVendas();
    fetchUsuarios();
  }, [fetchPosVendas, fetchUsuarios]);

  const handleCriar = async () => {
    try {
      const response = await posVendaService.create(formData);
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Pós-venda criado com sucesso",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchPosVendas();
      }
    } catch (error) {
      console.error('Erro ao criar pós-venda:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível criar o pós-venda",
        variant: "destructive",
      });
    }
  };

  const handleAtualizarStatus = async (id, novoStatus) => {
    try {
      const response = await posVendaService.atualizarStatus(id, { status: novoStatus });
      if (response.data.success) {
        toast({
          title: "Sucesso",
          description: "Status atualizado com sucesso",
        });
        fetchPosVendas();
        if (selectedPosVenda?.id === id) {
          setSelectedPosVenda(response.data.data);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: '',
      venda_id: '',
      vendedor_id: '',
      tipo: 'satisfacao',
      observacao: '',
      nota_satisfacao: null,
    });
  };

  const getTipoInfo = (tipo) => {
    return tiposPosVenda.find(t => t.value === tipo) || tiposPosVenda[tiposPosVenda.length - 1];
  };

  const getStatusInfo = (status) => {
    return statusPosVenda.find(s => s.value === status) || statusPosVenda[0];
  };

  const formatarData = (data) => {
    if (!data) return '-';
    return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            Pós-Venda
          </h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe tudo que acontece após a venda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPosVendas}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pós-Venda
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={filtros.status || 'all'} onValueChange={(value) => setFiltros({ ...filtros, status: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {statusPosVenda.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={filtros.tipo || 'all'} onValueChange={(value) => setFiltros({ ...filtros, tipo: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tiposPosVenda.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={filtros.vendedor_id || 'all'} onValueChange={(value) => setFiltros({ ...filtros, vendedor_id: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Select value={filtros.responsavel_id || 'all'} onValueChange={(value) => setFiltros({ ...filtros, responsavel_id: value === 'all' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pós-Vendas */}
      <Card>
        <CardHeader>
          <CardTitle>Pós-Vendas Registrados</CardTitle>
          <CardDescription>
            {posVendas.length} pós-venda(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posVendas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum pós-venda encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Abertura</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posVendas.map((posVenda) => {
                  const tipoInfo = getTipoInfo(posVenda.tipo);
                  const statusInfo = getStatusInfo(posVenda.status);
                  
                  return (
                    <TableRow key={posVenda.id}>
                      <TableCell className="font-medium">
                        {posVenda.cliente?.nome || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge className={tipoInfo.color}>
                          {tipoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {posVenda.vendedor?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {posVenda.responsavel_atual?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {formatarData(posVenda.data_abertura)}
                      </TableCell>
                      <TableCell>
                        {posVenda.nota_satisfacao ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {posVenda.nota_satisfacao}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPosVenda(posVenda);
                              setIsDetalhesDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar Pós-Venda */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Pós-Venda</DialogTitle>
            <DialogDescription>
              Registre um novo contato pós-venda com o cliente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Input
                  type="number"
                  placeholder="ID do Cliente"
                  value={formData.cliente_id}
                  onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                />
              </div>
              <div>
                <Label>Venda (opcional)</Label>
                <Input
                  type="number"
                  placeholder="ID da Venda"
                  value={formData.venda_id}
                  onChange={(e) => setFormData({ ...formData, venda_id: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Vendedor (opcional)</Label>
              <Select value={formData.vendedor_id || 'none'} onValueChange={(value) => setFormData({ ...formData, vendedor_id: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map(u => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Pós-Venda *</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposPosVenda.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observação *</Label>
              <Textarea
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                placeholder="Descreva o contato pós-venda..."
                rows={4}
              />
            </div>

            <div>
              <Label>Nota de Satisfação (1-5)</Label>
              <Select 
                value={formData.nota_satisfacao?.toString() || 'none'} 
                onValueChange={(value) => setFormData({ ...formData, nota_satisfacao: value === 'none' ? null : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma nota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não avaliar</SelectItem>
                  {[1, 2, 3, 4, 5].map(nota => (
                    <SelectItem key={nota} value={nota.toString()}>
                      {nota} {nota === 5 ? '⭐ Excelente' : nota >= 3 ? '👍 Bom' : '👎 Ruim'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriar} disabled={!formData.cliente_id || !formData.observacao}>
              Criar Pós-Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetalhesDialogOpen} onOpenChange={setIsDetalhesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPosVenda && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes do Pós-Venda #{selectedPosVenda.id}</DialogTitle>
                <DialogDescription>
                  Cliente: {selectedPosVenda.cliente?.nome || 'N/A'}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="detalhes" className="w-full">
                <TabsList>
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                  <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tipo</Label>
                      <Badge className={getTipoInfo(selectedPosVenda.tipo).color}>
                        {getTipoInfo(selectedPosVenda.tipo).label}
                      </Badge>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="flex gap-2">
                        <Badge className={getStatusInfo(selectedPosVenda.status).color}>
                          {getStatusInfo(selectedPosVenda.status).label}
                        </Badge>
                        {selectedPosVenda.status !== 'resolvido' && (
                          <Select
                            value={selectedPosVenda.status}
                            onValueChange={(value) => handleAtualizarStatus(selectedPosVenda.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusPosVenda.map(status => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Observação</Label>
                    <div className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                      {selectedPosVenda.observacao}
                    </div>
                  </div>

                  {selectedPosVenda.nota_satisfacao && (
                    <div>
                      <Label>Nota de Satisfação</Label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(nota => (
                          <Star
                            key={nota}
                            className={`h-6 w-6 ${
                              nota <= selectedPosVenda.nota_satisfacao
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="ml-2 font-semibold">
                          {selectedPosVenda.nota_satisfacao}/5
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="historico">
                  {selectedPosVenda.historico && selectedPosVenda.historico.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPosVenda.historico.map((item, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.descricao}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.usuario?.name} - {formatarData(item.created_at)}
                              </p>
                            </div>
                            <Badge variant="outline">{item.tipo_acao}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum histórico registrado
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="agendamentos">
                  {selectedPosVenda.agendamentos && selectedPosVenda.agendamentos.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPosVenda.agendamentos.map((agendamento) => (
                        <div key={agendamento.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {formatarData(agendamento.data_agendamento)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Responsável: {agendamento.responsavel?.name}
                              </p>
                              {agendamento.observacao && (
                                <p className="text-sm mt-1">{agendamento.observacao}</p>
                              )}
                            </div>
                            <Badge variant={agendamento.concluido ? 'default' : 'secondary'}>
                              {agendamento.concluido ? 'Concluído' : 'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhum agendamento registrado
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PosVendaPage;
