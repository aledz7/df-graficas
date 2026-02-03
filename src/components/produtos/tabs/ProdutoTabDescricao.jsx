import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

const ProdutoTabDescricao = ({ currentProduto, handleInputChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Descrição Detalhada</CardTitle>
        <CardDescription>Forneça mais detalhes sobre o produto. Isso pode aparecer no catálogo público ou PDV.</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <Label htmlFor="descricao_curta">Descrição Curta / Chamada (Opcional)</Label>
          <Input
            id="descricao_curta"
            name="descricao_curta"
            value={currentProduto.descricao_curta || ''}
            onChange={handleInputChange}
            placeholder="Ex: Ideal para presentes, 100% algodão"
            className="mt-1"
          />
        </div>
        <div className="mt-4">
          <Label htmlFor="descricao_longa">Descrição Completa (Opcional)</Label>
          <Textarea
            id="descricao_longa"
            name="descricao_longa"
            value={currentProduto.descricao_longa || ''}
            onChange={handleInputChange}
            placeholder="Detalhe todas as características, benefícios e diferenciais do produto aqui..."
            className="mt-1 min-h-[120px]"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ProdutoTabDescricao;