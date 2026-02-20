import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClienteList from '@/components/clientes/ClienteList';
import ClienteForm from '@/components/clientes/ClienteForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Upload, Download, Trash2, Loader2, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, RefreshCcw, X } from 'lucide-react';
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
  const [forceDeleteInfo, setForceDeleteInfo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [importResult, setImportResult] = useState(null);

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

  const confirmDeleteCliente = async (forcar = false) => {
    const cliente = forcar ? forceDeleteInfo?.cliente : clienteParaDeletar;
    if (!cliente) return;
    
    setIsLoading(true);
    try {
      await clienteService.delete(cliente.id, { forcar });
      
      toast({ 
        title: "Cliente Deletado", 
        description: `O cliente "${cliente.nome_completo || cliente.nome}" foi deletado do banco de dados.` 
      });
      
      setClienteParaDeletar(null);
      setForceDeleteInfo(null);
      await fetchClientes(currentPageRef.current);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      
      if (error.response?.status === 401) {
        toast({
          title: "Erro de Autenticação",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive"
        });
      } else if (error.response?.status === 422 && !forcar) {
        setForceDeleteInfo({
          message: error.response?.data?.message,
          cliente
        });
        return;
      } else {
        toast({ 
          title: "Erro ao excluir cliente", 
          description: error.response?.data?.message || "Não foi possível excluir o cliente do servidor.", 
          variant: "destructive" 
        });
      }
      setClienteParaDeletar(null);
      setForceDeleteInfo(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const data = await importFromExcel(file);

      if (!data || data.length === 0) {
        toast({ title: "Importação Vazia", description: "O arquivo não contém dados para importar.", variant: "destructive" });
        setIsLoading(false);
        event.target.value = null;
        return;
      }

      const camposIgnorados = [
        'id', 'tenant_id', 'created_at', 'updated_at', 'deleted_at',
        'codigo_cliente', 'total_pontos_ganhos', 'pontos_utilizados',
        'pontos_expirados', 'saldo_pontos_atual'
      ];

      const toBool = (val) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'number') return val !== 0;
        const str = String(val ?? '').toLowerCase().trim();
        return ['true', '1', 'sim', 'yes', 's', 'y', 'ativo', 'ativa'].includes(str);
      };

      const normalizeDate = (val) => {
        if (!val) return null;
        if (typeof val === 'number' && val > 10000) {
          const date = new Date((val - 25569) * 86400 * 1000);
          if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
          return null;
        }
        const date = new Date(val);
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
        return null;
      };

      // Preparar todos os itens normalizados
      const itens = [];
      for (const item of data) {
        const clienteData = {};
        for (const [key, value] of Object.entries(item)) {
          if (camposIgnorados.includes(key)) continue;
          if (value === null || value === undefined || value === '') continue;
          clienteData[key] = value;
        }

        if (!clienteData.nome_completo && !clienteData.nome) continue;

        if (clienteData.status !== undefined) clienteData.status = toBool(clienteData.status);
        else clienteData.status = true;

        if (clienteData.autorizado_prazo !== undefined) clienteData.autorizado_prazo = toBool(clienteData.autorizado_prazo);
        else clienteData.autorizado_prazo = false;

        if (clienteData.is_terceirizado !== undefined) clienteData.is_terceirizado = toBool(clienteData.is_terceirizado);
        else clienteData.is_terceirizado = false;

        if (clienteData.tipo_pessoa) {
          const tipo = clienteData.tipo_pessoa.toLowerCase().trim();
          if (['pessoa física', 'pessoa fisica', 'pf', 'física', 'fisica', 'f'].includes(tipo)) {
            clienteData.tipo_pessoa = 'Pessoa Física';
          } else if (['pessoa jurídica', 'pessoa juridica', 'pj', 'jurídica', 'juridica', 'j'].includes(tipo)) {
            clienteData.tipo_pessoa = 'Pessoa Jurídica';
          }
        }
        if (!clienteData.tipo_pessoa || !['Pessoa Física', 'Pessoa Jurídica'].includes(clienteData.tipo_pessoa)) {
          clienteData.tipo_pessoa = 'Pessoa Física';
        }

        if (clienteData.data_nascimento_abertura) {
          clienteData.data_nascimento_abertura = normalizeDate(clienteData.data_nascimento_abertura);
          if (!clienteData.data_nascimento_abertura) delete clienteData.data_nascimento_abertura;
        }

        itens.push(clienteData);
      }

      if (itens.length === 0) {
        toast({ title: "Importação Vazia", description: "Nenhum cliente válido encontrado no arquivo.", variant: "destructive" });
        setIsLoading(false);
        event.target.value = null;
        return;
      }

      const BATCH_SIZE = 50;
      const totalItens = itens.length;
      const totalBatches = Math.ceil(totalItens / BATCH_SIZE);
      let totalImportados = 0;
      let totalIgnorados = 0;
      let allImportadosNomes = [];
      let allIgnoradosNomes = [];
      let allErros = [];

      setImportProgress({ current: 0, total: totalItens, importados: 0, ignorados: 0, erros: 0 });

      for (let i = 0; i < totalBatches; i++) {
        const batch = itens.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        const enviados = Math.min((i + 1) * BATCH_SIZE, totalItens);

        try {
          const response = await api.post('/api/clientes/importar', { itens: batch });
          const result = response.data?.data || {};
          totalImportados += result.importados || 0;
          totalIgnorados += result.ignorados || 0;
          if (result.importados_nomes?.length) allImportadosNomes.push(...result.importados_nomes);
          if (result.ignorados_nomes?.length) allIgnoradosNomes.push(...result.ignorados_nomes);
          if (result.erros?.length) allErros.push(...result.erros);
        } catch (err) {
          allErros.push({ nome: `Lote ${i + 1}`, erro: err.message });
        }

        setImportProgress({
          current: enviados,
          total: totalItens,
          importados: totalImportados,
          ignorados: totalIgnorados,
          erros: allErros.length,
        });
      }

      setImportProgress(null);

      setImportResult({
        importados: totalImportados,
        ignorados: totalIgnorados,
        importadosNomes: allImportadosNomes,
        ignoradosNomes: allIgnoradosNomes,
        erros: allErros,
        total: totalItens,
      });

      if (totalImportados > 0) {
        await fetchClientes(1);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo de importação:', error);
      toast({ title: "Erro na Importação", description: error.message || "Não foi possível ler o arquivo.", variant: "destructive" });
      setImportProgress(null);
    } finally {
      setIsLoading(false);
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
      
      {importProgress && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                Importando clientes...
              </span>
            </div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {importProgress.current} de {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.round((importProgress.current / importProgress.total) * 100)}%` }}
            />
          </div>
          <div className="flex gap-5 text-sm">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> {importProgress.importados} novo(s)
            </span>
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-3.5 w-3.5" /> {importProgress.ignorados} ignorado(s)
            </span>
            {importProgress.erros > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5" /> {importProgress.erros} erro(s)
              </span>
            )}
          </div>
        </div>
      )}

      {isLoading && !importProgress ? (
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

      <AlertDialog open={!!clienteParaDeletar && !forceDeleteInfo} onOpenChange={() => setClienteParaDeletar(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isso irá deletar permanentemente o cliente "{clienteParaDeletar?.nome_completo || clienteParaDeletar?.nome}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmDeleteCliente(false)} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="mr-2 h-4 w-4" /> Deletar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!forceDeleteInfo} onOpenChange={(open) => { if (!open) { setForceDeleteInfo(null); setClienteParaDeletar(null); } }}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">Exclusao com registros vinculados</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                    <span className="block">{forceDeleteInfo?.message}</span>
                    <span className="block font-semibold text-red-500">
                      Deseja forcar a exclusao? Todos os registros vinculados serao movidos para a lixeira ou desvinculados.
                    </span>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    confirmDeleteCliente(true);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Forcar Exclusao
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Resultado da Importação */}
      {importResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setImportResult(null)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {importResult.erros.length === 0 ? (
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Resultado da Importação</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{importResult.total} cliente(s) processado(s)</p>
                </div>
              </div>
              <button onClick={() => setImportResult(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Resumo em cards */}
            <div className="grid grid-cols-3 gap-3 p-5">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.importados}</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Novos</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${importResult.ignorados > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'}`}>
                <p className={`text-2xl font-bold ${importResult.ignorados > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`}>{importResult.ignorados}</p>
                <p className={`text-xs mt-1 ${importResult.ignorados > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-500 dark:text-gray-400'}`}>Ignorados</p>
              </div>
              <div className={`rounded-lg p-3 text-center border ${importResult.erros.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600'}`}>
                <p className={`text-2xl font-bold ${importResult.erros.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>{importResult.erros.length}</p>
                <p className={`text-xs mt-1 ${importResult.erros.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}`}>Erros</p>
              </div>
            </div>

            {/* Listas detalhadas */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
              {importResult.importadosNomes.length > 0 && (
                <details open className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-green-700 dark:text-green-400 select-none">
                    <CheckCircle2 className="h-4 w-4" />
                    Novos clientes ({importResult.importadosNomes.length})
                  </summary>
                  <ul className="mt-2 ml-6 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.importadosNomes.map((nome, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        {nome}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {importResult.ignoradosNomes.length > 0 && (
                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-yellow-700 dark:text-yellow-400 select-none">
                    <AlertCircle className="h-4 w-4" />
                    Clientes ignorados — já cadastrados ({importResult.ignoradosNomes.length})
                  </summary>
                  <ul className="mt-2 ml-6 space-y-1 max-h-40 overflow-y-auto">
                    {importResult.ignoradosNomes.map((nome, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                        {nome}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {importResult.erros.length > 0 && (
                <details open className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-red-700 dark:text-red-400 select-none">
                    <AlertCircle className="h-4 w-4" />
                    Erros ({importResult.erros.length})
                  </summary>
                  <ul className="mt-2 ml-6 space-y-1.5 max-h-40 overflow-y-auto">
                    {importResult.erros.map((err, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-200">{err.nome || err}:</span>{' '}
                        <span className="text-red-600 dark:text-red-400">{err.erro || ''}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={() => setImportResult(null)} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ClientesPage;