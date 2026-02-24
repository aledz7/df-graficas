import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Reply, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function ChatNotificationToast({ 
  notification, 
  onClose, 
  onReply,
  className 
}) {
  const message = notification.message;
  const thread = notification.thread;

  useEffect(() => {
    // Auto-fechar após 5 segundos
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleOpenChat = () => {
    if (thread && onReply) {
      onReply(thread);
    }
    onClose();
  };

  const getThreadName = () => {
    if (thread?.tipo === 'grupo') {
      return thread.nome || 'Grupo';
    }
    if (thread?.tipo === 'os') {
      return `OS #${thread.ordem_servico_id}`;
    }
    return message?.user?.name || 'Conversa';
  };

  return (
    <Card className={cn(
      "w-80 shadow-lg border-2 animate-in slide-in-from-right",
      notification.prioridade === 'urgente' && "border-red-500",
      notification.prioridade === 'alta' && "border-orange-500",
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message?.user?.foto_url} />
              <AvatarFallback>
                {message?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{getThreadName()}</p>
              {message?.user && (
                <p className="text-xs text-gray-500">{message.user.name}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Mensagem */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 line-clamp-2">
            {message?.texto || 'Arquivo anexado'}
          </p>
          {message?.osCard && (
            <p className="text-xs text-blue-600 mt-1">
              📎 OS #{message.osCard.ordem_servico_id} anexada
            </p>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 mb-3">
          {formatDistanceToNow(new Date(message?.created_at || Date.now()), {
            addSuffix: true,
            locale: ptBR
          })}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenChat}
            className="flex-1 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir Chat
          </Button>
          {onReply && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onReply(thread);
                onClose();
              }}
              className="text-xs"
            >
              <Reply className="h-3 w-3 mr-1" />
              Responder
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
