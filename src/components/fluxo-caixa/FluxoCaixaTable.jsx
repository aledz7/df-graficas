import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, Edit2, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const formatCurrency = (value) => `R$ ${parseFloat(value || 0).toFixed(2).replace('.', ',')}`;

const FluxoCaixaTable = ({ lancamentos = [], dataSelecionada, onEdit, onDelete, isLoading = false }) => {
  // Garantir que lancamentos seja sempre um array
  const lancamentosArray = Array.isArray(lancamentos) ? lancamentos : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lançamentos do Dia: {dataSelecionada ? format(dataSelecionada, 'dd/MM/yyyy') : 'Nenhuma data selecionada'}</CardTitle>
        <CardDescription>Lista de todas as movimentações financeiras no dia selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Carregando lançamentos...</span>
          </div>
        ) : (
          <>
            {/* Layout Mobile - Cards */}
            <div className="md:hidden">
              {lancamentosArray.length > 0 ? (
                <div className="space-y-3">
                  {lancamentosArray.map((lancamento) => (
                    <motion.div
                      key={lancamento.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm break-words">{lancamento.descricao}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {lancamento.tipo === 'entrada' ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                                Entrada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                                Saída
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {lancamento.categoria_nome}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-3">
                          <p className={`text-lg font-bold ${lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(lancamento.valor)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Data/Hora</p>
                            <p className="text-sm">{format(parseISO(lancamento.created_at), 'dd/MM/yy HH:mm')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Forma Pagamento</p>
                            <p className="text-sm">{lancamento.forma_pagamento || '-'}</p>
                          </div>
                        </div>
                        
                        {!lancamento.isVenda && !lancamento.isContaPaga && !lancamento.isContaRecebida && !lancamento.isSuprimento && !lancamento.isSangria && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => onEdit(lancamento)} 
                              className="text-blue-500 hover:text-blue-700 flex-1"
                            >
                              <Edit2 size={14} className="mr-1"/>
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => onDelete(lancamento.id)} 
                              className="text-red-500 hover:text-red-700 flex-1"
                            >
                              <Trash2 size={14} className="mr-1"/>
                              Excluir
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowUpCircle size={48} className="mx-auto mb-4 text-muted-foreground/50" />
                  <p>Nenhum lançamento encontrado para os filtros aplicados neste dia.</p>
                </div>
              )}
            </div>

            {/* Layout Desktop - Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Forma Pag.</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosArray.length > 0 ? (
                    lancamentosArray.map((lancamento) => (
                      <TableRow key={lancamento.id}>
                        <TableCell>{format(parseISO(lancamento.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                        <TableCell>{lancamento.descricao}</TableCell>
                        <TableCell>
                          {lancamento.tipo === 'entrada' ? (
                            <span className="flex items-center text-green-600"><ArrowUpCircle className="mr-1 h-4 w-4" /> Entrada</span>
                          ) : (
                            <span className="flex items-center text-red-600"><ArrowDownCircle className="mr-1 h-4 w-4" /> Saída</span>
                          )}
                        </TableCell>
                        <TableCell>{lancamento.categoria_nome}</TableCell>
                        <TableCell>{lancamento.forma_pagamento || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(lancamento.valor)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!lancamento.isVenda && !lancamento.isContaPaga && !lancamento.isContaRecebida && !lancamento.isSuprimento && !lancamento.isSangria && ( 
                            <>
                              <Button variant="ghost" size="icon" onClick={() => onEdit(lancamento)} className="text-blue-500 hover:text-blue-700 mr-1">
                                <Edit2 size={16}/>
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => onDelete(lancamento.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16}/>
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        Nenhum lançamento encontrado para os filtros aplicados neste dia.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default FluxoCaixaTable;