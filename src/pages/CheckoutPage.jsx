import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { 
    Package, 
    ShoppingCart, 
    Plus, 
    Minus, 
    Trash2, 
    User, 
    Phone, 
    Mail, 
    MapPin, 
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    CreditCard,
    Smartphone,
    Banknote,
    MessageCircle,
    Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vendaPreVendaService, empresaService } from '@/services/api';
import { notificacaoService } from '@/services/notificacaoService';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { getImageUrl } from '@/lib/imageUtils';

const CheckoutPage = () => {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    
    // Estados do carrinho e checkout
    const [carrinho, setCarrinho] = useState([]);
    const [empresa, setEmpresa] = useState({ 
        nomeFantasia: '', 
        logoUrl: '', 
        whatsapp: '' 
    });
    const [dadosCliente, setDadosCliente] = useState({
        nome: '',
        email: '',
        telefone: '',
        endereco: '',
        formaPagamento: ''
    });
    const [isFinalizando, setIsFinalizando] = useState(false);
    const [isSucessoModalOpen, setIsSucessoModalOpen] = useState(false);

    // Carregar dados do carrinho e empresa
    useEffect(() => {
        const loadData = async () => {
            try {
                // Carregar carrinho do localStorage ou state
                let carrinhoSalvo = location.state?.carrinho || JSON.parse(localStorage.getItem('carrinho') || '[]');
                
                // Normalizar carrinho: garantir que todos os itens tenham tenant_id
                // Se algum item não tiver, tentar pegar de outro item que tenha
                let tenantIdComum = tenantId;
                if (!tenantIdComum && carrinhoSalvo.length > 0) {
                    // Procurar tenant_id em qualquer item do carrinho
                    for (const item of carrinhoSalvo) {
                        const itemTenantId = item.tenant_id || item.tenantId;
                        if (itemTenantId) {
                            tenantIdComum = itemTenantId;
                            break;
                        }
                    }
                }
                
                // Se encontrou um tenant_id comum, garantir que todos os itens tenham
                if (tenantIdComum) {
                    carrinhoSalvo = carrinhoSalvo.map(item => ({
                        ...item,
                        tenant_id: item.tenant_id || item.tenantId || tenantIdComum
                    }));
                    // Salvar carrinho normalizado de volta no localStorage
                    localStorage.setItem('carrinho', JSON.stringify(carrinhoSalvo));
                }
                
                setCarrinho(carrinhoSalvo);

                // Carregar dados da empresa (usar rota pública se tiver tenantId)
                // Tentar usar tenantId da URL primeiro, depois do carrinho
                const tenantIdParaEmpresa = tenantId || tenantIdComum;
                try {
                    if (tenantIdParaEmpresa) {
                        console.log('Carregando dados da empresa com tenantId:', tenantIdParaEmpresa);
                        const empresaResponse = await empresaService.getByTenant(tenantIdParaEmpresa);
                        const empresaData = empresaResponse.data.data || empresaResponse.data || {};
                        console.log('Dados da empresa recebidos:', empresaData);
                        
                        const nomeFantasia = empresaData.nome_fantasia || 
                                           empresaData.nomeFantasia || 
                                           empresaData.razao_social || 
                                           empresaData.razaoSocial || 
                                           'Minha Empresa';
                        const logoUrl = empresaData.logo_url || 
                                      empresaData.logoUrl || 
                                      empresaData.logo || 
                                      '';
                        const whatsapp = empresaData.whatsapp || '';
                        console.log('WhatsApp carregado da API:', whatsapp);
                        setEmpresa({ nomeFantasia, logoUrl, whatsapp });
                    } else {
                        // Se não tiver tenantId, usar valores padrão (checkout público não deve usar rota protegida)
                        console.warn('Nenhum tenantId encontrado para carregar dados da empresa');
                        setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '', whatsapp: '' });
                    }
                } catch (empresaError) {
                    console.warn('Erro ao carregar dados da empresa:', empresaError);
                    setEmpresa({ nomeFantasia: 'Minha Empresa', logoUrl: '', whatsapp: '' });
                }

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({
                    title: 'Erro ao carregar dados',
                    description: 'Não foi possível carregar os dados do checkout.',
                    variant: 'destructive'
                });
            }
        };

        loadData();
    }, [tenantId, location.state, toast]);

    // Funções do carrinho
    const removerDoCarrinho = (produtoId) => {
        const novoCarrinho = carrinho.filter(item => item.id !== produtoId);
        setCarrinho(novoCarrinho);
        localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    };

    const atualizarQuantidade = (produtoId, novaQuantidade) => {
        if (novaQuantidade <= 0) {
            removerDoCarrinho(produtoId);
            return;
        }
        
        // Encontrar o item no carrinho para verificar estoque
        const item = carrinho.find(item => item.id === produtoId);
        
        if (item && item.estoque !== undefined) {
            // Verificar se a nova quantidade excede o estoque disponível
            const estoqueDisponivel = parseFloat(item.estoque_atual || item.estoque || 0);
            
            if (novaQuantidade > estoqueDisponivel) {
                toast({
                    title: 'Estoque insuficiente',
                    description: `Você tentou adicionar ${novaQuantidade} unidade(s), mas há apenas ${estoqueDisponivel.toFixed(0)} unidade(s) disponível(is) em estoque.`,
                    variant: 'destructive'
                });
                return; // Não atualizar a quantidade
            }
        }
        
        const novoCarrinho = carrinho.map(item => 
            item.id === produtoId 
                ? { ...item, quantidade: novaQuantidade }
                : item
        );
        setCarrinho(novoCarrinho);
        localStorage.setItem('carrinho', JSON.stringify(novoCarrinho));
    };

    const calcularTotal = () => {
        return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    };

    const calcularTotalItens = () => {
        return carrinho.reduce((total, item) => total + item.quantidade, 0);
    };

    const enviarNotificacaoWhatsAppEmpresa = async (pedidoId) => {
        try {
            // Gerar mensagem para a empresa
            const mensagem = `Olá! Gostaria de finalizar um pedido feito através do catálogo online.\n\n` +
                `*Pedido #${pedidoId}*\n\n` +
                `*Meus dados:*\n` +
                `• Nome: ${dadosCliente.nome}\n` +
                `• Telefone: ${dadosCliente.telefone}\n` +
                `• Email: ${dadosCliente.email || 'Não informado'}\n` +
                `• Endereço: ${dadosCliente.endereco || 'Não informado'}\n\n` +
                `*Itens do meu pedido:*\n` +
                carrinho.map(item => 
                    `• ${item.nome} (${item.quantidade}x) - R$ ${(item.preco * item.quantidade).toFixed(2)}`
                ).join('\n') +
                `\n\n*Valor total: R$ ${calcularTotal().toFixed(2)}*\n` +
                `*Forma de pagamento:* ${getFormaPagamentoLabel(dadosCliente.formaPagamento)}\n\n` +
                `Por favor, me confirme se o pedido está correto e qual o prazo para entrega. Obrigado!`;

            // Limpar número do WhatsApp (remover caracteres especiais)
            console.log('WhatsApp da empresa no estado:', empresa.whatsapp);
            const whatsappLimpo = empresa.whatsapp ? empresa.whatsapp.replace(/[^0-9]/g, '') : '';
            console.log('WhatsApp limpo:', whatsappLimpo);
            
            // Validar se o número tem pelo menos 10 dígitos
            if (!whatsappLimpo || whatsappLimpo.length < 10) {
                console.log('Número do WhatsApp da empresa inválido ou não configurado. Original:', empresa.whatsapp, 'Limpo:', whatsappLimpo);
                toast({
                    title: 'WhatsApp não configurado',
                    description: 'O número do WhatsApp da empresa não está configurado ou é inválido. Por favor, verifique as configurações da empresa.',
                    variant: 'destructive'
                });
                return;
            }
            
            // Gerar URL do WhatsApp
            const urlWhatsApp = `https://wa.me/${whatsappLimpo}?text=${encodeURIComponent(mensagem)}`;
            
            // Abrir WhatsApp em nova aba
            window.open(urlWhatsApp, '_blank');
            
            console.log('Notificação enviada para WhatsApp da empresa:', urlWhatsApp);
            
        } catch (error) {
            console.error('Erro ao enviar notificação WhatsApp:', error);
            toast({
                title: 'Erro ao abrir WhatsApp',
                description: 'Não foi possível abrir o WhatsApp. Tente novamente.',
                variant: 'destructive'
            });
        }
    };

    const finalizarPedido = async () => {
        // Prevenir duplo clique
        if (isFinalizando) {
            console.log('Pedido já está sendo finalizado, ignorando chamada duplicada');
            return;
        }
        
        console.log('finalizarPedido chamada');
        console.log('dadosCliente:', dadosCliente);
        console.log('carrinho completo:', JSON.stringify(carrinho, null, 2));
        console.log('tenantId da URL:', tenantId);
        
        if (!dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.formaPagamento) {
            console.log('Dados obrigatórios não preenchidos');
            toast({
                title: 'Dados obrigatórios',
                description: 'Nome, telefone e forma de pagamento são obrigatórios para finalizar o pedido.',
                variant: 'destructive'
            });
            return;
        }

        if (carrinho.length === 0) {
            console.log('Carrinho vazio');
            toast({
                title: 'Carrinho vazio',
                description: 'Adicione produtos ao carrinho antes de finalizar.',
                variant: 'destructive'
            });
            return;
        }

        setIsFinalizando(true);

        try {
            console.log('Iniciando finalização do pedido');
            
            // Tentar obter tenantId da URL ou dos produtos do carrinho
            let tenantIdParaPedido = tenantId;
            console.log('tenantId da URL:', tenantIdParaPedido);
            
            if (!tenantIdParaPedido && carrinho.length > 0) {
                // Tentar extrair tenantId de qualquer produto do carrinho que tenha
                for (const item of carrinho) {
                    const itemTenantId = item.tenant_id || item.tenantId;
                    if (itemTenantId) {
                        tenantIdParaPedido = itemTenantId;
                        console.log('tenantId extraído do item do carrinho:', tenantIdParaPedido, 'do item:', item.nome);
                        break;
                    }
                }
                
                // Se ainda não encontrou, tentar do produto original (se houver)
                if (!tenantIdParaPedido) {
                    const primeiroProduto = carrinho[0];
                    console.log('Primeiro produto do carrinho:', primeiroProduto);
                    // Verificar se o produto original tem tenant_id (pode estar em variacao ou produto)
                    if (primeiroProduto.variacao) {
                        tenantIdParaPedido = primeiroProduto.variacao.tenant_id || primeiroProduto.variacao.tenantId;
                    }
                    console.log('tenantId extraído do produto/variacao:', tenantIdParaPedido);
                }
            }
            
            // Se ainda não tiver tenantId, não podemos criar o pedido (rota pública requer tenantId)
            if (!tenantIdParaPedido) {
                console.error('Erro: tenantId não encontrado');
                toast({
                    title: 'Erro ao finalizar pedido',
                    description: 'Não foi possível identificar a empresa. Por favor, acesse o catálogo público novamente.',
                    variant: 'destructive'
                });
                setIsFinalizando(false);
                return;
            }
            
            console.log('tenantIdParaPedido final:', tenantIdParaPedido);
            
            // Preparar dados do pedido
            const pedido = {
                cliente: {
                    nome: dadosCliente.nome,
                    email: dadosCliente.email,
                    telefone: dadosCliente.telefone,
                    endereco: dadosCliente.endereco,
                    forma_pagamento: dadosCliente.formaPagamento
                },
                itens: carrinho.map(item => ({
                    produto_id: parseInt(item.produtoId),
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco,
                    preco_total: item.preco * item.quantidade
                })),
                total: calcularTotal(),
                status: 'pendente',
                origem: 'catalogo_publico',
                observacoes: `Pedido realizado através do catálogo público da empresa ${empresa.nomeFantasia}`
            };
            
            console.log('Dados do pedido preparados:', pedido);
            console.log('Enviando pedido para API com tenantId:', tenantIdParaPedido);
            
            // Enviar pedido para a API usando rota pública (sempre requer tenantId)
            const response = await vendaPreVendaService.createForTenant(pedido, tenantIdParaPedido);
            
            console.log('Resposta da API:', response);

            // Obter ID do pedido criado
            const pedidoId = response.data?.venda?.id || response.data?.data?.id || response.data?.id || 'N/A';

            // Criar notificação para o sistema interno
            try {
                await notificacaoService.criarNotificacao(
                    'pedido_catalogo_publico',
                    'Novo Pedido do Catálogo Público',
                    `Cliente ${dadosCliente.nome} fez um pedido de R$ ${calcularTotal().toFixed(2)} (${dadosCliente.formaPagamento}) através do catálogo público.`,
                    {
                        cliente: dadosCliente,
                        total: calcularTotal(),
                        itens: carrinho.length,
                        forma_pagamento: dadosCliente.formaPagamento,
                        origem: 'catalogo_publico',
                        prioridade: 'alta'
                    }
                );
            } catch (notifError) {
                console.error('Erro ao criar notificação:', notifError);
                // Não falhar o pedido por causa da notificação
            }

            // Enviar notificação WhatsApp para a empresa
            try {
                await enviarNotificacaoWhatsAppEmpresa(pedidoId);
            } catch (whatsappError) {
                console.error('Erro ao enviar notificação WhatsApp:', whatsappError);
                // Não falhar o pedido por causa do WhatsApp
            }
            
            console.log('Exibindo modal de sucesso');
            setIsSucessoModalOpen(true);
            console.log('Modal de sucesso aberto');

            // Limpar carrinho
            setCarrinho([]);
            localStorage.removeItem('carrinho');
            
        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            toast({
                title: 'Erro ao finalizar pedido',
                description: error.response?.data?.message || 'Ocorreu um erro ao enviar seu pedido. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setIsFinalizando(false);
        }
    };

    const getFormaPagamentoIcon = (forma) => {
        switch (forma) {
            case 'cartao_entrega':
                return <CreditCard className="h-4 w-4" />;
            case 'pix':
                return <Smartphone className="h-4 w-4" />;
            case 'dinheiro':
                return <Banknote className="h-4 w-4" />;
            default:
                return <CreditCard className="h-4 w-4" />;
        }
    };

    const getFormaPagamentoLabel = (forma) => {
        switch (forma) {
            case 'cartao_entrega':
                return 'Cartão na Entrega';
            case 'pix':
                return 'PIX';
            case 'dinheiro':
                return 'Dinheiro';
            default:
                return 'Não informado';
        }
    };

    if (carrinho.length === 0) {
        return (
            <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
                <header className="bg-background shadow-sm sticky top-0 z-20">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            {empresa.logoUrl ? (
                                <img src={getImageUrl(empresa.logoUrl)} alt={`Logo de ${empresa.nomeFantasia}`} className="h-12 w-auto object-contain" />
                            ) : (
                                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Package className="h-6 w-6 text-primary" />
                                </div>
                            )}
                            <h1 className="text-2xl font-bold text-foreground">{empresa.nomeFantasia}</h1>
                        </div>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                    </div>
                </header>

                <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center py-20">
                        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium text-foreground">Seu carrinho está vazio</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Adicione produtos ao carrinho antes de finalizar a compra.
                        </p>
                        <Button 
                            onClick={() => navigate(-1)}
                            className="mt-4"
                        >
                            Continuar comprando
                        </Button>
                    </div>
                </main>
                <Toaster />
            </div>
        );
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
            <header className="bg-background shadow-sm sticky top-0 z-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {empresa.logoUrl ? (
                            <img src={getImageUrl(empresa.logoUrl)} alt={`Logo de ${empresa.nomeFantasia}`} className="h-12 w-auto object-contain" />
                        ) : (
                            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                        )}
                        <h1 className="text-2xl font-bold text-foreground">{empresa.nomeFantasia}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4" />
                            {calcularTotalItens()} item(s)
                        </Badge>
                        <Button 
                            variant="outline" 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Formulário de Dados do Cliente */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Dados do Cliente
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="nome" className="text-sm font-medium">
                                            Nome completo *
                                        </Label>
                                        <Input
                                            id="nome"
                                            value={dadosCliente.nome}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, nome: e.target.value }))}
                                            placeholder="Seu nome completo"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="telefone" className="text-sm font-medium">
                                            Telefone *
                                        </Label>
                                        <Input
                                            id="telefone"
                                            value={dadosCliente.telefone}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, telefone: e.target.value }))}
                                            placeholder="(11) 99999-9999"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <Label htmlFor="email" className="text-sm font-medium">
                                        E-mail
                                    </Label>
                                    <Input
                                        id="email"
                                        value={dadosCliente.email}
                                        onChange={(e) => setDadosCliente(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="seu@email.com"
                                        type="email"
                                        className="mt-1"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="endereco" className="text-sm font-medium">
                                        Endereço
                                    </Label>
                                    <Textarea
                                        id="endereco"
                                        value={dadosCliente.endereco}
                                        onChange={(e) => setDadosCliente(prev => ({ ...prev, endereco: e.target.value }))}
                                        placeholder="Rua, número, bairro, cidade, CEP"
                                        className="mt-1"
                                        rows={3}
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="formaPagamento" className="text-sm font-medium">
                                        Forma de Pagamento *
                                    </Label>
                                    <Select
                                        value={dadosCliente.formaPagamento}
                                        onValueChange={(value) => setDadosCliente(prev => ({ ...prev, formaPagamento: value }))}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Selecione a forma de pagamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cartao_entrega">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-4 w-4" />
                                                    Cartão na Entrega
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pix">
                                                <div className="flex items-center gap-2">
                                                    <Smartphone className="h-4 w-4" />
                                                    PIX
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="dinheiro">
                                                <div className="flex items-center gap-2">
                                                    <Banknote className="h-4 w-4" />
                                                    Dinheiro
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Resumo do Pedido */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Resumo do Pedido
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {carrinho.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                className="flex items-center space-x-3 p-3 border rounded-lg bg-white"
                                            >
                                                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                                    {item.imagem ? (
                                                        <img 
                                                            src={getImageUrl(item.imagem)} 
                                                            alt={item.nome}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{display: item.imagem ? 'none' : 'flex'}}>
                                                        <Package className="w-6 h-6 text-gray-400" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm truncate">{item.nome}</h4>
                                                    <p className="text-sm text-muted-foreground">
                                                        R$ {parseFloat(item.preco || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="text-sm font-medium w-8 text-center">
                                                        {item.quantidade}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removerDoCarrinho(item.id)}
                                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                                
                                <Separator className="my-4" />
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal ({calcularTotalItens()} itens):</span>
                                        <span>R$ {calcularTotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total:</span>
                                        <span className="text-primary">R$ {calcularTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 mt-4">
                                    <Button 
                                        onClick={() => navigate(`/catalogo-publico${tenantId ? `/${tenantId}` : ''}`)}
                                        variant="outline"
                                        className="flex-1 flex items-center gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Adicionar Mais
                                    </Button>
                                    <Button 
                                        onClick={finalizarPedido}
                                        disabled={isFinalizando || !dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.formaPagamento}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {isFinalizando ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Finalizando...
                                            </div>
                                        ) : (
                                            'Finalizar Pedido'
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Modal de sucesso */}
            <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isSucessoModalOpen ? 'block' : 'hidden'}`}>
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-600 mb-2">
                            Pré-venda concluída! 🎉
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Seu pedido foi enviado com sucesso! O WhatsApp foi aberto com uma mensagem pronta para você enviar para a empresa. Após o envio, nossa equipe entrará em contato para finalizar a compra.
                        </p>
                        
                        {/* Informações do pedido */}
                        <div className="bg-gray-50 p-4 rounded-lg text-left mb-4">
                            <h4 className="font-medium text-sm text-gray-700 mb-2">Resumo do Pedido</h4>
                            <div className="space-y-1 text-sm">
                                <p><strong>Cliente:</strong> {dadosCliente.nome}</p>
                                <p><strong>Telefone:</strong> {dadosCliente.telefone}</p>
                                <p><strong>Total:</strong> R$ {calcularTotal().toFixed(2)}</p>
                                <p><strong>Forma de Pagamento:</strong> {getFormaPagamentoLabel(dadosCliente.formaPagamento)}</p>
                                <p className="text-green-600"><strong>✓ WhatsApp aberto com mensagem pronta para envio</strong></p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                            <Button 
                                onClick={() => {
                                    // Gerar mensagem para WhatsApp
                                    const mensagem = `Olá! Gostaria de finalizar minha compra.\n\n` +
                                        `📋 *Resumo do Pedido:*\n` +
                                        `👤 Nome: ${dadosCliente.nome}\n` +
                                        `📞 Telefone: ${dadosCliente.telefone}\n` +
                                        `📧 Email: ${dadosCliente.email || 'Não informado'}\n` +
                                        `📍 Endereço: ${dadosCliente.endereco || 'Não informado'}\n` +
                                        `💳 Forma de Pagamento: ${getFormaPagamentoLabel(dadosCliente.formaPagamento)}\n\n` +
                                        `🛒 *Itens do Pedido:*\n` +
                                        carrinho.map(item => `• ${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}`).join('\n') +
                                        `\n\n💰 *Total: R$ ${calcularTotal().toFixed(2)}*`;
                                    
                                    // Codificar mensagem para URL
                                    const mensagemCodificada = encodeURIComponent(mensagem);
                                    
                                    // Redirecionar para WhatsApp
                                    const whatsappEmpresa = empresa.whatsapp ? empresa.whatsapp.replace(/[^0-9]/g, '') : '559188230963';
                                    window.open(`https://wa.me/${whatsappEmpresa}?text=${mensagemCodificada}`, '_blank');
                                    
                                    // Fechar modal
                                    setIsSucessoModalOpen(false);
                                    
                                    // Redirecionar para catálogo
                                    navigate('/catalogo-publico/1');
                                }}
                                className="w-full bg-green-600 hover:bg-green-700 flex items-center gap-2"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Seguir com a Compra no WhatsApp
                            </Button>
                            <Button 
                                variant="outline"
                                onClick={() => {
                                    setIsSucessoModalOpen(false);
                                    navigate('/catalogo-publico/1');
                                }}
                                className="w-full"
                            >
                                Continuar Comprando
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Toaster />
        </div>
    );
};

export default CheckoutPage;
