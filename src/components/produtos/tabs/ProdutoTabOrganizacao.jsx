import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryAutocomplete } from '@/components/ui/category-autocomplete';

const unidadeMedidaOptions = [
  { value: 'unidade', label: 'Unidade (UN)' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro Quadrado (m²)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'caixa', label: 'Caixa (CX)' },
  { value: 'peca', label: 'Peça (PÇ)' },
];

const ProdutoTabOrganizacao = ({
  currentProduto,
  handleInputChange,
  handleSelectChange,
  categories,
  subcategories,
}) => {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [categoriaSearchValue, setCategoriaSearchValue] = useState('');

  // Encontrar categoria selecionada baseada no currentProduto.categoria
  React.useEffect(() => {
    if (currentProduto.categoria && categories.length > 0) {
      const categoria = categories.find(cat => String(cat.id) === String(currentProduto.categoria));
      if (categoria) {
        setCategoriaSelecionada(categoria);
        setCategoriaSearchValue(categoria.nome);
      }
    }
  }, [currentProduto.categoria, categories]);

  const handleSelectCategoria = (categoria) => {
    setCategoriaSelecionada(categoria);
    setCategoriaSearchValue(categoria.nome);
    handleSelectChange('categoria', String(categoria.id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organização e Identificação</CardTitle>
        <CardDescription>Detalhes para categorização e localização do produto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="categoria">Categoria <span className="text-red-500">*</span></Label>
                <CategoryAutocomplete
                    value={categoriaSearchValue}
                    onChange={(e) => setCategoriaSearchValue(e.target.value)}
                    onSelect={handleSelectCategoria}
                    categories={categories}
                    placeholder="Digite o nome da categoria..."
                    className="w-full"
                />
            </div>
            <div>
                <Label htmlFor="subcategoriaId">Subcategoria (Opcional)</Label>
                <Select 
                    name="subcategoriaId" 
                    value={currentProduto.subcategoriaId || ''} 
                    onValueChange={(value) => handleSelectChange('subcategoriaId', value)} 
                    disabled={subcategories.length === 0}
                >
                    <SelectTrigger id="subcategoriaId">
                        <SelectValue placeholder="Selecione uma subcategoria">
                            {subcategories.find(sub => String(sub.id) === String(currentProduto.subcategoriaId))?.nome || 'Selecione uma subcategoria'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {subcategories.map(subcat => (
                            <SelectItem key={subcat.id} value={String(subcat.id)}>
                                {subcat.nome}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="codigo_barras">Código de Barras (EAN)</Label>
                <Input id="codigo_barras" name="codigo_barras" value={currentProduto.codigo_barras} onChange={handleInputChange} placeholder="Leia ou digite o código"/>
            </div>
            <div>
                <Label htmlFor="localizacao">Localização no Estoque</Label>
                <Input id="localizacao" name="localizacao" value={currentProduto.localizacao} onChange={handleInputChange} placeholder="Ex: Prateleira C2, Gaveta 3"/>
            </div>
        </div>
         <div>
            <Label htmlFor="unidadeMedida">Unidade de Medida</Label>
            <Select 
                name="unidadeMedida" 
                value={currentProduto.unidadeMedida ? String(currentProduto.unidadeMedida) : ""} 
                onValueChange={(value) => handleSelectChange('unidadeMedida', value)}
            >
                <SelectTrigger id="unidadeMedida">
                    <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                    {unidadeMedidaOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
         <div className="flex items-center space-x-2 pt-2">
            <Checkbox id="status" name="status" checked={currentProduto.status} onCheckedChange={(checked) => handleInputChange({ target: { name: 'status', checked, type: 'checkbox' }})}/>
            <Label htmlFor="status">Produto Ativo (visível para venda)</Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProdutoTabOrganizacao;