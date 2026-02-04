import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { apiDataManager } from '@/lib/apiDataManager';
import { adminConfigService } from '@/services/adminConfigService';

const DeleteWithJustificationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    requirePassword = true, 
    vendedorAtual,
    isLixeiraAction = false 
}) => {
    const [justificativa, setJustificativa] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setJustificativa('');
            setPassword('');
        }
    }, [isOpen]);

    const handleConfirm = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (requirePassword) {
            let isSenhaMasterValida = false;
            
            try {
                // Validar senha master usando o serviço Laravel
                const response = await adminConfigService.validarSenhaMaster(password);
                isSenhaMasterValida = response.data?.valida || false;
            } catch (error) {
                console.error('Erro ao validar senha master:', error);
                isSenhaMasterValida = false;
            }
            
            if (isLixeiraAction) {
                if (!isSenhaMasterValida) {
                    toast({ title: "Acesso Negado", description: "Apenas a Senha Master Global pode realizar esta ação na lixeira.", variant: "destructive" });
                    return;
                }
            } else {
                 const isSenhaVendedorValida = vendedorAtual && vendedorAtual.senha && password === vendedorAtual.senha;
                 if (!isSenhaMasterValida && !isSenhaVendedorValida) {
                    toast({ title: "Senha Incorreta", description: "A senha inserida está incorreta.", variant: "destructive" });
                    return;
                }
            }
        }
        if (!justificativa.trim() && !isLixeiraAction) { // Justificativa não é obrigatória para ações na lixeira, mas é para exclusão normal
            toast({ title: "Justificativa Necessária", description: "Por favor, forneça uma justificativa para a exclusão.", variant: "destructive" });
            return;
        }
        onConfirm(justificativa, password); // Passa a senha para o onConfirm, caso seja necessária no futuro
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        <AlertCircle className="mr-2 h-6 w-6 text-red-500" />
                        {title || 'Confirmar Ação'}
                    </DialogTitle>
                    <DialogDescription>
                        {description || 'Esta ação é irreversível. Tem certeza que deseja prosseguir?'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleConfirm} className="grid gap-4 py-4">
                    {!isLixeiraAction && (
                        <div className="space-y-1">
                            <Label htmlFor="justificativa_exclusao">Justificativa <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="justificativa_exclusao"
                                value={justificativa}
                                onChange={(e) => setJustificativa(e.target.value)}
                                placeholder="Descreva o motivo da ação..."
                                rows={3}
                            />
                        </div>
                    )}
                    {requirePassword && (
                        <div className="space-y-1">
                            <Label htmlFor="password_exclusao">
                                {isLixeiraAction ? "Senha Master Global" : "Senha de Confirmação (Sua ou Master)"}
                                <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="password_exclusao"
                                  type={showPassword ? 'text' : 'password'}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder={isLixeiraAction ? "Digite a senha master" : "Digite sua senha ou a senha master"}
                                  className="pl-10"
                                  autoComplete="current-password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button 
                            type="submit"
                            variant="destructive" 
                            disabled={(!isLixeiraAction && !justificativa.trim()) || (requirePassword && !password.trim())}
                        >
                            Confirmar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteWithJustificationModal;