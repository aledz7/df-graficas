import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Save, X } from 'lucide-react';

const ServicoAdicionalModal = ({ 
    isOpen, 
    onClose, 
    servico = null, 
    onSave, 
    loading = false 
}) => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        preco: '',
        unidade: 'm²',
        categoria: '',
        tipo: 'envelopamento',
        ordem: '0'
    });

    const categorias = [
        { value: 'aplicacao', label: 'Aplicação' },
        { value: 'remocao', label: 'Remoção' },
        { value: 'preparacao', label: 'Preparação' },
        { value: 'protecao', label: 'Proteção' },
        { value: 'acabamento', label: 'Acabamento' },
        { value: 'outros', label: 'Outros' }
    ];

    const tipos = [
        { value: 'envelopamento', label: 'Envelopamento' },
        { value: 'calculadora', label: 'Calculadora' }
    ];

    useEffect(() => {
        if (servico) {
            setFormData({
                nome: servico.nome || '',
                descricao: servico.descricao || '',
                preco: servico.preco?.toString() || '',
                unidade: servico.unidade || 'm²',
                categoria: servico.categoria || '',
                tipo: servico.tipo || 'envelopamento',
                ordem: servico.ordem?.toString() || '0'
            });
        } else {
            setFormData({
                nome: '',
                descricao: '',
                preco: '',
                unidade: 'm²',
                categoria: '',
                tipo: 'envelopamento',
                ordem: '0'
            });
        }
    }, [servico, isOpen]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'preco') {
            // Aceita vírgula ou ponto como separador decimal
            let cleanedValue = value.replace(/[^\d.,]/g, '');
            cleanedValue = cleanedValue.replace(',', '.');
            const parts = cleanedValue.split('.');
            const finalValue = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
            setFormData(prev => ({ ...prev, [name]: finalValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação básica
        if (!formData.nome.trim()) {
            toast({
                title: 'Campo obrigatório',
                description: 'O nome do serviço é obrigatório',
                variant: 'destructive'
            });
            return;
        }

        if (!formData.preco || parseFloat(formData.preco) <= 0) {
            toast({
                title: 'Preço inválido',
                description: 'O preço deve ser maior que zero',
                variant: 'destructive'
            });
            return;
        }

        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Erro ao salvar serviço:', error);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {servico ? 'Editar Serviço Adicional' : 'Novo Serviço Adicional'}
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome do Serviço *</Label>
                        <Input
                            id="nome"
                            name="nome"
                            value={formData.nome}
                            onChange={handleInputChange}
                            placeholder="Ex: Aplicação de Vinil"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea
                            id="descricao"
                            name="descricao"
                            value={formData.descricao}
                            onChange={handleInputChange}
                            placeholder="Descreva o serviço..."
                            rows={3}
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="preco">Preço por m² *</Label>
                            <Input
                                id="preco"
                                name="preco"
                                type="text"
                                inputMode="decimal"
                                value={formData.preco}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unidade">Unidade de Medida</Label>
                            <Select
                                value={formData.unidade}
                                onValueChange={(value) => handleSelectChange('unidade', value)}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="m²">m²</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                    <SelectItem value="unidade">Unidade</SelectItem>
                                    <SelectItem value="hora">Hora</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoria</Label>
                            <Select
                                value={formData.categoria}
                                onValueChange={(value) => handleSelectChange('categoria', value)}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categorias.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tipo">Tipo de Serviço *</Label>
                            <Select
                                value={formData.tipo}
                                onValueChange={(value) => handleSelectChange('tipo', value)}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tipos.map((tipo) => (
                                        <SelectItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="ordem">Ordem de Exibição</Label>
                        <Input
                            id="ordem"
                            name="ordem"
                            type="number"
                            min="0"
                            value={formData.ordem}
                            onChange={handleInputChange}
                            placeholder="0"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            <X size={16} className="mr-2" />
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90"
                        >
                            <Save size={16} className="mr-2" />
                            {loading ? 'Salvando...' : (servico ? 'Atualizar' : 'Criar')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ServicoAdicionalModal;
