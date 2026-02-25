import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, UserCheck, UserX, Eye, UserCircle2, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

// Função para formatar data e hora
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

const ClienteList = ({ clientes, searchTerm, handleEditCliente, handleDeleteCliente, canEdit = true, canDelete = true }) => {
  const filteredClientes = clientes.filter(c => {
    const term = searchTerm ? searchTerm.toLowerCase() : "";
    return (
      (c.nome_completo?.toLowerCase() || c.nome?.toLowerCase() || '').includes(term) ||
      (c.apelido_fantasia?.toLowerCase() || '').includes(term) ||
      (c.codigo_cliente?.toLowerCase() || '').includes(term) ||
      (c.cpf_cnpj?.toLowerCase() || '').includes(term) ||
      (c.email?.toLowerCase() || '').includes(term) ||
      (c.telefone_principal?.toLowerCase() || '').includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Visualização em Cards para Mobile */}
      <div className="md:hidden">
        <ScrollArea className="h-[calc(100vh-22rem)]">
          {filteredClientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 py-10">
              <Eye size={48} className="mb-4" />
              <p className="text-lg">Nenhum cliente encontrado.</p>
              {searchTerm && <p>Tente um termo de busca diferente.</p>}
            </div>
          ) : (
            <div className="space-y-2 pr-2">
              {filteredClientes.map((cliente, index) => (
                <motion.div
                  key={cliente.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow duration-200 dark:bg-gray-800">
                    <CardContent className="p-3 flex items-center space-x-3">
                      {cliente.foto_url ? (
                        <img 
                          alt={cliente.nome_completo || cliente.nome} 
                          src={`${import.meta.env.VITE_API_URL || ''}/storage/${cliente.foto_url}`} 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle2 size={48} className="text-muted-foreground shrink-0"/>
                      )}
                      <div className="flex-grow overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-primary truncate" title={cliente.nome_completo || cliente.nome}>
                            {cliente.nome_completo || cliente.nome}
                          </h3>
                          {cliente.codigo_cliente && (
                            <Badge variant="outline" className="text-xs">
                              {cliente.codigo_cliente}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={cliente.telefone_principal}>
                          Tel: {cliente.telefone_principal || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={cliente.email}>
                          Email: {cliente.email || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cadastro: {formatDateTime(cliente.created_at)}
                        </p>
                        <div className="flex items-center pt-1">
                          {cliente.status ? (
                            <UserCheck size={14} className="text-green-500 mr-1" />
                          ) : (
                            <UserX size={14} className="text-red-500 mr-1" />
                          )}
                          <span className={`text-xs font-medium ${cliente.status ? 'text-green-600' : 'text-red-600'}`}>
                            {cliente.status ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-1 items-end shrink-0">
                        {canEdit && (
                          <Button variant="outline" size="xs" onClick={() => handleEditCliente(cliente)} className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white">
                            <Eye size={12} className="mr-1" /> Ver
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="outline" size="xs" onClick={() => handleEditCliente(cliente)} className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white">
                            <Edit size={12} className="mr-1" /> Editar
                          </Button>
                        )}
                        {canDelete && cliente.id !== 'cli1' && (
                          <Button variant="outline" size="xs" onClick={() => handleDeleteCliente(cliente.id)} className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white">
                            <Trash2 size={12} className="mr-1" /> Excluir
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Visualização em Tabela para Desktop */}
      <div className="hidden md:block border rounded-md bg-white dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>NOME</TableHead>
              <TableHead>CONTATO</TableHead>
              <TableHead>CIDADE/UF</TableHead>
              <TableHead>DT CONTA</TableHead>
              <TableHead>STATUS/PEDIDOS</TableHead>
              <TableHead className="text-right">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <Eye size={48} className="mb-4 opacity-50" />
                    <p className="text-lg">Nenhum cliente encontrado.</p>
                    {searchTerm && <p>Tente um termo de busca diferente.</p>}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredClientes.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="font-medium">
                    {cliente.codigo_cliente ? `#${cliente.codigo_cliente}` : `#${cliente.id}`}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cliente.nome_completo || cliente.nome}</div>
                      {cliente.cpf_cnpj && (
                        <div className="text-xs text-muted-foreground">
                          {cliente.tipo_pessoa === 'Pessoa Jurídica' ? 'CNPJ' : 'CPF'}: {cliente.cpf_cnpj}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{cliente.email || '-'}</div>
                      <div className="text-xs text-muted-foreground">
                        {cliente.telefone_principal || '-'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{cliente.cidade || '-'}</div>
                      <div className="text-xs text-muted-foreground">{cliente.uf || '-'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(cliente.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {cliente.status ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck size={12} className="mr-1" />
                          Status: Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <UserX size={12} className="mr-1" />
                          Status: Inativo
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditCliente(cliente)}
                          title="Visualizar/Editar cliente"
                          className="h-8 w-8"
                        >
                          <Eye size={16} className="text-blue-600" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditCliente(cliente)}
                          title="Editar cliente"
                          className="h-8 w-8"
                        >
                          <List size={16} className="text-gray-600" />
                        </Button>
                      )}
                      {canEdit && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditCliente(cliente)}
                          title="Abrir cadastro completo"
                          className="h-8 w-8"
                        >
                          <UserCircle2 size={16} className="text-primary" />
                        </Button>
                      )}
                      {canDelete && cliente.id !== 'cli1' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteCliente(cliente.id)}
                          title="Excluir cliente"
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClienteList;