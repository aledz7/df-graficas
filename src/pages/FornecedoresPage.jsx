import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit, Trash2, Search, Upload, Calendar, Users } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiDataManager } from '@/lib/apiDataManager';

const FornecedoresPage = () => {
    const { toast } = useToast();
    const [fornecedores, setFornecedores] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fornecedorAtual, setFornecedorAtual] = useState({
        id: '',
        codigo: '',
        tipo: 'juridica',
        fundacao: '',
        nome: '',
        cnpj: '',
        ie: '',
        inscricaoMunicipal: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        atividade: '',
        telefoneFixo: '',
        whatsapp: '',
        celular: '',
        email: '',
        responsavel: '',
        foto: null
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fotoPreviewUrl, setFotoPreviewUrl] = useState(null);
    const objectUrlRef = useRef(null);

    // Estados brasileiros
    const estados = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
        'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                
                const storedFornecedores = await apiDataManager.getData('fornecedores', []);
                
                let parsedData = [];
                if (Array.isArray(storedFornecedores)) {
                    parsedData = storedFornecedores;
                } else if (storedFornecedores && storedFornecedores.data && Array.isArray(storedFornecedores.data)) {
                    parsedData = storedFornecedores.data;
                } else if (storedFornecedores && Array.isArray(storedFornecedores.success)) {
                    parsedData = [];
                }
                
                setFornecedores(parsedData);
            } catch (error) {
                console.error('❌ Erro ao carregar fornecedores:', error);
                setFornecedores([]);
                toast({ 
                    title: 'Erro ao carregar dados', 
                    description: 'Ocorreu um erro ao carregar os fornecedores.', 
                    variant: 'destructive' 
                });
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, []);

    // Atualiza a URL de preview da foto e faz o cleanup de blob URLs
    useEffect(() => {
        const foto = fornecedorAtual.foto;
        const apiBaseUrl = import.meta.env.VITE_API_URL || '';
        let nextUrl = null;
        if (!foto) {
            nextUrl = null;
        } else if (typeof foto === 'string') {
            if (/^(data:|blob:|https?:\/\/)/i.test(foto)) {
                nextUrl = foto;
            } else {
                nextUrl = apiBaseUrl ? `${apiBaseUrl}/storage/${foto}` : foto;
            }
        } else if (foto instanceof Blob) {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
            objectUrlRef.current = URL.createObjectURL(foto);
            nextUrl = objectUrlRef.current;
        } else if (typeof foto === 'object') {
            const path = foto.path || foto.foto_url || foto.fotoUrl;
            if (path) {
                nextUrl = /^(data:|blob:|https?:\/\/)/i.test(path)
                    ? path
                    : (apiBaseUrl ? `${apiBaseUrl}/storage/${path}` : path);
            }
        }
        setFotoPreviewUrl(nextUrl);
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [fornecedorAtual.foto]);

    const handleSave = async () => {
        if (!fornecedorAtual.nome) {
            toast({ title: "Erro", description: "O nome do fornecedor é obrigatório.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        
        try {
            let updatedFornecedores;
            if (isEditing) {
                updatedFornecedores = (Array.isArray(fornecedores) ? fornecedores : []).map(f => f.id === fornecedorAtual.id ? fornecedorAtual : f);
                toast({ title: "Sucesso!", description: "Fornecedor atualizado." });
            } else {
                const newFornecedor = { ...fornecedorAtual, id: `forn-${Date.now()}` };
                updatedFornecedores = [...(Array.isArray(fornecedores) ? fornecedores : []), newFornecedor];
                toast({ title: "Sucesso!", description: "Fornecedor adicionado." });
            }

            setFornecedores(updatedFornecedores);
            await apiDataManager.setData('fornecedores', updatedFornecedores);
            closeModal();
        } catch (error) {
            toast({ title: "Erro", description: "Ocorreu um erro ao salvar o fornecedor.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (fornecedor) => {
        setIsEditing(true);
        setFornecedorAtual({...fornecedor});
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            const updatedFornecedores = (Array.isArray(fornecedores) ? fornecedores : []).filter(f => f.id !== id);
            setFornecedores(updatedFornecedores);
            await apiDataManager.setData('fornecedores', updatedFornecedores);
            toast({ title: "Fornecedor removido.", variant: "destructive" });
        } catch (error) {
            console.error('❌ Erro ao remover fornecedor:', error);
            toast({ title: "Erro ao remover fornecedor.", variant: "destructive" });
        }
    };

    const openModal = () => {
        setIsEditing(false);
        setFornecedorAtual({
            id: '',
            codigo: '',
            tipo: 'juridica',
            fundacao: '',
            nome: '',
            cnpj: '',
            ie: '',
            inscricaoMunicipal: '',
            cep: '',
            endereco: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            uf: '',
            atividade: '',
            telefoneFixo: '',
            whatsapp: '',
            celular: '',
            email: '',
            responsavel: '',
            foto: null
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFornecedorAtual({ ...fornecedorAtual, foto: file });
        }
    };

    const filteredFornecedores = (Array.isArray(fornecedores) ? fornecedores : []).filter(f =>
        f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.responsavel && f.responsavel.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                        <div>
                            <CardTitle className="text-xl sm:text-2xl">Cadastro de Fornecedores</CardTitle>
                            <CardDescription className="text-sm">Gerencie seus fornecedores.</CardDescription>
                        </div>
                        <Button 
                            onClick={openModal}
                            className="w-full sm:w-auto"
                        >
                            <PlusCircle size={18} className="mr-2" /> Novo Fornecedor
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="Buscar fornecedor por nome ou responsável..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-4"
                        />
                        
                        {/* Visualização em Cards para Mobile */}
                        <div className="md:hidden">
                            <ScrollArea className="h-[calc(100vh-22rem)]">
                                <div className="space-y-4 pr-2">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                            <span>Carregando...</span>
                                        </div>
                                    ) : filteredFornecedores.length > 0 ? (
                                        filteredFornecedores.map((fornecedor) => (
                                            <motion.div
                                                key={fornecedor.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Nome</p>
                                                            <p className="font-semibold text-base break-words">{fornecedor.nome}</p>
                                                        </div>
                                                        <Badge variant="outline" className="ml-2 flex-shrink-0">
                                                            {fornecedor.tipo === 'fisica' ? 'PF' : 'PJ'}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
                                                            <p className="text-sm font-medium">{fornecedor.codigo || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Responsável</p>
                                                            <p className="text-sm font-medium truncate">{fornecedor.responsavel || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">Telefone</p>
                                                            <p className="text-sm font-medium">{fornecedor.telefoneFixo || fornecedor.celular || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">E-mail</p>
                                                            <p className="text-sm font-medium truncate">{fornecedor.email || '-'}</p>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleEdit(fornecedor)}
                                                                disabled={isSaving}
                                                                className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                Editar
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleDelete(fornecedor.id)}
                                                                disabled={isSaving}
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
                                            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                            <p>{searchTerm ? 'Nenhum fornecedor encontrado para a busca.' : 'Nenhum fornecedor cadastrado.'}</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Visualização em Tabela para Desktop */}
                        <div className="hidden md:block border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Responsável</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                <div className="flex items-center justify-center">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                                                    <span>Carregando...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredFornecedores.length > 0 ? (
                                        filteredFornecedores.map(fornecedor => (
                                            <TableRow key={fornecedor.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <TableCell className="font-medium">{fornecedor.codigo || '-'}</TableCell>
                                                <TableCell className="font-medium">{fornecedor.nome}</TableCell>
                                                <TableCell>{fornecedor.tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</TableCell>
                                                <TableCell>{fornecedor.responsavel || '-'}</TableCell>
                                                <TableCell>{fornecedor.telefoneFixo || fornecedor.celular || '-'}</TableCell>
                                                <TableCell>{fornecedor.email || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleEdit(fornecedor)}
                                                        disabled={isSaving}
                                                    >
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleDelete(fornecedor.id)}
                                                        className="text-red-500"
                                                        disabled={isSaving}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                {searchTerm ? 'Nenhum fornecedor encontrado para a busca.' : 'Nenhum fornecedor cadastrado.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
                        <DialogDescription>Preencha os dados do fornecedor.</DialogDescription>
                    </DialogHeader>
                    

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Coluna da Foto */}
                        <div className="md:col-span-1 space-y-4">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashborder-gray-300">
                                    {fotoPreviewUrl ? (
                                        <img 
                                            src={fotoPreviewUrl}
                                            alt="Foto do fornecedor" 
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-gray-400 text-6xl">👤</div>
                                    )}
                                </div>
                                        <Button variant="outline" size="sm" onClick={() => document.getElementById('foto-input').click()}>
                                            <Upload size={16} className="mr-2" />
                                            SELECIONE A FOTO
                                        </Button>
                                        <input
                                            id="foto-input"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                {/* Coluna dos Dados */}
                                <div className="md:col-span-3 space-y-4">
                                    {/* Primeira linha */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="codigo">CÓD:</Label>
                                            <Input 
                                                id="codigo" 
                                                placeholder="Código"
                                                value={fornecedorAtual.codigo} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, codigo: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="tipo">TIPO:</Label>
                                            <Select value={fornecedorAtual.tipo} onValueChange={(value) => setFornecedorAtual({ ...fornecedorAtual, tipo: value })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fisica">Pessoa Física</SelectItem>
                                                    <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="fundacao">FUNDAÇÃO:</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="fundacao" 
                                                    type="date"
                                                    value={fornecedorAtual.fundacao} 
                                                    onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, fundacao: e.target.value })} 
                                                />
                                                <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Segunda linha */}
                                    <div>
                                        <Label htmlFor="nome">NOME:</Label>
                                        <Input 
                                            id="nome" 
                                            placeholder="Digite o nome do fornecedor"
                                            value={fornecedorAtual.nome} 
                                            onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, nome: e.target.value })} 
                                        />
                                    </div>

                                    {/* Terceira linha */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="cnpj">CNPJ:</Label>
                                            <Input 
                                                id="cnpj" 
                                                placeholder="99.999.999/9999-99"
                                                value={fornecedorAtual.cnpj} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, cnpj: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="ie">I.E.:</Label>
                                            <Input 
                                                id="ie" 
                                                placeholder="RG"
                                                value={fornecedorAtual.ie} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, ie: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="inscricaoMunicipal">INSC. MUN.:</Label>
                                            <Input 
                                                id="inscricaoMunicipal" 
                                                placeholder="Órgão emissor do RG"
                                                value={fornecedorAtual.inscricaoMunicipal} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, inscricaoMunicipal: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    {/* Quarta linha */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="cep">CEP:</Label>
                                            <div className="relative">
                                                <Input 
                                                    id="cep" 
                                                    placeholder="00000-000"
                                                    value={fornecedorAtual.cep} 
                                                    onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, cep: e.target.value })} 
                                                />
                                                <Search size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="endereco">ENDEREÇO:</Label>
                                            <Input 
                                                id="endereco" 
                                                placeholder="Endereço do fornecedor"
                                                value={fornecedorAtual.endereco} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, endereco: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    {/* Quinta linha */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="numero">Nº:</Label>
                                            <Input 
                                                id="numero" 
                                                placeholder="Número"
                                                value={fornecedorAtual.numero} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, numero: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="complemento">COMPLEM.:</Label>
                                            <Input 
                                                id="complemento" 
                                                placeholder="Complemento"
                                                value={fornecedorAtual.complemento} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, complemento: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="bairro">BAIRRO:</Label>
                                            <Input 
                                                id="bairro" 
                                                placeholder="Bairro"
                                                value={fornecedorAtual.bairro} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, bairro: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                                    {/* Sexta linha */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="cidade">CIDADE:</Label>
                                            <Input 
                                                id="cidade" 
                                                placeholder="Cidade"
                                                value={fornecedorAtual.cidade} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, cidade: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="uf">UF:</Label>
                                            <Select value={fornecedorAtual.uf} onValueChange={(value) => setFornecedorAtual({ ...fornecedorAtual, uf: value })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o estado" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {estados.map((estado) => (
                                                        <SelectItem key={estado} value={estado}>
                                                            {estado}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="atividade">ATIVIDADE:</Label>
                                            <Input 
                                                id="atividade" 
                                                placeholder="Profissão"
                                                value={fornecedorAtual.atividade} 
                                                onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, atividade: e.target.value })} 
                                            />
                                        </div>
                                    </div>

                            {/* Sétima linha */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="telefoneFixo">TEL. FIXO:</Label>
                                    <Input 
                                        id="telefoneFixo" 
                                        placeholder="(00) 0000-0000"
                                        value={fornecedorAtual.telefoneFixo} 
                                        onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, telefoneFixo: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="whatsapp">WHATSAPP:</Label>
                                    <Input 
                                        id="whatsapp" 
                                        placeholder="(00) 00000-0000"
                                        value={fornecedorAtual.whatsapp} 
                                        onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, whatsapp: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="celular">CELULAR:</Label>
                                    <Input 
                                        id="celular" 
                                        placeholder="(00) 00000-0000"
                                        value={fornecedorAtual.celular} 
                                        onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, celular: e.target.value })} 
                                    />
                                </div>
                            </div>

                            {/* Oitava linha */}
                            <div>
                                <Label htmlFor="email">E-MAIL:</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    placeholder="fornecedor@email.com.br"
                                    value={fornecedorAtual.email} 
                                    onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, email: e.target.value })} 
                                />
                            </div>

                            {/* Nona linha */}
                            <div>
                                <Label htmlFor="responsavel">RESPONSÁVEL:</Label>
                                <Input 
                                    id="responsavel" 
                                    placeholder="Responsável"
                                    value={fornecedorAtual.responsavel} 
                                    onChange={(e) => setFornecedorAtual({ ...fornecedorAtual, responsavel: e.target.value })} 
                                 />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between">
                        <div className="flex space-x-2">
                            <Button 
                                variant="outline" 
                                onClick={closeModal}
                                disabled={isSaving}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        {isEditing ? 'Atualizando...' : 'Salvando...'}
                                    </>
                                ) : isEditing ? 'Atualizar' : 'Salvar'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FornecedoresPage;