import React, { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, Paperclip, Image as ImageIcon, Smile, 
  MoreVertical, Search, Star, Reply, Forward
} from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ChatWindow({ 
  thread, 
  messages, 
  typingUsers,
  onSendMessage,
  onUploadFile,
  onUpdateTyping,
  currentUserId 
}) {
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);
  const [replyTo, setReplyTo] = useState(null);

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  const getThreadName = () => {
    if (thread.tipo === 'grupo') {
      return thread.nome || 'Grupo';
    }
    if (thread.tipo === 'os') {
      return `OS #${thread.ordem_servico_id}`;
    }
    const otherMember = thread.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.name || 'Conversa';
  };

  const getThreadAvatar = () => {
    if (thread.tipo === 'grupo' || thread.tipo === 'os') {
      return null;
    }
    const otherMember = thread.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.foto_url || null;
  };

  const handleSend = async (texto, options = {}) => {
    if (!texto.trim() && !options.file) return;
    
    if (options.file) {
      await onUploadFile(thread.id, options.file);
    } else {
      await onSendMessage(thread.id, texto, {
        ...options,
        replyTo: replyTo?.id,
      });
    }
    
    setReplyTo(null);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="p-4 border-b bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          {thread.tipo === 'grupo' || thread.tipo === 'os' ? (
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">
                {getThreadName().charAt(0)}
              </span>
            </div>
          ) : (
            <Avatar className="h-12 w-12 border-2 border-gray-200 shadow-md">
              <AvatarImage src={getThreadAvatar()} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold">
                {getThreadName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div>
            <h3 className="font-semibold text-gray-900">{getThreadName()}</h3>
            {typingUsers.length > 0 ? (
              <p className="text-xs text-blue-600 font-medium animate-pulse">
                {typingUsers.map(u => u.name).join(', ')} está digitando...
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                {thread.tipo === 'grupo' ? 'Grupo' : 'Online'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message, index) => {
            const prevMessage = messages[index - 1];
            const showDate = !prevMessage || 
              new Date(message.created_at).toDateString() !== 
              new Date(prevMessage.created_at).toDateString();

            return (
              <div key={message.id}>
                {showDate && (
                  <div className="text-center my-6">
                    <span className="text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
                      {format(new Date(message.created_at), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                )}
                
                <ChatMessage
                  message={message}
                  isOwn={message.user_id === currentUserId}
                  onReply={() => setReplyTo(message)}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply preview */}
      {replyTo && (
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-200 flex items-center justify-between shadow-sm">
          <div className="flex-1">
            <p className="text-xs text-blue-600 font-medium">Respondendo a {replyTo.user?.name}</p>
            <p className="text-sm text-gray-700 truncate">{replyTo.texto}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyTo(null)}
            className="hover:bg-blue-100"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t shadow-lg">
        <ChatInput
          onSend={handleSend}
          onTyping={(isTyping) => onUpdateTyping(thread.id, isTyping)}
          replyTo={replyTo}
        />
      </div>
    </div>
  );
}
