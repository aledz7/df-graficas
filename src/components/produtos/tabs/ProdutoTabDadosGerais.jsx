import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ProdutoTabDadosGerais = ({ currentProduto, handleInputChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Gerais do Produto</CardTitle>
        <CardDescription>Informações básicas e identificação do produto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="codigo_produto">Código do Produto</Label>
                <Input id="codigo_produto" name="codigo_produto" value={currentProduto.codigo_produto} readOnly className="bg-gray-100 dark:bg-gray-700"/>
            </div>
            <div>
                <Label htmlFor="nome">Nome do Produto <span className="text-red-500">*</span></Label>
                <Input id="nome" name="nome" value={currentProduto.nome} onChange={handleInputChange} placeholder="Ex: Camiseta Premium Algodão Pima"/>
            </div>
        </div>

        <Separator />

        {/* Seção de Tipo de Visualização do Produto */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📍 Tipo de Visualização do Produto</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Defina onde este produto pode aparecer e ser utilizado no sistema.
            </p>
          </div>

          <RadioGroup 
            value={currentProduto.tipo_visualizacao || 'vendas'} 
            onValueChange={(value) => {
              handleInputChange({
                target: {
                  name: 'tipo_visualizacao',
                  value: value,
                  type: 'text'
                }
              });
              // Atualizar checkboxes de visibilidade baseado no tipo
              if (value === 'vendas') {
                handleInputChange({ target: { name: 'venda_pdv', checked: true, type: 'checkbox' } });
                handleInputChange({ target: { name: 'venda_marketplace', checked: true, type: 'checkbox' } });
                handleInputChange({ target: { name: 'uso_interno', checked: false, type: 'checkbox' } });
              } else if (value === 'catalogo_publico') {
                handleInputChange({ target: { name: 'venda_pdv', checked: false, type: 'checkbox' } });
                handleInputChange({ target: { name: 'venda_marketplace', checked: true, type: 'checkbox' } });
                handleInputChange({ target: { name: 'uso_interno', checked: false, type: 'checkbox' } });
              } else if (value === 'consumo_interno') {
                handleInputChange({ target: { name: 'venda_pdv', checked: false, type: 'checkbox' } });
                handleInputChange({ target: { name: 'venda_marketplace', checked: false, type: 'checkbox' } });
                handleInputChange({ target: { name: 'uso_interno', checked: true, type: 'checkbox' } });
              }
            }}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <RadioGroupItem value="vendas" id="tipo_vendas" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="tipo_vendas" className="text-sm font-medium cursor-pointer">
                  Vendas / Comercial
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Produtos para vendas no geral. Aparece no PDV e no Marketplace. Opção padrão para produtos comerciais.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <RadioGroupItem value="catalogo_publico" id="tipo_catalogo" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="tipo_catalogo" className="text-sm font-medium cursor-pointer">
                  Catálogo Público
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Escolhendo essa opção, você pode colocar itens com artes prontas. Exibido apenas para clientes finais no catálogo público, evitando que vários itens apareçam no sistema e atrapalhem o vendedor.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <RadioGroupItem value="consumo_interno" id="tipo_consumo" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="tipo_consumo" className="text-sm font-medium cursor-pointer">
                  Consumo Interno
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Visível apenas para pessoas que têm acesso a estoque. Ideal para material de limpeza, escritório e outros itens de uso interno que precisam de controle de estoque.
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Campos de Prazo */}
          <Separator />
          <div>
            <h3 className="text-lg font-semibold mb-2">⏱️ Prazos</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Informe os prazos de produção e criação de arte (opcional).
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_digital"
                checked={currentProduto.is_digital ?? false}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'is_digital',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                }}
              />
              <Label htmlFor="is_digital" className="text-sm font-medium leading-none cursor-pointer">
                Produto Digital (sem controle de estoque)
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Quando marcado, este produto não valida nem baixa estoque no PDV/vendas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prazo_producao">Prazo de Produção</Label>
              <Input 
                id="prazo_producao" 
                name="prazo_producao" 
                value={currentProduto.prazo_producao || ''} 
                onChange={handleInputChange} 
                placeholder="Ex: 5 dias, 1 semana, 10 dias úteis"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tempo necessário para produção do produto
              </p>
            </div>
            <div>
              <Label htmlFor="prazo_criacao_arte">Prazo de Criação de Arte</Label>
              <Input 
                id="prazo_criacao_arte" 
                name="prazo_criacao_arte" 
                value={currentProduto.prazo_criacao_arte || ''} 
                onChange={handleInputChange} 
                placeholder="Ex: 3 dias, 48 horas, 2 dias úteis"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tempo necessário para criação da arte do produto
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProdutoTabDadosGerais;