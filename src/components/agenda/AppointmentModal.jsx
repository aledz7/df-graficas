import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format, isValid } from 'date-fns';
import { apiDataManager } from '@/lib/apiDataManager';
import { criarCompromisso } from '@/services/compromissoService';
import { clienteService } from '@/services/api';
import { funcionarioService } from '@/services/funcionarioService';
import api from '@/config/axios';
import { safeJsonParse } from '@/lib/utils';
import { formatDateForBackend } from '@/utils/dateUtils';

const AppointmentModal = ({ isOpen, onClose, onSave, selectedDate }) => {
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [clienteId, setClienteId] = useState('');
    const [funcionarioId, setFuncionarioId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const [clientes, setClientes] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Buscar clientes da API principal igual à tela de clientes
                const response = await clienteService.getAll();
                // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                const clientesData = response.data?.data?.data || response.data?.data || response.data || [];
                const clientesArray = Array.isArray(clientesData) ? clientesData : [];
                setClientes(clientesArray);
                
                // Buscar users da API (que são os funcionários no sistema)
                try {
                    const usersResponse = await api.get('/api/users');
                    const usersData = usersResponse.data?.data?.data || usersResponse.data?.data || usersResponse.data || [];
                    const usersArray = Array.isArray(usersData) ? usersData : [];
                    setFuncionarios(usersArray);
                } catch (usersError) {
                    console.error('Erro ao carregar users da API, usando dados locais:', usersError);
                    // Fallback para dados locais
                    const funcionariosData = await apiDataManager.getItem('funcionarios');
                    const funcionariosArray = safeJsonParse(funcionariosData, []);
                    
                    // Tratar resposta da API quando não há dados
                    if (funcionariosArray && funcionariosArray.success && funcionariosArray.data === null) {
                        setFuncionarios([]);
                    } else if (funcionariosArray && funcionariosArray.success && Array.isArray(funcionariosArray.data)) {
                        setFuncionarios(funcionariosArray.data);
                    } else {
                        setFuncionarios(Array.isArray(funcionariosArray) ? funcionariosArray : []);
                    }
                }
                if (selectedDate) {
                    const date = new Date(selectedDate);
                    setStartDate(date.toISOString().split('T')[0]);
                }
            } catch(error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: 'Erro', 
                    description: 'Erro ao carregar clientes e funcionários.', 
                    variant: 'destructive' 
                });
            }
        };
        
        if (isOpen) {
            loadData();
        }
    }, [isOpen, selectedDate, toast]);
    
    const handleSave = async () => {
        if (!title || !clienteId || !funcionarioId || !startDate || !startTime || !endTime) {
            toast({ title: 'Campos Obrigatórios', description: 'Preencha todos os campos para salvar o compromisso.', variant: 'destructive' });
            return;
        }

        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${startDate}T${endTime}`);

        if (endDateTime <= startDateTime) {
            toast({ title: 'Horário Inválido', description: 'O horário de término deve ser após o horário de início.', variant: 'destructive' });
            return;
        }
        
        const selectedCliente = clientes.find(c => c.id.toString() === clienteId.toString());
        const selectedFuncionario = funcionarios.find(f => f.id === funcionarioId);

        setIsLoading(true);

        try {
            const dadosCompromisso = {
                title,
                start: formatDateForBackend(startDateTime),
                end: formatDateForBackend(endDateTime),
                all_day: false,
                cliente_id: selectedCliente ? parseInt(selectedCliente.id) : null,
                funcionario_id: selectedFuncionario ? parseInt(selectedFuncionario.id) : null,
                observacoes: observacoes || null,
                status: 'agendado'
            };

            const compromissoCriado = await criarCompromisso(dadosCompromisso);
            
            const newAppointment = {
                id: compromissoCriado.data.id,
                title: compromissoCriado.data.title,
                start: compromissoCriado.data.start,
                end: compromissoCriado.data.end,
                allDay: compromissoCriado.data.all_day,
                cliente: selectedCliente ? { 
                    id: selectedCliente.id, 
                    nome: selectedCliente.nome_exibicao || selectedCliente.nome_completo || selectedCliente.nome 
                } : null,
                funcionario: selectedFuncionario ? { id: selectedFuncionario.id, nome: selectedFuncionario.name } : null,
                observacoes: compromissoCriado.data.observacoes,
                status: compromissoCriado.data.status
            };
            
            onSave(newAppointment);
            toast({ title: 'Sucesso!', description: 'Compromisso agendado e salvo no servidor.' });
            
            setTitle('');
            setClienteId('');
            setFuncionarioId('');
            setStartDate('');
            setStartTime('');
            setEndTime('');
            setObservacoes('');
            
        } catch (error) {
            console.error('Erro ao salvar compromisso:', error);
            toast({ 
                title: 'Erro', 
                description: error.response?.data?.message || 'Erro ao salvar compromisso no servidor.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Agendar Compromisso</DialogTitle>
                    <DialogDescription>Preencha os detalhes do seu novo compromisso.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="title">Título do Compromisso</Label>
                        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Orçamento com novo cliente" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="cliente">Cliente</Label>
                            <Select value={clienteId.toString()} onValueChange={(value) => setClienteId(value)}>
                                <SelectTrigger id="cliente"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                                <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.nome_exibicao || c.nome_completo || c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="funcionario">Funcionário Responsável</Label>
                            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
                                <SelectTrigger id="funcionario"><SelectValue placeholder="Selecione um funcionário" /></SelectTrigger>
                                <SelectContent>{funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <Label htmlFor="startDate">Data</Label>
                            <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="col-span-1">
                            <Label htmlFor="startTime">Início</Label>
                            <Input id="startTime" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                        </div>
                        <div className="col-span-1">
                            <Label htmlFor="endTime">Fim</Label>
                            <Input id="endTime" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="observacoes">Observações</Label>
                        <Textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes importantes, endereço, etc." />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Salvar Compromisso'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AppointmentModal;