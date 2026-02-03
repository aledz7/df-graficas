import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Copy, Loader2 } from 'lucide-react';
import { generatePixPayload } from '@/lib/pixGenerator';
import QRCode from 'qrcode.react';

const PixQrCodeModal = ({ isOpen, onClose, valor, chavePix, nomeEmpresa, cidadeEmpresa, qrCodeUrl, shouldGenerateQr, hasChavePix, hasQrCodeUrl }) => {
    const { toast } = useToast();
    const [generatedQrCode, setGeneratedQrCode] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Gerar QR code dinamicamente quando shouldGenerateQr for true
    useEffect(() => {
        if (shouldGenerateQr && chavePix && valor) {
            setIsGenerating(true);
            try {
                const pixPayload = generatePixPayload({
                    chavePix,
                    nomeEmpresa: nomeEmpresa || 'Empresa',
                    cidadeEmpresa: cidadeEmpresa || 'Cidade',
                    valor: parseFloat(valor),
                    txid: `PAG${Date.now()}`
                });
                setGeneratedQrCode(pixPayload);
            } catch (error) {
                console.error('Erro ao gerar QR code PIX:', error);
                toast({
                    title: "Erro",
                    description: "Erro ao gerar QR code PIX",
                    variant: "destructive"
                });
            } finally {
                setIsGenerating(false);
            }
        }
    }, [shouldGenerateQr, chavePix, valor, nomeEmpresa, cidadeEmpresa, toast]);

    // Limpar QR code gerado quando o modal fechar
    useEffect(() => {
        if (!isOpen) {
            setGeneratedQrCode(null);
            setIsGenerating(false);
        }
    }, [isOpen]);
    
    const handleCopy = () => {
        if (chavePix) {
            navigator.clipboard.writeText(chavePix);
            toast({ title: 'Copiado!', description: 'A chave Pix foi copiada para a área de transferência.' });
        }
    };

    // Determinar qual QR code mostrar
    const isShowingBankQrCode = hasQrCodeUrl && qrCodeUrl;
    const isShowingGeneratedQrCode = shouldGenerateQr && generatedQrCode;

    return (
        <Dialog open={isOpen && valor && (hasChavePix || hasQrCodeUrl)} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Pagamento via PIX</DialogTitle>
                    <DialogDescription>
                        {isShowingBankQrCode && "Escaneie o QR Code cadastrado abaixo ou copie a chave PIX."}
                        {isShowingGeneratedQrCode && "Escaneie o QR Code gerado abaixo ou copie a chave PIX."}
                        {!qrCodeUrl && !generatedQrCode && !isGenerating && hasChavePix && "Use a chave PIX abaixo para pagar."}
                        {isGenerating && "Gerando QR Code..."}
                        <br/>Valor: <span className="font-bold">R$ {parseFloat(valor).toFixed(2)}</span>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center w-64 h-64 border rounded-md bg-gray-50">
                            <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-2" />
                            <p className="text-sm text-gray-500">Gerando QR Code...</p>
                        </div>
                    ) : qrCodeUrl ? (
                        <div className="flex flex-col items-center">
                            <img src={qrCodeUrl} alt="PIX QR Code" className="w-64 h-64 object-contain border rounded-md" />
                            <p className="text-xs text-muted-foreground mt-2">QR Code cadastrado no sistema</p>
                        </div>
                    ) : generatedQrCode ? (
                        <div className="flex flex-col items-center">
                            <div className="p-4 bg-white border border-gray-300 rounded-lg">
                                <QRCode 
                                    value={generatedQrCode} 
                                    size={256}
                                    level="M"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">QR Code gerado dinamicamente</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center w-64 h-64 border rounded-md bg-gray-50">
                            <p className="text-sm text-muted-foreground text-center">Nenhum QR Code disponível.<br/>Use a chave PIX abaixo.</p>
                        </div>
                    )}
                </div>
                {hasChavePix && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Chave PIX</label>
                        <div className="flex items-center space-x-2">
                            <Input readOnly value={chavePix || ''} className="text-xs" />
                            <Button variant="outline" size="icon" onClick={handleCopy} disabled={!chavePix}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Beneficiário: {nomeEmpresa}</p>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Fechar</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PixQrCodeModal;