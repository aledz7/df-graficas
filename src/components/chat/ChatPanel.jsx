import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Plus, Users, MessageSquare, FileText } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function ChatPanel({ 
  threads, 
  activeThread, 
  onSelectThread, 
  onCreateGroup,
  onNewChat,
  currentUserId 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredThreads = threads.filter(thread => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.nome?.toLowerCase().includes(query) ||
      thread.last_message_preview?.toLowerCase().includes(query)
    );
  });

  const formatTime = (date) => {
    if (!date) return '';
    try {
      const messageDate = new Date(date);
      const now = new Date();
      const diffInHours = (now - messageDate) / (1000 * 60 * 60);
      
      if (diffInHours < 24) {
        return formatDistanceToNow(messageDate, { addSuffix: true, locale: ptBR });
      }
      return format(messageDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getThreadName = (thread) => {
    if (thread.tipo === 'grupo') {
      return thread.nome || 'Grupo';
    }
    if (thread.tipo === 'os') {
      return `OS #${thread.ordem_servico_id}`;
    }
    // Thread direta - mostrar outro usuário
    const otherMember = thread.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.name || 'Conversa';
  };

  const getThreadAvatar = (thread) => {
    if (thread.tipo === 'grupo') {
      return null; // Mostrar ícone de grupo
    }
    const otherMember = thread.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.foto_url || null;
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Chat Interno</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewChat}
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/90 border-white/20 focus:bg-white"
          />
        </div>
      </div>

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium mb-2">Nenhuma conversa ainda</p>
              <p className="text-sm text-gray-400 mb-4">
                Clique no botão + para iniciar uma nova conversa ou criar um grupo
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewChat}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conversa
              </Button>
            </div>
          ) : (
            <>
              {/* Grupos por setor */}
              {filteredThreads.filter(t => t.tipo === 'grupo').length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
                    Grupos
                  </h3>
                  {filteredThreads
                    .filter(t => t.tipo === 'grupo')
                    .map(thread => (
                <div
                  key={thread.id}
                  onClick={() => onSelectThread(thread)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 hover:bg-gray-50 transition-all duration-200",
                    activeThread?.id === thread.id && "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-sm"
                  )}
                >
                  <div className="relative">
                    {thread.icone ? (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getThreadAvatar(thread)} />
                        <AvatarFallback>
                          {getThreadName(thread).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {thread.unread_count > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500">
                        {thread.unread_count > 99 ? '99+' : thread.unread_count}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">
                        {getThreadName(thread)}
                      </p>
                      {thread.lastMessage && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(thread.lastMessage.created_at)}
                        </span>
                      )}
                      {!thread.lastMessage && thread.updated_at && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTime(thread.updated_at)}
                        </span>
                      )}
                    </div>
                    {thread.last_message_preview && (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        {thread.last_message_preview}
                      </p>
                    )}
                  </div>
                </div>
                    ))}
                </div>
              )}

              {/* Conversas diretas */}
              {filteredThreads.filter(t => t.tipo === 'direto').length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
                    Conversas
                  </h3>
                  {filteredThreads
                    .filter(t => t.tipo === 'direto')
                    .map(thread => (
                      <div
                        key={thread.id}
                        onClick={() => onSelectThread(thread)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 hover:bg-gray-50 transition-all duration-200",
                          activeThread?.id === thread.id && "bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 shadow-sm"
                        )}
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={getThreadAvatar(thread)} />
                            <AvatarFallback>
                              {getThreadName(thread).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {thread.unread_count > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500">
                              {thread.unread_count > 99 ? '99+' : thread.unread_count}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm truncate">
                              {getThreadName(thread)}
                            </p>
                            {thread.lastMessage && (
                              <span className="text-xs text-gray-500 ml-2">
                                {formatTime(thread.lastMessage.created_at)}
                              </span>
                            )}
                            {!thread.lastMessage && thread.updated_at && (
                              <span className="text-xs text-gray-500 ml-2">
                                {formatTime(thread.updated_at)}
                              </span>
                            )}
                          </div>
                          {thread.last_message_preview && (
                            <p className="text-xs text-gray-600 truncate mt-1">
                              {thread.last_message_preview}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Chats de OS */}
              {filteredThreads.filter(t => t.tipo === 'os').length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2 px-2">
                    Ordens de Serviço
                  </h3>
                  {filteredThreads
                    .filter(t => t.tipo === 'os')
                    .map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => onSelectThread(thread)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer mb-1 hover:bg-gray-50 transition-colors",
                      activeThread?.id === thread.id && "bg-blue-50 border border-blue-200"
                    )}
                  >
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-orange-600" />
                      </div>
                      {thread.unread_count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-blue-500">
                          {thread.unread_count > 99 ? '99+' : thread.unread_count}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">
                          OS #{thread.ordem_servico_id}
                        </p>
                        {thread.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(thread.lastMessage.created_at)}
                          </span>
                        )}
                        {!thread.lastMessage && thread.updated_at && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(thread.updated_at)}
                          </span>
                        )}
                      </div>
                      {thread.last_message_preview && (
                        <p className="text-xs text-gray-600 truncate mt-1">
                          {thread.last_message_preview}
                        </p>
                      )}
                    </div>
                  </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
