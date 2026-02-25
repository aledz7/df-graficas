import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, PackageSearch, XCircle, Info, DollarSign } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AcabamentoForm = ({ currentAcabamento, setCurrentAcabamento, isEditing, onSubmit, onCancelEdit, onOpenProdutoModal, initialAcabamentoState }) => {
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'valor' || name === 'valor_minimo' || name === 'valor_m2' || name === 'valor_un' || name === 'quantidade_produto_por_unidade_acabamento') {
      const sanitizedValue = value.replace(/[^0-9,.]/g, '').replace(',', '.');
      setCurrentAcabamento(prev => ({ ...prev, [name]: sanitizedValue }));
    } else if (name === 'prazo_adicional') {
      const sanitizedValue = value.replace(/[^0-9]/g, '');
      setCurrentAcabamento(prev => ({ ...prev, [name]: sanitizedValue ? parseInt(sanitizedValue) : 0 }));
    } else {
      setCurrentAcabamento(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (checked) => {
    setCurrentAcabamento(prev => ({ ...prev, ativo: checked }));
  };

  const handleClearProdutoVinculado = () => {
    setCurrentAcabamento(prev => ({
      ...prev,
      produto_vinculado_id: null,
      produto_vinculado_nome: '',
      produto_vinculado_custo: '0.00',
      produto_vinculado_unidade_medida: '',
      produto_vinculado_estoque_no_momento_do_cadastro: 0,
      quantidade_produto_por_unidade_acabamento: initialAcabamentoState.quantidade_produto_por_unidade_acabamento,
    }));
    toast({ title: "Produto Desvinculado", description: "O produto base foi removido deste acabamento." });
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    if (!currentAcabamento.nome_acabamento.trim()) {
      toast({ title: "Erro", description: "O nome do acabamento é obrigatório.", variant: "destructive" });
      return;
    }
    
    // Validar valor mínimo (obrigatório)
    const valorMinimo = parseFloat(currentAcabamento.valor_minimo || 0);
    if (isNaN(valorMinimo) || valorMinimo < 0) {
      toast({ title: "Erro", description: "O valor mínimo é obrigatório e deve ser um número positivo ou zero.", variant: "destructive" });
      return;
    }

    // Validar valor base conforme tipo de cálculo
    let valorVenda = 0;
    if (currentAcabamento.tipo_aplicacao === 'fixo') {
      // Para fixo, usar o campo valor
      valorVenda = parseFloat(currentAcabamento.valor || 0);
      if (isNaN(valorVenda) || valorVenda <= 0) {
        toast({ title: "Erro", description: "O valor é obrigatório para acabamentos fixos.", variant: "destructive" });
        return;
      }
    } else if (currentAcabamento.tipo_aplicacao === 'variável') {
      // Para variável, usar o campo valor
      valorVenda = parseFloat(currentAcabamento.valor || 0);
      if (isNaN(valorVenda) || valorVenda <= 0) {
        toast({ title: "Erro", description: "O valor é obrigatório para acabamentos variáveis.", variant: "destructive" });
        return;
      }
    } else if (currentAcabamento.tipo_aplicacao === 'area_total' || currentAcabamento.tipo_aplicacao === 'metro_linear') {
      valorVenda = parseFloat(currentAcabamento.valor_m2 || currentAcabamento.valor || 0);
      if (isNaN(valorVenda) || valorVenda <= 0) {
        toast({ title: "Erro", description: "O valor de venda (m² ou metro linear) deve ser um número positivo.", variant: "destructive" });
        return;
      }
    } else if (currentAcabamento.tipo_aplicacao === 'unidade') {
      valorVenda = parseFloat(currentAcabamento.valor_un || currentAcabamento.valor || 0);
      if (isNaN(valorVenda) || valorVenda <= 0) {
        toast({ title: "Erro", description: "O valor de venda por unidade deve ser um número positivo.", variant: "destructive" });
        return;
      }
    }

    // Validar prazo adicional
    const prazoAdicional = parseInt(currentAcabamento.prazo_adicional || 0);
    if (isNaN(prazoAdicional) || prazoAdicional < 0) {
      toast({ title: "Erro", description: "O prazo adicional deve ser um número inteiro positivo ou zero.", variant: "destructive" });
      return;
    }

    const qtdProdPorUnidAcab = parseFloat(currentAcabamento.quantidade_produto_por_unidade_acabamento);
    if (isNaN(qtdProdPorUnidAcab) || qtdProdPorUnidAcab <= 0) {
        toast({ title: "Erro", description: "A 'Quantidade de Produto por Unidade de Acabamento' deve ser um número positivo.", variant: "destructive" });
        return;
    }

    const acabamentoParaSalvar = {
      ...currentAcabamento,
      valor: valorVenda.toFixed(2),
      valor_minimo: valorMinimo.toFixed(2),
      prazo_adicional: prazoAdicional,
      valor_m2: currentAcabamento.tipo_aplicacao === 'area_total' || currentAcabamento.tipo_aplicacao === 'metro_linear' ? valorVenda.toFixed(2) : (currentAcabamento.valor_m2 || '0.00'),
      valor_un: currentAcabamento.tipo_aplicacao === 'unidade' ? valorVenda.toFixed(2) : (currentAcabamento.valor_un || '0.00'),
      quantidade_produto_por_unidade_acabamento: qtdProdPorUnidAcab.toString(),
    };
    onSubmit(acabamentoParaSalvar);
  };

  return (
    <Card className="mb-8 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{isEditing ? 'Editar Acabamento' : 'Adicionar Novo Acabamento'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmitForm}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="nome_acabamento">Acabamento <span className="text-red-500">*</span></Label>
              <Input
                id="nome_acabamento"
                name="nome_acabamento"
                value={currentAcabamento.nome_acabamento}
                onChange={handleInputChange}
                placeholder="Ex: Dobra, Aplicação de Adesivo, Verniz Localizado"
                required
              />
            </div>
            <div></div>
          </div>

          {/* Seção de Tipo de Cálculo com Radio Buttons */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tipo de cálculo</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="tipo_fixo"
                  name="tipo_aplicacao_radio"
                  value="fixo"
                  checked={currentAcabamento.tipo_aplicacao === 'fixo'}
                  onChange={(e) => setCurrentAcabamento(prev => ({ ...prev, tipo_aplicacao: 'fixo' }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="tipo_fixo" className="text-sm font-normal cursor-pointer">
                  Fixo – independente da quantidade selecionada
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="tipo_variavel"
                  name="tipo_aplicacao_radio"
                  value="variável"
                  checked={currentAcabamento.tipo_aplicacao === 'variável'}
                  onChange={(e) => setCurrentAcabamento(prev => ({ ...prev, tipo_aplicacao: 'variável' }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="tipo_variavel" className="text-sm font-normal cursor-pointer">
                  Variável – proporcional à quantidade selecionada
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="tipo_m2"
                  name="tipo_aplicacao_radio"
                  value="area_total"
                  checked={currentAcabamento.tipo_aplicacao === 'area_total'}
                  onChange={(e) => setCurrentAcabamento(prev => ({ ...prev, tipo_aplicacao: 'area_total' }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="tipo_m2" className="text-sm font-normal cursor-pointer">
                  Por metro quadrado (m²)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="tipo_metro_linear"
                  name="tipo_aplicacao_radio"
                  value="metro_linear"
                  checked={currentAcabamento.tipo_aplicacao === 'metro_linear'}
                  onChange={(e) => setCurrentAcabamento(prev => ({ ...prev, tipo_aplicacao: 'metro_linear' }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="tipo_metro_linear" className="text-sm font-normal cursor-pointer">
                  Por metro linear de bordas – soma de todos os lados
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="valor">
                Valor (R$) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor"
                  name="valor"
                  type="text"
                  inputMode="decimal"
                  value={currentAcabamento.valor || (currentAcabamento.tipo_aplicacao === 'unidade' ? currentAcabamento.valor_un : currentAcabamento.valor_m2) || ''}
                  onChange={handleInputChange}
                  placeholder="10.50"
                  required
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor base utilizado no cálculo conforme o tipo selecionado
              </p>
            </div>
            <div>
              <Label htmlFor="valor_minimo">
                Valor Mínimo (R$) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="valor_minimo"
                  name="valor_minimo"
                  type="text"
                  inputMode="decimal"
                  value={currentAcabamento.valor_minimo || '0.00'}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Valor mínimo cobrado, independente da regra de cálculo
              </p>
            </div>
            <div>
              <Label htmlFor="prazo_adicional">
                Prazo Adicional (dias)
              </Label>
              <Input
                id="prazo_adicional"
                name="prazo_adicional"
                type="number"
                min="0"
                value={currentAcabamento.prazo_adicional || 0}
                onChange={handleInputChange}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Dias adicionais ao prazo da OS quando este acabamento for incluído
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                name="observacoes"
                value={currentAcabamento.observacoes}
                onChange={handleInputChange}
                placeholder="Ex: Aplicado a cada 50cm"
              />
            </div>
            <div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="cor_fundo">Cor de Fundo do Acabamento</Label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="cor_fundo"
                  name="cor_fundo"
                  value={currentAcabamento.cor_fundo || '#ffffff'}
                  onChange={handleInputChange}
                  className="w-12 h-10 rounded border border-input cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentAcabamento.cor_fundo || '#ffffff'}
                  onChange={handleInputChange}
                  name="cor_fundo"
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Esta cor será exibida como fundo do acabamento na tela de ordens de serviço
              </p>
            </div>
            <div></div>
          </div>
          
          <Card className="bg-slate-50 dark:bg-slate-800/50 p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-md flex items-center">
                <PackageSearch size={18} className="mr-2 text-blue-600 dark:text-blue-400"/>
                Produto Vinculado (Opcional)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-3">
              {currentAcabamento.produto_vinculado_id ? (
                <div className="p-3 border rounded-md bg-background">
                  <div className="flex justify-between items-center">
                      <p className="font-medium text-sm">{currentAcabamento.produto_vinculado_nome}</p>
                      <Button variant="ghost" size="icon" onClick={handleClearProdutoVinculado} className="text-red-500 hover:text-red-600 h-7 w-7">
                          <XCircle size={16}/>
                      </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Custo: R$ {parseFloat(currentAcabamento.produto_vinculado_custo || 0).toFixed(2)} / {currentAcabamento.produto_vinculado_unidade_medida}</p>
                  <p className="text-xs text-muted-foreground">Estoque Registrado: {currentAcabamento.produto_vinculado_estoque_no_momento_do_cadastro} {currentAcabamento.produto_vinculado_unidade_medida}</p>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={onOpenProdutoModal} className="w-full">
                  <PackageSearch size={16} className="mr-2"/> Vincular Produto do Estoque
                </Button>
              )}
              {currentAcabamento.produto_vinculado_id && (
                  <div>
                      <Label htmlFor="quantidade_produto_por_unidade_acabamento">
                          Qtd. Produto Vinculado por Unid. Acabamento
                          <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Info size={14} className="inline ml-1 text-muted-foreground cursor-help"/>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                      <p>Define quanto do produto vinculado é consumido para cada unidade do acabamento. Ex: Se o acabamento é "Ilhós (unidade)" e o produto vinculado é "Ilhós Niquelado (unidade)", use 1. Se o acabamento é "Laminação (m²)" e o produto vinculado é "Filme de Laminação (m²)", use 1. Se o acabamento é "Pintura Especial (m²)" e o produto vinculado é "Tinta XPTO (Litro)", e 1 litro de tinta cobre 10m², use 0.1 (pois 0.1 litro é usado por m² de acabamento).</p>
                                  </TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      </Label>
                      <Input
                          id="quantidade_produto_por_unidade_acabamento"
                          name="quantidade_produto_por_unidade_acabamento"
                          type="text"
                          inputMode="decimal"
                          value={currentAcabamento.quantidade_produto_por_unidade_acabamento}
                          onChange={handleInputChange}
                          placeholder="1"
                          required
                      />
                  </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center space-x-2">
            <Switch
              id="ativo"
              checked={currentAcabamento.ativo}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="ativo">Ativo (aparecerá nas Ordens de Serviço)</Label>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-3">
          {isEditing && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar Edição
            </Button>
          )}
          <Button type="submit" className="bg-primary hover:bg-primary/90">
            <PlusCircle size={18} className="mr-2" /> {isEditing ? 'Salvar Alterações' : 'Adicionar Acabamento'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default AcabamentoForm;