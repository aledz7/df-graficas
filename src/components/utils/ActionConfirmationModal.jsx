import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { KeyRound, ShieldAlert, Info } from 'lucide-react';

const ActionConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  requirePassword = false,
  requireJustification = false,
  passwordLabel = "Senha do Supervisor",
  justificationLabel = "Justificativa (Obrigatória)",
  passwordPlaceholder = "Digite a senha para confirmar",
  justificationPlaceholder = "Descreva o motivo desta ação.",
  confirmButtonText = "Confirmar",
  confirmButtonVariant = "default",
}) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [justification, setJustification] = useState('');

  const handleConfirmAction = async () => {
    if (requirePassword) {
      const supervisorPassword = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}').supervisorPassword;
      if (!supervisorPassword) {
        toast({ title: 'Senha de Supervisor Não Configurada', description: 'Por favor, configure uma senha de supervisor nas configurações da empresa.', variant: 'destructive', duration: 7000 });
        return;
      }
      if (!password) {
        toast({ title: 'Senha Obrigatória', description: 'Por favor, insira a senha do supervisor.', variant: 'destructive' });
        return;
      }
      if (password !== supervisorPassword) {
        toast({ title: 'Senha Incorreta', description: 'A senha do supervisor inserida está incorreta.', variant: 'destructive' });
        return;
      }
    }

    if (requireJustification && !justification.trim()) {
      toast({ title: 'Justificativa Obrigatória', description: justificationPlaceholder, variant: 'destructive' });
      return;
    }

    onConfirm(requireJustification ? justification : undefined);
    setPassword('');
    setJustification('');
    onClose();
  };

  const handleCancelAction = () => {
    setPassword('');
    setJustification('');
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center">
            {requirePassword ? <ShieldAlert className="mr-2 h-6 w-6 text-destructive" /> : <Info className="mr-2 h-6 w-6 text-primary" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-2 space-y-4">
          {requirePassword && (
            <div>
              <Label htmlFor="supervisor_password_confirm">{passwordLabel}</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="supervisor_password_confirm"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={passwordPlaceholder}
                  className="pl-10"
                />
              </div>
            </div>
          )}
          {requireJustification && (
            <div>
              <Label htmlFor="action_justification">{justificationLabel}</Label>
              <Textarea
                id="action_justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={justificationPlaceholder}
              />
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelAction}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmAction} 
            disabled={(requirePassword && !password.trim()) || (requireJustification && !justification.trim())}
            className={confirmButtonVariant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {confirmButtonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ActionConfirmationModal;