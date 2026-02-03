import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format, parseISO, isValid } from 'date-fns';
import { PlusCircle } from 'lucide-react';
import AppointmentModal from '@/components/agenda/AppointmentModal';
import { listarCompromissos } from '@/services/compromissoService';
import { apiDataManager } from '@/lib/apiDataManager';

const AgendaPage = () => {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const loadEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            // Carregar ordens de serviço do apiDataManager (mantém compatibilidade)
            const osSalvas = await apiDataManager.getData('ordens_servico_salvas', []);
            
            // Garantir que osSalvas seja sempre um array
            const osSalvasArray = Array.isArray(osSalvas) ? osSalvas : [];
            
            // Carregar compromissos do backend
            const compromissosResponse = await listarCompromissos();
            const compromissos = compromissosResponse.data || [];
            

            const osEvents = osSalvasArray
                .filter(os => os.data_previsao_entrega && isValid(parseISO(os.data_previsao_entrega)))
                .map(os => ({
                    id: os.id_os,
                    title: `Entrega OS #${os.id_os ? String(os.id_os).slice(-6) : 'N/A'}`,
                    start: parseISO(os.data_previsao_entrega),
                    allDay: true,
                    extendedProps: { type: 'OS', ...os },
                    backgroundColor: '#10B981',
                    borderColor: '#059669',
                }));
                
            const appointmentEvents = compromissos
                .filter(comp => comp.start && isValid(parseISO(comp.start)) && comp.end && isValid(parseISO(comp.end)))
                .map(comp => ({
                    id: comp.id,
                    title: comp.title,
                    start: parseISO(comp.start),
                    end: parseISO(comp.end),
                    allDay: comp.all_day,
                    extendedProps: { 
                        type: 'Compromisso', 
                        ...comp,
                        cliente: comp.cliente ? { 
                            id: comp.cliente.id, 
                            nome: comp.cliente.nome_exibicao || comp.cliente.nome_completo || comp.cliente.nome 
                        } : null,
                        funcionario: comp.funcionario ? { 
                            id: comp.funcionario.id, 
                            nome: comp.funcionario.name 
                        } : null
                    },
                    backgroundColor: '#3B82F6',
                    borderColor: '#2563EB',
                }));

            setEvents([...osEvents, ...appointmentEvents]);
        } catch (error) {
            console.error("Erro ao carregar eventos da agenda:", error);
            setEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    const handleEventClick = (clickInfo) => {
        setSelectedEvent(clickInfo.event);
        setIsEventModalOpen(true);
    };

    const handleDateSelect = (selectInfo) => {
        setAppointmentDate(selectInfo.startStr);
        setIsAppointmentModalOpen(true);
    };
    
    const handleSaveAppointment = async (newAppointment) => {
        // Recarregar eventos após salvar novo compromisso
        await loadEvents();
        setIsAppointmentModalOpen(false);
    };

    return (
        <div className="p-4 md:p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Agenda de Compromissos e Entregas</CardTitle>
                        <CardDescription>Visualize, agende compromissos e acompanhe as previsões de entrega.</CardDescription>
                    </div>
                    <Button onClick={() => { setAppointmentDate(new Date()); setIsAppointmentModalOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Agendar Compromisso
                    </Button>
                </CardHeader>
                <CardContent>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        events={events}
                        eventClick={handleEventClick}
                        select={handleDateSelect}
                        selectable={true}
                        locale="pt-br"
                        buttonText={{
                            today: 'Hoje',
                            month: 'Mês',
                            week: 'Semana',
                            day: 'Dia'
                        }}
                        height="auto"
                        nowIndicator={true}
                        slotMinTime="08:00:00"
                        slotMaxTime="19:00:00"
                    />
                </CardContent>
            </Card>

            <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                <DialogContent>
                    {selectedEvent && (
                        <>
                        <DialogHeader>
                            <DialogTitle>{selectedEvent.title}</DialogTitle>
                            <DialogDescription>Detalhes do {selectedEvent.extendedProps.type}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                            {selectedEvent.extendedProps.type === 'OS' ? (
                                <>
                                <p><strong>Status:</strong> {selectedEvent.extendedProps.status_os}</p>
                                <p><strong>Cliente:</strong> {selectedEvent.extendedProps.cliente?.nome_completo || selectedEvent.extendedProps.cliente?.nome || selectedEvent.extendedProps.cliente?.apelido_fantasia || selectedEvent.extendedProps.cliente_info?.nome || selectedEvent.extendedProps.cliente_nome_manual || 'Não informado'}</p>
                                <p><strong>Previsão de Entrega:</strong> {format(selectedEvent.start, 'dd/MM/yyyy')}</p>
                                <p><strong>Valor Total:</strong> R$ {parseFloat(selectedEvent.extendedProps.valor_total_os).toFixed(2)}</p>
                                </>
                            ) : (
                                <>
                                <p><strong>Cliente:</strong> {selectedEvent.extendedProps.cliente?.nome || 'Não informado'}</p>
                                <p><strong>Funcionário:</strong> {selectedEvent.extendedProps.funcionario?.nome || 'Não informado'}</p>
                                <p><strong>Horário:</strong> {format(selectedEvent.start, 'dd/MM/yyyy HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</p>
                                {selectedEvent.extendedProps.observacoes && (
                                    <p><strong>Observações:</strong> {selectedEvent.extendedProps.observacoes}</p>
                                )}
                                </>
                            )}
                        </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSave={handleSaveAppointment}
                selectedDate={appointmentDate}
            />
        </div>
    );
};

export default AgendaPage;