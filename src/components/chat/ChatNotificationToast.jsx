import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Reply, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ChatNotificationToast({ 
  notification, 
  onClose, 
  onReply,
  className 
}) {
  const message = notification.message;
  const thread = notification.thread;

  useEffect(() => {
    // Auto-fechar após 6 segundos (entre 5-8 segundos)
    const timer = setTimeout(() => {
      onClose();
    }, 6000);

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
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage src={message?.user?.foto_url || message?.user?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {message?.user?.name?.charAt(0).toUpperCase() || getThreadName()?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">{getThreadName()}</p>
              {message?.user && thread?.tipo !== 'grupo' && (
                <p className="text-xs text-gray-500 truncate">{message.user.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Agora</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
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

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              if (onReply) {
                onReply(thread);
              }
              onClose();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Reply className="h-4 w-4 mr-1.5" />
            Responder
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleOpenChat}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Abrir conversa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
