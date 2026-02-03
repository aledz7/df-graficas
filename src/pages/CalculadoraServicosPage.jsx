import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Edit, Trash2, Wrench, DollarSign, Package } from 'lucide-react';
import { apiDataManager } from '@/lib/apiDataManager';
import { calculadoraService, acabamentoService } from '@/services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CalculadoraServicosPage = () => {
  const { toast } = useToast();
  const [servicos, setServicos] = useState([]);
  const [currentServico, setCurrentServico] = useState({ id: '', nome: '', preco: '', unidade: 'm²', descricao: '', ativo: true, tipo: 'calculadora' });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const STORAGE_KEY = 'calculadora_servicos_adicionais';

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar serviços da calculadora
        const servicosResponse = await calculadoraService.getServicosAdicionais();
        let servicosCalculadora = [];
        
        if (servicosResponse?.data?.success && servicosResponse.data.data) {
          servicosCalculadora = Array.isArray(servicosResponse.data.data) ? servicosResponse.data.data : [];
        }
        
        // Carregar acabamentos-serviços
        const acabamentosResponse = await acabamentoService.getAll();
        let acabamentosServicos = [];
        
        if (acabamentosResponse?.data) {
          const acabamentosArray = Array.isArray(acabamentosResponse.data) ? acabamentosResponse.data : [];
          // Converter acabamentos para o formato de serviços
          acabamentosServicos = acabamentosArray.map(acab => ({
            id: `acab_${acab.id}`,
            nome: acab.nome_acabamento,
            preco: acab.valor_m2 || '0',
            unidade: 'm²',
            descricao: acab.observacoes || `Acabamento: ${acab.nome_acabamento}`,
            ativo: acab.ativo !== false,
            tipo: 'acabamento',
            origem: 'acabamentos-servicos'
          }));
        }
        
        // Combinar serviços da calculadora e acabamentos
        const todosServicos = [...servicosCalculadora, ...acabamentosServicos];
        
        if (todosServicos.length > 0) {
          setServicos(todosServicos);
          // Também salvar no localStorage como backup
          await apiDataManager.setData(STORAGE_KEY, todosServicos);
        } else {
          // Fallback para localStorage
          const storedServicos = await apiDataManager.getDataAsArray(STORAGE_KEY);
          setServicos(storedServicos);
        }
      } catch (error) {
        console.error('Erro ao carregar serviços adicionais:', error);
        // Fallback para localStorage se a API falhar
        const storedServicos = await apiDataManager.getDataAsArray(STORAGE_KEY);
        setServicos(storedServicos);
      }
    };
    
    loadData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'preco') {
      const sanitizedValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
      setCurrentServico(prev => ({ ...prev, [name]: sanitizedValue }));
    } else {
      setCurrentServico(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (checked) => {
    setCurrentServico(prev => ({ ...prev, ativo: checked }));
  };

  const resetForm = () => {
    setCurrentServico({ id: '', nome: '', preco: '', unidade: 'm²', descricao: '', ativo: true, tipo: 'calculadora' });
    setIsEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentServico.nome.trim()) {
      toast({ title: "Erro", description: "O nome do serviço é obrigatório.", variant: "destructive" });
      return;
    }
    const valor = parseFloat(currentServico.preco);
    if (isNaN(valor) || valor < 0) {
      toast({ title: "Erro", description: "O valor por m² deve ser um número válido.", variant: "destructive" });
      return;
    }

    try {
      let servicoData = {
        nome: currentServico.nome,
        preco: valor.toFixed(2),
        unidade: 'm²',
        descricao: currentServico.descricao || `Serviço adicional: ${currentServico.nome}`,
        ativo: currentServico.ativo,
        tipo: 'calculadora'
      };

      let updatedServicos;
      
      if (isEditing) {
        // Para edição, incluímos o ID no objeto
        servicoData.id = currentServico.id;
        
        // Atualiza no backend
        const response = await calculadoraService.criarServicoAdicional(servicoData);
        
        // Extrai o serviço atualizado da resposta da API
        const servicoAtualizado = response?.data?.data || response?.data?.success && response?.data?.data;
        
        // Atualiza o estado local
        if (servicoAtualizado) {
          // Se temos dados da API, usamos eles
          updatedServicos = servicos.map(serv => 
            serv.id === currentServico.id ? servicoAtualizado : serv
          );
        } else {
          // Fallback para dados locais
          updatedServicos = servicos.map(serv => 
            serv.id === currentServico.id ? { ...currentServico, preco: valor.toFixed(2) } : serv
          );
        }
        
        toast({ title: "Sucesso!", description: "Serviço atualizado." });
      } else {
        // Para novo serviço
        const response = await calculadoraService.criarServicoAdicional(servicoData);        
        // Extrai o serviço criado da resposta da API
        const servicoCriado = response?.data?.data;
        
        let novoServico;
        if (servicoCriado) {
          // Se a API retornou o serviço criado, usamos ele
          novoServico = servicoCriado;
        } else {
          // Fallback para criar localmente
          const id = response?.data?.id || `serv-${Date.now()}`;
          novoServico = { ...servicoData, id };
        }
        
        updatedServicos = [...servicos, novoServico];
        toast({ title: "Sucesso!", description: "Novo serviço adicionado." });
      }
      
      setServicos(updatedServicos);
      
      // Mantém uma cópia no localStorage como backup
      await apiDataManager.setData(STORAGE_KEY, updatedServicos);
      
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar o serviço. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  const handleEdit = (servico) => {
    // Não permitir edição de acabamentos diretamente da calculadora
    if (servico.tipo === 'acabamento') {
      toast({
        title: "Informação",
        description: "Acabamentos devem ser editados na página de Configuração de Acabamentos.",
        variant: "default"
      });
      return;
    }
    
    setCurrentServico(servico);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleToggleActive = async (id) => {
    try {
      // Encontra o serviço que será atualizado
      const servicoToUpdate = servicos.find(serv => serv.id === id);
      if (!servicoToUpdate) return;
      
      // Não permitir alteração de status de acabamentos diretamente da calculadora
      if (servicoToUpdate.tipo === 'acabamento') {
        toast({
          title: "Informação",
          description: "Status de acabamentos deve ser alterado na página de Configuração de Acabamentos.",
          variant: "default"
        });
        return;
      }
      
      // Cria uma cópia com o status invertido
      const updatedServico = { 
        nome: servicoToUpdate.nome,
        preco: servicoToUpdate.preco,
        unidade: servicoToUpdate.unidade || 'm²',
        descricao: servicoToUpdate.descricao || `Serviço adicional: ${servicoToUpdate.nome}`,
        ativo: !servicoToUpdate.ativo,
        tipo: 'calculadora',
        id: servicoToUpdate.id
      };
      
      // Atualiza no backend
      await calculadoraService.criarServicoAdicional(updatedServico);
      
      // Atualiza o estado local
      const updatedServicos = servicos.map(serv =>
        serv.id === id ? { ...serv, ativo: !serv.ativo } : serv
      );
      
      setServicos(updatedServicos);
      
      // Mantém uma cópia no localStorage como backup
      await apiDataManager.setData(STORAGE_KEY, updatedServicos);
      
      toast({ 
        title: "Status Alterado", 
        description: `O serviço foi ${updatedServicos.find(a=>a.id===id).ativo ? 'ativado' : 'desativado'}.` 
      });
    } catch (error) {
      console.error('Erro ao alterar status do serviço:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível alterar o status do serviço. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      // Encontra o serviço a ser excluído
      const servicoToDelete = servicos.find(serv => serv.id === id);
      
      // Não permitir exclusão de acabamentos diretamente da calculadora
      if (servicoToDelete && servicoToDelete.tipo === 'acabamento') {
        toast({
          title: "Informação",
          description: "Acabamentos devem ser excluídos na página de Configuração de Acabamentos.",
          variant: "default"
        });
        return;
      }
      
      if (servicoToDelete) {
        // Envia para o backend com flag de exclusão
        await calculadoraService.criarServicoAdicional({ 
          nome: servicoToDelete.nome,
          preco: servicoToDelete.preco,
          unidade: servicoToDelete.unidade || 'm²',
          descricao: servicoToDelete.descricao || `Serviço adicional: ${servicoToDelete.nome}`,
          ativo: false,
          tipo: 'calculadora',
          deleted: true,
          id: String(servicoToDelete.id) // Garante que é string
        });
      }
      
      // Atualiza o estado local
      const updatedServicos = servicos.filter(serv => serv.id !== id);
      setServicos(updatedServicos);
      
      // Mantém uma cópia no localStorage como backup
      await apiDataManager.setData(STORAGE_KEY, updatedServicos);
      
      toast({ title: "Excluído!", description: "Serviço removido com sucesso.", variant: "destructive" });
    } catch (error) {
      console.error('Erro ao excluir serviço:', error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível excluir o serviço. Tente novamente.", 
        variant: "destructive" 
      });
    }
  };

  // Garantir que servicos seja sempre um array antes de filtrar
  const servicosArray = Array.isArray(servicos) ? servicos : [];
  
  
  // Mapear os serviços para garantir que todos os campos necessários existam
  const normalizedServicos = servicosArray.map(serv => {
    // Criar objeto normalizado
    const normalizedServ = {
      id: serv.id || '',
      nome: serv.nome || serv.nome_servico || '',  // Compatibilidade com dados antigos
      preco: serv.preco || serv.valor_m2 || '0',   // Compatibilidade com dados antigos
      unidade: serv.unidade || 'm²',
      descricao: serv.descricao || `Serviço adicional: ${serv.nome || serv.nome_servico || ''}`,
      ativo: typeof serv.ativo !== 'undefined' ? serv.ativo : true,
      tipo: serv.tipo || 'calculadora'  // Default para calculadora se não especificado
    };
    
    return normalizedServ;
  });
  
  const filteredServicos = normalizedServicos.filter(serv =>
    serv.nome.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (serv.tipo === 'calculadora' || serv.tipo === 'acabamento')  // Incluir serviços da calculadora e acabamentos
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-4 md:p-6"
    >
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <Wrench size={36} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Serviços Adicionais da Calculadora</h1>
            <p className="text-muted-foreground">Adicione, edite ou desative os serviços para a calculadora de adesivos.</p>
          </div>
        </div>
      </header>

      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{isEditing ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nome">Nome do Serviço</Label>
                <Input
                  id="nome"
                  name="nome"
                  value={currentServico.nome}
                  onChange={handleInputChange}
                  placeholder="Ex: Laminação Fosca"
                  required
                />
              </div>
              <div>
                <Label htmlFor="preco">Valor por m² (R$)</Label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="preco"
                    name="preco"
                    type="text"
                    inputMode="decimal"
                    value={currentServico.preco}
                    onChange={handleInputChange}
                    placeholder="10.50"
                    required
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={currentServico.ativo}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="ativo">Ativo (aparecerá na Calculadora)</Label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-3">
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar Edição
              </Button>
            )}
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              <PlusCircle size={18} className="mr-2" /> {isEditing ? 'Salvar Alterações' : 'Adicionar Serviço'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Serviços Cadastrados</CardTitle>
          <CardDescription>Gerencie os serviços disponíveis na calculadora.</CardDescription>
          <div className="mt-4">
            <Input
              placeholder="Buscar serviço por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {/* Visualização em Cards para Mobile */}
          <div className="md:hidden space-y-4">
            {filteredServicos.length > 0 ? (
              filteredServicos.map((serv) => (
                <motion.div
                  key={serv.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 ${!serv.ativo ? 'opacity-60' : ''}`}
                >
                  <div className="space-y-3">
                    {/* Nome e Status */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nome do Serviço</p>
                        <p className="font-semibold text-base break-words">{serv.nome}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={serv.ativo ? "success" : "secondary"}>
                          {serv.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                        <Switch
                          checked={serv.ativo}
                          onCheckedChange={() => handleToggleActive(serv.id)}
                          aria-label={serv.ativo ? "Desativar" : "Ativar"}
                          disabled={serv.tipo === 'acabamento'}
                        />
                      </div>
                    </div>

                    {/* Tipo */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                      <Badge variant={serv.tipo === 'acabamento' ? 'default' : 'outline'} className={serv.tipo === 'acabamento' ? 'bg-blue-500' : 'bg-green-500 text-white'}>
                        {serv.tipo === 'acabamento' ? 'Acabamento' : 'Calculadora'}
                      </Badge>
                      {serv.tipo === 'acabamento' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Gerenciado na página de Acabamentos
                        </p>
                      )}
                    </div>

                    {/* Valor */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Valor por m²</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        R$ {parseFloat(serv.preco).toFixed(2)}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEdit(serv)}
                          disabled={serv.tipo === 'acabamento'}
                          className={`flex-1 ${serv.tipo === 'acabamento' ? 'text-gray-400 border-gray-300' : 'text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400'}`}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={serv.tipo === 'acabamento'}
                              className={`flex-1 ${serv.tipo === 'acabamento' ? 'text-gray-400 border-gray-300' : 'text-red-600 hover:text-red-700 border-red-300 hover:border-red-400'}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] sm:max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o serviço "{serv.nome}"? Esta ação não poderá ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                              <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(serv.id)} 
                                className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum serviço encontrado.</p>
              </div>
            )}
          </div>

          {/* Visualização em Tabela para Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor/m²</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServicos.length > 0 ? (
                  filteredServicos.map(serv => (
                    <TableRow key={serv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!serv.ativo ? 'opacity-60' : ''}`}>
                      <TableCell className="font-medium">{serv.nome}</TableCell>
                      <TableCell className="text-right">R$ {parseFloat(serv.preco).toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          serv.tipo === 'acabamento' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {serv.tipo === 'acabamento' ? 'Acabamento' : 'Calculadora'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                         <Switch
                            checked={serv.ativo}
                            onCheckedChange={() => handleToggleActive(serv.id)}
                            aria-label={serv.ativo ? "Desativar" : "Ativar"}
                            disabled={serv.tipo === 'acabamento'}
                          />
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEdit(serv)} 
                          title={serv.tipo === 'acabamento' ? "Editar na página de Acabamentos" : "Editar"}
                          disabled={serv.tipo === 'acabamento'}
                        >
                          <Edit size={16} className={serv.tipo === 'acabamento' ? "text-gray-400" : "text-blue-600"} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title={serv.tipo === 'acabamento' ? "Excluir na página de Acabamentos" : "Excluir"}
                              disabled={serv.tipo === 'acabamento'}
                            >
                              <Trash2 size={16} className={serv.tipo === 'acabamento' ? "text-gray-400" : "text-destructive"} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o serviço "{serv.nome}"? Esta ação não poderá ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(serv.id)} className="bg-destructive hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      Nenhum serviço encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CalculadoraServicosPage;