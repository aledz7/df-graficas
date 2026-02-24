import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  FileText,
  Calendar,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { kanbanService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

export default function OSDetailsModal({ os, open, onClose, onUpdate }) {
  const [osDetails, setOSDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && os) {
      loadOSDetails();
    }
  }, [open, os]);

  const loadOSDetails = async () => {
    if (!os?.id) return;
    
    setLoading(true);
    try {
      const response = await kanbanService.getOSDetails(os.id);
      if (response.data.success) {
        setOSDetails(response.data.data);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes da OS',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = async (item) => {
    if (!osDetails) return;

    const novoStatus = !item.concluido;
    
    try {
      const response = await kanbanService.updateItemProgress({
        os_id: os.id,
        item_id: item.id,
        concluido: novoStatus,
      });

      if (response.data.success) {
        // Atualizar estado local
        const itensAtualizados = osDetails.itens.map((i) =>
          i.id === item.id ? { ...i, concluido: novoStatus } : i
        );
        
        setOSDetails({
          ...osDetails,
          itens: itensAtualizados,
          progresso: response.data.data.progresso,
        });

        // Notificar componente pai
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o item',
        variant: 'destructive',
      });
    }
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return null;
    const apenasNumeros = telefone.replace(/\D/g, '');
    if (apenasNumeros.length === 11) {
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 7)}-${apenasNumeros.slice(7)}`;
    } else if (apenasNumeros.length === 10) {
      return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 6)}-${apenasNumeros.slice(6)}`;
    }
    return telefone;
  };

  const formatarData = (data) => {
    if (!data) return null;
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  const data = osDetails || os;
  if (!data) return null;

  const progressoPercentual = data.progresso?.percentual || 0;
  const itensConcluidos = data.progresso?.itens_concluidos || 0;
  const totalItens = data.progresso?.total_itens || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            OS #{data.os?.numero_os || data.numero_os || data.id}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Selos */}
            <div className="flex items-center gap-2 flex-wrap">
              {data.tem_arte_pronta && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Star className="h-3 w-3 mr-1" />
                  ARTE PRONTA
                </Badge>
              )}
              {data.prazo_datahora && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <Clock className="h-3 w-3 mr-1" />
                  PRAZO ESPECÍFICO
                </Badge>
              )}
              {data.is_atrasado && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  ATRASADO
                </Badge>
              )}
            </div>

            {/* Informações do Cliente */}
            <div>
              <h3 className="font-semibold mb-2">Cliente</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Nome: </span>
                  {data.cliente?.nome || data.os?.cliente?.nome || 'Não informado'}
                </div>
                {data.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a
                      href={`tel:${data.telefone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {formatarTelefone(data.telefone)}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Prazo */}
            {data.prazo_datahora && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Prazo
                </h3>
                <p className="text-sm">{formatarData(data.prazo_datahora)}</p>
              </div>
            )}

            {/* Observações */}
            {data.observacoes && (
              <div>
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {data.observacoes}
                </p>
              </div>
            )}

            <Separator />

            {/* Checklist de Itens */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Itens da OS</h3>
                {totalItens > 0 && (
                  <span className="text-sm text-gray-600">
                    {itensConcluidos} de {totalItens} {totalItens === 1 ? 'concluído' : 'concluídos'}
                  </span>
                )}
              </div>

              {totalItens > 0 && (
                <div className="mb-4">
                  <Progress value={progressoPercentual} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {Math.round(progressoPercentual)}% concluído
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {data.itens && data.itens.length > 0 ? (
                  data.itens.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        item.concluido ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <Checkbox
                        checked={item.concluido}
                        onCheckedChange={() => handleToggleItem(item)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {item.concluido ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span
                            className={`font-medium ${
                              item.concluido ? 'line-through text-gray-500' : 'text-gray-900'
                            }`}
                          >
                            {item.nome || item.nome_servico_produto}
                          </span>
                        </div>
                        {item.quantidade > 1 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Quantidade: {item.quantidade}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Nenhum item cadastrado</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
