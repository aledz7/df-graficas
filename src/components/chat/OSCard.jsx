import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, ExternalLink, Star, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function OSCard({ osCard }) {
  const navigate = useNavigate();
  const os = osCard.ordemServico || osCard.preview_data;

  if (!os) return null;

  const handleOpenOS = () => {
    navigate(`/operacional/ordens-servico/${os.id || osCard.ordem_servico_id}`);
  };

  const formatDate = (date) => {
    if (!date) return 'Não informado';
    try {
      return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return date;
    }
  };

  return (
    <Card className="mt-2 border-2 border-blue-300 bg-blue-50">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-900">
              OS #{os.numero_os || os.id_os || osCard.ordem_servico_id}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenOS}
            className="h-6 px-2 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir
          </Button>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-gray-700">
              {os.cliente || os.cliente_info?.nome || 'Cliente não informado'}
            </span>
          </div>

          {(os.prazo || os.prazo_datahora || os.data_prevista_entrega) && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-gray-700">
                Prazo: {formatDate(os.prazo || os.prazo_datahora || os.data_prevista_entrega)}
              </span>
            </div>
          )}

          {os.status && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {os.status_os || os.status}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
