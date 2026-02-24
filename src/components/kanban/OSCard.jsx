import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Phone, FileText, Calendar, Clock, Star, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OSCard({ os, onClick }) {
  const progressoPercentual = os.progresso?.percentual || 0;
  const itensConcluidos = os.progresso?.itens_concluidos || 0;
  const totalItens = os.progresso?.total_itens || 0;

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
      return format(new Date(data), "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
      return data;
    }
  };

  return (
    <Card
      className="mb-3 cursor-pointer hover:shadow-lg transition-shadow bg-white"
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('os_id', os.id);
        e.dataTransfer.setData('coluna_id', os.coluna_id);
      }}
    >
      <CardContent className="p-4">
        {/* Header com selos */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {os.tem_arte_pronta && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <Star className="h-3 w-3 mr-1" />
                ARTE PRONTA
              </Badge>
            )}
            {os.prazo_datahora && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                <Clock className="h-3 w-3 mr-1" />
                PRAZO ESPECÍFICO
              </Badge>
            )}
            {os.is_atrasado && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                <AlertCircle className="h-3 w-3 mr-1" />
                ATRASADO
              </Badge>
            )}
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-2">
          <h4 className="font-semibold text-sm text-gray-900">
            {os.cliente?.nome || 'Cliente não informado'}
          </h4>
        </div>

        {/* Informações */}
        <div className="space-y-1.5 mb-3 text-xs text-gray-600">
          {os.telefone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <a
                href={`tel:${os.telefone}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-blue-600"
              >
                {formatarTelefone(os.telefone)}
              </a>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            <span>OS #{os.numero_os || os.id}</span>
          </div>
          {os.prazo_datahora && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatarData(os.prazo_datahora)}</span>
            </div>
          )}
        </div>

        {/* Itens */}
        {os.itens && os.itens.length > 0 && (
          <div className="mb-3 space-y-1">
            {os.itens.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {item.concluido ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <span className={item.concluido ? 'line-through text-gray-500' : 'text-gray-700'}>
                  {item.nome} {item.quantidade > 1 && `(x${item.quantidade})`}
                </span>
              </div>
            ))}
            {os.itens.length > 3 && (
              <div className="text-xs text-gray-500">
                +{os.itens.length - 3} {os.itens.length - 3 === 1 ? 'item' : 'itens'}
              </div>
            )}
          </div>
        )}

        {/* Barra de progresso */}
        {totalItens > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">
                {itensConcluidos} de {totalItens} {totalItens === 1 ? 'tarefa' : 'tarefas'}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {Math.round(progressoPercentual)}%
              </span>
            </div>
            <Progress value={progressoPercentual} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
