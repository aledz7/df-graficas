import React from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AcabamentosTable = ({ acabamentos, onEdit, onDelete, onToggleActive }) => {
  return (
    <>
      {/* Visualização em Cards para Mobile */}
      <div className="md:hidden space-y-4">
        {acabamentos.length > 0 ? (
          acabamentos.map((acab) => (
            <motion.div
              key={acab.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 ${!acab.ativo ? 'opacity-60' : ''}`}
            >
              <div className="space-y-3">
                {/* Nome e Status */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nome do Acabamento</p>
                    <p className="font-semibold text-base break-words">{acab.nome_acabamento}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={acab.ativo ? "success" : "secondary"}>
                      {acab.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <Switch
                      checked={acab.ativo}
                      onCheckedChange={() => onToggleActive(acab.id)}
                      aria-label={acab.ativo ? "Desativar" : "Ativar"}
                    />
                  </div>
                </div>

                {/* Produto Vinculado */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Produto Vinculado</p>
                  {acab.produto_vinculado_nome ? (
                    <>
                      <p className="text-sm font-medium break-words">{acab.produto_vinculado_nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Custo: R$ {parseFloat(acab.produto_vinculado_custo || 0).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum</p>
                  )}
                </div>

                {/* Valor de Venda */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valor</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {parseFloat(acab.valor || (acab.tipo_aplicacao === 'unidade' ? acab.valor_un : acab.valor_m2) || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {acab.tipo_aplicacao === 'fixo' ? 'Fixo' : 
                     acab.tipo_aplicacao === 'variável' ? 'Variável' :
                     acab.tipo_aplicacao === 'unidade' ? 'por unidade' : 
                     acab.tipo_aplicacao === 'metro_linear' ? 'por m linear' : 'por m²'}
                  </p>
                </div>

                {/* Valor Mínimo */}
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valor Mínimo</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    R$ {parseFloat(acab.valor_minimo || 0).toFixed(2)}
                  </p>
                </div>

                {/* Prazo Adicional */}
                {acab.prazo_adicional > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Prazo Adicional</p>
                    <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                      +{acab.prazo_adicional} {acab.prazo_adicional === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onEdit(acab)}
                      className="flex-1 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o acabamento "{acab.nome_acabamento}"? Esta ação não poderá ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(acab.id)} 
                            className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Nenhum acabamento encontrado.</p>
          </div>
        )}
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome/Tipo de Acabamento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Valor mínimo</TableHead>
              <TableHead className="text-center">Prazo Adicional</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {acabamentos.length > 0 ? (
              acabamentos.map(acab => (
                <TableRow key={acab.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${!acab.ativo ? 'opacity-60' : ''}`}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acab.cor_fundo || '#ffffff' }}></div>
                      <div>
                        <div>{acab.nome_acabamento}</div>
                        <div className="text-xs text-muted-foreground">
                          {acab.tipo_aplicacao === 'fixo' ? 'Fixo' : 
                           acab.tipo_aplicacao === 'variável' ? 'Variável' :
                           acab.tipo_aplicacao === 'area_total' ? 'Por m²' :
                           acab.tipo_aplicacao === 'metro_linear' ? 'Por m linear' :
                           acab.tipo_aplicacao === 'unidade' ? 'Unidade' : acab.tipo_aplicacao}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold">R$ {parseFloat(acab.valor || (acab.tipo_aplicacao === 'unidade' ? acab.valor_un : acab.valor_m2) || 0).toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm text-blue-600 dark:text-blue-400">R$ {parseFloat(acab.valor_minimo || 0).toFixed(2)}</div>
                  </TableCell>
                  <TableCell className="text-center">
                    {acab.prazo_adicional > 0 ? (
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        +{acab.prazo_adicional} {acab.prazo_adicional === 1 ? 'dia' : 'dias'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                     <Switch
                        checked={acab.ativo}
                        onCheckedChange={() => onToggleActive(acab.id)}
                        aria-label={acab.ativo ? "Desativar" : "Ativar"}
                      />
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(acab)} title="Editar">
                      <Edit size={16} className="text-blue-600" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Excluir">
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o acabamento "{acab.nome_acabamento}"? Esta ação não poderá ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(acab.id)} className="bg-destructive hover:bg-destructive/90">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhum acabamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default AcabamentosTable;