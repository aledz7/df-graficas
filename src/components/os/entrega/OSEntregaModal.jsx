import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { funcionarioService } from "@/services/api";

const OSEntregaModal = ({ isOpen, setIsOpen, os, onConfirm }) => {
    const { toast } = useToast();
    const [dadosEntrega, setDadosEntrega] = useState({
        entregue_por: "",
        recebido_por: "",
        data_entrega: "",
    });
    const [funcionarios, setFuncionarios] = useState([]);
    const [carregandoFuncionarios, setCarregandoFuncionarios] = useState(false);

    const carregarFuncionarios = async () => {
        try {
            setCarregandoFuncionarios(true);
            const response = await funcionarioService.getAll();
            
            // Normalizar a estrutura de dados (pode vir paginada ou não)
            let funcionariosData = response.data?.data?.data || response.data?.data || response.data || response || [];
            
            // Garantir que é um array
            if (!Array.isArray(funcionariosData)) {
                console.warn('Dados de funcionários não são um array:', funcionariosData);
                funcionariosData = [];
            }
            
            const funcionariosAtivos = funcionariosData.filter(f => f.status === true || f.status === 1 || f.status === 'ativo');
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

    useEffect(() => {
        if (isOpen) {
            setDadosEntrega({
                entregue_por: "",
                recebido_por: "",
                data_entrega: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            });
            carregarFuncionarios();
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDadosEntrega(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (field, value) => {
        setDadosEntrega(prev => ({ ...prev, [field]: value }));
    };

    const handleConfirmar = () => {
        if (!dadosEntrega.entregue_por || !dadosEntrega.recebido_por) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha quem entregou e quem recebeu.",
                variant: "destructive",
            });
            return;
        }

        if (!dadosEntrega.data_entrega) {
            toast({
                title: "Data obrigatória",
                description: "Por favor, informe a data e hora da entrega.",
                variant: "destructive",
            });
            return;
        }

        // Buscar o nome do funcionário selecionado
        const funcionarioSelecionado = funcionarios.find(f => f.id === parseInt(dadosEntrega.entregue_por));
        const nomeFuncionario = funcionarioSelecionado ? (funcionarioSelecionado.name || funcionarioSelecionado.nome) : dadosEntrega.entregue_por;
        
        // Converter data_entrega para o formato correto e usar nome do funcionário
        const dadosParaEnvio = {
            ...dadosEntrega,
            entregue_por: nomeFuncionario,
            data_entrega: dadosEntrega.data_entrega ? new Date(dadosEntrega.data_entrega).toISOString() : null
        };
        
        onConfirm(os.id, dadosParaEnvio);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registrar Entrega da OS: {os.id}</DialogTitle>
                    <DialogDescription>
                        Preencha as informações abaixo para confirmar a entrega do pedido.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="entregue_por">Entregue Por:</Label>
                        <Select 
                            value={dadosEntrega.entregue_por} 
                            onValueChange={(value) => handleSelectChange('entregue_por', value)}
                            disabled={carregandoFuncionarios}
                        >
                            <SelectTrigger id="entregue_por">
                                <SelectValue placeholder={carregandoFuncionarios ? "Carregando funcionários..." : "Selecione o funcionário"} />
                            </SelectTrigger>
                            <SelectContent>
                                {(() => {
                                    if (Array.isArray(funcionarios) && funcionarios.length > 0) {
                                        return funcionarios.map((funcionario) => (
                                            <SelectItem key={funcionario.id} value={funcionario.id}>
                                                {funcionario.name || funcionario.nome}
                                            </SelectItem>
                                        ));
                                    } else if (!carregandoFuncionarios) {
                                        return (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                Nenhum funcionário encontrado
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="recebido_por">Recebido Por:</Label>
                        <Input
                            id="recebido_por"
                            name="recebido_por"
                            value={dadosEntrega.recebido_por}
                            onChange={handleChange}
                            placeholder="Nome de quem recebeu"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="data_entrega">Data e Hora da Entrega:</Label>
                        <Input
                            id="data_entrega"
                            name="data_entrega"
                            type="datetime-local"
                            value={dadosEntrega.data_entrega}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmar}>Confirmar Entrega</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OSEntregaModal;