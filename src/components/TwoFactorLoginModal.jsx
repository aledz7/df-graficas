import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { authService } from '@/services/api';

const TwoFactorLoginModal = ({ isOpen, onClose, userEmail, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos em segundos
  const { toast } = useToast();

  // Timer para expiração do código
  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, timeLeft]);

  // Resetar quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setTimeLeft(600);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      toast({
        title: "Erro",
        description: "Por favor, digite o código de 6 dígitos.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Passar o código para o onSuccess em vez de chamar a API diretamente
      onSuccess({ user: { email: userEmail }, code });
      
    } catch (error) {
      console.error('Erro ao verificar código 2FA:', error);
      
      let errorMessage = "Erro ao verificar código. Tente novamente.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      const response = await authService.sendTwoFactorCode(userEmail);
      
      if (response.success) {
        toast({
          title: "Código Reenviado",
          description: "Um novo código foi enviado para seu email."
        });
        setTimeLeft(600); // Reset timer
      } else {
        toast({
          title: "Erro",
          description: response.message || "Erro ao reenviar código.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error);
      toast({
        title: "Erro",
        description: "Erro ao reenviar código. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Verificação de Segurança</span>
          </DialogTitle>
          <DialogDescription>
            Digite o código de 6 dígitos enviado para seu email
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações do email */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Código enviado para
              </p>
              <p className="text-xs text-blue-700">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center space-x-2 p-3 bg-gray-50 border rounded-lg">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Código expira em: {formatTime(timeLeft)}
            </span>
          </div>

          {/* Campo do código */}
          <div className="space-y-2">
            <Label htmlFor="code">Código de Verificação</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              placeholder="000000"
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              disabled={loading || timeLeft === 0}
              required
            />
            <p className="text-xs text-muted-foreground text-center">
              Digite o código de 6 dígitos que você recebeu por email
            </p>
          </div>

          {/* Botão de reenviar */}
          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResendCode}
              disabled={resendLoading || timeLeft > 0}
              className="text-xs"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Reenviar Código
                </>
              )}
            </Button>
            {timeLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Aguarde {formatTime(timeLeft)} para reenviar
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || code.length !== 6 || timeLeft === 0}
            >
              {loading ? "Verificando..." : "Verificar Código"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorLoginModal;
