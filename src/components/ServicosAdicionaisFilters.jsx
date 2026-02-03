import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Filter } from 'lucide-react';

const ServicosAdicionaisFilters = ({ 
    filters, 
    onFilterChange, 
    onClearFilters,
    showTipoFilter = false 
}) => {
    const categorias = [
        { value: 'todas', label: 'Todas as categorias' },
        { value: 'aplicacao', label: 'Aplicação' },
        { value: 'remocao', label: 'Remoção' },
        { value: 'preparacao', label: 'Preparação' },
        { value: 'protecao', label: 'Proteção' },
        { value: 'acabamento', label: 'Acabamento' },
        { value: 'outros', label: 'Outros' }
    ];

    const statusOptions = [
        { value: 'todos', label: 'Todos os status' },
        { value: 'true', label: 'Ativos' },
        { value: 'false', label: 'Inativos' }
    ];

    const tipoOptions = [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'envelopamento', label: 'Envelopamento' },
        { value: 'calculadora', label: 'Calculadora' }
    ];

    const handleInputChange = (name, value) => {
        onFilterChange({ ...filters, [name]: value });
    };

    const handleClearFilters = () => {
        onClearFilters();
    };

    const hasActiveFilters = Object.values(filters).some(value => value !== '' && value !== 'todas' && value !== 'todos');

    return (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
                <Filter size={20} className="text-muted-foreground" />
                <h3 className="text-lg font-medium">Filtros</h3>
                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="text-sm text-muted-foreground hover:text-primary underline"
                    >
                        Limpar filtros
                    </button>
                )}
            </div>

            <div className={`grid grid-cols-1 gap-4 ${showTipoFilter ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
                {/* Busca por nome */}
                <div className="space-y-2">
                    <Label htmlFor="search">Buscar por nome</Label>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="Nome do serviço..."
                            value={filters.search}
                            onChange={(e) => handleInputChange('search', e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Filtro por categoria */}
                <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                        value={filters.categoria}
                        onValueChange={(value) => handleInputChange('categoria', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
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

                {/* Filtro por tipo - apenas se showTipoFilter for true */}
                {showTipoFilter && (
                    <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo</Label>
                        <Select
                            value={filters.tipo}
                            onValueChange={(value) => handleInputChange('tipo', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {tipoOptions.map((tipo) => (
                                    <SelectItem key={tipo.value} value={tipo.value}>
                                        {tipo.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Filtro por status */}
                <div className="space-y-2">
                    <Label htmlFor="ativo">Status</Label>
                    <Select
                        value={filters.ativo}
                        onValueChange={(value) => handleInputChange('ativo', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro por preço */}
                <div className="space-y-2">
                    <Label htmlFor="preco_min">Preço mínimo</Label>
                    <Input
                        id="preco_min"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={filters.preco_min}
                        onChange={(e) => handleInputChange('preco_min', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default ServicosAdicionaisFilters;
