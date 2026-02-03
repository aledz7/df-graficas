import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Calculator, Save, Search, AlertCircle, Package } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { apiDataManager } from '@/lib/apiDataManager';
import { produtoService, calculoSavadoService, calculadoraService, acabamentoService } from '@/services/api';
import { getImageUrl } from '@/lib/imageUtils';

const MaterialLookupModal = ({ open, onOpenChange, onSelect, materiais, mostrarPrecoPorM2, onToggleMostrarPrecoPorM2 }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredMateriais = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return materiais.filter(m => ((m.nome || m.nome_produto || '').toLowerCase().includes(term)));
    }, [materiais, searchTerm]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Buscar Material</DialogTitle>
                </DialogHeader>
                <div className="flex items-center justify-between mb-2">
                    <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 mr-2" />
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <Checkbox id="toggle-preco-m2" checked={!!mostrarPrecoPorM2} onCheckedChange={onToggleMostrarPrecoPorM2} />
                        <Label htmlFor="toggle-preco-m2" className="text-sm cursor-pointer">Mostrar preço por m²</Label>
                    </div>
                </div>
                <ScrollArea className="h-72">
                    {filteredMateriais.map(m => {
                        const imageUrl = m.imagem_principal ? getImageUrl(m.imagem_principal) : null;
                        
                        return (
                            <div key={m.id} onClick={() => { onSelect(m); onOpenChange(false); }} className="p-2 hover:bg-accent rounded cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 flex items-center justify-center border border-border rounded-md bg-muted/20 flex-shrink-0">
                                        {imageUrl ? (
                                            <img 
                                                src={imageUrl} 
                                                alt={m.nome} 
                                                className="w-full h-full object-cover rounded-md"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextElementSibling.style.display = 'flex';
                                                }}
                                                onLoad={() => {
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-full h-full flex items-center justify-center ${imageUrl ? 'hidden' : ''}`}>
                                            <Package className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{m.nome}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {mostrarPrecoPorM2 ? (
                                                <>R$ {m.preco_m2 || 0} / m²</>
                                            ) : (
                                                <>R$ {m.preco_venda || 0} (venda)</>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredMateriais.length === 0 && <p className="text-center text-muted-foreground p-4">Nenhum material encontrado.</p>}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

const CalculadoraPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    const [tamanhoArquivoCm, setTamanhoArquivoCm] = useState({ altura: '', largura: '' });
    const [areaImpressaoM, setAreaImpressaoM] = useState({ altura: '1', largura: '1' });
    const [material, setMaterial] = useState(null);
    const [servicosAdicionais, setServicosAdicionais] = useState([]);
    
    // Dados do cliente
    const [clienteData, setClienteData] = useState({
        nome: '',
        telefone: '',
        email: ''
    });
    
    const [materiaisDisponiveis, setMateriaisDisponiveis] = useState([]);
    const [servicosDisponiveis, setServicosDisponiveis] = useState([]);
    const [calculosSalvos, setCalculosSalvos] = useState([]);

    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [mostrarPrecoPorM2, setMostrarPrecoPorM2] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Buscar produtos da API (normalizando diferentes formatos de resposta)
                const response = await produtoService.getAll('?per_page=1000');
                const payload = (response && response.data !== undefined) ? response.data : response;
                const produtosData = (payload && payload.data) ? payload.data : payload;
                const produtosArray = Array.isArray(produtosData) ? produtosData : [];
                // Opcional: filtrar para materiais com preço por m² disponível
                const materiaisComPreco = produtosArray.filter(p => (p.preco_m2 || p.preco_venda));
                setMateriaisDisponiveis(materiaisComPreco);

                // Buscar serviços adicionais da API
                try {
                    const servicosResponse = await calculadoraService.getServicosAdicionais();
                    
                    let servicosAtivos = [];
                    
                    // Verificar diferentes formatos possíveis da resposta da API
                    if (servicosResponse?.data?.success && servicosResponse.data.data) {
                        // Formato: { success: true, data: [...] }
                        const servicosArray = Array.isArray(servicosResponse.data.data) ? servicosResponse.data.data : [];
                        servicosAtivos = servicosArray.filter(s => s.ativo !== false);
                    } else if (Array.isArray(servicosResponse?.data)) {
                        // Formato: [...] (array direto)
                        servicosAtivos = servicosResponse.data.filter(s => s.ativo !== false);
                    } else if (servicosResponse?.data?.data && Array.isArray(servicosResponse.data.data)) {
                        // Formato: { data: [...] }
                        servicosAtivos = servicosResponse.data.data.filter(s => s.ativo !== false);
                    } else {
                        // Fallback para localStorage se a API não retornar dados válidos
                        const storedServicos = await apiDataManager.getDataAsArray('calculadora_servicos_adicionais');
                        servicosAtivos = Array.isArray(storedServicos) ? storedServicos.filter(s => s.ativo !== false) : [];
                    }
                    
                    // Buscar acabamentos como serviços adicionais
                    let acabamentosServicos = [];
                    try {
                        const acabamentosResponse = await acabamentoService.getAll();
                        if (acabamentosResponse?.data) {
                            const acabamentosArray = Array.isArray(acabamentosResponse.data) ? acabamentosResponse.data : [];
                            acabamentosServicos = acabamentosArray
                                .filter(acab => acab.ativo !== false)
                                .map(acab => ({
                                    id: `acab_${acab.id}`,
                                    nome: acab.nome_acabamento,
                                    preco: acab.valor_m2 || '0',
                                    unidade: 'm²',
                                    descricao: acab.observacoes || `Acabamento: ${acab.nome_acabamento}`,
                                    ativo: acab.ativo !== false,
                                    tipo: 'acabamento',
                                    origem: 'acabamentos-servicos'
                                }));
                        }
                    } catch (acabamentosError) {
                        console.warn('⚠️ Erro ao carregar acabamentos como serviços:', acabamentosError);
                    }
                    
                    // Combinar serviços da calculadora e acabamentos
                    const todosServicos = [...servicosAtivos, ...acabamentosServicos];
                    
                    const storedCalculosStr = await apiDataManager.getItem('calculos_salvos');
                    const storedCalculos = storedCalculosStr ? JSON.parse(storedCalculosStr) : [];
                    
                    setServicosDisponiveis(todosServicos);
                    setCalculosSalvos(Array.isArray(storedCalculos) ? storedCalculos : []);
                } catch (servicosError) {
                    console.error('Erro ao carregar serviços da API:', servicosError);
                    // Fallback para localStorage se a API falhar
                    try {
                        const storedServicos = await apiDataManager.getDataAsArray('calculadora_servicos_adicionais');
                        const servicosAtivos = Array.isArray(storedServicos) ? storedServicos.filter(s => s.ativo !== false) : [];
                        setServicosDisponiveis(servicosAtivos);
                    } catch (localStorageError) {
                        console.error('Erro ao carregar dados do localStorage:', localStorageError);
                        setServicosDisponiveis([]);
                    }
                    
                    const storedCalculosStr = await apiDataManager.getItem('calculos_salvos');
                    const storedCalculos = storedCalculosStr ? JSON.parse(storedCalculosStr) : [];
                    setCalculosSalvos(Array.isArray(storedCalculos) ? storedCalculos : []);
                }


            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                toast({ 
                    title: "Erro ao carregar produtos", 
                    description: "Não foi possível carregar a lista de produtos. Tente novamente mais tarde.",
                    variant: "destructive"
                });
            }
        };
        
        loadData();
    }, []); // Executar apenas uma vez na montagem



    // useEffect separado para lidar com dados do estado da localização
    useEffect(() => {
        if (location.state?.calculoParaCarregar && Object.keys(location.state.calculoParaCarregar).length > 0) {
            const { config, cliente } = location.state.calculoParaCarregar;
            
            // Carregar configurações do cálculo
            setTamanhoArquivoCm(config.tamanhoArquivoCm || { altura: '', largura: '' });
            setAreaImpressaoM(config.areaImpressaoM || { altura: '1', largura: '1' });
            setMaterial(config.material || null);
            setServicosAdicionais(config.servicosAdicionais || []);
            
            // Carregar dados do cliente, se existirem
            if (cliente) {
                setClienteData({
                    nome: cliente.nome || '',
                    telefone: cliente.telefone || '',
                    email: cliente.email || ''
                });
            }
            
            toast({ title: "Orçamento Carregado!", description: "Continue de onde parou." });
        }
    }, [location.state, toast]); // Removido navigate e adicionado location.state como dependência

    const calculoResultado = useMemo(() => {
        if (!material) {
            return { error: "Selecione um material para iniciar o cálculo." };
        }
        
        const arquivoAlturaM = parseFloat(tamanhoArquivoCm.altura) / 100;
        const arquivoLarguraM = parseFloat(tamanhoArquivoCm.largura) / 100;
        const impressaoAlturaM = parseFloat(areaImpressaoM.altura);
        const impressaoLarguraM = parseFloat(areaImpressaoM.largura);

        if (!arquivoAlturaM || !arquivoLarguraM || !impressaoAlturaM || !impressaoLarguraM) {
            return { 
                quantidade: 0, 
                valorTotal: 0, 
                valorUnidade: 0, 
                valorMaterial: 0, 
                valorServicos: 0, 
                error: null 
            };
        }
        
        const fit1 = Math.floor(impressaoLarguraM / arquivoLarguraM) * Math.floor(impressaoAlturaM / arquivoAlturaM);
        const fit2 = Math.floor(impressaoLarguraM / arquivoAlturaM) * Math.floor(impressaoAlturaM / arquivoLarguraM);
        const quantidade = Math.max(fit1, fit2) || 0;
        
        let precoBase;
        if (material.unidade_medida === 'm2' || material.unidade_medida === 'metro') {
            precoBase = parseFloat(material.preco_m2 || material.preco_venda || 0);
        } else {
            precoBase = parseFloat(material.preco_venda || 0);
        }

        const areaImpressaoTotal = impressaoAlturaM * impressaoLarguraM;
        const valorMaterial = areaImpressaoTotal * precoBase;
        
        const valorServicos = servicosAdicionais.reduce((acc, s) => acc + (areaImpressaoTotal * parseFloat(s.preco || s.valor || s.valor_m2 || 0)), 0);

        const valorTotal = valorMaterial + valorServicos;
        const valorUnidade = quantidade > 0 ? valorTotal / quantidade : 0;

        return { 
            quantidade, 
            valorTotal: valorTotal || 0, 
            valorUnidade: valorUnidade || 0, 
            valorMaterial: valorMaterial || 0, 
            valorServicos: valorServicos || 0, 
            error: null 
        };
    }, [tamanhoArquivoCm, areaImpressaoM, material, servicosAdicionais]);
    
    const handleServicoChange = useCallback((servico, checked) => {
        setServicosAdicionais(prev => {
            const result = checked 
                ? [...prev, servico]
                : prev.filter(s => s.id !== servico.id);
            return result;
        });
    }, []);

    const handleSaveCalculo = async () => {
        if (calculoResultado.error) {
            toast({ title: "Erro no Cálculo", description: calculoResultado.error, variant: 'destructive'});
            return;
        }

        // Se estiver editando um cálculo existente, usar o nome atual
        const isEditing = location.state?.calculoParaCarregar?.id;
        console.log('Pagina de edição aberta: ', isEditing);
        const nomeCalculo = isEditing ? location.state.calculoParaCarregar.nome : prompt("Digite um nome para este orçamento:", `Orçamento ${new Date().toLocaleDateString()}`);
        if (!nomeCalculo) return;

        // Criar item baseado no material selecionado
        const precoM2Material = material ? parseFloat(material.preco_m2 ?? material.preco_venda ?? 0) : 0;
        const itemMaterial = material ? {
            id: `item-${Date.now()}`,
            nome_servico_produto: material.nome,
            tipo_item: 'm2',
            quantidade: calculoResultado.quantidade || 1,
            valor_unitario: precoM2Material || 0,
            valor_unitario_m2: precoM2Material || 0,
            largura: parseFloat(areaImpressaoM.largura) || 0,
            altura: parseFloat(areaImpressaoM.altura) || 0,
            subtotal_item: calculoResultado.valorMaterial || 0,
            produto_id: material.id,
            acabamentos_selecionados: [],
            observacoes: `Material: ${material.nome} - ${areaImpressaoM.altura}x${areaImpressaoM.largura}m`
        } : null;

        // Criar produto baseado no material
        const produtoMaterial = material ? {
            id: material.id,
            nome: material.nome,
            codigo_produto: material.codigo_produto || material.codigo || '',
            preco_venda: material.preco_venda || 0,
            preco_m2: precoM2Material || 0,
            unidade_medida: material.unidade_medida || 'm²',
            quantidade: calculoResultado.quantidade || 1,
            valor_total: calculoResultado.valorMaterial || 0
        } : null;

        const calculoData = {
            nome: nomeCalculo,
            resultado: calculoResultado.valorTotal || 0,
            dados_calculo: {
                cliente: {
                    nome: clienteData.nome,
                    telefone: clienteData.telefone,
                    email: clienteData.email
                },
                config: {
                    tamanhoArquivoCm, 
                    areaImpressaoM, 
                    material, 
                    servicosAdicionais
                },
                resultado: calculoResultado,
                itens: itemMaterial ? [itemMaterial] : [],
                produtos: produtoMaterial ? [produtoMaterial] : [],
                servicos_adicionais: servicosAdicionais
            },
            descricao: isEditing ? `Orçamento atualizado em ${new Date().toLocaleDateString()}` : `Orçamento criado em ${new Date().toLocaleDateString()}`
        };
        
        try {
            let response;
            if (isEditing) {
                // Atualizar cálculo existente
                response = await calculoSavadoService.update(location.state.calculoParaCarregar.id, calculoData);
                // Atualizar estado local
                const novosCalculosSalvos = calculosSalvos.map(calc => 
                    calc.id === location.state.calculoParaCarregar.id ? response.data.data : calc
                );
                setCalculosSalvos(novosCalculosSalvos);
                toast({ title: 'Orçamento Atualizado!', description: `O orçamento "${nomeCalculo}" foi atualizado.` });
            } else {
                // Criar novo cálculo
                response = await calculoSavadoService.create(calculoData);
                // Atualizar estado local
                const novosCalculosSalvos = [...calculosSalvos, response.data.data];
                setCalculosSalvos(novosCalculosSalvos);
                toast({ title: 'Orçamento Salvo!', description: `O orçamento "${nomeCalculo}" foi salvo no histórico.` });
            }
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            toast({ 
                title: 'Erro ao salvar', 
                description: 'Não foi possível salvar o orçamento. Tente novamente.', 
                variant: 'destructive' 
            });
        }
    };

    const renderResultado = () => {
        if (calculoResultado.error) {
            return (
                <div className="text-center text-orange-600 font-semibold p-4 bg-orange-100 dark:bg-orange-900/30 rounded-md flex flex-col items-center gap-2">
                    <AlertCircle className="w-8 h-8"/>
                    <p>{calculoResultado.error}</p>
                </div>
            );
        }
        return (
            <>
                <div className="flex justify-between items-center">
                    <Label>Quantidade de Adesivos:</Label>
                    <span className="font-bold text-2xl">{calculoResultado.quantidade}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <Label>Valor do Material:</Label>
                    <span className="font-semibold">R$ {(calculoResultado.valorMaterial || 0).toFixed(2)}</span>
                </div>
                
                {/* Detalhamento dos serviços selecionados */}
                {servicosAdicionais.length > 0 && (
                    <div className="text-sm border-t border-b py-2 my-2">
                        <Label className="block mb-1">Serviços Adicionais:</Label>
                        {servicosAdicionais.map(servico => {
                            const areaImpressaoTotal = parseFloat(areaImpressaoM.altura) * parseFloat(areaImpressaoM.largura);
                            const valorServico = areaImpressaoTotal * parseFloat(servico.preco || servico.valor || servico.valor_m2 || 0);
                            return (
                                <div key={servico.id} className="flex justify-between items-center ml-2 text-xs">
                                    <span>{servico.nome || servico.nome_servico || 'Serviço sem nome'}</span>
                                    <span>R$ {valorServico.toFixed(2)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <div className="flex justify-between items-center text-sm">
                    <Label>Valor dos Serviços:</Label>
                    <span className="font-semibold">R$ {(calculoResultado.valorServicos || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <Label>Valor Total:</Label>
                    <span className="font-bold text-2xl text-primary">R$ {(calculoResultado.valorTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <Label>Valor por Unidade:</Label>
                    <span className="font-semibold text-lg">R$ {(calculoResultado.valorUnidade || 0).toFixed(2)}</span>
                </div>
            </>
        )
    }

    return (
        <>

            
            <div className="flex flex-col lg:flex-row h-full p-4 gap-4">
                <Card className="w-full lg:w-1/2">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center"><Calculator className="mr-2"/> Parâmetros</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <fieldset className="border p-3 rounded-md">
                            <legend className="text-sm font-medium px-1">Tamanho do Arquivo (cm)</legend>
                            <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Altura" value={tamanhoArquivoCm.altura} onChange={e => setTamanhoArquivoCm(p => ({...p, altura: e.target.value}))}/>
                                <span>x</span>
                                <Input type="number" placeholder="Largura" value={tamanhoArquivoCm.largura} onChange={e => setTamanhoArquivoCm(p => ({...p, largura: e.target.value}))}/>
                            </div>
                        </fieldset>
                         <fieldset className="border p-3 rounded-md">
                            <legend className="text-sm font-medium px-1">Área de Impressão (m)</legend>
                            <div className="flex items-center gap-2">
                                <Input type="number" placeholder="Altura" value={areaImpressaoM.altura} onChange={e => setAreaImpressaoM(p => ({...p, altura: e.target.value}))}/>
                                <span>x</span>
                                <Input type="number" placeholder="Largura" value={areaImpressaoM.largura} onChange={e => setAreaImpressaoM(p => ({...p, largura: e.target.value}))}/>
                            </div>
                        </fieldset>
                        <div>
                            <div className="flex items-center justify-between">
                                <Label>Material Utilizado</Label>
                                <div className="flex items-center gap-2 text-xs">
                                    <Checkbox id="toggle-preco-card" checked={!!mostrarPrecoPorM2} onCheckedChange={setMostrarPrecoPorM2} />
                                    <Label htmlFor="toggle-preco-card" className="cursor-pointer">mostrar por m²</Label>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full justify-start text-left font-normal" onClick={() => setIsMaterialModalOpen(true)}>
                                <Search className="mr-2 h-4 w-4" />
                                {material ? (
                                    mostrarPrecoPorM2
                                        ? `${material.nome} (R$ ${material.preco_m2 || 0} / m²)`
                                        : `${material.nome} (R$ ${material.preco_venda || 0})`
                                ) : "Clique para buscar um material"}
                            </Button>
                        </div>
                        <div>
                            <Label>Serviços Adicionais</Label>
                             <ScrollArea className="h-32 border rounded-md p-2">
                                <div className="space-y-2">
                                    {servicosDisponiveis.map(servico => (
                                        <div key={servico.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`servico-${servico.id}`}
                                                checked={servicosAdicionais.some(s => s.id === servico.id)}
                                                onCheckedChange={(checked) => handleServicoChange(servico, checked)}
                                            />
                                            <Label htmlFor={`servico-${servico.id}`} className="font-normal flex-1 cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <span>{servico.nome || servico.nome_servico || 'Serviço sem nome'}</span>
                                                    <span className="text-muted-foreground">(R$ {servico.preco || servico.valor || servico.valor_m2 || 0}/m²)</span>
                                                    {servico.tipo === 'acabamento' && (
                                                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                            Acabamento
                                                        </span>
                                                    )}
                                                </div>
                                            </Label>
                                        </div>
                                    ))}
                                    {servicosDisponiveis.length === 0 && <p className="text-xs text-muted-foreground text-center p-2">Nenhum serviço adicional cadastrado.</p>}
                                </div>
                             </ScrollArea>
                        </div>
                        
                        <fieldset className="border p-3 rounded-md">
                            <legend className="text-sm font-medium px-1">Dados do Cliente</legend>
                            <div className="space-y-2">
                                <div>
                                    <Label htmlFor="cliente-nome">Nome</Label>
                                    <Input 
                                        id="cliente-nome" 
                                        placeholder="Nome do cliente" 
                                        value={clienteData.nome} 
                                        onChange={e => setClienteData(prev => ({...prev, nome: e.target.value}))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="cliente-telefone">Telefone</Label>
                                    <Input 
                                        id="cliente-telefone" 
                                        placeholder="(00) 00000-0000" 
                                        value={clienteData.telefone} 
                                        onChange={e => setClienteData(prev => ({...prev, telefone: e.target.value}))}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="cliente-email">E-mail</Label>
                                    <Input 
                                        id="cliente-email" 
                                        type="email" 
                                        placeholder="email@exemplo.com" 
                                        value={clienteData.email} 
                                        onChange={e => setClienteData(prev => ({...prev, email: e.target.value}))}
                                    />
                                </div>
                            </div>
                        </fieldset>
                    </CardContent>
                </Card>
                <Card className="flex flex-col w-full lg:w-1/2">
                    <CardHeader>
                        <CardTitle>Resultado</CardTitle>
                        <CardDescription>Com base nos parâmetros fornecidos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-lg flex-grow flex flex-col justify-center">
                        {renderResultado()}
                    </CardContent>
                    <div className="p-4 mt-auto border-t flex flex-col gap-2">
                        <Button onClick={handleSaveCalculo} disabled={!!calculoResultado.error} className="w-full"><Save className="mr-2"/> Salvar Orçamento</Button>
                    </div>
                </Card>
            </div>
            <MaterialLookupModal 
                open={isMaterialModalOpen} 
                onOpenChange={setIsMaterialModalOpen} 
                onSelect={setMaterial} 
                materiais={materiaisDisponiveis}
                mostrarPrecoPorM2={mostrarPrecoPorM2}
                onToggleMostrarPrecoPorM2={setMostrarPrecoPorM2}
            />
        </>
    );
};

export default CalculadoraPage;