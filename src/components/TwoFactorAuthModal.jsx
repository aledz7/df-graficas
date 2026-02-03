import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Shield, Smartphone, Key, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { authService } from '@/services/api';

const TwoFactorAuthModal = ({ isOpen, onClose }) => {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const { toast } = useToast();

  // Carregar status do 2FA quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      loadTwoFactorStatus();
    }
  }, [isOpen]);

  const loadTwoFactorStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await authService.getTwoFactorStatus();
      if (response.success) {
        setTwoFactorEnabled(response.two_factor_enabled);
      }
    } catch (error) {
      console.error('Erro ao carregar status do 2FA:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar status da autenticação de dois fatores.",
        variant: "destructive"
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleToggleTwoFactor = async (enabled) => {
    try {
      setLoading(true);
      const response = await authService.toggleTwoFactor(enabled);
      
      if (response.success) {
        setTwoFactorEnabled(response.two_factor_enabled);
        toast({
          title: "Sucesso!",
          description: response.message
        });
      } else {
        toast({
          title: "Erro",
          description: response.message || "Erro ao alterar configuração de 2FA.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao alterar 2FA:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar configuração de 2FA. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Autenticação de Dois Fatores</span>
          </DialogTitle>
          <DialogDescription>
            Proteja sua conta com uma camada extra de segurança
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              {twoFactorEnabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {twoFactorEnabled ? '2FA Ativado' : '2FA Desativado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {twoFactorEnabled 
                    ? 'Sua conta está protegida com autenticação de dois fatores'
                    : 'Sua conta não possui proteção adicional'
                  }
                </p>
              </div>
            </div>
            
            {loadingStatus ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggleTwoFactor}
                disabled={loading}
              />
            )}
          </div>

          {/* Como funciona */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Como Funciona</h3>
            
            <div className="grid gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Código por Email</h4>
                  <p className="text-xs text-muted-foreground">
                    Quando ativado, você receberá um código de 6 dígitos por email a cada login
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Key className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Segurança Extra</h4>
                  <p className="text-xs text-muted-foreground">
                    Mesmo que alguém descubra sua senha, precisará do código do seu email
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Códigos Temporários</h4>
                  <p className="text-xs text-muted-foreground">
                    Os códigos expiram em 10 minutos para máxima segurança
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefícios */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Benefícios da 2FA</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Proteção contra ataques de força bruta</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Segurança mesmo se sua senha for comprometida</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Conformidade com padrões de segurança</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Controle total sobre o acesso à sua conta</span>
              </li>
            </ul>
          </div>

          {/* Aviso importante */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Importante</h4>
            <p className="text-xs text-yellow-700">
              Certifique-se de ter acesso ao email cadastrado em sua conta. 
              Se você não conseguir acessar seu email, entre em contato com o suporte.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full" disabled={loading}>
            {loading ? "Processando..." : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorAuthModal;
