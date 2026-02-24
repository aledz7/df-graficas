import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Send, Paperclip, Image as ImageIcon, Smile,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChatInput({ onSend, onTyping, replyTo }) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Atualizar status "digitando..."
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Parar de digitar após 2 segundos sem digitar
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, 2000);
  };

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      setIsTyping(false);
      onTyping?.(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onSend('', { file });
    }
  };

  return (
    <div className="p-4 bg-white">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg flex items-center justify-between border border-blue-200">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium">Respondendo a {replyTo.user?.name}</p>
            <p className="text-sm text-gray-700 truncate">{replyTo.texto || 'Arquivo'}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}}
            className="h-6 w-6 p-0 hover:bg-blue-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Botões de ação */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,application/pdf,.cdr,.ai,.eps,.psd,.zip,.rar"
          />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Input */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Escreva uma mensagem..."
            className="pr-12 min-h-[48px] rounded-full border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            multiline
            rows={1}
          />
        </div>

        {/* Botão enviar */}
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
