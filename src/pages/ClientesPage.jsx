import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClienteList from '@/components/clientes/ClienteList';
import ClienteForm from '@/components/clientes/ClienteForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Upload, Download, Trash2, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { safeJsonParse } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { exportToExcel, importFromExcel } from '@/lib/utils';
import { clienteService } from '@/services/api';
import api from '@/services/api';
import PermissionGate, { useActionPermissions } from '@/components/PermissionGate';
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


const PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  // Refs para paginação server-side
  const searchTimerRef = useRef(null);
  const fetchCounterRef = useRef(0);
  const currentPageRef = useRef(1);
  const isInitialMount = useRef(true);
  const searchTermRef = useRef('');

  currentPageRef.current = currentPage;
  searchTermRef.current = searchTerm;
  
  // Verificar permissões para ações específicas
  const { canCreate, canEdit, canDelete } = useActionPermissions('gerenciar_clientes', {
    create: 'clientes_cadastrar',
    edit: 'clientes_editar',
    delete: 'clientes_excluir'
  });

  // Busca paginada no servidor
  const fetchClientes = useCallback(async (page = 1) => {
    const fetchId = ++fetchCounterRef.current;
    setIsLoading(true);

    try {
      const params = {
        page,
        per_page: PER_PAGE,
        sort_by: 'nome',
        sort_order: 'asc',
      };

      const search = searchTermRef.current;
      if (search) params.search = search;

      const response = await api.get('/api/clientes', { params });

      if (fetchCounterRef.current !== fetchId) return;

      const paginatedData = response?.data?.data;

      if (paginatedData) {
        const clientesArray = Array.isArray(paginatedData.data) ? paginatedData.data : [];
        setPagination({
          current_page: paginatedData.current_page || page,
          last_page: paginatedData.last_page || 1,
          total: paginatedData.total || 0,
          per_page: paginatedData.per_page || PER_PAGE,
          from: paginatedData.from || 0,
          to: paginatedData.to || 0,
        });
        setClientes(clientesArray);
        setCurrentPage(page);
      }

      if (page === 1 && location.state?.openModal) {
        handleNovoCliente();
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (error) {
      if (fetchCounterRef.current !== fetchId) return;
      console.error("Erro ao carregar dados de clientes da API:", error);
      setClientes([]);

      if (error.response?.status === 401) {
        toast({ title: "Erro de Autenticação", description: "Sua sessão expirou.", variant: "destructive" });
      } else {
        toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar os clientes.", variant: "destructive" });
      }
    } finally {
      if (fetchCounterRef.current === fetchId) setIsLoading(false);
    }
  }, [toast, location.state, navigate]);

  // Carga inicial
  useEffect(() => {
    fetchClientes(1);
  }, [fetchClientes]);

  // Busca debounced
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { fetchClientes(1); }, 500);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchTerm, fetchClientes]);

  const handlePageChange = useCallback((page) => {
    fetchClientes(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fetchClientes]);


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
      await fetchClientes(currentPageRef.current);
      
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
      await fetchClientes(currentPageRef.current);
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
            await fetchClientes(1);
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

  const handleExportExcel = async () => {
    try {
      // Para exportação, buscar todos os clientes
      const response = await api.get('/api/clientes', { params: { per_page: 1000 } });
      const allClientes = response?.data?.data?.data || clientes;
      exportToExcel(allClientes, 'clientes', 'Lista_Clientes.xlsx');
    } catch {
      exportToExcel(clientes, 'clientes', 'Lista_Clientes.xlsx');
    }
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
            onClick={() => fetchClientes(currentPageRef.current)} 
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
          <PermissionGate permission="clientes_cadastrar">
            <Button
              variant="outline"
              className="ml-2"
              onClick={() => document.getElementById('import-file').click()}
              disabled={isLoading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          </PermissionGate>
          <PermissionGate permission="clientes_cadastrar">
            <Button onClick={handleNovoCliente} className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white w-full md:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Novo Cliente
            </Button>
          </PermissionGate>
        </div>
      </div>
      
      {isLoading ? (
         <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-2" />
          <p>Carregando clientes...</p>
        </div>
      ) : (
        <ClienteList 
          clientes={clientes} 
          searchTerm={searchTerm}
          handleEditCliente={handleEditCliente}
          handleDeleteCliente={handleDeleteCliente}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Paginação */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 mt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exibindo {pagination.from}–{pagination.to} de {pagination.total} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage <= 1 || isLoading}>
              Primeira
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1 || isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm font-medium px-3">
              Página {currentPage} de {pagination.last_page}
            </span>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pagination.last_page || isLoading}>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.last_page)} disabled={currentPage >= pagination.last_page || isLoading}>
              Última
            </Button>
          </div>
        </div>
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