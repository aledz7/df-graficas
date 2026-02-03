import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/components/ui/use-toast";
import { ArrowDownCircle, ArrowUpCircle, History, Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { movimentacaoCaixaService, uploadService, contaBancariaService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import FileUpload from '@/components/ui/file-upload';
import { exportToPdf } from '@/lib/reportGenerator';
import { apiDataManager } from '@/lib/apiDataManager';

const SangriaSuprimentoPage = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [tipo, setTipo] = useState('sangria');
    const [valor, setValor] = useState('');
    const [motivo, setMotivo] = useState('');
    const [historico, setHistorico] = useState([]);
    const [anexos, setAnexos] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [empresaSettings, setEmpresaSettings] = useState({});
    const [logoUrl, setLogoUrl] = useState('');
    const [contasBancarias, setContasBancarias] = useState([]);
    const [contaSelecionadaId, setContaSelecionadaId] = useState(undefined);
    const [isLoadingContas, setIsLoadingContas] = useState(true);

    const loadData = async () => {
        try {
            // Buscar todas as movimentações
            const response = await movimentacaoCaixaService.getMovimentacoes();
            
            // Garante que movimentacoes seja sempre um array
            const movimentacoes = Array.isArray(response.data) ? response.data : (response.data?.data || []);
            
            
            // Filtrar apenas sangria e suprimento baseado na categoria_nome
            const movimentacoesFiltradas = movimentacoes.filter(mov =>
                mov.categoria_nome === 'Sangria de Caixa' || 
                mov.categoria_nome === 'Suprimento de Caixa'
            );
            
            
            // Converter dados da API para o formato esperado pelo componente
            const historicoFormatado = movimentacoesFiltradas.map(mov => ({
                id: mov.id,
                tipo: mov.categoria_nome === 'Sangria de Caixa' ? 'sangria' : 'suprimento',
                valor: parseFloat(mov.valor),
                motivo: mov.metadados?.motivo || mov.observacoes || mov.descricao,
                data: mov.data_operacao || mov.created_at,
                anexos: mov.anexos || []
            }));
            
            setHistorico(historicoFormatado.sort((a,b) => new Date(b.data) - new Date(a.data)));
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            toast({ 
                title: 'Erro ao carregar dados', 
                description: 'Não foi possível carregar o histórico de movimentações.', 
                variant: 'destructive' 
            });
            setHistorico([]);
        }
    }

    useEffect(() => {
        const loadDataAndSettings = async () => {
            await loadData();
            
            // Carregar configurações da empresa para o relatório
            try {
                const settings = JSON.parse(await apiDataManager.getItem('empresaSettings') || '{}');
                const logo = await apiDataManager.getItem('logoUrl') || '';
                setEmpresaSettings(settings);
                setLogoUrl(logo);
            } catch (error) {
                console.error('Erro ao carregar configurações da empresa:', error);
            }
            
            // Carregar contas bancárias
            try {
                setIsLoadingContas(true);
                const response = await contaBancariaService.getAll();
                console.log('Resposta completa do getAll:', response);
                
                let contasArray = [];
                
                // Tentar diferentes estruturas de resposta
                if (response) {
                    // Se response.data existe
                    if (response.data) {
                        // response.data.data.data (estrutura aninhada)
                        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
                            contasArray = response.data.data.data;
                        }
                        // response.data.data (array direto)
                        else if (response.data.data && Array.isArray(response.data.data)) {
                            contasArray = response.data.data;
                        }
                        // response.data (array direto)
                        else if (Array.isArray(response.data)) {
                            contasArray = response.data;
                        }
                    }
                    // Se response é um array direto
                    else if (Array.isArray(response)) {
                        contasArray = response;
                    }
                }
                
                console.log('Contas bancárias extraídas:', contasArray);
                console.log('Quantidade de contas:', contasArray.length);
                
                // Filtrar apenas contas ativas (se ativo não for false)
                const contasAtivas = contasArray.filter(conta => conta.ativo !== false && conta.ativo !== 0);
                
                console.log('Contas ativas:', contasAtivas);
                
                setContasBancarias(contasAtivas);
                
                // Selecionar a conta de caixa por padrão
                if (contasAtivas.length > 0) {
                    const contaCaixa = contasAtivas.find(c => c.tipo === 'caixa' || c.nome === 'Caixa');
                    if (contaCaixa) {
                        setContaSelecionadaId(String(contaCaixa.id));
                    } else {
                        setContaSelecionadaId(String(contasAtivas[0].id));
                    }
                    console.log('Conta selecionada:', contaSelecionadaId);
                } else {
                    console.warn('Nenhuma conta bancária ativa encontrada. Total de contas:', contasArray.length);
                }
            } catch (error) {
                console.error('Erro ao carregar contas bancárias:', error);
                console.error('Resposta completa do erro:', error.response?.data || error);
            } finally {
                setIsLoadingContas(false);
            }
        };
        
        loadDataAndSettings();
    }, []);

    const handleFileSelect = async (fileData) => {
        try {
            setIsUploading(true);
            
            // Fazer upload do arquivo
            const uploadResponse = await uploadService.uploadAnexoMovimentacao(fileData.file, 'temp');
            
            if (uploadResponse.data.success) {
                const anexoData = {
                    name: fileData.name,
                    original_name: fileData.name,
                    url: uploadResponse.data.url,
                    path: uploadResponse.data.path,
                    filename: uploadResponse.data.filename,
                    type: fileData.type,
                    size: fileData.size,
                    previewUrl: fileData.previewUrl
                };
                
                setAnexos(prev => [...prev, anexoData]);
                
                toast({
                    title: 'Arquivo anexado!',
                    description: `${fileData.name} foi anexado com sucesso.`
                });
            } else {
                throw new Error(uploadResponse.data.message || 'Erro no upload');
            }
        } catch (error) {
            console.error('Erro ao fazer upload do anexo:', error);
            toast({
                title: 'Erro ao anexar arquivo',
                description: 'Não foi possível anexar o arquivo. Tente novamente.',
                variant: 'destructive'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileRemove = (index) => {
        setAnexos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveMovimentacao = async () => {
        if (!valor || parseFloat(valor) <= 0) {
            toast({ title: 'Valor Inválido', description: 'Por favor, insira um valor positivo.', variant: 'destructive' });
            return;
        }
        if (!motivo) {
            toast({ title: 'Motivo Obrigatório', description: 'Por favor, descreva o motivo da movimentação.', variant: 'destructive' });
            return;
        }
        
        if (!user || !user.id) {
            toast({ title: 'Erro de Autenticação', description: 'Usuário não identificado. Faça login novamente.', variant: 'destructive' });
            return;
        }
        
        const valorFloat = parseFloat(valor);

        try {
            // Garantir que contaSelecionadaId seja um número ou null
            const contaIdParaEnviar = contaSelecionadaId 
                ? (typeof contaSelecionadaId === 'string' ? parseInt(contaSelecionadaId) : contaSelecionadaId)
                : null;
            
            console.log('💾 [SangriaSuprimento] Criando movimentação:', {
                tipo,
                valor: valorFloat,
                motivo,
                contaSelecionadaId,
                contaIdParaEnviar,
                tipoContaId: typeof contaIdParaEnviar
            });
            
            // Criar movimentação no banco de dados Laravel
            const movimentacaoData = {
                tipo,
                valor: valorFloat,
                motivo,
                usuario_id: user.id, // Incluir o ID do usuário logado
                usuario_nome: user.name, // Incluir o nome do usuário logado
                anexos: anexos.length > 0 ? anexos : null, // Incluir anexos se houver
                conta_bancaria_id: contaIdParaEnviar // Incluir conta bancária selecionada
            };

            console.log('💾 [SangriaSuprimento] Dados enviados para API:', movimentacaoData);

            const response = await movimentacaoCaixaService.createMovimentacao(movimentacaoData);
            
            console.log('💾 [SangriaSuprimento] Resposta da API:', response);
            
            // Adicionar nova movimentação ao histórico local
            const novaMovimentacao = {
                id: response.data?.id || `mov-${Date.now()}`,
                tipo,
                valor: valorFloat,
                motivo,
                data: response.data?.data_operacao || new Date().toISOString(),
                anexos: anexos.length > 0 ? anexos : []
            };
            
            setHistorico([novaMovimentacao, ...historico]);
            setValor('');
            setMotivo('');
            setAnexos([]); // Limpar anexos após salvar

            toast({ 
                title: 'Movimentação Registrada!', 
                description: `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${valorFloat.toFixed(2)} salvo com sucesso no banco de dados.` 
            });
        } catch (error) {
            console.error('Erro ao salvar movimentação:', error);
            
            let errorMessage = 'Erro ao salvar movimentação.';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast({ 
                title: 'Erro ao Salvar', 
                description: errorMessage, 
                variant: 'destructive' 
            });
        }
    };

    const handlePrintReport = async () => {
        try {
            if (!historico || historico.length === 0) {
                toast({ 
                    title: 'Nenhum dado para imprimir', 
                    description: 'Não há movimentações registradas para gerar o relatório.', 
                    variant: 'destructive' 
                });
                return;
            }

            setIsGeneratingPdf(true);

            // Aguardar um pouco para garantir que o estado seja atualizado
            await new Promise(resolve => setTimeout(resolve, 100));

            // Preparar dados para o PDF com formatação adequada
            const headers = ['Data', 'Tipo', 'Motivo', 'Valor (R$)'];
            
            const data = historico.map(item => {
                try {
                    const dataFormatada = item.data 
                        ? format(new Date(item.data), 'dd/MM/yyyy HH:mm')
                        : 'Data não disponível';
                    
                    const tipoFormatado = item.tipo === 'sangria' ? 'Sangria' : 'Suprimento';
                    const motivoFormatado = item.motivo || 'Sem descrição';
                    const valorFormatado = parseFloat(item.valor || 0).toFixed(2);
                    
                    return [dataFormatada, tipoFormatado, motivoFormatado, valorFormatado];
                } catch (error) {
                    console.error('Erro ao formatar item:', error, item);
                    return ['N/A', 'N/A', 'Erro ao formatar', '0.00'];
                }
            });

            // Calcular totais
            const totalSangrias = historico
                .filter(item => item.tipo === 'sangria')
                .reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);
            
            const totalSuprimentos = historico
                .filter(item => item.tipo === 'suprimento')
                .reduce((acc, item) => acc + parseFloat(item.valor || 0), 0);

            const saldo = totalSuprimentos - totalSangrias;

            const summary = [
                { 
                    label: 'Total de Sangrias', 
                    value: `R$ ${totalSangrias.toFixed(2)}` 
                },
                { 
                    label: 'Total de Suprimentos', 
                    value: `R$ ${totalSuprimentos.toFixed(2)}` 
                },
                { 
                    label: 'Saldo (Suprimento - Sangria)', 
                    value: `R$ ${saldo.toFixed(2)}`,
                    color: saldo >= 0 ? 'green' : 'red'
                }
            ];

            // Gerar PDF com tratamento de erro
            console.log('Gerando PDF com dados:', { 
                titulo: 'Relatório de Sangrias e Suprimentos',
                headers, 
                dataCount: data.length, 
                summary,
                empresa: empresaSettings?.nomeFantasia || 'JET-IMPRE'
            });
            
            exportToPdf(
                'Relatório de Sangrias e Suprimentos',
                [headers], // Envolver headers em array
                data,
                summary,
                logoUrl || '',
                empresaSettings?.nomeFantasia || 'JET-IMPRE'
            );

            toast({ 
                title: '✅ PDF Gerado!', 
                description: `Relatório com ${historico.length} movimentações gerado com sucesso.` 
            });
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            toast({ 
                title: 'Erro ao gerar PDF', 
                description: `Não foi possível gerar o relatório: ${error.message}`, 
                variant: 'destructive' 
            });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrintSingleMovimentacao = async (item) => {
        try {
            // Preparar dados para o PDF com apenas uma movimentação
            const headers = ['Data', 'Tipo', 'Motivo', 'Valor (R$)'];
            
            const dataFormatada = item.data 
                ? format(new Date(item.data), 'dd/MM/yyyy HH:mm')
                : 'Data não disponível';
            
            const tipoFormatado = item.tipo === 'sangria' ? 'Sangria' : 'Suprimento';
            const motivoFormatado = item.motivo || 'Sem descrição';
            const valorFormatado = parseFloat(item.valor || 0).toFixed(2);
            
            const data = [[dataFormatada, tipoFormatado, motivoFormatado, valorFormatado]];

            // Resumo apenas desta movimentação
            const summary = [
                { 
                    label: 'Tipo', 
                    value: tipoFormatado
                },
                { 
                    label: 'Data', 
                    value: dataFormatada
                },
                { 
                    label: 'Valor', 
                    value: `R$ ${valorFormatado}`,
                    color: item.tipo === 'suprimento' ? 'green' : 'red'
                }
            ];

            // Gerar PDF
            exportToPdf(
                `Comprovante de ${tipoFormatado}`,
                [headers],
                data,
                summary,
                logoUrl || '',
                empresaSettings?.nomeFantasia || 'JET-IMPRE'
            );

            toast({ 
                title: '✅ PDF Gerado!', 
                description: `Comprovante de ${tipoFormatado.toLowerCase()} gerado com sucesso.` 
            });
        } catch (error) {
            console.error('Erro ao gerar comprovante:', error);
            toast({ 
                title: 'Erro ao gerar PDF', 
                description: `Não foi possível gerar o comprovante: ${error.message}`, 
                variant: 'destructive' 
            });
        }
    };

    return (
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Sangria e Suprimento</CardTitle>
                        <CardDescription>Registre retiradas (Sangria) e adições (Suprimento) de dinheiro do caixa.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Tipo de Movimentação</Label>
                            <Select value={tipo} onValueChange={setTipo}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sangria">
                                        <div className="flex items-center"><ArrowDownCircle className="mr-2 text-red-500" /> Sangria (Retirada)</div>
                                    </SelectItem>
                                    <SelectItem value="suprimento">
                                        <div className="flex items-center"><ArrowUpCircle className="mr-2 text-green-500" /> Suprimento (Adição)</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="valor">Valor (R$)</Label>
                            <Input id="valor" type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <Label htmlFor="motivo">Motivo</Label>
                            <Input id="motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex: Pagamento de fornecedor, Troco" />
                        </div>
                        <div>
                            <Label>Conta Bancária</Label>
                            {isLoadingContas ? (
                                <Input 
                                    value="Carregando contas..." 
                                    disabled 
                                    className="bg-muted"
                                />
                            ) : contasBancarias.length > 0 ? (
                                <Select 
                                    value={contaSelecionadaId || String(contasBancarias[0]?.id)} 
                                    onValueChange={(value) => setContaSelecionadaId(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a conta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contasBancarias.map(conta => (
                                            <SelectItem key={conta.id} value={String(conta.id)}>
                                                {conta.nome_banco || conta.nome}
                                                {conta.agencia && ` - Ag: ${conta.agencia}`}
                                                {conta.conta && ` - Conta: ${conta.conta}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input 
                                    value="Nenhuma conta disponível" 
                                    disabled 
                                    className="bg-muted"
                                />
                            )}
                        </div>
                        <div>
                            <Label>Recibo (Opcional)</Label>
                            <FileUpload
                                onFileSelect={handleFileSelect}
                                onFileRemove={handleFileRemove}
                                existingFiles={anexos}
                                acceptedTypes="image/*,application/pdf"
                                maxSize={5 * 1024 * 1024} // 5MB
                                placeholder="Clique para anexar recibo"
                                description="Imagens (JPG, PNG) ou PDF - Máx. 5MB"
                                disabled={isUploading}
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button 
                            onClick={handleSaveMovimentacao} 
                            className="w-full" 
                            disabled={isUploading}
                        >
                            {isUploading ? 'Processando...' : 'Registrar Movimentação'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center">
                                <History className="mr-2" /> Histórico de Movimentações
                            </CardTitle>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={handlePrintReport}
                                className="flex items-center gap-2"
                                disabled={historico.length === 0 || isGeneratingPdf}
                            >
                                {isGeneratingPdf ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                        Gerando...
                                    </>
                                ) : (
                                    <>
                                        <Printer size={16} />
                                        Imprimir PDF
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Layout Mobile - Cards */}
                        <div className="md:hidden">
                            <ScrollArea className="h-[calc(100vh-18rem)]">
                                {historico.length > 0 ? (
                                    <div className="space-y-3">
                                        {historico.map(item => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`border rounded-lg p-4 ${
                                                    item.tipo === 'sangria' 
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                                                        : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <Badge className={`${
                                                        item.tipo === 'sangria' 
                                                            ? 'bg-red-600 hover:bg-red-700' 
                                                            : 'bg-green-600 hover:bg-green-700'
                                                    }`}>
                                                        {item.tipo === 'sangria' ? (
                                                            <><ArrowDownCircle size={14} className="mr-1" /> Sangria</>
                                                        ) : (
                                                            <><ArrowUpCircle size={14} className="mr-1" /> Suprimento</>
                                                        )}
                                                    </Badge>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={() => handlePrintSingleMovimentacao(item)}
                                                            title="Imprimir esta movimentação"
                                                        >
                                                            <Printer size={14} />
                                                        </Button>
                                                        <div className="text-right">
                                                            <p className={`text-lg font-bold ${
                                                                item.tipo === 'sangria' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                                                            }`}>
                                                                R$ {item.valor.toFixed(2)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Data</p>
                                                        <p className="text-sm font-medium">{format(new Date(item.data), "dd/MM/yyyy HH:mm")}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Motivo</p>
                                                        <p className="text-sm break-words">{item.motivo}</p>
                                                    </div>
                                                    {item.anexos && item.anexos.length > 0 && (
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Anexos</p>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.anexos.map((anexo, idx) => (
                                                                    <Button
                                                                        key={idx}
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-6 px-2 text-xs"
                                                                        onClick={() => window.open(anexo.url, '_blank')}
                                                                    >
                                                                        📄 {anexo.name || anexo.original_name || `Anexo ${idx + 1}`}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <History size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                                        <p>Nenhuma movimentação registrada.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        {/* Layout Desktop - Tabela */}
                        <div className="hidden md:block">
                            <ScrollArea className="h-[calc(100vh-18rem)]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Motivo</TableHead>
                                            <TableHead>Anexos</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead className="text-center">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historico.length > 0 ? historico.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <span className={`font-semibold ${item.tipo === 'sangria' ? 'text-red-600' : 'text-green-600'}`}>
                                                        {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{format(new Date(item.data), "dd/MM/yyyy HH:mm")}</TableCell>
                                                <TableCell>{item.motivo}</TableCell>
                                                <TableCell>
                                                    {item.anexos && item.anexos.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.anexos.map((anexo, idx) => (
                                                                <Button
                                                                    key={idx}
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs"
                                                                    onClick={() => window.open(anexo.url, '_blank')}
                                                                >
                                                                    📄 {anexo.name || anexo.original_name || `Anexo ${idx + 1}`}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">R$ {item.valor.toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 px-3"
                                                        onClick={() => handlePrintSingleMovimentacao(item)}
                                                        title="Imprimir esta movimentação"
                                                    >
                                                        <Printer size={14} className="mr-1" />
                                                        Imprimir
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhuma movimentação registrada.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SangriaSuprimentoPage;