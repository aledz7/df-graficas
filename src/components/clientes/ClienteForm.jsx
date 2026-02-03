import React, { useState, useEffect, useCallback } from 'react';
import { clienteService } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { User, Camera, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClienteTabDadosCadastrais from './tabs/ClienteTabDadosCadastrais';
import ClienteTabConfiguracoes from './tabs/ClienteTabConfiguracoes';
import ClienteTabAtendimentos from './tabs/ClienteTabAtendimentos';
import ClienteTabCompras from './tabs/ClienteTabCompras';
import ClienteTabFinanceiro from './tabs/ClienteTabFinanceiro';
import ClienteTabPontuacao from './tabs/ClienteTabPontuacao';

import { apiDataManager } from '@/lib/apiDataManager';
import { useValidationError } from '@/hooks/useValidationError';


const defaultCliente = {
    id: '', 
    codigo_cliente: '', 
    nome_completo: '', 
    apelido_fantasia: '', 
    tipo_pessoa: 'Pessoa Física', 
    cpf_cnpj: '', 
    rg_ie: '', 
    data_nascimento_abertura: '', 
    sexo: 'Prefiro não informar', 
    email: '', 
    telefone_principal: '', 
    whatsapp: '', 
    endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''}, 
    observacoes: '', 
    autorizado_prazo: false, 
    status: true,
    foto_url: '',
    classificacao_cliente: 'Padrão', 
    desconto_fixo_os_terceirizado: '0',
    is_terceirizado: false,
    atendimentos: [],
    pontos: {
        total_ganhos: 0,
        utilizados: 0,
        expirados: 0,
        saldo_atual: 0,
    }
};

