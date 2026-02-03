import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Search, Users, Edit, Trash2, Loader2, Key, KeyRound, Eye, EyeOff, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import FuncionarioFormModal from '@/components/funcionarios/FuncionarioFormModal';
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal';
import FecharMesModal from '@/components/funcionarios/FecharMesModal';
import { funcionarioService } from '@/services/funcionarioService';
import { apiDataManager } from '@/lib/apiDataManager';

const FuncionariosPage = ({ vendedorAtual }) => {
    const { toast } = useToast();
    const [funcionarios, setFuncionarios] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedFuncionario, setSelectedFuncionario] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [credentialsInfo, setCredentialsInfo] = useState({});
    const [showPassword, setShowPassword] = useState({});
    const [isFecharMesModalOpen, setIsFecharMesModalOpen] = useState(false);

    const loadFuncionarios = async () => {
        setIsLoading(true);
        try {

            
            const response = await funcionarioService.getAll();
            // Verificar se a resposta tem dados paginados ou é um array direto
            let funcionarios = [];
            if (response.data && response.data.data) {
                // Dados paginados
                funcionarios = response.data.data;
            } else if (Array.isArray(response.data)) {
                // Array direto
                funcionarios = response.data;
            } else if (Array.isArray(response)) {
                // Resposta é um array
                funcionarios = response;
            }
            setFuncionarios(funcionarios);
        } catch (error) {
            console.error('Erro ao carregar funcionários:', error);
            toast({ title: 'Erro ao carregar dados', description: 'Não foi possível carregar os funcionários.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadFuncionarios();
    }, []);

    // Carregar credenciais dos funcionários
    useEffect(() => {
        if (funcionarios.length > 0) {
            funcionarios.forEach(funcionario => {
                checkCredentials(funcionario.id);
            });
        }
    }, [funcionarios]);

    const handleOpenModal = (funcionario = null) => {
        setSelectedFuncionario(funcionario);
        setIsModalOpen(true);
    };

    const handleCloseModal = (shouldReload = false) => {
        setIsModalOpen(false);
        setSelectedFuncionario(null);
        if (shouldReload) {
            loadFuncionarios(); 
        }
    };

    const handleDeleteRequest = (funcionario) => {
        setSelectedFuncionario(funcionario);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async (justificativa) => {
        if (!selectedFuncionario) return;

        try {
            await funcionarioService.delete(selectedFuncionario.id);
            toast({ title: 'Sucesso', description: 'Funcionário removido com sucesso.' });
            loadFuncionarios();
            setIsDeleteModalOpen(false);
            setSelectedFuncionario(null);
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao remover funcionário.', variant: 'destructive' });
        }
    };

    const handleFecharMes = async (dia, mes, ano, observacoes) => {
        try {
            setIsLoading(true);
            // Enviar dia, mes, ano e observacoes para que o fechamento seja registrado no dia selecionado
            const response = await funcionarioService.fecharMes({ dia, mes, ano, observacoes });
            
            toast({ 
                title: 'Mês fechado com sucesso!', 
                description: response.message || `${response.data?.holerites_gerados || 0} holerites gerados.`, 
                variant: 'default' 
            });
            
            // Não fechar o modal imediatamente para permitir ver o histórico atualizado
            // setIsFecharMesModalOpen(false);
            
            // Recarregar funcionários para atualizar os dados
            loadFuncionarios();
            
            // Disparar evento para notificar componentes filhos sobre o fechamento do mês
            window.dispatchEvent(new CustomEvent('mesFechado', { 
                detail: { mes, ano } 
            }));
        } catch (error) {
            console.error('Erro ao fechar mês:', error);
            toast({ 
                title: 'Erro ao fechar mês', 
                description: error.response?.data?.message || 'Não foi possível fechar o mês. Tente novamente.', 
                variant: 'destructive' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    const checkCredentials = async (funcionarioId) => {
        try {
            const response = await funcionarioService.hasCredentials(funcionarioId);
            setCredentialsInfo(prev => ({
                ...prev,
                [funcionarioId]: response.data
            }));
        } catch (error) {
            console.error('Erro ao verificar credenciais:', error);
        }
    };

    const resetPassword = async (funcionarioId) => {
        try {
            const response = await funcionarioService.resetPassword(funcionarioId);
            const newPassword = response.data.new_password;
            
            // Atualizar o estado local com a nova senha
            setCredentialsInfo(prev => ({
                ...prev,
                [funcionarioId]: {
                    ...prev[funcionarioId],
                    new_password: newPassword
                }
            }));
            
            toast({ 
                title: 'Senha Resetada', 
                description: `Nova senha: ${newPassword}`,
                duration: 10000
            });
        } catch (error) {
            toast({ 
                title: 'Erro', 
                description: 'Erro ao resetar senha.', 
                variant: 'destructive' 
            });
        }
    };

    const togglePasswordVisibility = (funcionarioId) => {
        setShowPassword(prev => ({
            ...prev,
            [funcionarioId]: !prev[funcionarioId]
        }));
    };

    const filteredFuncionarios = Array.isArray(funcionarios) ? funcionarios.filter(f =>
        f.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cpf?.includes(searchTerm) ||
        f.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    return (
        <>
            <div className="p-4 md:p-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div className="flex items-center space-x-3">
                            <Users size={28} className="text-primary hidden sm:block" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">Cadastro de Funcionários</CardTitle>
                                <CardDescription className="text-sm">Gerencie sua equipe, salários e permissões.</CardDescription>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button 
                                variant="outline" 
                                onClick={() => setIsFecharMesModalOpen(true)}
                                disabled={isLoading}
                                className="w-full sm:w-auto"
                            >
                                <Calendar size={18} className="mr-2" /> Fechar Mês
                            </Button>
                            <Button 
                                onClick={() => handleOpenModal(null)}
                                className="w-full sm:w-auto"
                            >
                                <PlusCircle size={18} className="mr-2" /> Novo Funcionário
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, CPF ou cargo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-0 md:p-6">
                        {/* Visualização em Cards para Mobile */}
                        <div className="md:hidden">
                            <ScrollArea className="h-[calc(100vh-22rem)]">
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <span className="ml-2">Carregando funcionários...</span>
                                    </div>
                                ) : (
                                    <div className="space-y-4 p-4 pr-2">
                                        {filteredFuncionarios.length > 0 ? (
                                            filteredFuncionarios.map((funcionario) => {
                                                const credInfo = credentialsInfo[funcionario.id];
                                                const hasCredentials = credInfo?.has_credentials;
                                                
                                                return (
                                                    <motion.div
                                                        key={funcionario.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                                                    >
                                                        <div className="space-y-3">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Nome</p>
                                                                    <p className="font-semibold text-base break-words">{funcionario.name}</p>
                                                                </div>
                                                                <Badge variant={funcionario.status ? "default" : "destructive"} className="ml-2 flex-shrink-0">
                                                                    {funcionario.status ? 'Ativo' : 'Inativo'}
                                                                </Badge>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Cargo</p>
                                                                    <p className="text-sm font-medium">{funcionario.cargo}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Telefone</p>
                                                                    <p className="text-sm font-medium">{funcionario.telefone}</p>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400">E-mail</p>
                                                                <p className="text-sm font-medium truncate">{funcionario.email}</p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credenciais</p>
                                                                <div className="flex items-center flex-wrap gap-2">
                                                                    {hasCredentials ? (
                                                                        <>
                                                                            <Badge variant="outline" className="text-green-600 border-green-300">
                                                                                <KeyRound className="h-3 w-3 mr-1" />
                                                                                Ativo
                                                                            </Badge>
                                                                            {credInfo.new_password && (
                                                                                <div className="flex items-center gap-1 text-xs">
                                                                                    <span className="text-gray-500">Senha:</span>
                                                                                    <span className={`font-mono ${showPassword[funcionario.id] ? 'text-black' : 'text-gray-400'}`}>
                                                                                        {showPassword[funcionario.id] ? credInfo.new_password : '••••••••'}
                                                                                    </span>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-5 w-5 p-0"
                                                                                        onClick={() => togglePasswordVisibility(funcionario.id)}
                                                                                    >
                                                                                        {showPassword[funcionario.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                                                                            <Key className="h-3 w-3 mr-1" />
                                                                            Não configurado
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                                <div className="flex gap-2">
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        onClick={() => handleOpenModal(funcionario)}
                                                                        disabled={isLoading}
                                                                        className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                                                    >
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Editar
                                                                    </Button>
                                                                    <Button 
                                                                        variant="outline" 
                                                                        size="sm" 
                                                                        onClick={() => handleDeleteRequest(funcionario)}
                                                                        disabled={isLoading}
                                                                        className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Excluir
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                                <p>{searchTerm ? 'Nenhum funcionário encontrado para a busca.' : 'Nenhum funcionário cadastrado.'}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Visualização em Tabela para Desktop */}
                        <div className="hidden md:block">
                            <ScrollArea className="h-[calc(100vh-22rem)]">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <span className="ml-2">Carregando funcionários...</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nome</TableHead>
                                                <TableHead>Cargo</TableHead>
                                                <TableHead>E-mail</TableHead>
                                                <TableHead>Telefone</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Credenciais</TableHead>
                                                <TableHead className="text-right">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredFuncionarios.length > 0 ? (
                                                filteredFuncionarios.map((funcionario) => {
                                                    const credInfo = credentialsInfo[funcionario.id];
                                                    const hasCredentials = credInfo?.has_credentials;
                                                    
                                                    return (
                                                        <TableRow key={funcionario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                            <TableCell className="font-medium">{funcionario.name}</TableCell>
                                                            <TableCell>{funcionario.cargo}</TableCell>
                                                            <TableCell>{funcionario.email}</TableCell>
                                                            <TableCell>{funcionario.telefone}</TableCell>
                                                            <TableCell>
                                                                <span className={`px-2 py-1 rounded-full text-xs ${funcionario.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                    {funcionario.status ? 'Ativo' : 'Inativo'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center space-x-2">
                                                                    {hasCredentials ? (
                                                                        <>
                                                                            <span className="flex items-center text-green-600 text-xs">
                                                                                <KeyRound className="h-3 w-3 mr-1" />
                                                                                Ativo
                                                                            </span>
                                                                            {credInfo.new_password && (
                                                                                <div className="flex items-center space-x-1">
                                                                                    <span className="text-xs text-gray-500">Senha:</span>
                                                                                    <span className={`text-xs font-mono ${showPassword[funcionario.id] ? 'text-black' : 'text-gray-400'}`}>
                                                                                        {showPassword[funcionario.id] ? credInfo.new_password : '••••••••'}
                                                                                    </span>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-4 w-4 p-0"
                                                                                        onClick={() => togglePasswordVisibility(funcionario.id)}
                                                                                    >
                                                                                        {showPassword[funcionario.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="flex items-center text-gray-500 text-xs">
                                                                            <Key className="h-3 w-3 mr-1" />
                                                                            Não configurado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end space-x-2">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        onClick={() => handleOpenModal(funcionario)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="text-red-600 hover:text-red-800"
                                                                        onClick={() => handleDeleteRequest(funcionario)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-24 text-center">
                                                        {searchTerm ? 'Nenhum funcionário encontrado para a busca.' : 'Nenhum funcionário cadastrado.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                )}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <FuncionarioFormModal isOpen={isModalOpen} onClose={handleCloseModal} funcionario={selectedFuncionario} />
            <DeleteWithJustificationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Confirmar Exclusão de Funcionário"
                description={`Você está prestes a excluir o funcionário "${selectedFuncionario?.name}". Esta ação não pode ser desfeita diretamente, o item será movido para a lixeira.`}
                requirePassword={true}
                vendedorAtual={vendedorAtual}
            />
            <FecharMesModal
                isOpen={isFecharMesModalOpen}
                onClose={() => setIsFecharMesModalOpen(false)}
                onConfirm={handleFecharMes}
                isLoading={isLoading}
            />
        </>
    );
};

export default FuncionariosPage;