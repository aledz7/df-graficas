import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { KeyRound, Eye, EyeOff, AlertTriangle, DollarSign, FileText } from 'lucide-react';
import { adminConfigService } from '@/services/adminConfigService';

const AlterarSalarioModal = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    salarioAtual,
    title = "Alterar Salário Base", 
    description = "Para alterar o salário base, informe o novo valor e a senha master." 
}) => {
    const { toast } = useToast();
    const [novoSalario, setNovoSalario] = useState('');
    const [senha, setSenha] = useState('');
    const [motivo, setMotivo] = useState('');
    const [showSenha, setShowSenha] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!novoSalario.trim() || parseFloat(novoSalario) <= 0) {
            toast({ title: "Erro", description: "Por favor, informe um valor válido para o salário.", variant: "destructive" });
            return;
        }

        if (!senha.trim()) {
            toast({ title: "Erro", description: "Por favor, informe a senha master.", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            const response = await adminConfigService.validarSenhaMaster(senha);
            
            if (response.success && response.data.valida) {
                toast({ title: "Sucesso", description: "Senha master validada com sucesso." });
                onSuccess(novoSalario, motivo);
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
        setNovoSalario('');
        setSenha('');
        setMotivo('');
        setShowSenha(false);
        setLoading(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
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
                        <Label htmlFor="salario-atual">Salário Atual</Label>
                        <Input
                            id="salario-atual"
                            type="text"
                            value={`R$ ${parseFloat(salarioAtual || 0).toFixed(2)}`}
                            disabled
                            className="bg-gray-100 dark:bg-gray-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="novo-salario">Novo Salário (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="novo-salario"
                                type="number"
                                step="0.01"
                                min="0"
                                value={novoSalario}
                                onChange={(e) => setNovoSalario(e.target.value)}
                                placeholder="0,00"
                                disabled={loading}
                                className="pl-10"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="senha-master">Senha Master</Label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="senha-master"
                                type={showSenha ? 'text' : 'password'}
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                                placeholder="Digite a senha master"
                                disabled={loading}
                                className="pl-10"
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

                    <div className="space-y-2">
                        <Label htmlFor="motivo">Motivo da Alteração (Opcional)</Label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Textarea
                                id="motivo"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Ex: Aumento por mérito, Promoção, Ajuste salarial..."
                                disabled={loading}
                                className="pl-10"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !novoSalario.trim() || !senha.trim()}>
                            {loading ? 'Validando...' : 'Alterar Salário'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AlterarSalarioModal; 