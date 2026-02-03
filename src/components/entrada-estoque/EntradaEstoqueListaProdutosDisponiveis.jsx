import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle } from 'lucide-react';

const EntradaEstoqueListaProdutosDisponiveis = ({ filteredProdutos, handleAddItem }) => {
  return (
    <ScrollArea className="h-48 border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="w-24 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredProdutos.map(produto => (
            <TableRow key={produto.id}>
              <TableCell>
                <div className="font-medium">{produto.nome}</div>
                <div className="text-xs text-muted-foreground">Cód: {produto.codigo_produto} | Estoque: {produto.estoque}</div>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" onClick={() => handleAddItem(produto)}>
                  <PlusCircle className="mr-1 h-4 w-4" /> Add
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filteredProdutos.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center h-24">Nenhum produto encontrado.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};

export default EntradaEstoqueListaProdutosDisponiveis;