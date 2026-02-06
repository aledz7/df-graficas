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
    Send,
    QrCode,
    Wallet,
    DollarSign,
    Ticket,
    X,
    Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { vendaPreVendaService, empresaService } from '@/services/api';
import { notificacaoService } from '@/services/notificacaoService';
import { formaPagamentoService } from '@/services/formaPagamentoService';
import { cupomService } from '@/services/cupomService';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { getImageUrl } from '@/lib/imageUtils';

// Função auxiliar para obter o ícone baseado no código
const getIconByCode = (iconCode) => {
    switch (iconCode) {
        case 'credit-card': return CreditCard;
        case 'smartphone': return Smartphone;
        case 'banknote': return Banknote;
        case 'qr-code': return QrCode;
        case 'wallet': return Wallet;
        case 'dollar-sign': return DollarSign;
        default: return CreditCard;
    }
};

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
        cep: '',
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: '',
        formaPagamento: ''
    });
    const [isFinalizando, setIsFinalizando] = useState(false);
    const [isSucessoModalOpen, setIsSucessoModalOpen] = useState(false);
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [isBuscandoCep, setIsBuscandoCep] = useState(false);
    
    // Estados do cupom
    const [codigoCupom, setCodigoCupom] = useState('');
    const [cupomAplicado, setCupomAplicado] = useState(null);
    const [isValidandoCupom, setIsValidandoCupom] = useState(false);
    const [erroCupom, setErroCupom] = useState('');

    // Função para buscar CEP via ViaCEP
    const buscarCep = async (cep) => {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;

        setIsBuscandoCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                toast({
                    title: 'CEP não encontrado',
                    description: 'Verifique o CEP informado.',
                    variant: 'destructive'
                });
                return;
            }

            setDadosCliente(prev => ({
                ...prev,
                rua: data.logradouro || '',
                bairro: data.bairro || '',
                cidade: data.localidade || '',
                estado: data.uf || ''
            }));

            toast({
                title: 'Endereço encontrado',
                description: 'Preencha o número e complemento.',
            });
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            toast({
                title: 'Erro ao buscar CEP',
                description: 'Não foi possível consultar o CEP. Preencha manualmente.',
                variant: 'destructive'
            });
        } finally {
            setIsBuscandoCep(false);
        }
    };

    // Formatar CEP enquanto digita
    const formatarCep = (value) => {
        const cepLimpo = value.replace(/\D/g, '');
        if (cepLimpo.length <= 5) return cepLimpo;
        return `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}`;
    };

    const handleCepChange = (e) => {
        const cepFormatado = formatarCep(e.target.value);
        setDadosCliente(prev => ({ ...prev, cep: cepFormatado }));
        
        // Buscar CEP automaticamente quando tiver 8 dígitos
        const cepLimpo = cepFormatado.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
            buscarCep(cepLimpo);
        }
    };

    // Função para formatar endereço completo
    const formatarEnderecoCompleto = () => {
        const partes = [];
        if (dadosCliente.rua) partes.push(dadosCliente.rua);
        if (dadosCliente.numero) partes.push(`Nº ${dadosCliente.numero}`);
        if (dadosCliente.complemento) partes.push(dadosCliente.complemento);
        if (dadosCliente.bairro) partes.push(dadosCliente.bairro);
        if (dadosCliente.cidade) partes.push(dadosCliente.cidade);
        if (dadosCliente.estado) partes.push(dadosCliente.estado);
        if (dadosCliente.cep) partes.push(`CEP: ${dadosCliente.cep}`);
        return partes.join(', ') || 'Não informado';
    };

    // Função para validar e aplicar cupom
    const aplicarCupom = async () => {
        if (!codigoCupom.trim()) {
            setErroCupom('Digite o código do cupom');
            return;
        }

        const tenantIdParaCupom = tenantId || (carrinho.length > 0 ? carrinho[0].tenant_id : null);
        if (!tenantIdParaCupom) {
            setErroCupom('Erro ao identificar a loja');
            return;
        }

        setIsValidandoCupom(true);
        setErroCupom('');

        try {
            const response = await cupomService.validarCupom(
                tenantIdParaCupom, 
                codigoCupom.trim().toUpperCase(), 
                calcularTotal()
            );

            if (response.valido) {
                setCupomAplicado(response.data);
                setErroCupom('');
                toast({
                    title: 'Cupom aplicado!',
                    description: `Desconto de ${response.data.tipo_desconto === 'percentual' 
                        ? response.data.valor_desconto_original + '%' 
                        : 'R$ ' + response.data.valor_desconto_calculado.toFixed(2)
                    } aplicado ao seu pedido.`,
                });
            } else {
                setErroCupom(response.message || 'Cupom inválido');
                setCupomAplicado(null);
            }
        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            setErroCupom('Erro ao validar cupom. Tente novamente.');
            setCupomAplicado(null);
        } finally {
            setIsValidandoCupom(false);
        }
    };

    // Função para remover cupom aplicado
    const removerCupom = () => {
        setCupomAplicado(null);
        setCodigoCupom('');
        setErroCupom('');
    };

    // Calcular total com desconto
    const calcularTotalComDesconto = () => {
        const subtotal = calcularTotal();
        if (!cupomAplicado) return subtotal;
        
        const desconto = cupomAplicado.valor_desconto_calculado || 0;
        return Math.max(0, subtotal - desconto);
    };

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

                // Carregar formas de pagamento do tenant
                try {
                    if (tenantIdParaEmpresa) {
                        const formasResponse = await formaPagamentoService.getByTenant(tenantIdParaEmpresa);
                        const formasData = formasResponse.data || [];
                        setFormasPagamento(formasData);
                        console.log('Formas de pagamento carregadas:', formasData);
                    }
                } catch (formasError) {
                    console.warn('Erro ao carregar formas de pagamento:', formasError);
                    // Manter formas padrão como fallback
                    setFormasPagamento([
                        { id: 1, nome: 'Cartão na Entrega', codigo: 'cartao_entrega', icone: 'credit-card' },
                        { id: 2, nome: 'PIX', codigo: 'pix', icone: 'smartphone' },
                        { id: 3, nome: 'Dinheiro', codigo: 'dinheiro', icone: 'banknote' }
                    ]);
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
                `• Endereço: ${formatarEnderecoCompleto()}\n\n` +
                `*Itens do meu pedido:*\n` +
                carrinho.map(item => 
                    `• ${item.nome} (${item.quantidade}x) - R$ ${(item.preco * item.quantidade).toFixed(2)}`
                ).join('\n') +
                (cupomAplicado 
                    ? `\n\n*Subtotal: R$ ${calcularTotal().toFixed(2)}*\n*Cupom: ${cupomAplicado.codigo} (-R$ ${cupomAplicado.valor_desconto_calculado.toFixed(2)})*\n*Valor total: R$ ${calcularTotalComDesconto().toFixed(2)}*\n`
                    : `\n\n*Valor total: R$ ${calcularTotal().toFixed(2)}*\n`) +
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

        // Validar campos de endereço
        if (!dadosCliente.cep || !dadosCliente.rua || !dadosCliente.numero || !dadosCliente.bairro || !dadosCliente.cidade) {
            console.log('Endereço incompleto');
            toast({
                title: 'Endereço incompleto',
                description: 'CEP, Rua, Número, Bairro e Cidade são obrigatórios.',
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
                    endereco: formatarEnderecoCompleto(),
                    cep: dadosCliente.cep,
                    rua: dadosCliente.rua,
                    numero: dadosCliente.numero,
                    bairro: dadosCliente.bairro,
                    cidade: dadosCliente.cidade,
                    estado: dadosCliente.estado,
                    complemento: dadosCliente.complemento,
                    forma_pagamento: dadosCliente.formaPagamento
                },
                itens: carrinho.map(item => ({
                    produto_id: parseInt(item.produtoId),
                    nome: item.nome,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco,
                    preco_total: item.preco * item.quantidade
                })),
                subtotal: calcularTotal(),
                desconto: cupomAplicado ? cupomAplicado.valor_desconto_calculado : 0,
                cupom_codigo: cupomAplicado ? cupomAplicado.codigo : null,
                cupom_id: cupomAplicado ? cupomAplicado.cupom_id : null,
                total: calcularTotalComDesconto(),
                status: 'pendente',
                origem: 'catalogo_publico',
                observacoes: `Pedido realizado através do catálogo público da empresa ${empresa.nomeFantasia}${cupomAplicado ? ` - Cupom: ${cupomAplicado.codigo}` : ''}`
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
                    `Cliente ${dadosCliente.nome} fez um pedido de R$ ${calcularTotalComDesconto().toFixed(2)} (${dadosCliente.formaPagamento}) através do catálogo público.${cupomAplicado ? ` Cupom: ${cupomAplicado.codigo}` : ''}`,
                    {
                        cliente: dadosCliente,
                        subtotal: calcularTotal(),
                        desconto: cupomAplicado ? cupomAplicado.valor_desconto_calculado : 0,
                        total: calcularTotalComDesconto(),
                        itens: carrinho.length,
                        forma_pagamento: dadosCliente.formaPagamento,
                        cupom: cupomAplicado ? cupomAplicado.codigo : null,
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

            // Registrar uso do cupom
            if (cupomAplicado) {
                try {
                    await cupomService.registrarUso(tenantIdParaPedido, cupomAplicado.cupom_id);
                    console.log('Uso do cupom registrado');
                } catch (cupomError) {
                    console.error('Erro ao registrar uso do cupom:', cupomError);
                    // Não falhar o pedido por causa do cupom
                }
            }
            
            console.log('Exibindo modal de sucesso');
            setIsSucessoModalOpen(true);
            console.log('Modal de sucesso aberto');

            // Limpar carrinho e cupom
            setCarrinho([]);
            localStorage.removeItem('carrinho');
            setCupomAplicado(null);
            setCodigoCupom('');
            
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

    const getFormaPagamentoLabel = (codigo) => {
        // Primeiro tentar encontrar nas formas de pagamento carregadas
        const formaEncontrada = formasPagamento.find(f => f.codigo === codigo);
        if (formaEncontrada) {
            return formaEncontrada.nome;
        }
        
        // Fallback para valores padrão
        switch (codigo) {
            case 'cartao_entrega':
                return 'Cartão na Entrega';
            case 'pix':
                return 'PIX';
            case 'dinheiro':
                return 'Dinheiro';
            default:
                return codigo || 'Não informado';
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
                                
                                {/* Campos de Endereço */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="cep" className="text-sm font-medium">
                                            CEP *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="cep"
                                                value={dadosCliente.cep}
                                                onChange={handleCepChange}
                                                placeholder="00000-000"
                                                maxLength={9}
                                                className="mt-1"
                                            />
                                            {isBuscandoCep && (
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 mt-0.5">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label htmlFor="rua" className="text-sm font-medium">
                                            Rua/Avenida *
                                        </Label>
                                        <Input
                                            id="rua"
                                            value={dadosCliente.rua}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, rua: e.target.value }))}
                                            placeholder="Nome da rua ou avenida"
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <Label htmlFor="numero" className="text-sm font-medium">
                                            Número *
                                        </Label>
                                        <Input
                                            id="numero"
                                            value={dadosCliente.numero}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, numero: e.target.value }))}
                                            placeholder="Nº"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="complemento" className="text-sm font-medium">
                                            Complemento
                                        </Label>
                                        <Input
                                            id="complemento"
                                            value={dadosCliente.complemento}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, complemento: e.target.value }))}
                                            placeholder="Apto, Bloco..."
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="bairro" className="text-sm font-medium">
                                            Bairro *
                                        </Label>
                                        <Input
                                            id="bairro"
                                            value={dadosCliente.bairro}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, bairro: e.target.value }))}
                                            placeholder="Bairro"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="cidade" className="text-sm font-medium">
                                            Cidade *
                                        </Label>
                                        <Input
                                            id="cidade"
                                            value={dadosCliente.cidade}
                                            onChange={(e) => setDadosCliente(prev => ({ ...prev, cidade: e.target.value }))}
                                            placeholder="Cidade"
                                            className="mt-1"
                                        />
                                    </div>
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
                                            {formasPagamento.length > 0 ? (
                                                formasPagamento.map((forma) => {
                                                    const IconComponent = getIconByCode(forma.icone);
                                                    return (
                                                        <SelectItem key={forma.id} value={forma.codigo}>
                                                            <div className="flex items-center gap-2">
                                                                <IconComponent className="h-4 w-4" />
                                                                {forma.nome}
                                                            </div>
                                                        </SelectItem>
                                                    );
                                                })
                                            ) : (
                                                <>
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
                                                </>
                                            )}
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
                                                className="flex items-center space-x-3 p-3 border rounded-lg bg-card"
                                            >
                                                <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
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
                                                    <div className="w-full h-full bg-muted flex items-center justify-center" style={{display: item.imagem ? 'none' : 'flex'}}>
                                                        <Package className="w-6 h-6 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-medium text-sm truncate text-foreground">{item.nome}</h4>
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
                                                    <span className="text-sm font-medium w-8 text-center text-foreground">
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

                                {/* Campo de Cupom */}
                                <div className="space-y-2 mb-4">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                        <Ticket className="h-4 w-4" />
                                        Cupom de Desconto
                                    </Label>
                                    {cupomAplicado ? (
                                        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                                    {cupomAplicado.codigo}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {cupomAplicado.tipo_desconto === 'percentual' 
                                                        ? `-${cupomAplicado.valor_desconto_original}%`
                                                        : `-R$ ${cupomAplicado.valor_desconto_calculado.toFixed(2)}`
                                                    }
                                                </Badge>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={removerCupom}
                                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input
                                                value={codigoCupom}
                                                onChange={(e) => {
                                                    setCodigoCupom(e.target.value.toUpperCase());
                                                    setErroCupom('');
                                                }}
                                                placeholder="Digite o código"
                                                className={`flex-1 font-mono ${erroCupom ? 'border-red-500' : ''}`}
                                                onKeyPress={(e) => e.key === 'Enter' && aplicarCupom()}
                                            />
                                            <Button 
                                                onClick={aplicarCupom}
                                                disabled={isValidandoCupom || !codigoCupom.trim()}
                                                variant="outline"
                                                size="sm"
                                            >
                                                {isValidandoCupom ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Aplicar'
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                    {erroCupom && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {erroCupom}
                                        </p>
                                    )}
                                </div>

                                <Separator className="my-4" />
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal ({calcularTotalItens()} itens):</span>
                                        <span>R$ {calcularTotal().toFixed(2)}</span>
                                    </div>
                                    
                                    {cupomAplicado && (
                                        <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                            <span>Desconto ({cupomAplicado.codigo}):</span>
                                            <span>- R$ {cupomAplicado.valor_desconto_calculado.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between text-lg font-bold">
                                        <span>Total:</span>
                                        <span className="text-primary">R$ {calcularTotalComDesconto().toFixed(2)}</span>
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
                                        disabled={isFinalizando || !dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.formaPagamento || !dadosCliente.cep || !dadosCliente.rua || !dadosCliente.numero || !dadosCliente.bairro || !dadosCliente.cidade}
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
                <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="mx-auto mb-4 w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-green-500 mb-2">
                            Pré-venda concluída! 🎉
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            Seu pedido foi enviado com sucesso! O WhatsApp foi aberto com uma mensagem pronta para você enviar para a empresa. Após o envio, nossa equipe entrará em contato para finalizar a compra.
                        </p>
                        
                        {/* Informações do pedido */}
                        <div className="bg-muted p-4 rounded-lg text-left mb-4">
                            <h4 className="font-medium text-sm text-foreground mb-2">Resumo do Pedido</h4>
                            <div className="space-y-1 text-sm text-foreground">
                                <p><strong>Cliente:</strong> {dadosCliente.nome}</p>
                                <p><strong>Telefone:</strong> {dadosCliente.telefone}</p>
                                {cupomAplicado && (
                                    <>
                                        <p><strong>Subtotal:</strong> R$ {calcularTotal().toFixed(2)}</p>
                                        <p className="text-green-600"><strong>Desconto ({cupomAplicado.codigo}):</strong> -R$ {cupomAplicado.valor_desconto_calculado.toFixed(2)}</p>
                                    </>
                                )}
                                <p><strong>Total:</strong> R$ {calcularTotalComDesconto().toFixed(2)}</p>
                                <p><strong>Forma de Pagamento:</strong> {getFormaPagamentoLabel(dadosCliente.formaPagamento)}</p>
                                <p className="text-green-500"><strong>✓ WhatsApp aberto com mensagem pronta para envio</strong></p>
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
                                        `📍 Endereço: ${formatarEnderecoCompleto()}\n` +
                                        `💳 Forma de Pagamento: ${getFormaPagamentoLabel(dadosCliente.formaPagamento)}\n\n` +
                                        `🛒 *Itens do Pedido:*\n` +
                                        carrinho.map(item => `• ${item.nome} x${item.quantidade} - R$ ${(item.preco * item.quantidade).toFixed(2)}`).join('\n') +
                                        (cupomAplicado 
                                            ? `\n\n💵 Subtotal: R$ ${calcularTotal().toFixed(2)}\n🎟️ Cupom ${cupomAplicado.codigo}: -R$ ${cupomAplicado.valor_desconto_calculado.toFixed(2)}\n💰 *Total: R$ ${calcularTotalComDesconto().toFixed(2)}*`
                                            : `\n\n💰 *Total: R$ ${calcularTotal().toFixed(2)}*`);
                                    
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
