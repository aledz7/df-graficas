import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Share2, QrCode, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QRCode from 'qrcode.react';

const CompartilharModal = ({ isOpen, onClose, tipo, id, onCompartilhar }) => {
  const [linkCompartilhamento, setLinkCompartilhamento] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && id) {
      handleGerarLink();
    } else {
      setLinkCompartilhamento('');
      setCopiado(false);
    }
  }, [isOpen, id]);

  const handleGerarLink = async () => {
    if (!id) return;
    
    setIsLoading(true);
    try {
      const response = await onCompartilhar(id);
      
      if (response.success && response.data?.share_url) {
        // Usar a URL completa do frontend
        const baseUrl = window.location.origin;
        const tipoPath = tipo === 'os' ? 'os' : 'venda';
        const shareUrl = `${baseUrl}/public/${tipoPath}/${response.data.share_token}`;
        setLinkCompartilhamento(shareUrl);
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível gerar o link de compartilhamento',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao gerar link de compartilhamento',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copiarLink = () => {
    if (!linkCompartilhamento) return;
    
    navigator.clipboard.writeText(linkCompartilhamento).then(() => {
      setCopiado(true);
      toast({
        title: 'Link copiado!',
        description: 'O link foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopiado(false), 2000);
    });
  };

  const compartilharWhatsApp = () => {
    if (!linkCompartilhamento) return;
    const mensagem = tipo === 'os' 
      ? 'Confira os detalhes da Ordem de Serviço'
      : 'Confira os detalhes da Venda';
    const url = `https://wa.me/?text=${encodeURIComponent(mensagem + ': ' + linkCompartilhamento)}`;
    window.open(url, '_blank');
  };

  const abrirLink = () => {
    if (!linkCompartilhamento) return;
    window.open(linkCompartilhamento, '_blank');
  };

  const getTitulo = () => {
    return tipo === 'os' ? 'Compartilhar Ordem de Serviço' : 'Compartilhar Venda';
  };

  const getDescricao = () => {
    return tipo === 'os' 
      ? 'Compartilhe esta ordem de serviço através de um link público. O link pode ser acessado sem necessidade de login.'
      : 'Compartilhe esta venda através de um link público. O link pode ser acessado sem necessidade de login.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {getTitulo()}
          </DialogTitle>
          <DialogDescription>
            {getDescricao()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : linkCompartilhamento ? (
            <>
              <div>
                <Label>Link de Compartilhamento</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={linkCompartilhamento}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copiarLink}
                  >
                    {copiado ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-center py-4">
                <QRCode value={linkCompartilhamento} size={200} />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={compartilharWhatsApp}
                  className="flex-1"
                >
                  📱 WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={abrirLink}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir Link
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Clique em "Gerar Link" para criar o link de compartilhamento</p>
              <Button onClick={handleGerarLink} className="mt-4">
                Gerar Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompartilharModal;
