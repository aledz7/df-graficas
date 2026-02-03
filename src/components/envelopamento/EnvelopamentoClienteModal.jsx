import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserCircle2, Users, UserCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { clienteService, funcionarioService } from '@/services/api';

const EnvelopamentoClienteModal = ({ open, onOpenChange, onSelectCliente }) => {
    const [clientes, setClientes] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchFuncionarioTerm, setSearchFuncionarioTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const loadData = async () => {
            if (!open) return;
            
            setIsLoading(true);
            try {
                const response = await clienteService.getAll();
                
                // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
                const clientesData = response.data?.data?.data || response.data?.data || response.data || [];
                const clientesArray = Array.isArray(clientesData) ? clientesData : [];
                
                // Filtrar apenas clientes ativos (considerar ativo se não estiver explicitamente marcado como inativo)
                const activeClientes = clientesArray.filter(c => 
                    c.ativo !== false && 
                    c.status !== false && 
                    c.ativo !== 0 && 
                    c.status !== 0
                );
                
                setClientes(activeClientes);
                setSearchTerm('');
            } catch(error) {
                console.error('Erro ao carregar clientes para envelopamento:', error);
                setClientes([]);
                toast({ 
                    title: 'Erro', 
                    description: 'Erro ao carregar clientes.', 
                    variant: 'destructive' 
                });
            } finally {
                setIsLoading(false);
            }
        };

        const loadFuncionarios = async () => {
            if (!open) return;
            
            setLoadingFuncionarios(true);
            try {
                const response = await funcionarioService.getAll();
                console.log('Resposta funcionários Envelopamento:', response);
                
                // Normalizar a estrutura de dados (pode vir paginada ou não)
                let funcionariosData = response.data?.data?.data || response.data?.data || response.data || response || [];
                
                // Garantir que é um array
                if (!Array.isArray(funcionariosData)) {
                    console.warn('Dados de funcionários não são um array:', funcionariosData);
                    funcionariosData = [];
                }
                
                const funcionariosAtivos = funcionariosData.filter(f => f.status === true || f.status === 1);
                setFuncionarios(funcionariosAtivos);
            } catch (error) {
                console.error('Erro ao carregar funcionários:', error);
                setFuncionarios([]);
                toast({ 
                    title: 'Erro', 
                    description: 'Erro ao carregar funcionários.', 
                    variant: 'destructive' 
                });
            } finally {
                setLoadingFuncionarios(false);
            }
        };
        
        loadData();
        loadFuncionarios();
    }, [open, toast]);

    const filteredClientes = clientes.filter(c => 
        (c.nome || c.nome_completo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nome_fantasia || c.apelido_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cpf_cnpj || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.telefone || c.telefone_principal || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        
        onSelectCliente(clienteComTipo);
        onOpenChange(false);
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
        
        onSelectCliente(funcionarioComoCliente);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] w-full">
                <DialogHeader>
                    <DialogTitle>Buscar Cliente ou Funcionário</DialogTitle>
                    <DialogDescription>Selecione um cliente ou funcionário para o envelopamento.</DialogDescription>
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
                        
                        <div className="border rounded-md max-h-[400px] overflow-y-auto">
                            <div className="space-y-1 p-2">
                                {isLoading ? (
                                    <div className="text-center py-10 text-muted-foreground">
                                        <p>Carregando clientes...</p>
                                    </div>
                                ) : filteredClientes.length > 0 ? filteredClientes.map(cliente => (
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
                                Ao selecionar um funcionário, o envelopamento será registrado como consumo interno no relatório mensal do funcionário <strong>apenas quando houver pagamentos em Crediário</strong>.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default EnvelopamentoClienteModal;