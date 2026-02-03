import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ProdutoTabDadosGerais = ({ currentProduto, handleInputChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Gerais do Produto</CardTitle>
        <CardDescription>Informações básicas e identificação do produto.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  );
};

export default ProdutoTabDadosGerais;