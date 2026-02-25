import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

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

        {/* Seção de Visibilidade do Produto */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">📍 Visibilidade do Produto</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Defina onde este produto pode aparecer e ser utilizado no sistema.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="venda_pdv"
                checked={currentProduto.venda_pdv ?? true}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'venda_pdv',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                }}
              />
              <Label htmlFor="venda_pdv" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                ☑ Mostrar no PDV
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Produto aparece no sistema de venda balcão. Pode ser vendido diretamente no caixa e aparece na busca do PDV.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="venda_marketplace"
                checked={currentProduto.venda_marketplace ?? true}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'venda_marketplace',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                }}
              />
              <Label htmlFor="venda_marketplace" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                ☑ Mostrar no Marketplace
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Produto aparece na loja virtual. Visível ao cliente final e pode ser comprado online.
            </p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="uso_interno"
                checked={currentProduto.uso_interno ?? false}
                onCheckedChange={(checked) => {
                  handleInputChange({
                    target: {
                      name: 'uso_interno',
                      checked: checked,
                      type: 'checkbox'
                    }
                  });
                  // Se marcar uso interno, desmarcar automaticamente PDV e Marketplace
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
              />
              <Label htmlFor="uso_interno" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                ☑ Uso Interno (Balcão)
              </Label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
              Produto não aparece no PDV nem no Marketplace. Serve apenas para uso interno, custo por OS, controle de estoque, insumos e serviços internos.
            </p>
          </div>

          {/* Aviso quando uso interno está marcado */}
          {currentProduto.uso_interno && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ <strong>Produto de Uso Interno:</strong> Este produto não será exibido para clientes no PDV nem no Marketplace.
              </p>
            </div>
          )}

          {/* Aviso quando nenhum está marcado */}
          {!currentProduto.venda_pdv && !currentProduto.venda_marketplace && !currentProduto.uso_interno && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-xs text-red-800 dark:text-red-200">
                ⚠️ <strong>Atenção:</strong> Nenhuma opção de visibilidade está marcada. O produto ficará oculto de todas as vendas.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProdutoTabDadosGerais;