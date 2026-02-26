import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const CMYK_OPTIONS = [
  { value: '1x0', label: '1x0', descricao: 'Impressão de Cor Única' },
  { value: '4x0', label: '4x0', descricao: 'Frente Colorido' },
  { value: '4x4', label: '4x4', descricao: 'Frente & Verso Colorido' },
];

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

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox
                id="venda_pdv"
                checked={currentProduto.venda_pdv !== undefined ? currentProduto.venda_pdv : true}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'venda_pdv',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                  // Se marcar Vendas/Comercial, desmarcar Consumo Interno
                  if (checked) {
                    handleInputChange({
                      target: {
                        name: 'uso_interno',
                        checked: false,
                        type: 'checkbox'
                      }
                    });
                  }
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="venda_pdv" className="text-sm font-medium cursor-pointer">
                  Vendas / Comercial
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Produtos para vendas no geral. Aparece no PDV e no Marketplace. Opção padrão para produtos comerciais.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox
                id="venda_marketplace"
                checked={currentProduto.venda_marketplace !== undefined ? currentProduto.venda_marketplace : true}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'venda_marketplace',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                  // Se marcar Catálogo Público, desmarcar Consumo Interno
                  if (checked) {
                    handleInputChange({
                      target: {
                        name: 'uso_interno',
                        checked: false,
                        type: 'checkbox'
                      }
                    });
                  }
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="venda_marketplace" className="text-sm font-medium cursor-pointer">
                  Catálogo Público
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Escolhendo essa opção, você pode colocar itens com artes prontas. Exibido apenas para clientes finais no catálogo público, evitando que vários itens apareçam no sistema e atrapalhem o vendedor.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox
                id="uso_interno"
                checked={currentProduto.uso_interno || false}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'uso_interno',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                  // Se marcar Consumo Interno, desmarcar as outras duas
                  if (checked) {
                    handleInputChange({
                      target: {
                        name: 'venda_pdv',
                        checked: false,
                        type: 'checkbox'
                      }
                    });
                    handleInputChange({
                      target: {
                        name: 'venda_marketplace',
                        checked: false,
                        type: 'checkbox'
                      }
                    });
                  }
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <Label htmlFor="uso_interno" className="text-sm font-medium cursor-pointer">
                  Consumo Interno
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Visível apenas para pessoas que têm acesso a estoque. Ideal para material de limpeza, escritório e outros itens de uso interno que precisam de controle de estoque.
                </p>
              </div>
            </div>
          </div>

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
                checked={currentProduto.is_digital !== undefined ? currentProduto.is_digital : true}
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

        {/* ============================================
            ESPECIFICAÇÕES TÉCNICAS DE IMPRESSÃO
        ============================================ */}
        <Separator />
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold mb-1">🖨️ Especificações Técnicas de Impressão</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Defina as especificações técnicas do produto: material, dimensões, acabamentos e configuração de cor.
            </p>
          </div>

          {/* MATERIAL */}
          <div>
            <Label htmlFor="material" className="font-semibold">
              Material
            </Label>
            <Input
              id="material"
              name="material"
              value={currentProduto.material || ''}
              onChange={handleInputChange}
              placeholder="Ex: Papel Couchê 115g, Lona 540g, PVC Adesivo, Papel Offset 75g..."
              className="mt-1"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Insumo ou tipo de material utilizado para produzir o item.
            </p>
          </div>

          {/* TAMANHO + SANGRIA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TAMANHO */}
            <div className="space-y-3">
              <div>
                <Label className="font-semibold">Tamanho Final (cm)</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Dimensões finais do produto acabado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="tamanho_largura" className="text-xs text-gray-600 dark:text-gray-400">
                    Largura (cm)
                  </Label>
                  <Input
                    id="tamanho_largura"
                    name="tamanho_largura"
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentProduto.tamanho_largura || ''}
                    onChange={handleInputChange}
                    placeholder="0,0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="tamanho_altura" className="text-xs text-gray-600 dark:text-gray-400">
                    Altura (cm)
                  </Label>
                  <Input
                    id="tamanho_altura"
                    name="tamanho_altura"
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentProduto.tamanho_altura || ''}
                    onChange={handleInputChange}
                    placeholder="0,0"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tamanho_profundidade" className="text-xs text-gray-600 dark:text-gray-400">
                  Profundidade (cm) <span className="text-gray-400 font-normal">— opcional</span>
                </Label>
                <Input
                  id="tamanho_profundidade"
                  name="tamanho_profundidade"
                  type="number"
                  step="0.1"
                  min="0"
                  value={currentProduto.tamanho_profundidade || ''}
                  onChange={handleInputChange}
                  placeholder="0,0"
                  className="mt-1"
                />
              </div>
            </div>

            {/* SANGRIA */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Sangria (cm)</Label>
                  <Badge variant="secondary" className="text-xs font-normal">
                    +3mm automático
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Calculado automaticamente somando 3mm ao tamanho. Editável se necessário.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="sangria_largura" className="text-xs text-gray-600 dark:text-gray-400">
                    Largura c/ sangria (cm)
                  </Label>
                  <Input
                    id="sangria_largura"
                    name="sangria_largura"
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentProduto.sangria_largura || ''}
                    onChange={handleInputChange}
                    placeholder="0,0"
                    className="mt-1 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  />
                </div>
                <div>
                  <Label htmlFor="sangria_altura" className="text-xs text-gray-600 dark:text-gray-400">
                    Altura c/ sangria (cm)
                  </Label>
                  <Input
                    id="sangria_altura"
                    name="sangria_altura"
                    type="number"
                    step="0.1"
                    min="0"
                    value={currentProduto.sangria_altura || ''}
                    onChange={handleInputChange}
                    placeholder="0,0"
                    className="mt-1 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  />
                </div>
              </div>
              {/* Preview visual */}
              {(currentProduto.tamanho_largura || currentProduto.tamanho_altura) && (currentProduto.sangria_largura || currentProduto.sangria_altura) && (
                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Tamanho:</span>{' '}
                  {currentProduto.tamanho_largura || '—'}cm × {currentProduto.tamanho_altura || '—'}cm
                  {' '}→{' '}
                  <span className="font-medium text-blue-600 dark:text-blue-400">Sangria:</span>{' '}
                  {currentProduto.sangria_largura || '—'}cm × {currentProduto.sangria_altura || '—'}cm
                </div>
              )}
            </div>
          </div>

          {/* ACABAMENTO */}
          <div>
            <Label htmlFor="acabamento" className="font-semibold">
              Acabamento
            </Label>
            <Textarea
              id="acabamento"
              name="acabamento"
              value={currentProduto.acabamento || ''}
              onChange={handleInputChange}
              placeholder="Ex: Laminação Fosca, Verniz Localizado, Corte Especial, Vinco, Dobra, Hot Stamping..."
              className="mt-1 min-h-[70px] resize-none"
              rows={2}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Descreva os tipos de acabamentos utilizados neste produto.
            </p>
          </div>

          {/* CMYK */}
          <div>
            <Label className="font-semibold">CMYK — Configuração de Cor</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
              Defina a configuração de impressão de cores do produto.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {CMYK_OPTIONS.map((opt) => {
                const isSelected = (currentProduto.cmyk || '4x0') === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer flex-1 transition-all duration-150
                      ${isSelected
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-border bg-card hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                  >
                    <input
                      type="radio"
                      name="cmyk"
                      value={opt.value}
                      checked={isSelected}
                      onChange={handleInputChange}
                      className="accent-primary h-4 w-4 shrink-0"
                    />
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        {opt.descricao}
                      </span>
                    </div>
                    {opt.value === '4x0' && (
                      <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                        Padrão
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProdutoTabDadosGerais;