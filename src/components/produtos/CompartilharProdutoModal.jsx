import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, Share2, QrCode, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QRCode from 'qrcode.react';

const CompartilharProdutoModal = ({ isOpen, onClose, produto }) => {
  const [linkCompartilhamento, setLinkCompartilhamento] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (produto && isOpen) {
      // Gerar link de compartilhamento usando o domínio de produção
      const baseUrl = 'https://jet-impre.com';
      const link = `${baseUrl}/catalogo-publico/produto/${produto.id}`;
      setLinkCompartilhamento(link);
      
      // Mensagem padrão
      setMensagemPersonalizada(`Olá! Confira este produto: ${produto.nome}\n\n${link}`);
    }
  }, [produto, isOpen]);

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkCompartilhamento);
      setCopiado(true);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const copiarMensagem = async () => {
    try {
      await navigator.clipboard.writeText(mensagemPersonalizada);
      toast({
        title: "Mensagem copiada!",
        description: "A mensagem foi copiada para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const compartilharWhatsApp = () => {
    const mensagem = encodeURIComponent(mensagemPersonalizada);
    const url = `https://wa.me/?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const compartilharTelegram = () => {
    const mensagem = encodeURIComponent(mensagemPersonalizada);
    const url = `https://t.me/share/url?url=${encodeURIComponent(linkCompartilhamento)}&text=${mensagem}`;
    window.open(url, '_blank');
  };

  const abrirLink = () => {
    window.open(linkCompartilhamento, '_blank');
  };

  if (!produto) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Compartilhar Produto
          </DialogTitle>
          <DialogDescription>
            Compartilhe este produto com seus clientes através de diferentes canais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Produto */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {produto.imagem_principal ? (
                  <img 
                    src={produto.imagem_principal.startsWith('http') 
                      ? produto.imagem_principal 
                      : `${import.meta.env.VITE_API_URL}/storage/${produto.imagem_principal}`
                    } 
                    alt={produto.nome} 
                    className="h-16 w-16 object-cover rounded-md border" 
                  />
                ) : (
                  <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-md">
                    <span className="text-2xl">📦</span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{produto.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    Código: {produto.codigo_produto}
                  </p>
                  <p className="text-sm font-medium text-green-600">
                    R$ {parseFloat(produto.preco_venda || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link de Compartilhamento */}
          <div className="space-y-2">
            <Label htmlFor="link">Link de Compartilhamento</Label>
            <div className="flex gap-2">
              <Input
                id="link"
                value={linkCompartilhamento}
                readOnly
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copiarLink}
                className="shrink-0"
              >
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={abrirLink}
                className="shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label>QR Code</Label>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white border rounded-lg">
                <QRCode value={linkCompartilhamento} size={120} />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Cliente pode escanear este QR Code para acessar o produto diretamente.</p>
              </div>
            </div>
          </div>

          {/* Mensagem Personalizada */}
          <div className="space-y-2">
            <Label htmlFor="mensagem">Mensagem Personalizada</Label>
            <Textarea
              id="mensagem"
              value={mensagemPersonalizada}
              onChange={(e) => setMensagemPersonalizada(e.target.value)}
              placeholder="Digite uma mensagem personalizada para acompanhar o link..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copiarMensagem}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar Mensagem
              </Button>
            </div>
          </div>

          {/* Botões de Compartilhamento */}
          <div className="space-y-2">
            <Label>Compartilhar via</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={compartilharWhatsApp}
                className="flex-1 min-w-[120px]"
              >
                📱 WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={compartilharTelegram}
                className="flex-1 min-w-[120px]"
              >
                💬 Telegram
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompartilharProdutoModal;
