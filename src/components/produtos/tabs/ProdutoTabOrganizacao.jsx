import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CategoryAutocomplete } from '@/components/ui/category-autocomplete';
import { categoriaService, subcategoriaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Loader2 } from 'lucide-react';

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
  onCategoriaCreated,
  onSubcategoriaCreated,
}) => {
  const { toast } = useToast();
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [categoriaSearchValue, setCategoriaSearchValue] = useState('');
  
  // Estados para modais de cadastro rápido
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  const [showSubcategoriaModal, setShowSubcategoriaModal] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', descricao: '' });
  const [novaSubcategoria, setNovaSubcategoria] = useState({ nome: '', descricao: '' });
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [savingSubcategoria, setSavingSubcategoria] = useState(false);

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

  // Funções para salvar categoria e subcategoria rapidamente
  const handleSaveCategoria = async () => {
    if (!novaCategoria.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da categoria é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    setSavingCategoria(true);
    try {
      const response = await categoriaService.create({
        nome: novaCategoria.nome.trim(),
        descricao: novaCategoria.descricao.trim() || null,
        tipo: 'produto',
        ativo: true
      });

      const categoriaCriada = response.data?.data || response.data;
      
      toast({
        title: 'Sucesso',
        description: `Categoria "${novaCategoria.nome}" criada com sucesso!`
      });

      // Fechar modal e limpar form
      setShowCategoriaModal(false);
      setNovaCategoria({ nome: '', descricao: '' });

      // Notificar o componente pai para recarregar categorias
      if (onCategoriaCreated) {
        await onCategoriaCreated(categoriaCriada);
      }

      // Selecionar automaticamente a nova categoria
      if (categoriaCriada) {
        setCategoriaSelecionada(categoriaCriada);
        setCategoriaSearchValue(categoriaCriada.nome);
        handleSelectChange('categoria', String(categoriaCriada.id));
      }
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao criar categoria. Tente novamente.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSavingCategoria(false);
    }
  };

  const handleSaveSubcategoria = async () => {
    if (!novaSubcategoria.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome da subcategoria é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    if (!currentProduto.categoria) {
      toast({
        title: 'Erro',
        description: 'Selecione uma categoria antes de criar uma subcategoria.',
        variant: 'destructive'
      });
      return;
    }

    setSavingSubcategoria(true);
    try {
      const response = await subcategoriaService.create({
        nome: novaSubcategoria.nome.trim(),
        descricao: novaSubcategoria.descricao.trim() || null,
        categoria_id: Number(currentProduto.categoria),
        ativo: true
      });

      const subcategoriaCriada = response.data?.data || response.data;
      
      toast({
        title: 'Sucesso',
        description: `Subcategoria "${novaSubcategoria.nome}" criada com sucesso!`
      });

      // Fechar modal e limpar form
      setShowSubcategoriaModal(false);
      setNovaSubcategoria({ nome: '', descricao: '' });

      // Notificar o componente pai para recarregar subcategorias
      if (onSubcategoriaCreated) {
        await onSubcategoriaCreated(subcategoriaCriada);
      }

      // Selecionar automaticamente a nova subcategoria
      if (subcategoriaCriada) {
        handleSelectChange('subcategoriaId', String(subcategoriaCriada.id));
      }
    } catch (error) {
      console.error('Erro ao criar subcategoria:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao criar subcategoria. Tente novamente.';
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSavingSubcategoria(false);
    }
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
                <div className="flex gap-2">
                    <div className="flex-1">
                        <CategoryAutocomplete
                            value={categoriaSearchValue}
                            onChange={(e) => setCategoriaSearchValue(e.target.value)}
                            onSelect={handleSelectCategoria}
                            categories={categories}
                            placeholder="Digite o nome da categoria..."
                            className="w-full"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowCategoriaModal(true)}
                        title="Cadastrar nova categoria"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div>
                <Label htmlFor="subcategoriaId">Subcategoria (Opcional)</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Select 
                            name="subcategoriaId" 
                            value={currentProduto.subcategoriaId || ''} 
                            onValueChange={(value) => handleSelectChange('subcategoriaId', value)} 
                            disabled={subcategories.length === 0 && !currentProduto.categoria}
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
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowSubcategoriaModal(true)}
                        disabled={!currentProduto.categoria}
                        title={currentProduto.categoria ? "Cadastrar nova subcategoria" : "Selecione uma categoria primeiro"}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
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

      {/* Modal de Cadastro Rápido de Categoria */}
      <Dialog open={showCategoriaModal} onOpenChange={setShowCategoriaModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Cadastre uma nova categoria rapidamente. Ela será selecionada automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nomeCategoria">Nome <span className="text-red-500">*</span></Label>
              <Input
                id="nomeCategoria"
                value={novaCategoria.nome}
                onChange={(e) => setNovaCategoria(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Adesivos, Banners, etc."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricaoCategoria">Descrição (Opcional)</Label>
              <Input
                id="descricaoCategoria"
                value={novaCategoria.descricao}
                onChange={(e) => setNovaCategoria(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição da categoria..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCategoriaModal(false);
                setNovaCategoria({ nome: '', descricao: '' });
              }}
              disabled={savingCategoria}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCategoria} disabled={savingCategoria}>
              {savingCategoria ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Categoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Cadastro Rápido de Subcategoria */}
      <Dialog open={showSubcategoriaModal} onOpenChange={setShowSubcategoriaModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
            <DialogDescription>
              Cadastre uma nova subcategoria para a categoria "{categoriaSelecionada?.nome || 'selecionada'}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nomeSubcategoria">Nome <span className="text-red-500">*</span></Label>
              <Input
                id="nomeSubcategoria"
                value={novaSubcategoria.nome}
                onChange={(e) => setNovaSubcategoria(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Vinil, Lona, etc."
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricaoSubcategoria">Descrição (Opcional)</Label>
              <Input
                id="descricaoSubcategoria"
                value={novaSubcategoria.descricao}
                onChange={(e) => setNovaSubcategoria(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição da subcategoria..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowSubcategoriaModal(false);
                setNovaSubcategoria({ nome: '', descricao: '' });
              }}
              disabled={savingSubcategoria}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveSubcategoria} disabled={savingSubcategoria}>
              {savingSubcategoria ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Subcategoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ProdutoTabOrganizacao;