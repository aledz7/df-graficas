import React from 'react';
import ChatNotificationToast from './ChatNotificationToast';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import { useChat } from '@/hooks/useChat';

/**
 * Componente global para gerenciar notificações de chat
 * Renderiza toasts no topo direito da tela
 */
export default function ChatNotificationManager({ chatOpen = false }) {
  const { activeThread } = useChat();
  const { notifications, removeNotification } = useChatNotifications(
    chatOpen,
    activeThread?.id
  );

  const handleOpenChat = (thread) => {
    // Disparar evento para abrir o chat
    window.dispatchEvent(new CustomEvent('openChat', {
      detail: { threadId: thread.id }
    }));
    removeNotification(notifications.find(n => n.thread.id === thread.id)?.id);
  };

  const handleReply = (thread) => {
    handleOpenChat(thread);
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <ChatNotificationToast
          key={notification.id}
          notification={{
            message: notification.message,
            thread: notification.thread,
            prioridade: notification.isUrgent ? 'urgente' : 'normal'
          }}
          onClose={() => removeNotification(notification.id)}
          onReply={handleReply}
        />
      ))}
    </div>
  );
}
