import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ChatPanel from './ChatPanel';
import ChatWindow from './ChatWindow';
import ChatNotificationToast from './ChatNotificationToast';
import NewChatModal from './NewChatModal';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import '@/components/chat/ChatIcon.css';

export default function ChatContainer({ open, onClose }) {
  const {
    threads,
    activeThread,
    setActiveThread,
    messages,
    typingUsers,
    loadMessages,
    loadThreads,
    sendMessage,
    uploadFile,
    getOrCreateDirectThread,
    updateTypingStatus,
  } = useChat({ enabled: open, mode: 'full', pollIntervalMs: 10000 });

  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Carregar threads quando o chat abrir
  useEffect(() => {
    if (open && user) {
      loadThreads();
    }
  }, [open, user]);

  // Listener para abrir thread específica quando receber evento
  useEffect(() => {
    const handleOpenChat = async (event) => {
      const { threadId } = event.detail || {};
      if (threadId) {
        // Abrir o chat se não estiver aberto
        if (!open) {
          // Disparar evento para abrir o chat (será tratado no App.jsx)
          return;
        }

        // Encontrar a thread e ativá-la
        let thread = threads.find(t => t.id === threadId);
        
        if (!thread) {
          // Se não encontrou, recarregar threads e tentar novamente
          await loadThreads();
          const updatedThreadsResponse = await chatService.getThreads();
          if (updatedThreadsResponse.data.success) {
            const updatedThreads = updatedThreadsResponse.data.data || [];
            thread = updatedThreads.find(t => t.id === threadId);
          }
        }

        if (thread) {
          setActiveThread(thread);
          await loadMessages(thread.id);
        }
      }
    };

    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, [open, threads, setActiveThread, loadMessages, loadThreads]);

  // Carregar mensagens quando thread ativa mudar
  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.id);
    }
  }, [activeThread, loadMessages]);

  const handleSelectThread = (thread) => {
    setActiveThread(thread);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleNewChat = () => {
    setIsNewChatModalOpen(true);
  };

  const handleSelectUser = async (user) => {
    try {
      const thread = await getOrCreateDirectThread(user.id);
      setActiveThread(thread);
      await loadThreads();
      toast({
        title: 'Sucesso',
        description: `Conversa iniciada com ${user.name}`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a conversa',
        variant: 'destructive',
      });
    }
  };

  const handleCreateGroup = async (groupData) => {
    try {
      const response = await chatService.createGroup(groupData);
      if (response.data.success) {
        const thread = response.data.data;
        setActiveThread(thread);
        await loadThreads();
        toast({
          title: 'Sucesso',
          description: 'Grupo criado com sucesso',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.error || 'Não foi possível criar o grupo',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0 flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Sidebar */}
          <div className={cn(
            "w-80 border-r bg-white transition-all shadow-lg",
            !showSidebar && "hidden md:block"
          )}>
            <ChatPanel
              threads={threads}
              activeThread={activeThread}
              onSelectThread={handleSelectThread}
              onCreateGroup={handleCreateGroup}
              onNewChat={handleNewChat}
              currentUserId={user?.id}
            />
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col min-w-0 relative bg-white">
            {activeThread && !showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden absolute top-4 left-4 z-10 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
              >
                ← Voltar
              </button>
            )}
            <ChatWindow
              thread={activeThread}
              messages={messages}
              typingUsers={typingUsers}
              onSendMessage={sendMessage}
              onUploadFile={uploadFile}
              onUpdateTyping={updateTypingStatus}
              currentUserId={user?.id}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Chat */}
      <NewChatModal
        open={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSelectUser={handleSelectUser}
        onCreateGroup={handleCreateGroup}
      />

      {/* Notificações Toast */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <ChatNotificationToast
            key={notification.id}
            notification={notification}
            onClose={() => {
              setNotifications(prev => 
                prev.filter(n => n.id !== notification.id)
              );
            }}
            onReply={(thread) => {
              setActiveThread(thread);
              onClose();
            }}
          />
        ))}
      </div>
    </>
  );
}
