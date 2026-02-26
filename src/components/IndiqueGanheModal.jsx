import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, CheckCircle2, Star, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { indicacaoService } from '@/services/indicacaoService';

const IndiqueGanheModal = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa_nome: '',
    responsavel_nome: '',
    whatsapp: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const limparFormulario = () => {
    setFormData({
      empresa_nome: '',
      responsavel_nome: '',
      whatsapp: '',
    });
  };

  const handleEnviarIndicacao = async () => {
    if (!formData.empresa_nome || !formData.responsavel_nome || !formData.whatsapp) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Informe empresa, responsável e WhatsApp para enviar a indicação.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await indicacaoService.enviarIndicacao({
        empresa_nome: formData.empresa_nome.trim(),
        responsavel_nome: formData.responsavel_nome.trim(),
        whatsapp: formData.whatsapp.trim(),
      });

      toast({
        title: 'Indicação enviada com sucesso',
        description: 'A indicação já foi encaminhada para o administrador.',
      });

      limparFormulario();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Não foi possível enviar a indicação',
        description: error?.response?.data?.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Gift className="h-7 w-7 text-orange-500" />
            Indique e Ganhe
          </DialogTitle>
          <DialogDescription>
            Indique amigos e ganhe mensalidades grátis!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banner principal */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 p-6 text-white">
            <div className="absolute -top-10 -right-10 opacity-20">
              <Gift className="h-40 w-40" />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-2">
                Ganhe 3 Mensalidades <span className="text-yellow-300">GRÁTIS!</span>
              </h3>
              <p className="text-lg opacity-90">
                Para cada cliente que você indicar e assinar o sistema
              </p>
            </div>
          </div>

          {/* Como funciona */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Como funciona?
            </h4>
            
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 font-bold">1</span>
                </div>
                <div>
                  <h5 className="font-medium">Preencha os dados da indicação</h5>
                  <p className="text-sm text-muted-foreground">
                    Informe empresa, responsável e WhatsApp para o time comercial entrar em contato
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400 font-bold">2</span>
                </div>
                <div>
                  <h5 className="font-medium">Seu indicado assina o sistema</h5>
                  <p className="text-sm text-muted-foreground">
                    Nós entramos em contato com seu indicado e, quando ele fechar a assinatura, a bonificação é liberada
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h5 className="font-medium text-green-700 dark:text-green-400">Você ganha 3 mensalidades grátis!</h5>
                  <p className="text-sm text-muted-foreground">
                    Sem limite de indicações - quanto mais indicar, mais você ganha!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="empresa_nome">Nome da empresa indicada *</Label>
              <Input
                id="empresa_nome"
                placeholder="Ex.: Gráfica Exemplo LTDA"
                value={formData.empresa_nome}
                onChange={(event) => handleChange('empresa_nome', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel_nome">Responsável *</Label>
              <Input
                id="responsavel_nome"
                placeholder="Ex.: João Silva"
                value={formData.responsavel_nome}
                onChange={(event) => handleChange('responsavel_nome', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp *</Label>
              <Input
                id="whatsapp"
                placeholder="Ex.: (61) 99999-9999"
                value={formData.whatsapp}
                onChange={(event) => handleChange('whatsapp', event.target.value)}
              />
            </div>

            <Button
              onClick={handleEnviarIndicacao}
              disabled={loading}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {loading ? 'Enviando indicação...' : 'Enviar indicação'}
            </Button>
          </div>

          {/* Termos */}
          <p className="text-xs text-muted-foreground text-center">
            * A bonificação será creditada após a confirmação da assinatura do indicado.
            Não há limite de indicações. Válido para novos clientes apenas.
          </p>

          <p className="text-xs text-muted-foreground text-center">
            Indicando como: <strong>{user?.name || 'Usuário'}</strong>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndiqueGanheModal;
