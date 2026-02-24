import React, { useState, useEffect } from 'react';
import { kanbanService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import KanbanColumn from '@/components/kanban/KanbanColumn';
import OSDetailsModal from '@/components/kanban/OSDetailsModal';
import { Loader2, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function KanbanPage() {
  const [columns, setColumns] = useState([]);
  const [osByColumn, setOSByColumn] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOS, setSelectedOS] = useState(null);
  const [isOSModalOpen, setIsOSModalOpen] = useState(false);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#6366f1');
  const { toast } = useToast();

  const coresPredefinidas = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#14b8a6', // Teal
  ];

  useEffect(() => {
    loadKanban();
    
    // Listener para eventos de movimentação de OS
    const handleMoveOS = async (event) => {
      const { osId, colunaAnteriorId, colunaNovaId } = event.detail;
      await moveOS(osId, colunaAnteriorId, colunaNovaId);
    };

    window.addEventListener('kanban:move-os', handleMoveOS);
    
    return () => {
      window.removeEventListener('kanban:move-os', handleMoveOS);
    };
  }, []);

  const loadKanban = async () => {
    setLoading(true);
    try {
      const [columnsResponse, osResponse] = await Promise.all([
        kanbanService.getColumns(),
        kanbanService.getOS(),
      ]);

      if (columnsResponse.data.success) {
        setColumns(columnsResponse.data.data);
      }

      if (osResponse.data.success) {
        setOSByColumn(osResponse.data.data);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o Kanban',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const moveOS = async (osId, colunaAnteriorId, colunaNovaId) => {
    try {
      const response = await kanbanService.moveOS({
        os_id: osId,
        coluna_anterior_id: colunaAnteriorId,
        coluna_nova_id: colunaNovaId,
        nova_ordem: 0,
      });

      if (response.data.success) {
        await loadKanban();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível mover a OS',
        variant: 'destructive',
      });
    }
  };

  const handleOSClick = (os) => {
    setSelectedOS(os);
    setIsOSModalOpen(true);
  };

  const handleAddColumn = () => {
    setNewColumnName('');
    setNewColumnColor('#6366f1');
    setIsAddColumnModalOpen(true);
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da coluna é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await kanbanService.createColumn({
        nome: newColumnName,
        cor: newColumnColor,
      });

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Coluna criada com sucesso',
        });
        setIsAddColumnModalOpen(false);
        await loadKanban();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a coluna',
        variant: 'destructive',
      });
    }
  };

  const handleEditColumn = (column) => {
    setEditingColumn(column);
    setNewColumnName(column.nome);
    setNewColumnColor(column.cor);
    setIsEditColumnModalOpen(true);
  };

  const handleUpdateColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da coluna é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await kanbanService.updateColumn(editingColumn.id, {
        nome: newColumnName,
        cor: newColumnColor,
      });

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Coluna atualizada com sucesso',
        });
        setIsEditColumnModalOpen(false);
        setEditingColumn(null);
        await loadKanban();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Não foi possível atualizar a coluna',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!confirm('Tem certeza que deseja excluir esta coluna? As OS serão movidas para "NOVOS PEDIDOS".')) {
      return;
    }

    try {
      const response = await kanbanService.deleteColumn(columnId);

      if (response.data.success) {
        toast({
          title: 'Sucesso',
          description: 'Coluna excluída com sucesso',
        });
        await loadKanban();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Não foi possível excluir a coluna',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 border-b bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Painel Kanban
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Organize suas OS de forma visual e profissional
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="flex gap-6 overflow-x-auto pb-6">
            {columns.map((column, index) => (
              <KanbanColumn
                key={column.id}
                column={column}
                osList={osByColumn[column.id] || []}
                onOSClick={handleOSClick}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onAddColumn={handleAddColumn}
                isLastColumn={index === columns.length - 1}
              />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Modal Adicionar Coluna */}
      <Dialog open={isAddColumnModalOpen} onOpenChange={setIsAddColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Coluna</Label>
              <Input
                id="nome"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ex: Em Produção"
              />
            </div>
            <div>
              <Label htmlFor="cor">Cor</Label>
              <div className="flex gap-2 mt-2">
                {coresPredefinidas.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-10 h-10 rounded border-2 ${
                      newColumnColor === cor ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setNewColumnColor(cor)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateColumn}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Coluna */}
      <Dialog open={isEditColumnModalOpen} onOpenChange={setIsEditColumnModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome da Coluna</Label>
              <Input
                id="edit-nome"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Ex: Em Produção"
              />
            </div>
            <div>
              <Label htmlFor="edit-cor">Cor</Label>
              <div className="flex gap-2 mt-2">
                {coresPredefinidas.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className={`w-10 h-10 rounded border-2 ${
                      newColumnColor === cor ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: cor }}
                    onClick={() => setNewColumnColor(cor)}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes da OS */}
      <OSDetailsModal
        os={selectedOS}
        open={isOSModalOpen}
        onClose={() => setIsOSModalOpen(false)}
        onUpdate={loadKanban}
      />
    </div>
  );
}
