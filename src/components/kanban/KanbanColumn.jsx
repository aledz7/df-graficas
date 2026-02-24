import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OSCard from './OSCard';
import { MoreVertical, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function KanbanColumn({
  column,
  osList = [],
  onOSClick,
  onEditColumn,
  onDeleteColumn,
  onAddColumn,
  isLastColumn = false,
}) {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-gray-50');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-gray-50');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-gray-50');
    
    const osId = e.dataTransfer.getData('os_id');
    const colunaAnteriorId = e.dataTransfer.getData('coluna_id');
    
    if (osId && colunaAnteriorId !== column.id.toString()) {
      // Disparar evento customizado para mover OS
      window.dispatchEvent(new CustomEvent('kanban:move-os', {
        detail: {
          osId: parseInt(osId),
          colunaAnteriorId: colunaAnteriorId ? parseInt(colunaAnteriorId) : null,
          colunaNovaId: column.id,
        }
      }));
    }
  };

  return (
    <div className="flex-shrink-0 w-80">
      <Card className="h-full flex flex-col shadow-lg border-0 overflow-hidden">
        <CardHeader
          className="pb-3 bg-gradient-to-r"
          style={{
            background: `linear-gradient(135deg, ${column.cor || '#6366f1'} 0%, ${column.cor || '#4f46e5'} 100%)`,
            color: 'white',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white font-bold text-base">
                {column.nome}
              </CardTitle>
              <Badge variant="secondary" className="bg-white/30 text-white border-white/40 font-semibold">
                {osList.length}
              </Badge>
            </div>
            {!column.is_obrigatoria && !column.is_sistema && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditColumn(column)}>
                    Renomear
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDeleteColumn(column.id)}
                    className="text-red-600"
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent
          className="flex-1 overflow-y-auto p-4 min-h-[400px] bg-gray-50"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="space-y-3">
            {osList.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Nenhuma OS nesta coluna</p>
              </div>
            ) : (
              osList.map((os) => (
                <OSCard key={os.id} os={os} onClick={() => onOSClick(os)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botão adicionar coluna */}
      {isLastColumn && (
        <Button
          variant="outline"
          className="w-full mt-4 h-14 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 rounded-lg"
          onClick={onAddColumn}
        >
          <Plus className="h-5 w-5 mr-2" />
          <span className="font-medium">Adicionar Coluna</span>
        </Button>
      )}
    </div>
  );
}
