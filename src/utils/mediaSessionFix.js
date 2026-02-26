/**
 * Utilitário para corrigir erros do MediaSession API
 * Previne erros relacionados a ações inválidas como 'enterpictureinpicture'
 * Aplica o patch no prototype para capturar também scripts externos (extensões do browser)
 */

// Lista de ações válidas do MediaSession API
const validMediaSessionActions = [
  'play',
  'pause',
  'seekbackward',
  'seekforward',
  'previoustrack',
  'nexttrack',
  'skipad',
  'stop',
  'seekto'
];

const patchMediaSession = () => {
  try {
    // Verificar se MediaSession está disponível
    if (typeof window === 'undefined') return;
    
    const MediaSessionClass = window.MediaSession || 
      (window.navigator && window.navigator.mediaSession && window.navigator.mediaSession.constructor);
    
    if (!MediaSessionClass) return;

    // Tentar patch no prototype (captura scripts externos/extensões do browser também)
    const proto = MediaSessionClass.prototype || 
      Object.getPrototypeOf(window.navigator.mediaSession);

    if (proto && proto.setActionHandler && !proto._patchedByDFGraficas) {
      const originalSetActionHandler = proto.setActionHandler;

      proto.setActionHandler = function(action, handler) {
        if (!validMediaSessionActions.includes(action)) {
          console.warn(`[MediaSession Fix] Ação inválida ignorada: "${action}"`);
          return;
        }
        try {
          return originalSetActionHandler.call(this, action, handler);
        } catch (error) {
          console.warn(`[MediaSession Fix] Erro ao definir handler para "${action}":`, error);
        }
      };

      proto._patchedByDFGraficas = true;
    }

    // Também patch na instância diretamente como fallback
    if (navigator.mediaSession && !navigator.mediaSession._instancePatched) {
      const originalInstance = navigator.mediaSession.setActionHandler;

      if (typeof originalInstance === 'function') {
        navigator.mediaSession.setActionHandler = function(action, handler) {
          if (!validMediaSessionActions.includes(action)) {
            console.warn(`[MediaSession Fix] Ação inválida ignorada: "${action}"`);
            return;
          }
          try {
            return originalInstance.call(this, action, handler);
          } catch (error) {
            console.warn(`[MediaSession Fix] Erro ao definir handler para "${action}":`, error);
          }
        };
        navigator.mediaSession._instancePatched = true;
      }
    }
  } catch (error) {
    // Silencioso - não queremos causar mais erros ao tentar corrigir
  }
};

export const fixMediaSession = patchMediaSession;

// Aplicar patch imediatamente (antes de qualquer outro script quando possível)
patchMediaSession();
