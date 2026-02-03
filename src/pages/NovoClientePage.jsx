import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ClienteForm from '@/components/clientes/ClienteForm';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse } from '@/lib/utils';
import { motion } from 'framer-motion';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clienteService } from '@/services/api';

const NovoClientePage = ({ vendedorAtual }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(true); // Abre o formulário diretamente


  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveCliente = async (clienteData, cadastrarOutro = false) => {
    setIsSubmitting(true);
    try {
      // Remove campos vazios ou nulos
      const cleanData = Object.fromEntries(
        Object.entries(clienteData).filter(([_, v]) => v != null && v !== '')
      );

      const result = await clienteService.create(cleanData);
      
      // Verificar se o cliente foi salvo apenas localmente
      if (result._message) {
        // Cliente salvo apenas no localStorage
        toast({ 
          title: "Atenção", 
          description: `Cliente "${clienteData.nome_completo || clienteData.nome}" salvo localmente. ${result._message}`,
          variant: "warning"
        });
      } else {
        // Cliente salvo com sucesso no banco de dados
        toast({ 
          title: "Sucesso!", 
          description: `Cliente "${clienteData.nome_completo || clienteData.nome}" cadastrado com sucesso no banco de dados.` 
        });
      }
      
      if (cadastrarOutro) {
        // Reset form for next entry
        setIsModalOpen(false);
        setTimeout(() => {
          setIsModalOpen(true);
          setIsSubmitting(false);
        }, 0);
      } else {
        setIsModalOpen(false);
        navigate('/cadastros/clientes');
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      
      // Tratamento de erros específicos
      if (error.message && error.message.includes('autenticação')) {
        // Erro de autenticação
        toast({
          title: "Erro de Autenticação",
          description: error.message || "Sessão expirada. Por favor, faça login novamente.",
          variant: "destructive"
        });
        
        // Redirecionar para a página de login após um breve atraso
        setTimeout(() => {
          navigate('/login', { state: { from: location.pathname } });
        }, 2000);
      } else {
        // Outros erros
        toast({
          title: "Erro",
          description: error.response?.data?.message || error.message || "Ocorreu um erro ao salvar o cliente.",
          variant: "destructive"
        });
      }
      
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setIsModalOpen(false);
    navigate('/cadastros/clientes');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
       <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" className="mr-4" onClick={() => navigate('/cadastros/clientes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <UserPlus className="h-8 w-8 mr-3 text-primary" />
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Cadastrar Novo Cliente</h1>
            <p className="text-muted-foreground">Preencha os campos abaixo para adicionar um novo cliente ao sistema.</p>
        </div>
      </div>

      {isModalOpen && (
        <ClienteForm
          cliente={null} // Para garantir que é um novo cliente
          onSave={handleSaveCliente} 
          onCancel={handleCloseForm} 
          vendedorAtual={vendedorAtual}
          isSubmitting={isSubmitting}
        />
      )}
       {!isModalOpen && (
         <div className="text-center py-10">
            <p className="text-muted-foreground">O formulário de cadastro foi fechado.</p>
            <Button onClick={() => setIsModalOpen(true)} className="mt-4">Abrir Formulário Novamente</Button>
         </div>
       )}
    </motion.div>
  );
};

export default NovoClientePage;