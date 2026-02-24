// Efeitos visuais estilo MSN para o chat

export const applyChatEffects = (element, isUrgent = false) => {
  if (!element) return;

  // Remover classes anteriores
  element.classList.remove('shake', 'urgent', 'pulse');

  if (isUrgent) {
    // Efeito shake para urgente
    element.classList.add('urgent');
    
    // Adicionar pulse no badge
    const badge = element.querySelector('.chat-badge');
    if (badge) {
      badge.classList.add('pulse');
    }
  } else {
    // Efeito shake leve
    element.classList.add('shake');
  }

  // Remover após animação
  setTimeout(() => {
    element.classList.remove('shake', 'urgent');
    const badge = element.querySelector('.chat-badge');
    if (badge) {
      badge.classList.remove('pulse');
    }
  }, 2000);
};

export const playNotificationSound = () => {
  // Criar som de notificação (opcional)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGH0fPTgjMGHm7A7+OZURAJR6Hh8sVtJAUwgM/y2Yk3CBxou+3nn00QDFCn4/C2YxwGOJHX8sx5LAUkd8fw3ZBACBRdtOnrqFUUCkaf4PK+bCEHMYfR89OCMwYebsDv45lREAlHoeHyxW0kBTCAz/LZiTcIHGi77eefTRAMUKfj8LZjHAY4kdfyzHksBSR3x/DdkEA=');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignorar erro se não puder tocar
    });
  } catch (error) {
    // Ignorar erro
  }
};
