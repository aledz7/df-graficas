import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Eye, RotateCcw, Trash2, Filter, CalendarDays, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import DeleteWithJustificationModal from '@/components/utils/DeleteWithJustificationModal.jsx';
import ItemExcluidoDetalhesModal from '@/components/utils/ItemExcluidoDetalhesModal.jsx'; 
import { format, parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { lixeiraService } from '@/services/api';

const LixeiraPage = ({ vendedorAtual }) => {
  const { toast } = useToast();
  const [lixeiraItens, setLixeiraItens] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItens, setFilteredItens] = useState([]);
  const [itemParaAcao, setItemParaAcao] = useState(null);
  const [isDeletePermanenteModalOpen, setIsDeletePermanenteModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [loading, setLoading] = useState(false);

  const loadLixeiraItens = useCallback(async () => {
    setLoading(true);
    try {
      const response = await lixeiraService.getAll();
      if (response.success) {
        setLixeiraItens(response.data || []);
      } else {
        toast({ 
          title: "Erro", 
          description: response.message || "Erro ao carregar registros excluídos", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Erro ao carregar lixeira:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao carregar registros excluídos", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLixeiraItens();
  }, [loadLixeiraItens]);

  useEffect(() => {
    let results = lixeiraItens.filter(item => {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const nome = (item.nome || '').toLowerCase();
      const tipo = (item.tipo || '').toLowerCase();
      const codigo = (item.codigo || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const telefone = (item.telefone || '').toLowerCase();
      const valor = (item.valor || '').toString().toLowerCase();

      return (
        nome.includes(lowerSearchTerm) ||
        tipo.includes(lowerSearchTerm) ||
        codigo.includes(lowerSearchTerm) ||
        email.includes(lowerSearchTerm) ||
        telefone.includes(lowerSearchTerm) ||
        valor.includes(lowerSearchTerm)
      );
    });

    if (dateRange.from && isValid(dateRange.from)) {
        results = results.filter(item => {
            const itemDate = parseISO(item.data_exclusao);
            return isValid(itemDate) && itemDate >= startOfDay(dateRange.from);
        });
    }
    if (dateRange.to && isValid(dateRange.to)) {
        results = results.filter(item => {
            const itemDate = parseISO(item.data_exclusao);
            return isValid(itemDate) && itemDate <= endOfDay(dateRange.to);
        });
    }

    setFilteredItens(results);
  }, [searchTerm, lixeiraItens, dateRange]);

  const handleRestaurarItem = async (itemParaRestaurar) => {
    try {
      const response = await lixeiraService.restore(itemParaRestaurar.id, itemParaRestaurar.tabela);
      
      if (response.success) {
        // Recarregar a lista após restaurar
        await loadLixeiraItens();
        toast({ 
          title: 'Item Restaurado!', 
          description: `O item "${itemParaRestaurar.nome || itemParaRestaurar.id}" foi restaurado com sucesso.` 
        });
      } else {
        toast({ 
          title: "Erro", 
          description: response.message || "Erro ao restaurar item", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Erro ao restaurar item:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao restaurar item", 
        variant: "destructive" 
      });
    }
  };

  const handleDeletePermanente = (item) => {
    setItemParaAcao(item);
    setIsDeletePermanenteModalOpen(true);
  };

  const confirmDeletePermanente = async (justificativa, senha) => {
    if (!itemParaAcao) return;

    try {
      const response = await lixeiraService.destroy(itemParaAcao.id, itemParaAcao.tabela);
      
      if (response.success) {
        // Recarregar a lista após excluir
        await loadLixeiraItens();
        toast({ 
          title: 'Item Excluído Permanentemente', 
          description: `O item foi removido permanentemente.` 
        });
      } else {
        toast({ 
          title: "Erro", 
          description: response.message || "Erro ao excluir item", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao excluir item permanentemente", 
        variant: "destructive" 
      });
    }
    
    setIsDeletePermanenteModalOpen(false);
    setItemParaAcao(null);
  };

  const handleViewDetails = (item) => {
    setItemParaAcao(item);
    setIsViewDetailsModalOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <Trash2 className="mr-3 h-8 w-8 text-destructive"/> Lixeira do Sistema
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 md:mt-0 w-full md:w-auto">
          <Input
            type="search"
            placeholder="Buscar na lixeira..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 bg-white dark:bg-gray-700"
          />
          <Popover>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-full md:w-[260px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                    )}
                >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange.from && isValid(dateRange.from) ? (
                        dateRange.to && isValid(dateRange.to) ? (
                            <>{format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}</>
                        ) : (
                            format(dateRange.from, "dd/MM/yy")
                        )
                    ) : (
                        <span>Data da Exclusão</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                        if (range?.from && !isValid(range.from)) range.from = undefined;
                        if (range?.to && !isValid(range.to)) range.to = undefined;
                        setDateRange(range || { from: undefined, to: undefined });
                    }}
                    numberOfMonths={2}
                />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Itens excluídos são mantidos aqui temporariamente. Você pode restaurá-los ou excluí-los permanentemente.</p>

      <ScrollArea className="h-[calc(100vh-250px)] md:h-[calc(100vh-280px)]">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <ScrollArea className="h-[600px] w-full">
            <div className="space-y-3 p-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando registros excluídos...</span>
                  </div>
                </div>
              ) : filteredItens.length > 0 ? (
                filteredItens.map((item, index) => (
                  <motion.div
                    key={`${item.tabela}-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm break-words">
                          {item.nome || `ID: ${item.id}`}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {item.tipo}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground">Data de Exclusão</p>
                        <p className="text-sm font-medium">
                          {format(parseISO(item.data_exclusao), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Informações</p>
                        <div className="text-sm">
                          {item.tipo === 'Produto' && (
                            <div className="space-y-1">
                              <div>Código: {item.codigo || 'N/A'}</div>
                              <div>Preço: R$ {item.preco ? parseFloat(item.preco).toFixed(2) : 'N/A'}</div>
                            </div>
                          )}
                          {item.tipo === 'Cliente' && (
                            <div className="space-y-1">
                              <div>Email: {item.email || 'N/A'}</div>
                              <div>Telefone: {item.telefone || 'N/A'}</div>
                            </div>
                          )}
                          {item.tipo === 'Funcionário' && (
                            <div className="space-y-1">
                              <div>Email: {item.email || 'N/A'}</div>
                              <div>Telefone: {item.telefone || 'N/A'}</div>
                            </div>
                          )}
                          {item.tipo === 'Máquina' && (
                            <div>Modelo: {item.codigo || 'N/A'}</div>
                          )}
                          {(item.tipo === 'Venda' || item.tipo === 'Orçamento' || item.tipo === 'Ordem de Serviço' || item.tipo === 'Envelopamento') && (
                            <div>Valor: R$ {item.valor ? parseFloat(item.valor).toFixed(2) : 'N/A'}</div>
                          )}
                          {(item.tipo === 'Categoria' || item.tipo === 'Subcategoria') && (
                            <div>Nome: {item.nome || 'N/A'}</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-2 border-t">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(item)} title="Ver Detalhes">
                          <Eye className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-xs">Ver</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleRestaurarItem(item)} title="Restaurar Item">
                          <RotateCcw className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-xs">Restaurar</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePermanente(item)} title="Excluir Permanentemente">
                          <Trash2 className="h-4 w-4 text-red-600 mr-1" />
                          <span className="text-xs">Excluir</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {lixeiraItens.length === 0 ? 'Nenhum registro excluído encontrado.' : 'Nenhum resultado encontrado para a busca.'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>ID/Nome do Item</TableHead>
                <TableHead>Data Exclusão</TableHead>
                <TableHead>Informações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Carregando registros excluídos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredItens.length > 0 ? (
                filteredItens.map((item) => (
                  <TableRow key={`${item.tabela}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell className="font-medium">
                      {item.nome || `ID: ${item.id}`}
                    </TableCell>
                    <TableCell>{format(parseISO(item.data_exclusao), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.tipo === 'Produto' && (
                        <div>
                          <div>Código: {item.codigo || 'N/A'}</div>
                          <div>Preço: R$ {item.preco ? parseFloat(item.preco).toFixed(2) : 'N/A'}</div>
                        </div>
                      )}
                      {item.tipo === 'Cliente' && (
                        <div>
                          <div>Email: {item.email || 'N/A'}</div>
                          <div>Telefone: {item.telefone || 'N/A'}</div>
                        </div>
                      )}
                      {item.tipo === 'Funcionário' && (
                        <div>
                          <div>Email: {item.email || 'N/A'}</div>
                          <div>Telefone: {item.telefone || 'N/A'}</div>
                        </div>
                      )}
                      {item.tipo === 'Máquina' && (
                        <div>
                          <div>Modelo: {item.codigo || 'N/A'}</div>
                        </div>
                      )}
                      {(item.tipo === 'Venda' || item.tipo === 'Orçamento' || item.tipo === 'Ordem de Serviço' || item.tipo === 'Envelopamento') && (
                        <div>Valor: R$ {item.valor ? parseFloat(item.valor).toFixed(2) : 'N/A'}</div>
                      )}
                      {(item.tipo === 'Categoria' || item.tipo === 'Subcategoria') && (
                        <div>Nome: {item.nome || 'N/A'}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(item)} title="Ver Detalhes">
                          <Eye className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRestaurarItem(item)} title="Restaurar Item">
                          <RotateCcw className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePermanente(item)} title="Excluir Permanentemente">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {lixeiraItens.length === 0 ? 'Nenhum registro excluído encontrado.' : 'Nenhum resultado encontrado para a busca.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>

      {/* Modal para exclusão permanente */}
      <DeleteWithJustificationModal
        isOpen={isDeletePermanenteModalOpen}
        onClose={() => {
          setIsDeletePermanenteModalOpen(false);
          setItemParaAcao(null);
        }}
        onConfirm={confirmDeletePermanente}
        title="Excluir Permanentemente"
        message={`Tem certeza que deseja excluir permanentemente o item "${itemParaAcao?.nome || itemParaAcao?.id}"? Esta ação não pode ser desfeita.`}
        requirePassword={true}
        passwordLabel="Senha Master"
        passwordPlaceholder="Digite a senha master para confirmar"
      />

      {/* Modal para visualizar detalhes */}
      <ItemExcluidoDetalhesModal
        isOpen={isViewDetailsModalOpen}
        onClose={() => {
          setIsViewDetailsModalOpen(false);
          setItemParaAcao(null);
        }}
        item={itemParaAcao}
      />
    </motion.div>
  );
};

export default LixeiraPage;