import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClienteList from '@/components/clientes/ClienteList';
import ClienteForm from '@/components/clientes/ClienteForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Upload, Download, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { exportToExcel, importFromExcel } from '@/lib/utils';
import { clienteService } from '@/services/api';
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


const ClientesPage = ({ vendedorAtual }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [clientes, setClientes] = useState([]);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [clienteParaDeletar, setClienteParaDeletar] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscar clientes da API - sempre do Laravel, sem fallback
      const response = await clienteService.getAll();
      
      // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
      const clientesData = response.data?.data?.data || response.data?.data || response.data || [];
      const clientesArray = Array.isArray(clientesData) ? clientesData : [];
      setClientes(clientesArray);
      
      if (location.state?.openModal) {
        handleNovoCliente();
        navigate(location.pathname, { replace: true, state: {} }); 
      }
    } catch (error) {
      console.error("Erro ao carregar dados de clientes da API:", error);
      
      // Em caso de erro, definir como array vazio
      setClientes([]);
      
      // Verificar se é um erro de autenticação
      if (error.response?.status === 401) {
        toast({ 
          title: "Erro de Autenticação", 
          description: "Sua sessão expirou. Por favor, faça login novamente.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Erro ao carregar dados", 
          description: "Não foi possível carregar os clientes do servidor.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, location.state, navigate]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results = clientes.filter(cliente =>
      (cliente.nome_completo?.toLowerCase() || cliente.nome?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (cliente.apelido_fantasia?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (cliente.codigo_cliente?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (cliente.cpf_cnpj?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (cliente.email?.toLowerCase() || '').includes(lowerSearchTerm) ||
      (cliente.telefone_principal?.toLowerCase() || '').includes(lowerSearchTerm)
    );
    setFilteredClientes(results);
  }, [searchTerm, clientes]);
  
  const [filteredClientes, setFilteredClientes] = useState(clientes);


  const handleNovoCliente = () => {
    setClienteSelecionado(null);
    setIsModalOpen(true);
  };

  const handleEditCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setIsModalOpen(true);
  };

  const handleSaveCliente = async (clienteData, cadastrarOutro = false) => {
    setIsLoading(true);
    try {
      let result;
      let isUpdate = false;
      
      // Remover campos vazios ou nulos, exceto valores booleanos e zero
      const cleanData = Object.fromEntries(
        Object.entries(clienteData).filter(([_, v]) => {
          if (v === 0 || v === false) return true; // Mantém valores zero e false
          return v != null && v !== '';
        })
      );
      
      // Verificar se é uma atualização ou criação
      if (clienteData.id && !String(clienteData.id).startsWith('cli-') && !String(clienteData.id).startsWith('local-')) {
        // É uma atualização de cliente existente no banco
        isUpdate = true;
        result = await clienteService.update(clienteData.id, cleanData);
      } else {
        // É um novo cliente
        const { id, ...dataToSend } = cleanData;
        result = await clienteService.create(dataToSend);
      }
      
      // Recarregar a lista de clientes para refletir as mudanças
      await loadData();
      
      toast({ 
        title: "Sucesso!", 
        description: `Cliente ${isUpdate ? 'atualizado' : 'cadastrado'} com sucesso no banco de dados.`,
        variant: 'success'
      });

      if (cadastrarOutro) {
        setClienteSelecionado(null); 
        setIsModalOpen(true); 
      } else {
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao salvar cliente via API:', error);
      
      // Se for um erro de validação, propagar o erro para que o ClienteForm possa tratá-lo
      if (error.isValidationError) {
        throw error; // Relança o erro para que o ClienteForm possa exibir as mensagens de validação
      }
      
      // Verificar se é um erro de autenticação
      if (error.response?.status === 401) {
        toast({
          title: 'Erro de Autenticação',
          description: 'Sua sessão expirou. Por favor, faça login novamente.',
          variant: 'destructive'
        });
      } else {
        // Para outros erros, exibir mensagem genérica
        toast({
          title: 'Erro',
          description: error.message || 'Ocorreu um erro ao salvar o cliente. Por favor, tente novamente.',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCliente = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente && cliente.id === 'cli1') {
        toast({ title: "Ação não permitida", description: "O cliente 'Consumidor Final' não pode ser excluído.", variant: "destructive" });
        return;
    }
    setClienteParaDeletar(cliente);
  };

  const confirmDeleteCliente = async () => {
    if (!clienteParaDeletar) return;
    
    setIsLoading(true);
    try {
      // Excluir cliente via API
      await clienteService.delete(clienteParaDeletar.id);
      
      toast({ 
        title: "Cliente Deletado", 
        description: `O cliente "${clienteParaDeletar.nome_completo || clienteParaDeletar.nome}" foi deletado do banco de dados.` 
      });
      
      // Recarregar a lista de clientes para refletir as mudanças
      await loadData();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      
      // Verificar se é um erro de autenticação
      if (error.response?.status === 401) {
        toast({
          title: "Erro de Autenticação",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive"
        });
      } else {
        // Exibir mensagem de erro genérica
        toast({ 
          title: "Erro ao excluir cliente", 
          description: error.response?.data?.message || "Não foi possível excluir o cliente do servidor.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsLoading(false);
      setClienteParaDeletar(null);
    }
  };
  
  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      try {
        importFromExcel(file, async (data) => {
          // Processar cada cliente importado e enviar para a API
          const importPromises = data.map(async (item) => {
            try {
              // Mapear dados para o formato da API
              const clienteData = {
                nome: item.nome_completo || item.nome,
                tipo: (item.tipo_pessoa === 'Pessoa Física' || item.tipo_pessoa === 'fisica') ? 'fisica' : 'juridica',
                cpf_cnpj: item.cpf_cnpj || '',
                email: item.email || '',
                telefone: item.telefone_principal || '',
                celular: item.celular || '',
                endereco: item.endereco?.logradouro || '',
                bairro: item.endereco?.bairro || '',
                cidade: item.endereco?.cidade || '',
                estado: item.endereco?.estado || '',
                cep: item.endereco?.cep || '',
                ativo: item.status === undefined ? 1 : (item.status ? 1 : 0),
                // Outros campos conforme necessário
              };
              
              // Enviar para API
              const response = await clienteService.create(clienteData);
              return response.data;
            } catch (error) {
              console.error('Erro ao importar cliente:', error);
              throw error;
            }
          });
          
          try {
            await Promise.all(importPromises);
            toast({ 
              title: "Importação Concluída", 
              description: `${data.length} clientes importados para o banco de dados.` 
            });
            // Recarregar a lista de clientes
            await loadData();
          } catch (error) {
            toast({ 
              title: "Erro na Importação", 
              description: "Alguns clientes não puderam ser importados. Verifique os dados e tente novamente.", 
              variant: "destructive" 
            });
          }
          
          setIsLoading(false);
        }, (error) => {
          toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
          setIsLoading(false);
        });
      } catch (error) {
        toast({ title: "Erro na Importação", description: error.message, variant: "destructive" });
        setIsLoading(false);
      }
      event.target.value = null;
    }
  };

  const handleExportExcel = () => {
    exportToExcel(clientes, 'clientes', 'Lista_Clientes.xlsx');
    toast({ title: "Exportação Iniciada", description: "O download da planilha de clientes começará em breve." });
  };


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Gerenciamento de Clientes</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-64 bg-white dark:bg-gray-700"
            />
          </div>
          <Button 
            onClick={loadData} 
            variant="outline" 
            className="ml-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            className="ml-2"
            disabled={isLoading || clientes.length === 0}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Exportar
          </Button>
          <input
            type="file"
            id="import-file"
            accept=".xlsx, .xls, .csv"
            onChange={handleImportExcel}
            className="hidden"
            disabled={isLoading}
          />
          <Button
            variant="outline"
            className="ml-2"
            onClick={() => document.getElementById('import-file').click()}
            disabled={isLoading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button onClick={handleNovoCliente} className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white w-full md:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Cliente
          </Button>
        </div>
      </div>
      
      {isLoading ? (
         <div className="flex justify-center items-center h-64">
          <p>Carregando clientes...</p>
        </div>
      ) : (
        <ClienteList 
          clientes={filteredClientes} 
          searchTerm={searchTerm}
          handleEditCliente={handleEditCliente}
          handleDeleteCliente={handleDeleteCliente}
        />
      )}

      {isModalOpen && (
        <ClienteForm
          isOpen={isModalOpen}
          clienteEmEdicao={clienteSelecionado}
          onSave={handleSaveCliente}
          onClose={() => {
            setIsModalOpen(false);
            setClienteSelecionado(null);
          }}
          vendedorAtual={vendedorAtual}
          showSaveAndNewButton={true}
        />
      )}

      <AlertDialog open={!!clienteParaDeletar} onOpenChange={() => setClienteParaDeletar(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá deletar permanentemente o cliente "{clienteParaDeletar?.nome_completo || clienteParaDeletar?.nome}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteCliente} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="mr-2 h-4 w-4" /> Deletar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ClientesPage;