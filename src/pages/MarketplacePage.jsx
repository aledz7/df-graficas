import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Search, Store, ShoppingBag, UserPlus, Truck, Upload, Image as ImageIcon, Link as LinkIcon, DollarSign, FileText, Printer } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { apiDataManager } from '@/lib/apiDataManager';
import { safeJsonParse } from '@/lib/utils';
import { marketplaceService } from '@/services/marketplaceService';

import { uploadService } from '@/services/api';
import MarketplaceProdutoModal from '@/components/marketplace/MarketplaceProdutoModal';

const MarketplaceVendaForm = ({ isOpen, venda, onSave, onClose, vendedorAtual }) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        id: venda?.id || `mkt-${uuidv4()}`,
        data_venda: venda?.data_venda || new Date().toISOString(),
        cliente_nome: venda?.cliente_nome || '',
        cliente_contato: venda?.cliente_contato || '',
        cliente_endereco: venda?.cliente_endereco || '',
        produtos: Array.isArray(venda?.produtos) ? venda.produtos : [],
        valor_total: venda?.valor_total || 0,
        status_pedido: venda?.status_pedido || 'Aguardando Envio',
        codigo_rastreio: venda?.codigo_rastreio || '',
        link_produto: venda?.link_produto || '',
        fotos_produto: Array.isArray(venda?.fotos_produto) ? venda.fotos_produto : [],
        observacoes: venda?.observacoes || '',
        vendedor_id: venda?.vendedor_id || vendedorAtual?.id,
        vendedor_nome: venda?.vendedor_nome || vendedorAtual?.nome,
    });
    const [newProduto, setNewProduto] = useState({ nome: '', quantidade: 1, preco_unitario: '', produto_id: null });
    const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFotoUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;


        try {
            // Mostrar previews locais para melhor UX
            const localPreviews = files.map(file => URL.createObjectURL(file));
            setFormData(prev => ({
                ...prev,
                fotos_produto: Array.isArray(prev.fotos_produto) ? [...prev.fotos_produto, ...localPreviews] : localPreviews
            }));

            // Fazer upload das imagens para o servidor usando a galeria
            const response = await uploadService.uploadGaleria(files);


            if (response.data && response.data.success) {
                // Usar os caminhos relativos retornados pelo servidor para salvar no banco
                const novasUrls = response.data.urls || [];


                setFormData(prev => {
                    const fotosExistentes = Array.isArray(prev.fotos_produto) ? prev.fotos_produto : [];
                    // Remover as URLs temporárias e adicionar os caminhos relativos
                    const fotosSemTemporarias = fotosExistentes.filter(foto => !foto.startsWith('blob:'));
                    const novasFotos = [...fotosSemTemporarias, ...novasUrls];



                    return {
                        ...prev,
                        fotos_produto: novasFotos
                    };
                });

                toast({
                    title: "Sucesso",
                    description: "Fotos do produto enviadas com sucesso!"
                });
            } else {
                console.error('Erro no upload das fotos:', response.data);
                toast({
                    title: "Erro",
                    description: response.data?.message || "Erro ao enviar fotos do produto",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Erro ao fazer upload das fotos:', error);
            toast({
                title: "Erro",
                description: "Erro ao enviar fotos do produto",
                variant: "destructive"
            });
        }
    };

    const handleAddProduto = () => {
        if (!newProduto.nome || !newProduto.preco_unitario) {
            toast({ title: 'Produto incompleto', variant: 'destructive' });
            return;
        }
        const precoUnitario = parseFloat(newProduto.preco_unitario);
        if (isNaN(precoUnitario)) {
            toast({ title: 'Preço inválido', description: 'O preço unitário deve ser um número válido.', variant: 'destructive' });
            return;
        }
        const produto = {
            ...newProduto,
            id: uuidv4(),
            produto_id: newProduto.produto_id || null, // Preservar ID do produto se existir 
            preco_unitario: precoUnitario, // Garantir que é número
            subtotal: newProduto.quantidade * precoUnitario
        };
        const currentProdutos = Array.isArray(formData.produtos) ? formData.produtos : [];
        const newProdutosList = [...currentProdutos, produto];
        const newTotal = newProdutosList.reduce((acc, p) => acc + (parseFloat(p.subtotal) || 0), 0);
        setFormData(prev => ({ ...prev, produtos: newProdutosList, valor_total: newTotal }));
        setNewProduto({ nome: '', quantidade: 1, preco_unitario: '', produto_id: null });
    };

    const handleSelectProdutoCatalogo = (produto) => {
        setNewProduto({
            nome: produto.nome,
            quantidade: 1,
            preco_unitario: produto.preco_unitario,
            produto_id: produto.id
        });
    };

    const handleRemoveProduto = (id) => {
        const currentProdutos = Array.isArray(formData.produtos) ? formData.produtos : [];
        const newProdutosList = currentProdutos.filter(p => p.id !== id);
        const newTotal = newProdutosList.reduce((acc, p) => acc + (parseFloat(p.subtotal) || 0), 0);
        setFormData(prev => ({ ...prev, produtos: newProdutosList, valor_total: newTotal }));
    };

    const handleRemoveFoto = (index) => {
        setFormData(prev => {
            const fotosExistentes = Array.isArray(prev.fotos_produto) ? prev.fotos_produto : [];
            const novasFotos = fotosExistentes.filter((_, i) => i !== index);
            return { ...prev, fotos_produto: novasFotos };
        });
        toast({ title: "Foto removida." });
    };

    // Função para obter URL completa da foto para exibição
    const getFotoUrl = (foto) => {
        // Se já é uma URL completa, retornar como está
        if (foto.startsWith('http')) {
            return foto;
        }

        // Se é um blob URL (preview local), retornar como está
        if (foto.startsWith('blob:')) {
            return foto;
        }

        // Se é um caminho relativo, construir URL completa
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        // Se o caminho já começar com tenants/, construir URL completa
        if (foto.startsWith('tenants/')) {
            const fullUrl = `${apiBaseUrl}/api/storage/${foto}`;
            return fullUrl;
        }

        // Se é apenas o nome do arquivo, construir caminho completo
        // Por enquanto, usar tenant_id 1 como fallback
        const fullUrl = `${apiBaseUrl}/api/storage/tenants/1/produtos/galeria/${foto}`;
        return fullUrl;
    };

    const handleSaveClick = () => {
        const currentProdutos = Array.isArray(formData.produtos) ? formData.produtos : [];
        if (!formData.cliente_nome || currentProdutos.length === 0) {
            toast({ title: 'Dados incompletos', description: 'Nome do cliente e pelo menos um produto são obrigatórios.', variant: 'destructive' });
            return;
        }

        // Garantir que os valores numéricos sejam números e strings vazias sejam null
        const dadosParaSalvar = {
            ...formData,
            valor_total: parseFloat(formData.valor_total) || 0,
            cliente_contato: formData.cliente_contato || null,
            cliente_endereco: formData.cliente_endereco || null,
            codigo_rastreio: formData.codigo_rastreio || null,
            link_produto: formData.link_produto || null,
            observacoes: formData.observacoes || null,
            vendedor_id: formData.vendedor_id || null,
            vendedor_nome: formData.vendedor_nome || null,
            fotos_produto: Array.isArray(formData.fotos_produto) ? formData.fotos_produto : [],
            produtos: currentProdutos.map(produto => ({
                ...produto,
                quantidade: parseInt(produto.quantidade) || 1,
                preco_unitario: parseFloat(produto.preco_unitario) || 0,
                subtotal: parseFloat(produto.subtotal) || 0,
                produto_id: produto.produto_id || null // Enviar ID real do produto
            }))
        };

        onSave(dadosParaSalvar);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{venda ? 'Editar Venda Online' : 'Nova Venda Online'}</DialogTitle>
                    <DialogDescription>Gerencie suas vendas de marketplace.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center"><UserPlus className="mr-2" /> Dados do Cliente</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div><Label>Nome do Cliente</Label><Input name="cliente_nome" value={formData.cliente_nome} onChange={handleChange} /></div>
                                    <div><Label>Contato (Telefone/Email)</Label><Input name="cliente_contato" value={formData.cliente_contato} onChange={handleChange} /></div>
                                    <div><Label>Endereço de Entrega</Label><Textarea name="cliente_endereco" value={formData.cliente_endereco} onChange={handleChange} /></div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center"><ShoppingBag className="mr-2" /> Produtos</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {(Array.isArray(formData.produtos) ? formData.produtos : []).map(p => (
                                            <div key={p.id || 'no-id'} className="flex justify-between items-center text-sm p-2 border rounded">
                                                <span>{p.nome || 'Produto sem nome'} ({p.quantidade || 0}x)</span>
                                                <div className="flex items-center gap-2">
                                                    <span>R$ {(() => {
                                                        const subtotal = parseFloat(p.subtotal);
                                                        return isNaN(subtotal) ? '0.00' : subtotal.toFixed(2);
                                                    })()}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveProduto(p.id)}><Trash2 size={14} /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 pt-4 border-t space-y-2">
                                        <div className="flex gap-2 mb-2">
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => setIsProdutoModalOpen(true)}>
                                                <Search className="mr-2 h-4 w-4" /> Buscar no Catálogo
                                            </Button>
                                        </div>
                                        <Input placeholder="Nome do Produto" value={newProduto.nome} onChange={(e) => setNewProduto({ ...newProduto, nome: e.target.value, produto_id: null })} />
                                        <div className="flex gap-2">
                                            <Input type="number" placeholder="Qtd" value={newProduto.quantidade} onChange={(e) => {
                                                const quantidade = parseInt(e.target.value, 10);
                                                setNewProduto({ ...newProduto, quantidade: isNaN(quantidade) ? 1 : Math.max(1, quantidade) });
                                            }} className="w-20" />
                                            <Input type="number" placeholder="Preço Unit." value={newProduto.preco_unitario} onChange={(e) => setNewProduto({ ...newProduto, preco_unitario: e.target.value })} />
                                            <Button onClick={handleAddProduto}><PlusCircle size={16} /></Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center"><Truck className="mr-2" /> Envio e Status</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div><Label>Status do Pedido</Label><Select name="status_pedido" value={formData.status_pedido} onValueChange={(v) => handleSelectChange('status_pedido', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Aguardando Envio">Aguardando Envio</SelectItem><SelectItem value="Enviado">Enviado</SelectItem><SelectItem value="Entregue">Entregue</SelectItem><SelectItem value="Cancelado">Cancelado</SelectItem></SelectContent></Select></div>
                                    <div><Label>Código de Rastreio</Label><Input name="codigo_rastreio" value={formData.codigo_rastreio} onChange={handleChange} /></div>
                                    <div><Label>Link do Produto/Anúncio</Label><Input name="link_produto" value={formData.link_produto} onChange={handleChange} /></div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center"><ImageIcon className="mr-2" /> Fotos</CardTitle></CardHeader>
                                <CardContent>
                                    <Button asChild variant="outline" className="w-full mb-2">
                                        <label htmlFor="fotos-upload">
                                            <Upload size={14} className="mr-2" /> Carregar Fotos do Produto
                                            <input id="fotos-upload" type="file" multiple accept="image/*" className="sr-only" onChange={handleFotoUpload} />
                                        </label>
                                    </Button>
                                    <div className="flex flex-wrap gap-2">
                                        {(Array.isArray(formData.fotos_produto) ? formData.fotos_produto : []).map((foto, i) => (
                                            <div key={i} className="relative group">
                                                <img
                                                    src={getFotoUrl(foto)}
                                                    className="w-16 h-16 object-cover rounded border"
                                                    alt={`Foto ${i + 1}`}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => handleRemoveFoto(i)}
                                                >
                                                    <Trash2 size={12} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-lg flex items-center"><DollarSign className="mr-2" /> Total e Observações</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label>Valor Total da Venda</Label>
                                        <Input type="number" name="valor_total" value={formData.valor_total} onChange={(e) => {
                                            const valor = parseFloat(e.target.value);
                                            setFormData(prev => ({ ...prev, valor_total: isNaN(valor) ? 0 : valor }));
                                        }} placeholder="0.00" />
                                    </div>
                                    <div><Label>Observações</Label><Textarea name="observacoes" value={formData.observacoes} onChange={handleChange} /></div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                    <Button onClick={handleSaveClick}>Salvar Venda</Button>
                </DialogFooter>
            </DialogContent>

            <MarketplaceProdutoModal
                open={isProdutoModalOpen}
                onOpenChange={setIsProdutoModalOpen}
                onSelectProduto={handleSelectProdutoCatalogo}
            />
        </Dialog >
    )
}

const MarketplacePage = ({ vendedorAtual }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [vendas, setVendas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [vendaEmEdicao, setVendaEmEdicao] = useState(null);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');

    const loadVendas = async () => {
        try {
            const vendasFromApi = await marketplaceService.getVendas();
            const vendasArray = Array.isArray(vendasFromApi) ? vendasFromApi : [];

            // Construir URLs completas para as fotos
            const vendasComFotosCorrigidas = vendasArray.map(venda => {
                if (venda.fotos_produto && Array.isArray(venda.fotos_produto)) {
                    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
                    const fotosComUrlsCompletas = venda.fotos_produto.map(foto => {
                        // Se já é uma URL completa, manter como está
                        if (foto.startsWith('http')) {
                            return foto;
                        }
                        // Se é um caminho relativo, construir URL completa
                        if (foto.startsWith('tenants/')) {
                            return `${apiBaseUrl}/api/storage/${foto}`;
                        }
                        // Se é apenas o nome do arquivo, construir caminho completo
                        return `${apiBaseUrl}/api/storage/tenants/1/produtos/galeria/${foto}`;
                    });
                    return { ...venda, fotos_produto: fotosComUrlsCompletas };
                }
                return venda;
            });

            vendasComFotosCorrigidas.sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));
            setVendas(vendasComFotosCorrigidas);
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            toast({
                title: 'Erro ao carregar vendas',
                description: 'Não foi possível carregar as vendas do servidor.',
                variant: 'destructive'
            });
            setVendas([]);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            loadVendas();
            const settings = safeJsonParse(await apiDataManager.getItem('empresaSettings') || '{}', {});
            setEmpresaSettings(settings);
            setLogoUrl(await apiDataManager.getItem('logoUrl') || '');

        };

        loadData();
    }, []);

    const handleOpenForm = (venda = null) => {
        setVendaEmEdicao(venda);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setVendaEmEdicao(null);
        setIsFormOpen(false);
    };

    const handleSave = async (vendaData) => {
        try {
            // Salva a venda individual no backend
            await marketplaceService.salvarVenda(vendaData);

            loadVendas();
            handleCloseForm();
            toast({ title: 'Sucesso!', description: 'Venda salva com sucesso.' });
        } catch (error) {
            console.error('Erro ao salvar venda:', error);
            toast({
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar a venda no servidor. Tente novamente.',
                variant: 'destructive'
            });
        }
    };

    const handleDelete = async (id) => {
        try {
            // Exclui a venda diretamente no backend
            await marketplaceService.excluirVenda(id);

            loadVendas();
            toast({ title: 'Venda removida', variant: 'destructive' });
        } catch (error) {
            console.error('Erro ao remover venda:', error);
            toast({
                title: 'Erro ao remover',
                description: 'Não foi possível remover a venda do servidor. Tente novamente.',
                variant: 'destructive'
            });
        }
    };

    const filteredVendas = (Array.isArray(vendas) ? vendas : []).filter(v => {
        if (!v || typeof v !== 'object') return false;

        const clienteNome = (v.cliente_nome || '').toLowerCase();
        const codigoRastreio = (v.codigo_rastreio || '').toLowerCase();
        const produtos = Array.isArray(v.produtos) ? v.produtos : [];
        const searchLower = searchTerm.toLowerCase();

        return clienteNome.includes(searchLower) ||
            codigoRastreio.includes(searchLower) ||
            produtos.some(p => (p.nome || '').toLowerCase().includes(searchLower));
    });

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center space-x-3">
                            <Store size={28} className="text-primary" />
                            <div>
                                <CardTitle className="text-2xl">Vendas Online / Marketplace</CardTitle>
                                <CardDescription>Gerencie suas vendas de plataformas online.</CardDescription>
                            </div>
                        </div>
                        <Button onClick={() => handleOpenForm()}><PlusCircle size={18} className="mr-2" /> Nova Venda</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por cliente, produto ou rastreio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendas.map(venda => (
                    <motion.div key={venda.id || 'no-id'} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg truncate">{venda.cliente_nome || 'Cliente sem nome'}</CardTitle>
                                    <Badge variant={venda.status_pedido === 'Entregue' ? 'success' : 'default'}>{venda.status_pedido || 'N/A'}</Badge>
                                </div>
                                <CardDescription>
                                    {venda.data_venda ?
                                        (() => {
                                            try {
                                                return format(parseISO(venda.data_venda), 'dd/MM/yyyy HH:mm');
                                            } catch (e) {
                                                return 'Data inválida';
                                            }
                                        })()
                                        : 'Data não informada'
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-2">
                                {(Array.isArray(venda.produtos) ? venda.produtos.slice(0, 2) : []).map(p => <p key={p.id || 'no-id'} className="truncate">{p.quantidade || 0}x {p.nome || 'Produto sem nome'}</p>)}
                                {Array.isArray(venda.produtos) && venda.produtos.length > 2 && <p className="text-xs text-muted-foreground">... e mais {venda.produtos.length - 2} item(s).</p>}
                                <p className="font-bold">Total: R$ {(() => {
                                    const valor = parseFloat(venda.valor_total);
                                    return isNaN(valor) ? '0.00' : valor.toFixed(2);
                                })()}</p>
                                {venda.codigo_rastreio && <p className="text-xs truncate">Rastreio: {venda.codigo_rastreio}</p>}
                                {Array.isArray(venda.fotos_produto) && venda.fotos_produto.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ImageIcon size={12} />
                                        <span>{venda.fotos_produto.length} foto(s)</span>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenForm(venda)}><Edit size={14} className="mr-1 md:mr-2" /> Editar</Button>
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(venda.id)}><Trash2 size={14} className="mr-1 md:mr-2" /> Excluir</Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {isFormOpen && <MarketplaceVendaForm isOpen={isFormOpen} venda={vendaEmEdicao} onSave={handleSave} onClose={handleCloseForm} vendedorAtual={vendedorAtual} />}
        </div>
    );
}

export default MarketplacePage;