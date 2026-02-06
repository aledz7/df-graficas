import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2, UserCheck, UserX, Eye, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <ScrollArea className="h-full flex-grow">
      {filteredClientes.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <Eye size={48} className="mb-4" />
          <p className="text-lg">Nenhum cliente encontrado.</p>
          {searchTerm && <p>Tente um termo de busca diferente.</p>}
        </div>
      )}
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
                  <h3 className="text-sm font-semibold text-primary truncate" title={cliente.nome_completo || cliente.nome}>{cliente.nome_completo || cliente.nome}</h3>
                  <p className="text-xs text-muted-foreground truncate" title={cliente.telefone_principal}>Tel: {cliente.telefone_principal || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground truncate" title={cliente.email}>Email: {cliente.email || 'N/A'}</p>
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
    </ScrollArea>
  );
};

export default ClienteList;