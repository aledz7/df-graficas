import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Banknote, Edit, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { contaBancariaService, uploadService } from '../services/api';
import { getImageUrl } from '../lib/imageUtils';

const initialFormState = { 
    id: null, 
    nome: '', 
    nome_banco: '', 
    agencia: '', 
    conta: '', 
    digito_conta: '', 
    operacao: '',
    tipo: 'conta_corrente',
    saldo_inicial: 0,
    data_saldo_inicial: new Date().toISOString().split('T')[0],
    titular_nome: '',
    titular_documento: '',
    telefone_contato: '',
    email_contato: '',
    ativo: true,
    incluir_fluxo_caixa: true,
    conta_padrao: false,
    cor: '#3498db',
    icone: 'fas fa-university',
    observacoes: '',
    metadados: {
        chavePix: '',
        qrCodeUrl: ''
    }
};



const ContasBancariasPage = () => {
    const { toast } = useToast();
    const [contas, setContas] = useState([]);
    const [formData, setFormData] = useState(initialFormState);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [qrCodePreview, setQrCodePreview] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                
                const response = await contaBancariaService.getAll();
                
                // O ResourceController retorna dados paginados
                // A estrutura é: response.data.data.data (array de contas)
                let contasData = [];
                if (response && response.data && response.data.data && response.data.data.data) {
                    contasData = response.data.data.data;
                } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
                    contasData = response.data.data;
                } else if (response && response.data && Array.isArray(response.data)) {
                    contasData = response.data;
                } 
                
                setContas(contasData);
            } catch (error) {
                console.error('❌ Erro ao carregar contas bancárias da API:', error);
                toast({ 
                    title: 'Erro ao carregar', 
                    description: 'Não foi possível carregar as contas bancárias.', 
                    variant: 'destructive' 
                });
                setContas([]);
            }
        };
        
        loadData();
    }, [toast]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQrCodeUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                toast({ title: "Arquivo muito grande", description: "Por favor, use uma imagem com menos de 1MB.", variant: "destructive" });
                return;
            }
            
            try {
                // Fazer upload do arquivo para o servidor
                const response = await uploadService.uploadQrCode(file);
                
                if (response.data.success) {
                    const path = response.data.path;
                    const url = response.data.url;
                    
                    setFormData(prev => ({ 
                        ...prev, 
                        metadados: { 
                            ...prev.metadados, 
                            qrCodeUrl: path // Salvar o caminho no banco
                        } 
                    }));
                    setQrCodePreview(url); // Usar a URL para preview
                    
                    toast({ 
                        title: "QR Code enviado", 
                        description: "Imagem do QR Code foi enviada com sucesso." 
                    });
                } else {
                    toast({ 
                        title: "Erro no upload", 
                        description: response.data.message || "Erro ao enviar QR Code.", 
                        variant: "destructive" 
                    });
                }
            } catch (error) {
                console.error('Erro ao fazer upload do QR Code:', error);
                toast({ 
                    title: "Erro no upload", 
                    description: "Erro ao enviar QR Code. Tente novamente.", 
                    variant: "destructive" 
                });
            }
        }
    };

    const handleSave = async () => {
        if (!formData.nome) {
            toast({ title: 'Campos obrigatórios', description: 'Nome da conta é obrigatório.', variant: 'destructive' });
            return;
        }

        try {
            if (formData.id) {
                // Atualizar conta existente
                await contaBancariaService.update(formData.id, formData);
                toast({ title: 'Sucesso', description: 'Conta bancária atualizada.' });
            } else {
                // Criar nova conta
                await contaBancariaService.create(formData);
                toast({ title: 'Sucesso', description: 'Nova conta bancária adicionada.' });
            }
            
            // Recarregar dados da API
            const response = await contaBancariaService.getAll();
            let contasData = [];
            if (response && response.data && response.data.data && response.data.data.data) {
                contasData = response.data.data.data;
            } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
                contasData = response.data.data;
            } else if (response && response.data && Array.isArray(response.data)) {
                contasData = response.data;
            }
            setContas(contasData);
            setIsDialogOpen(false);
        } catch (error) {
            console.error('❌ Erro ao salvar conta bancária na API:', error);
            toast({ 
                title: 'Erro ao salvar', 
                description: 'Ocorreu um erro ao salvar os dados na API.', 
                variant: 'destructive' 
            });
        }
    };

    const handleEdit = (conta) => {
        setFormData(conta);
        // Se tiver QR Code salvo, usar a URL para preview
        if (conta.metadados?.qrCodeUrl) {
            const imageUrl = getImageUrl(conta.metadados.qrCodeUrl);
            setQrCodePreview(imageUrl);
        } else {
            setQrCodePreview('');
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            await contaBancariaService.delete(id);
            toast({ title: 'Sucesso', description: 'Conta bancária removida.' });
            
            // Recarregar dados da API
            const response = await contaBancariaService.getAll();
            let contasData = [];
            if (response && response.data && response.data.data && response.data.data.data) {
                contasData = response.data.data.data;
            } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
                contasData = response.data.data;
            } else if (response && response.data && Array.isArray(response.data)) {
                contasData = response.data;
            }
            setContas(contasData);
        } catch (error) {
            console.error('❌ Erro ao remover conta bancária da API:', error);
            toast({ 
                title: 'Erro ao remover', 
                description: 'Ocorreu um erro ao remover a conta bancária da API.', 
                variant: 'destructive' 
            });
        }
    };

    const openNewDialog = () => {
        setFormData(initialFormState);
        setQrCodePreview('');
        setIsDialogOpen(true);
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                        <Banknote size={28} className="text-primary hidden sm:block" />
                        <div>
                            <CardTitle className="text-xl sm:text-2xl">Contas Bancárias</CardTitle>
                            <CardDescription className="text-sm">Gerencie as contas para recebimento via PIX e QR Codes.</CardDescription>
                        </div>
                    </div>
                    <Button 
                        onClick={openNewDialog}
                        className="w-full sm:w-auto"
                    >
                        <PlusCircle size={18} className="mr-2" /> Nova Conta
                    </Button>
                </CardHeader>
                <CardContent>
                    {/* Visualização em Cards para Mobile */}
                    <div className="md:hidden">
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            <div className="space-y-4 pr-2">
                                {contas.length > 0 ? (
                                    contas.map((conta) => (
                                        <motion.div
                                            key={conta.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                                        >
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3">
                                                    {conta.metadados?.qrCodeUrl ? (
                                                        (() => {
                                                            const imageUrl = getImageUrl(conta.metadados.qrCodeUrl);
                                                            return (
                                                                <img src={imageUrl} alt="QR Code" className="w-16 h-16 object-contain rounded-sm border flex-shrink-0" />
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center flex-shrink-0">
                                                            <ImageIcon size={24} className="text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Banco</p>
                                                        <p className="font-semibold text-base break-words">{conta.nome_banco || conta.nome}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Agência</p>
                                                        <p className="text-sm font-medium">{conta.agencia}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">Conta</p>
                                                        <p className="text-sm font-medium">{conta.conta}{conta.digito_conta ? `-${conta.digito_conta}` : ''}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Chave PIX</p>
                                                    <p className="text-sm font-medium break-words">{conta.metadados?.chavePix || 'Não informada'}</p>
                                                </div>

                                                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handleEdit(conta)}
                                                            className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handleDelete(conta.id)}
                                                            className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                        <Banknote className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <p>Nenhuma conta bancária cadastrada.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Visualização em Tabela para Desktop */}
                    <div className="hidden md:block">
                        <ScrollArea className="h-[calc(100vh-18rem)]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>QR Code</TableHead>
                                        <TableHead>Banco</TableHead>
                                        <TableHead>Agência</TableHead>
                                        <TableHead>Conta</TableHead>
                                        <TableHead>Chave PIX</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contas.length > 0 ? (
                                        contas.map(conta => (
                                            <TableRow key={conta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <TableCell>
                                                    {conta.metadados?.qrCodeUrl ? (
                                                        (() => {
                                                            const imageUrl = getImageUrl(conta.metadados.qrCodeUrl);
                                                            return (
                                                                <img src={imageUrl} alt="QR Code" className="w-10 h-10 object-contain rounded-sm border" />
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="w-10 h-10 bg-muted rounded-sm flex items-center justify-center">
                                                            <ImageIcon size={20} className="text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-medium">{conta.nome_banco || conta.nome}</TableCell>
                                                <TableCell>{conta.agencia}</TableCell>
                                                <TableCell>{conta.conta}{conta.digito_conta ? `-${conta.digito_conta}` : ''}</TableCell>
                                                <TableCell>{conta.metadados?.chavePix || 'Não informada'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(conta)}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(conta.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">Nenhuma conta bancária cadastrada.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{formData.id ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="nome">Nome da Conta</Label>
                            <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Ex: Conta Principal" />
                        </div>
                        <div>
                            <Label htmlFor="nome_banco">Nome do Banco</Label>
                            <Input id="nome_banco" name="nome_banco" value={formData.nome_banco} onChange={handleInputChange} placeholder="Ex: Banco do Brasil" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="agencia">Agência</Label>
                                <Input id="agencia" name="agencia" value={formData.agencia} onChange={handleInputChange} placeholder="Ex: 1234-5" />
                            </div>
                            <div>
                                <Label htmlFor="conta">Conta</Label>
                                <Input id="conta" name="conta" value={formData.conta} onChange={handleInputChange} placeholder="Ex: 12345-6" />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="chavePix">Chave PIX</Label>
                            <Input 
                                id="chavePix" 
                                name="chavePix" 
                                value={formData.metadados?.chavePix || ''} 
                                onChange={(e) => setFormData(prev => ({ 
                                    ...prev, 
                                    metadados: { 
                                        ...prev.metadados, 
                                        chavePix: e.target.value 
                                    } 
                                }))} 
                                placeholder="Ex: email@exemplo.com ou (11) 99999-9999"
                            />
                        </div>
                        <div>
                            <Label htmlFor="qrCodeUpload">Imagem do QR Code PIX (Opcional)</Label>
                            <div className="mt-1 flex items-center space-x-4">
                                {qrCodePreview ? (
                                    <img src={qrCodePreview} alt="Preview QR Code" className="w-20 h-20 object-contain rounded border" />
                                ) : (
                                    <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                                        <ImageIcon size={32} className="text-muted-foreground" />
                                    </div>
                                )}
                                <Button asChild variant="outline">
                                    <label htmlFor="qrCodeUploadInput">
                                        <Upload size={16} className="mr-2" /> Upload
                                        <input id="qrCodeUploadInput" type="file" className="sr-only" onChange={handleQrCodeUpload} accept="image/*" />
                                    </label>
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Se não fornecer, um QR Code será gerado dinamicamente.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                        <Button onClick={handleSave}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ContasBancariasPage;