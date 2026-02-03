import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { KeyRound, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { adminConfigService } from '@/services/adminConfigService';

const SenhaMasterModal = ({ isOpen, onClose, onSuccess, title = "Senha Master Necessária", description = "Esta operação requer a senha master do sistema." }) => {
  const { toast } = useToast();
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!senha.trim()) {
      toast({ title: "Erro", description: "Por favor, informe a senha master.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      const response = await adminConfigService.validarSenhaMaster(senha);
      
      if (response.success && response.data.valida) {
        toast({ title: "Sucesso", description: "Senha master validada com sucesso." });
        onSuccess(senha);
        handleClose();
      } else {
        toast({ title: "Erro", description: "Senha master inválida.", variant: "destructive" });
        setSenha('');
      }
    } catch (error) {
      console.error('Erro ao validar senha master:', error);
      toast({ title: "Erro", description: "Erro ao validar senha master.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSenha('');
    setShowSenha(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-200">Atenção:</h3>
              <p className="text-xs text-yellow-600 dark:text-yellow-300">
                Esta é uma operação sensível que requer autorização especial.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senha-master">Senha Master</Label>
            <div className="relative">
              <Input
                id="senha-master"
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite a senha master"
                disabled={loading}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute inset-y-0 right-0 h-full px-3"
                onClick={() => setShowSenha(!showSenha)}
                disabled={loading}
              >
                {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !senha.trim()}>
              {loading ? 'Validando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SenhaMasterModal; 