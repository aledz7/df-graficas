import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProdutoForm from '@/components/produtos/ProdutoForm';
import { useToast } from '@/components/ui/use-toast';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { motion } from 'framer-motion';
import { PackagePlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productCategoryService } from '@/services/api';

const NovoProdutoPage = ({ vendedorAtual }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(true); // Abre o formulário diretamente
  const [categorias, setCategorias] = useState([]);

  const loadInitialData = useCallback(async () => {
    try {
      const response = await productCategoryService.getAll();
      setCategorias(response.data);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      toast({ title: "Erro ao carregar dados", description: "Não foi possível carregar as categorias de produtos do servidor.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSaveProduto = async (produtoData, cadastrarOutro = false) => {
    const produtos = safeJsonParse(await apiDataManager.getItem('produtos'), []);
    const novosProdutos = [...produtos, { ...produtoData, id: produtoData.id || `prod-${Date.now()}` }];
    await apiDataManager.setItem('produtos', novosProdutos);
    
    toast({ title: "Sucesso!", description: `Produto "${produtoData.nome}" cadastrado com sucesso.` });

    if (cadastrarOutro) {
      setIsModalOpen(false); // Fecha e reabre para resetar o form pelo ProdutoForm
      setTimeout(() => setIsModalOpen(true), 0);
    } else {
      setIsModalOpen(false);
      navigate('/cadastros/produtos'); // Volta para a lista de produtos
    }
  };

  const handleCloseForm = () => {
    setIsModalOpen(false);
    navigate('/cadastros/produtos');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
      <div className="flex items-center mb-6">
        <Button variant="outline" size="icon" className="mr-4" onClick={() => navigate('/cadastros/produtos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PackagePlus className="h-8 w-8 mr-3 text-primary" />
        <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Cadastrar Novo Produto</h1>
            <p className="text-muted-foreground">Preencha os campos abaixo para adicionar um novo produto ao sistema.</p>
        </div>
      </div>

      {isModalOpen && (
        <ProdutoForm
          produto={null} // Para garantir que é um novo produto
          onSave={handleSaveProduto}
          onClose={handleCloseForm}
          categorias={categorias}
          setCategorias={setCategorias}
          vendedorAtual={vendedorAtual}
          showSaveAndNewButton={true} // Prop para mostrar o botão "Salvar e Cadastrar Outro"
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

export default NovoProdutoPage;