const ClienteForm = ({ isOpen, onClose, onSave, clienteEmEdicao, showSaveAndNewButton = false, isSubmitting = false }) => {
    const { toast } = useToast();
    const { showError } = useValidationError();
    const [currentCliente, setCurrentCliente] = useState(defaultCliente);
    const [isLoading, setIsLoading] = useState(false);
    const [fotoPreview, setFotoPreview] = useState('');
    const [activeTab, setActiveTab] = useState("dados");


    const resetForm = useCallback(() => {
        const nextId = `cli-${Date.now()}`;
        setCurrentCliente({ 
            ...defaultCliente, 
            id: nextId, 
            codigo_cliente: nextId, 
            endereco: {...defaultCliente.endereco}, 
            atendimentos: [], 
            pontos: {...defaultCliente.pontos} 
        });
        setFotoPreview('');
        setActiveTab("dados");
    }, [defaultCliente]);

    useEffect(() => {
        if (!clienteEmEdicao || !clienteEmEdicao.id) {
            resetForm();
            return;
        }
        
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                const response = await clienteService.getById(clienteEmEdicao.id);
                console.log('📡 ClienteForm: Resposta da API:', response);
                
                if (response && response.data) {
                    const clienteData = response.data;
                    console.log('👤 ClienteForm: Dados do cliente carregados:', clienteData);
                    
                    // Estruturar dados do cliente com endereço
                    const clienteEstruturado = {
                        ...defaultCliente,
                        ...clienteData,
                        endereco: {
                            cep: clienteData.cep || '',
                            logradouro: clienteData.logradouro || '',
                            numero: clienteData.numero || '',
                            complemento: clienteData.complemento || '',
                            bairro: clienteData.bairro || '',
                            cidade: clienteData.cidade || '',
                            estado: clienteData.estado || ''
                        }
                    };
                    
                    console.log('🏗️ ClienteForm: Cliente estruturado:', clienteEstruturado);
                    console.log('🔍 ClienteForm: Campo nome_completo:', clienteEstruturado.nome_completo);
                    console.log('🔍 ClienteForm: Campo telefone_principal:', clienteEstruturado.telefone_principal);
                    console.log('🔍 ClienteForm: Campo autorizado_prazo:', clienteEstruturado.autorizado_prazo);
                    
                    setCurrentCliente(clienteEstruturado);
                    
                    // Carregar foto se existir
                    if (clienteData.foto_url) {
                        const apiBaseUrl = import.meta.env.VITE_API_URL || '';
                        setFotoPreview(`${apiBaseUrl}/storage/${clienteData.foto_url}`);
                    }
                } else {
                    console.error('❌ ClienteForm: Resposta da API não contém dados válidos');
                }
            } catch(error) {
                console.error('❌ ClienteForm: Erro ao carregar dados do cliente:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [clienteEmEdicao, resetForm]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentCliente(prev => ({ ...prev, [name]: value }));
    };
    
    const handleNestedInputChange = (parentKey, childKey, value) => {
        if (parentKey === 'endereco') {
            setCurrentCliente(prev => ({
                ...prev,
                endereco: {
                    ...prev.endereco,
                    [childKey]: value
                }
            }));
        }
    };
    
    const handleSelectChange = (name, value) => {
        setCurrentCliente(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name, checked) => {
        setCurrentCliente(prev => ({ ...prev, [name]: checked }));
    };

    const handleFotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if(file.size > 1024 * 1024) { // 1MB
                toast({ title: 'Imagem muito grande!', description: 'Por favor, selecione uma imagem menor que 1MB.', variant: 'destructive'});
                return;
            }
            
            try {
                const formData = new FormData();
                formData.append('foto', file);
                
                const token = apiDataManager.getToken();
                
                const apiBaseUrl = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${apiBaseUrl}/api/upload/foto-cliente`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Construir URL completa usando a base da API
                    const apiBaseUrl = import.meta.env.VITE_API_URL || '';
                    const fullImageUrl = `${apiBaseUrl}${result.url}`;
                    setFotoPreview(fullImageUrl);
                    setCurrentCliente(prev => ({ ...prev, foto_url: result.path }));
                    toast({ title: 'Foto enviada com sucesso!', description: 'A foto foi carregada.' });
                } else {
                    toast({ title: 'Erro ao enviar foto!', description: result.message || 'Erro desconhecido', variant: 'destructive' });
                }
            } catch (error) {
                console.error('Erro ao fazer upload da foto:', error);
                toast({ title: 'Erro ao enviar foto!', description: 'Erro de conexão', variant: 'destructive' });
            }
        }
    };

    const handleLocateCep = async () => {
        if (!currentCliente.endereco.cep) {
            toast({ title: "CEP não informado", description: "Por favor, insira um CEP para buscar.", variant: "destructive" });
            return;
        }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${currentCliente.endereco.cep.replace(/\D/g, '')}/json/`);
            if (!response.ok) throw new Error('Falha ao buscar CEP');
            const data = await response.json();
            if (data.erro) {
                toast({ title: "CEP não encontrado", description: "Verifique o CEP informado.", variant: "destructive" });
            } else {
                setCurrentCliente(prev => ({
                    ...prev,
                    endereco: {
                        ...prev.endereco,
                        logradouro: data.logradouro || prev.endereco.logradouro || '',
                        bairro: data.bairro || prev.endereco.bairro || '',
                        cidade: data.localidade || prev.endereco.cidade || '',
                        estado: data.uf || prev.endereco.estado || '',
                        complemento: data.complemento || prev.endereco.complemento || '',
                    }
                }));
                toast({ title: "Endereço encontrado!", description: "Os campos de endereço foram preenchidos." });
            }
        } catch (error) {
            toast({ title: "Erro ao buscar CEP", description: error.message, variant: "destructive" });
        }
    };



    const handleSubmit = async (e, cadastrarOutro = false) => {
        e.preventDefault();
        
        // Sem validações obrigatórias no frontend
        
        try {
            // Processar dados para envio
            const { endereco, ...clienteSemEndereco } = currentCliente;
            const cleanData = {
                ...clienteSemEndereco,
                // Mapear campos de endereço individualmente
                cep: currentCliente.endereco?.cep || '',
                logradouro: currentCliente.endereco?.logradouro || '',
                numero: currentCliente.endereco?.numero || '',
                complemento: currentCliente.endereco?.complemento || '',
                bairro: currentCliente.endereco?.bairro || '',
                cidade: currentCliente.endereco?.cidade || '',
                estado: currentCliente.endereco?.estado || ''
            };
            
            // Remove ID se for um novo cliente para evitar envio acidental
            // ou se o ID for temporário (começa com 'cli-' ou 'local-')
            if (!clienteEmEdicao || 
                (cleanData.id && (String(cleanData.id).startsWith('cli-') || String(cleanData.id).startsWith('local-')))) {
                delete cleanData.id;
            }
            
            try {
                await onSave(cleanData, cadastrarOutro);
            } catch (saveError) {
                console.error('Erro ao chamar onSave:', saveError);
                throw saveError; // Rejoga o erro para ser capturado pelo catch externo
            }
        } catch (error) {
            showError(error, 'Ocorreu um erro ao salvar o cliente.');
        }
    };

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2">Carregando dados do cliente...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {clienteEmEdicao ? 'Editar Cliente' : 'Novo Cliente'}
                    </DialogTitle>
                    <DialogDescription>
                        {clienteEmEdicao 
                            ? 'Atualize as informações do cliente.' 
                            : 'Preencha os dados para cadastrar um novo cliente.'}
                    </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-1 flex-grow overflow-hidden">
                     <div className="md:col-span-3 flex flex-col items-center space-y-3 pt-12 border-r pr-4">
                        <div className="relative w-32 h-32">
                             <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                                {fotoPreview ? (
                                    <img src={fotoPreview} alt="Foto do Cliente" className="w-full h-full object-cover"/>
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground" />
                                )}
                            </div>
                            <Label htmlFor="foto-upload-main" className="absolute bottom-1 right-1 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 shadow-md">
                                <Camera className="w-4 h-4"/>
                                <Input id="foto-upload-main" type="file" className="hidden" accept="image/*" onChange={handleFotoChange}/>
                            </Label>
                        </div>
                        <p className="text-sm text-muted-foreground text-center">{currentCliente.nome_completo || 'Nome do Cliente'}</p>
                        <p className="text-xs text-muted-foreground text-center">{currentCliente.codigo_cliente || 'Código'}</p>
                    </div>

                    <div className="md:col-span-9 flex-grow overflow-hidden">
                         <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                            <TabsList className="mb-2 shrink-0">
                                <TabsTrigger value="dados">Dados</TabsTrigger>
                                <TabsTrigger value="config">Configurações</TabsTrigger>
                                <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
                                <TabsTrigger value="compras">Histórico</TabsTrigger>
                                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
                                <TabsTrigger value="pontos">Pontos</TabsTrigger>
                            </TabsList>
                            <ScrollArea className="flex-grow p-1 pr-3">
                                <TabsContent value="dados" className="p-0 pt-2">
                                    <ClienteTabDadosCadastrais 
                                        cliente={currentCliente} 
                                        handleInputChange={handleChange} 
                                        handleNestedInputChange={handleNestedInputChange}
                                        handleSelectChange={handleSelectChange}
                                        handleLocateCep={handleLocateCep}
                                        handleFotoUpload={handleFotoChange}
                                        fotoPreview={fotoPreview}
                                    />
                                </TabsContent>
                                 <TabsContent value="config" className="p-0 pt-2">
                                    <ClienteTabConfiguracoes 
                                      cliente={currentCliente} 
                                      handleSwitchChange={handleSwitchChange} 
                                      handleInputChange={handleChange} 
                                      handleSelectChange={handleSelectChange} 
                                    />
                                </TabsContent>
                                <TabsContent value="atendimentos" className="p-0 pt-2">
                                    <ClienteTabAtendimentos clienteId={currentCliente.id} currentCliente={currentCliente} setCurrentCliente={setCurrentCliente} />
                                </TabsContent>
                                <TabsContent value="compras" className="p-0 pt-2">
                                    <ClienteTabCompras clienteId={currentCliente.id} />
                                </TabsContent>
                                <TabsContent value="financeiro" className="p-0 pt-2">
                                    <ClienteTabFinanceiro clienteId={currentCliente.id} />
                                </TabsContent>
                                <TabsContent value="pontos" className="p-0 pt-2">
                                    <ClienteTabPontuacao clienteId={currentCliente.id} currentCliente={currentCliente} setCurrentCliente={setCurrentCliente}/>
                                </TabsContent>
                            </ScrollArea>
                        </Tabs>
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        {isSubmitting ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                    {showSaveAndNewButton && !clienteEmEdicao && (
                        <Button 
                            onClick={async () => {
                                try {
                                    await handleSubmit({ preventDefault: () => {} }, true);
                                } catch (error) {
                                    // O erro já foi tratado no handleSubmit
                                    console.error('Erro no Salvar e Cadastrar Novo:', error);
                                }
                            }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar e Cadastrar Novo'}
                        </Button>
                    )}
                    <Button 
                        onClick={async () => {
                            try {
                                await handleSubmit({ preventDefault: () => {} }, false);
                            } catch (error) {
                                // O erro já foi tratado no handleSubmit
                                console.error('Erro no Salvar:', error);
                            }
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Salvando...' : (clienteEmEdicao ? 'Salvar Alterações' : 'Salvar Cliente')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


    );
};

export default ClienteForm;