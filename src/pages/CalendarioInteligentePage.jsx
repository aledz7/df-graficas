import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  GraduationCap,
  CheckSquare,
  ShoppingBag,
  Star,
  AlertCircle,
  Info
} from 'lucide-react';
import { eventoCalendarioService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

const tiposEvento = [
  { value: 'volta_aulas', label: 'Volta às Aulas', icon: GraduationCap, color: '#3B82F6' },
  { value: 'eleicoes', label: 'Eleições', icon: CheckSquare, color: '#10B981' },
  { value: 'datas_comerciais', label: 'Datas Comerciais', icon: ShoppingBag, color: '#F59E0B' },
  { value: 'feriado', label: 'Feriado', icon: Calendar, color: '#EF4444' },
  { value: 'evento_especial', label: 'Evento Especial', icon: Star, color: '#8B5CF6' },
  { value: 'outro', label: 'Outro', icon: Info, color: '#6B7280' },
];

const niveisImpacto = [
  { value: 'alto', label: 'Alto', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'medio', label: 'Médio', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'baixo', label: 'Baixo', color: 'bg-green-100 text-green-800 border-green-300' },
];

const CalendarioInteligentePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    tipo: 'outro',
    impacto: 'medio',
    recorrente: false,
    frequencia_recorrencia: 'anual',
    ativo: true,
    observacoes: '',
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const hoje = new Date();
      const mesAtual = hoje.getMonth() + 1;
      const anoAtual = hoje.getFullYear();
      
      const response = await eventoCalendarioService.getAll({
        mes: mesAtual,
        ano: anoAtual,
        anos: [anoAtual, anoAtual + 1], // Para eventos recorrentes
      });

      if (response.data.success) {
        const eventosFormatados = response.data.data.map(evento => {
          const tipoInfo = tiposEvento.find(t => t.value === evento.tipo) || tiposEvento[tiposEvento.length - 1];
          return {
            id: evento.id,
            title: evento.titulo,
            start: evento.data_inicio,
            end: evento.data_fim || evento.data_inicio,
            allDay: true,
            backgroundColor: tipoInfo.color,
            borderColor: tipoInfo.color,
            extendedProps: {
              ...evento,
              tipoInfo,
            },
          };
        });
        setEvents(eventosFormatados);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os eventos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleDateSelect = (selectInfo) => {
    setFormData({
      ...formData,
      data_inicio: format(selectInfo.start, 'yyyy-MM-dd'),
      data_fim: '',
    });
    setSelectedEvent(null);
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo) => {
    const evento = clickInfo.event.extendedProps;
    setSelectedEvent(evento);
    setFormData({
      titulo: evento.titulo || '',
      descricao: evento.descricao || '',
      data_inicio: evento.data_inicio || '',
      data_fim: evento.data_fim || '',
      tipo: evento.tipo || 'outro',
      impacto: evento.impacto || 'medio',
      recorrente: evento.recorrente || false,
      frequencia_recorrencia: evento.frequencia_recorrencia || 'anual',
      ativo: evento.ativo !== undefined ? evento.ativo : true,
      observacoes: evento.observacoes || '',
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (isEditing && selectedEvent) {
        await eventoCalendarioService.update(selectedEvent.id, formData);
        toast({
          title: "Sucesso",
          description: "Evento atualizado com sucesso",
        });
      } else {
        await eventoCalendarioService.create(formData);
        toast({
          title: "Sucesso",
          description: "Evento criado com sucesso",
        });
      }
      setIsDialogOpen(false);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível salvar o evento",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      await eventoCalendarioService.delete(eventToDelete.id);
      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso",
      });
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
      loadEvents();
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o evento",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      data_inicio: '',
      data_fim: '',
      tipo: 'outro',
      impacto: 'medio',
      recorrente: false,
      frequencia_recorrencia: 'anual',
      ativo: true,
      observacoes: '',
    });
    setSelectedEvent(null);
    setIsEditing(false);
  };

  const getTipoInfo = (tipo) => {
    return tiposEvento.find(t => t.value === tipo) || tiposEvento[tiposEvento.length - 1];
  };

  const getImpactoInfo = (impacto) => {
    return niveisImpacto.find(n => n.value === impacto) || niveisImpacto[1];
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-500" />
            Calendário Inteligente da Gráfica
          </h1>
          <p className="text-muted-foreground mt-1">
            Eventos que impactam vendas: volta às aulas, eleições, datas comerciais e mais
          </p>
        </div>
        {user?.is_admin && (
          <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calendário de Eventos</CardTitle>
          <CardDescription>
            Visualize eventos que impactam as vendas. Clique em uma data para criar um evento ou em um evento existente para visualizar/editar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={events}
              eventClick={handleEventClick}
              select={user?.is_admin ? handleDateSelect : null}
              selectable={user?.is_admin}
              locale="pt-br"
              buttonText={{
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
              }}
              height="auto"
              nowIndicator={true}
            />
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Legenda de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {tiposEvento.map(tipo => (
              <div key={tipo.value} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded" 
                  style={{ backgroundColor: tipo.color }}
                />
                <span className="text-sm">{tipo.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Evento */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Edite as informações do evento' : 'Cadastre um novo evento que impacta as vendas'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Volta às Aulas 2025"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o evento e seu impacto nas vendas"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início *</Label>
                <Input
                  type="date"
                  value={formData.data_inicio}
                  onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim (opcional)</Label>
                <Input
                  type="date"
                  value={formData.data_fim}
                  onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                  min={formData.data_inicio}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Evento *</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEvento.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Impacto nas Vendas</Label>
                <Select value={formData.impacto} onValueChange={(value) => setFormData({ ...formData, impacto: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niveisImpacto.map(nivel => (
                      <SelectItem key={nivel.value} value={nivel.value}>
                        {nivel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="recorrente"
                checked={formData.recorrente}
                onCheckedChange={(checked) => setFormData({ ...formData, recorrente: checked })}
              />
              <Label htmlFor="recorrente">Evento Recorrente</Label>
            </div>

            {formData.recorrente && (
              <div>
                <Label>Frequência de Recorrência</Label>
                <Select 
                  value={formData.frequencia_recorrencia} 
                  onValueChange={(value) => setFormData({ ...formData, frequencia_recorrencia: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações adicionais sobre o evento"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Evento Ativo</Label>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {isEditing && (
              <Button
                variant="destructive"
                onClick={() => {
                  setEventToDelete(selectedEvent);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!formData.titulo || !formData.data_inicio}>
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{eventToDelete?.titulo}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CalendarioInteligentePage;
