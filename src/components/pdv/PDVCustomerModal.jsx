import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Users, UserCheck } from 'lucide-react';
import { apiDataManager } from '@/lib/apiDataManager';
import { funcionarioService } from '@/services/api';

const PDVCustomerModal = ({ isOpen, setIsOpen, clientes, setClientes, setClienteSelecionado, setClienteNomeLivre }) => {
  const { toast } = useToast();
  const [searchClienteTerm, setSearchClienteTerm] = useState('');
  const [searchFuncionarioTerm, setSearchFuncionarioTerm] = useState('');
  const [novoCliente, setNovoCliente] = useState({ nome: '', cpf: '', telefone: ''});
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);

  // Carregar funcionários quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadFuncionarios();
    }
  }, [isOpen]);

  const loadFuncionarios = async () => {
    setLoadingFuncionarios(true);
    try {
      const response = await funcionarioService.getAll();
      console.log('Resposta completa funcionários:', response);
      
      // Normalizar a estrutura de dados (pode vir paginada ou não)
      let funcionariosData = response.data?.data?.data || response.data?.data || response.data || response || [];
      
      // Garantir que é um array
      if (!Array.isArray(funcionariosData)) {
        console.warn('Dados de funcionários não são um array:', funcionariosData);
        funcionariosData = [];
      }
      
      console.log('Funcionários normalizados:', funcionariosData);
      const funcionariosAtivos = funcionariosData.filter(f => f.status === true || f.status === 1);
      console.log('Funcionários ativos:', funcionariosAtivos);
      console.log('Primeiro funcionário exemplo:', funcionariosAtivos[0]);
      setFuncionarios(funcionariosAtivos);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar funcionários.', variant: 'destructive' });
      setFuncionarios([]);
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  const handleSelecionarCliente = (cliente) => {
    // Adicionar identificador de tipo para clientes normais
    const clienteComTipo = {
      ...cliente,
      tipo_pessoa: 'cliente', // Identificador do tipo
      isFuncionario: false // Garantir que não é funcionário
    };
    
    setClienteSelecionado(clienteComTipo);
    setClienteNomeLivre(''); 
    setIsOpen(false);
    setSearchClienteTerm('');
    setSearchFuncionarioTerm('');
  };

  const handleSelecionarFuncionario = (funcionario) => {
    // Converter funcionário para formato de cliente com prefixo para evitar conflito de IDs
    const funcionarioComoCliente = {
      id: `funcionario_${funcionario.id}`, // Prefixo único para funcionários
      funcionario_id: funcionario.id, // ID original do funcionário
      nome: funcionario.name || funcionario.nome,
      nome_completo: funcionario.name || funcionario.nome,
      cpf: funcionario.cpf,
      cpf_cnpj: funcionario.cpf,
      telefone: funcionario.telefone || funcionario.celular || funcionario.whatsapp,
      telefone_principal: funcionario.telefone || funcionario.celular || funcionario.whatsapp,
      email: funcionario.email,
      cargo: funcionario.cargo,
      tipo_pessoa: 'funcionario', // Identificador do tipo
      isFuncionario: true, // Flag para identificação rápida
      salario_base: funcionario.salario_base || 0,
      permite_receber_comissao: funcionario.permite_receber_comissao || false,
      // Funcionários não participam do programa de pontos
      pontos_disponivel: 0,
      pontos_total: 0,
      participaProgramaPontos: false
    };
    
    setClienteSelecionado(funcionarioComoCliente);
    setClienteNomeLivre(''); 
    setIsOpen(false);
    setSearchClienteTerm('');
    setSearchFuncionarioTerm('');
  };

  const handleSalvarNovoCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone) {
        toast({ title: "Dados Incompletos", description: "Nome e telefone são obrigatórios para novo cliente.", variant: "destructive" });
        return;
    }
    const clienteParaSalvar = { 
      ...novoCliente, 
      id: `cliente_novo_${Date.now()}`, // Prefixo único para novos clientes
      tipo_pessoa: 'cliente',
      isFuncionario: false
    };
    const clientesAtualizados = [...(Array.isArray(clientes) ? clientes : []), clienteParaSalvar];
    setClientes(clientesAtualizados);
    await apiDataManager.setItem('clientes', clientesAtualizados);
    setClienteSelecionado(clienteParaSalvar);
    setClienteNomeLivre('');
    setNovoCliente({ nome: '', cpf: '', telefone: ''});
    setIsOpen(false);
    toast({ title: "Cliente Salvo!", description: `${clienteParaSalvar.nome} cadastrado e selecionado.` });
  };

  const filteredClientes = (Array.isArray(clientes) ? clientes : []).filter(c => {
    if (!c) return false;
    const nome = c.nome || c.nome_completo || '';
    const cpf = c.cpf || c.cpf_cnpj || '';
    const telefone = c.telefone || c.telefone_principal || '';
    const searchTerm = searchClienteTerm.toLowerCase();
    
    return nome.toLowerCase().includes(searchTerm) ||
           cpf.includes(searchClienteTerm) ||
           telefone.includes(searchClienteTerm);
  });

  const filteredFuncionarios = funcionarios.filter(f => {
    if (!f) return false;
    const nome = f.name || f.nome || '';
    const cpf = f.cpf || '';
    const telefone = f.telefone || f.celular || f.whatsapp || '';
    const cargo = f.cargo || '';
    const searchTerm = searchFuncionarioTerm.toLowerCase();
    
    return nome.toLowerCase().includes(searchTerm) ||
           cpf.includes(searchFuncionarioTerm) ||
           telefone.includes(searchFuncionarioTerm) ||
           cargo.toLowerCase().includes(searchTerm);
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Cliente ou Funcionário</DialogTitle>
          <DialogDescription>Busque um cliente, funcionário existente ou cadastre um novo cliente.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="clientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <Users size={16} />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="funcionarios" className="flex items-center gap-2">
              <UserCheck size={16} />
              Funcionários
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="clientes" className="space-y-3">
            <Input 
              placeholder="Buscar por nome, CPF ou telefone" 
              value={searchClienteTerm} 
              onChange={(e) => setSearchClienteTerm(e.target.value)} 
            />
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {filteredClientes.map(cli => (
                <div key={cli.id} onClick={() => handleSelecionarCliente(cli)} className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm">
                  <p className="font-medium">{cli.nome || cli.nome_completo || 'Nome não informado'}</p>
                  <p className="text-xs text-muted-foreground">
                    {cli.cpf || cli.cpf_cnpj || 'CPF não informado'} - {cli.telefone || cli.telefone_principal || 'Telefone não informado'}
                  </p>
                </div>
              ))}
              {filteredClientes.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">Nenhum cliente encontrado.</p>}
            </ScrollArea>
            
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-base">Novo Cliente</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                <Input placeholder="Nome completo *" value={novoCliente.nome} onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})} />
                <Input placeholder="CPF (opcional)" value={novoCliente.cpf} onChange={(e) => setNovoCliente({...novoCliente, cpf: e.target.value})} />
                <Input placeholder="Telefone *" value={novoCliente.telefone} onChange={(e) => setNovoCliente({...novoCliente, telefone: e.target.value})} />
                <Button onClick={handleSalvarNovoCliente} className="w-full bg-orange-500 hover:bg-orange-600">Salvar Novo Cliente</Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="funcionarios" className="space-y-3">
            <Input 
              placeholder="Buscar por nome, CPF, telefone ou cargo" 
              value={searchFuncionarioTerm} 
              onChange={(e) => setSearchFuncionarioTerm(e.target.value)} 
            />
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {loadingFuncionarios ? (
                <p className="text-sm text-center text-muted-foreground py-4">Carregando funcionários...</p>
              ) : (
                <>
                  {filteredFuncionarios.map(func => (
                    <div key={func.id} onClick={() => handleSelecionarFuncionario(func)} className="p-2 hover:bg-accent rounded-md cursor-pointer text-sm border-l-4 border-l-blue-500 mb-2">
                      <div className="flex items-center gap-2">
                        <UserCheck size={16} className="text-blue-500" />
                        <div className="flex-1">
                          <p className="font-medium">{func.name || func.nome || 'Nome não informado'}</p>
                          <p className="text-xs text-muted-foreground">
                            {func.cargo || 'Cargo não definido'}
                            {func.cpf && ` - CPF: ${func.cpf}`}
                          </p>
                          {(func.telefone || func.celular || func.whatsapp) && (
                            <p className="text-xs text-muted-foreground">
                              Tel: {func.telefone || func.celular || func.whatsapp}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredFuncionarios.length === 0 && !loadingFuncionarios && (
                    <p className="text-sm text-center text-muted-foreground py-4">Nenhum funcionário encontrado.</p>
                  )}
                </>
              )}
            </ScrollArea>
            
            <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
              <p className="text-sm text-blue-700">
                <UserCheck size={16} className="inline mr-1" />
                Ao selecionar um funcionário, a compra será registrada como consumo interno no relatório mensal do funcionário <strong>apenas quando houver pagamentos em Crediário</strong>.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PDVCustomerModal;