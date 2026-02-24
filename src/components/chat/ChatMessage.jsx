import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Reply, Forward, Star, Check, CheckCheck, 
  Paperclip, FileText, Image as ImageIcon, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import OSCard from './OSCard';

export default function ChatMessage({ message, isOwn, onReply }) {
  const formatTime = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'HH:mm', { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getReadStatus = () => {
    // Simplificado - você pode melhorar verificando reads
    return <CheckCheck className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div className={cn(
      "flex gap-2 group",
      isOwn && "flex-row-reverse"
    )}>
      {!isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.user?.foto_url} />
          <AvatarFallback>
            {message.user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "flex flex-col max-w-[70%]",
        isOwn && "items-end"
      )}>
        {!isOwn && (
          <span className="text-xs text-gray-500 mb-1">
            {message.user?.name || 'Usuário'}
          </span>
        )}

        {/* Reply preview */}
        {message.reply_to && message.replyTo && (
          <div className={cn(
            "mb-1 p-2 bg-gray-100 rounded border-l-2 border-blue-500 text-xs",
            isOwn && "bg-blue-50"
          )}>
            <p className="font-medium text-gray-700">
              {message.replyTo.user?.name}
            </p>
            <p className="text-gray-600 truncate">
              {message.replyTo.texto || 'Arquivo'}
            </p>
          </div>
        )}

        {/* Mensagem */}
        <div className={cn(
          "rounded-2xl px-4 py-2.5 shadow-sm",
          isOwn 
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
            : "bg-white text-gray-900 border border-gray-200"
        )}>
          {/* Card de OS */}
          {message.tipo === 'os_card' && message.osCard && (
            <OSCard osCard={message.osCard} />
          )}

          {/* Texto */}
          {message.texto && (
            <p className="whitespace-pre-wrap break-words">
              {message.texto}
            </p>
          )}

          {/* Anexos */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded border",
                    isOwn ? "bg-blue-400 border-blue-300" : "bg-white border-gray-300"
                  )}
                >
                  {attachment.file_type === 'imagem' ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs opacity-75">
                      {attachment.formatted_size || `${(attachment.file_size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-8 w-8 p-0"
                  >
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-1 mt-2">
            {message.is_importante && (
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            )}
            {message.is_urgente && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Urgente
              </Badge>
            )}
          </div>
        </div>

        {/* Footer com hora e status */}
        <div className={cn(
          "flex items-center gap-2 mt-1 text-xs text-gray-500",
          isOwn && "flex-row-reverse"
        )}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && getReadStatus()}
          {message.edited_at && (
            <span className="italic">(editado)</span>
          )}
        </div>
      </div>

      {/* Botões de ação (hover) */}
      {!isOwn && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply(message)}
            className="h-7 w-7 p-0"
          >
            <Reply className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
