import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, CheckCircle2, Star, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const IndiqueGanheModal = ({ open, onOpenChange }) => {
  const { user } = useAuth();

  // Número do WhatsApp para contato
  const whatsappNumber = '5561998524612';

  const handleContatoWhatsApp = () => {
    const nomeEmpresa = user?.empresa_nome || user?.name || 'Cliente';
    const mensagem = encodeURIComponent(
      `Olá! Sou cliente do sistema e gostaria de indicar alguém.\n\n` +
      `Minha empresa: ${nomeEmpresa}\n\n` +
      `Dados do indicado:\n` +
      `Nome: \n` +
      `Telefone: \n` +
      `Empresa: `
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${mensagem}`, '_blank');
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
                  <h5 className="font-medium">Entre em contato conosco</h5>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão abaixo e envie os dados da pessoa ou empresa que deseja indicar
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

          {/* Botão WhatsApp */}
          <Button 
            onClick={handleContatoWhatsApp}
            className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-6 w-6 mr-3" />
            Indicar pelo WhatsApp
          </Button>

          {/* Termos */}
          <p className="text-xs text-muted-foreground text-center">
            * A bonificação será creditada após a confirmação da assinatura do indicado.
            Não há limite de indicações. Válido para novos clientes apenas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IndiqueGanheModal;
