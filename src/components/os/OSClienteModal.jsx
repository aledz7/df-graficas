import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserCircle2, UserPlus, Users, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { clienteService, funcionarioService } from '@/services/api';

const OSClienteModal = ({ isOpen, onClose, onClienteSelecionado, onOpenNovoCliente, initialSearchTerm = '' }) => {
    const [clientes, setClientes] = useState([]);
    const [totalClientes, setTotalClientes] = useState(0);
    const [funcionarios, setFuncionarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [searchFuncionarioTerm, setSearchFuncionarioTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (isOpen && initialSearchTerm) {
            setSearchTerm(initialSearchTerm);
        }
    }, [isOpen, initialSearchTerm]);

    const searchClientes = useCallback(async (term) => {
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        try {
            const result = await clienteService.search(term, { perPage: 50 });
            if (controller.signal.aborted) return;
            const list = Array.isArray(result.data) ? result.data : [];
            setClientes(list);
            setTotalClientes(result.meta?.total || list.length);
            setHasSearched(true);
        } catch (error) {
            if (controller.signal.aborted) return;
            console.error('Erro ao buscar clientes:', error);
            setClientes([]);
            setTotalClientes(0);
        } finally {
            if (!controller.signal.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setClientes([]);
            setHasSearched(false);
            setSearchTerm('');
            return;
        }
        searchClientes('');
    }, [isOpen, searchClientes]);

    useEffect(() => {
        if (!isOpen) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchClientes(searchTerm);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchTerm, isOpen, searchClientes]);

    useEffect(() => {
        const loadFuncionarios = async () => {
            if (!isOpen) return;
            setLoadingFuncionarios(true);
            try {
                const response = await funcionarioService.getAll();
                let funcionariosData = response.data?.data?.data || response.data?.data || response.data || response || [];
                if (!Array.isArray(funcionariosData)) funcionariosData = [];
                const funcionariosAtivos = funcionariosData.filter(f => f.status === true || f.status === 1);
                setFuncionarios(funcionariosAtivos);
            } catch (error) {
                console.error('Erro ao carregar funcionários:', error);
                setFuncionarios([]);
            } finally {
                setLoadingFuncionarios(false);
            }
        };
        loadFuncionarios();
    }, [isOpen]);

    const filteredFuncionarios = funcionarios.filter(f => {
        if (!f) return false;
        const nome = f.name || f.nome || '';
        const cpf = f.cpf || '';
        const telefone = f.telefone || f.celular || f.whatsapp || '';
        const cargo = f.cargo || '';
        const searchTermLower = searchFuncionarioTerm.toLowerCase();
        return nome.toLowerCase().includes(searchTermLower) ||
               cpf.includes(searchFuncionarioTerm) ||
               telefone.includes(searchFuncionarioTerm) ||
               cargo.toLowerCase().includes(searchTermLower);
    });

    const handleSelect = (cliente) => {
        // Adicionar identificador de tipo para clientes normais
        const clienteComTipo = {
            ...cliente,
            tipo_pessoa: 'cliente',
            isFuncionario: false
        };
        
        if (typeof onClienteSelecionado === 'function') {
            onClienteSelecionado(clienteComTipo);
        }
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    const handleSelectFuncionario = (funcionario) => {
        // Converter funcionário para formato de cliente com prefixo para evitar conflito de IDs
        const funcionarioComoCliente = {
            id: `funcionario_${funcionario.id}`,
            funcionario_id: funcionario.id,
            nome: funcionario.name || funcionario.nome,
            nome_completo: funcionario.name || funcionario.nome,
            cpf: funcionario.cpf,
            cpf_cnpj: funcionario.cpf,
            telefone: funcionario.telefone || funcionario.celular || funcionario.whatsapp,
            telefone_principal: funcionario.telefone || funcionario.celular || funcionario.whatsapp,
            email: funcionario.email,
            cargo: funcionario.cargo,
            tipo_pessoa: 'funcionario',
            isFuncionario: true,
            salario_base: funcionario.salario_base || 0,
            permite_receber_comissao: funcionario.permite_receber_comissao || false,
            // Funcionários não participam do programa de pontos
            pontos_disponivel: 0,
            pontos_total: 0,
            participaProgramaPontos: false
        };
        
        if (typeof onClienteSelecionado === 'function') {
            onClienteSelecionado(funcionarioComoCliente);
        }
        if (typeof onClose === 'function') {
            onClose();
        }
    };
    
    const handleOpenNovoClienteLink = () => {
        if (typeof onClose === 'function') onClose(); 
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] w-full">
                <DialogHeader>
                    <DialogTitle>Buscar Cliente ou Funcionário</DialogTitle>
                    <DialogDescription>Pesquise por cliente ou funcionário para vincular à OS.</DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="clientes" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="clientes" className="flex items-center gap-2">
                            <Users size={16} />
                            Clientes
                        </TabsTrigger>
                        <TabsTrigger value="funcionarios" className="flex items-center gap-2">
                            <UserCheck size={16} />
                            Funcionários
                        </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="clientes" className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar cliente por nome, CPF/CNPJ, e-mail ou telefone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        
                        {hasSearched && !isLoading && (
                            <p className="text-xs text-muted-foreground px-1">
                                {totalClientes > 0
                                    ? `Exibindo ${clientes.length} de ${totalClientes} cliente${totalClientes !== 1 ? 's' : ''} encontrado${totalClientes !== 1 ? 's' : ''}.${totalClientes > clientes.length ? ' Refine sua busca para encontrar mais.' : ''}`
                                    : ''}
                            </p>
                        )}

                        <div className="border rounded-md max-h-[400px] overflow-y-auto">
                            <div className="space-y-1 p-2">
                                {isLoading ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                                        <p>Buscando clientes...</p>
                                    </div>
                                ) : clientes.length > 0 ? clientes.map(cliente => (
                                    <Card key={cliente.id} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => handleSelect(cliente)}>
                                        <CardContent className="p-3 flex items-center space-x-3">
                                            {cliente.foto_url ? (
                                                <img 
                                                    alt={cliente.nome || cliente.nome_completo} 
                                                    src={`${import.meta.env.VITE_API_URL || ''}/storage/${cliente.foto_url}`} 
                                                    className="w-10 h-10 object-cover rounded-full" 
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                                    <UserCircle2 size={24} className="text-muted-foreground" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold">{cliente.nome || cliente.nome_completo}</p>
                                                <p className="text-sm text-muted-foreground">{cliente.telefone || cliente.telefone_principal || 'Sem telefone'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>Nenhum cliente encontrado.</p>
                                        {searchTerm && <p className="text-xs">Tente um termo de busca diferente.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="funcionarios" className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar funcionário por nome, CPF, telefone ou cargo..."
                                value={searchFuncionarioTerm}
                                onChange={(e) => setSearchFuncionarioTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        
                        <div className="border rounded-md max-h-[350px] overflow-y-auto">
                            <div className="space-y-1 p-2">
                                {loadingFuncionarios ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>Carregando funcionários...</p>
                                    </div>
                                ) : filteredFuncionarios.length > 0 ? filteredFuncionarios.map(funcionario => (
                                    <Card key={funcionario.id} className="cursor-pointer hover:bg-accent transition-colors border-l-4 border-l-blue-500" onClick={() => handleSelectFuncionario(funcionario)}>
                                        <CardContent className="p-3 flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <UserCheck size={24} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{funcionario.name || funcionario.nome || 'Nome não informado'}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {funcionario.cargo || 'Cargo não definido'}
                                                    {funcionario.cpf && ` - CPF: ${funcionario.cpf}`}
                                                </p>
                                                {(funcionario.telefone || funcionario.celular || funcionario.whatsapp) && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Tel: {funcionario.telefone || funcionario.celular || funcionario.whatsapp}
                                                    </p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>Nenhum funcionário encontrado.</p>
                                        {searchFuncionarioTerm && <p className="text-xs">Tente um termo de busca diferente.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                            <p className="text-sm text-blue-700">
                                <UserCheck size={16} className="inline mr-1" />
                                Ao selecionar um funcionário, a OS será registrada como consumo interno no relatório mensal do funcionário <strong>apenas quando houver pagamentos em Crediário</strong>.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default OSClienteModal;