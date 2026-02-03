import { useState, useEffect, createContext, useContext } from 'react';
import { empresaService } from '@/services/api';
import { apiDataManager } from '@/lib/apiDataManager';

const NomeSistemaContext = createContext();

export const NomeSistemaProvider = ({ children }) => {
  const [nomeSistema, setNomeSistema] = useState('Jet Impre');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarNomeSistema = async () => {
      try {
        // Verificar se estamos em uma rota pública (sem token de autenticação)
        const token = apiDataManager.getToken();
        
        if (!token) {
          // Em rotas públicas, usar valor do localStorage ou padrão
          const nomeSalvo = await apiDataManager.getItem('nomeSistema') || 'Jet Impre';
          setNomeSistema(nomeSalvo);
          setLoading(false);
          return;
        }

        // Em rotas protegidas, carregar da API da empresa
        const response = await empresaService.get();
        const nome = response.data.data?.nome_sistema || 'Jet Impre';
        setNomeSistema(nome);
        
        // Salvar no localStorage para uso em rotas públicas (apenas a string, não o objeto)
        await apiDataManager.setItem('nomeSistema', nome);
      } catch (error) {
        console.error('❌ [useNomeSistema] Erro ao carregar nome do sistema:', error);
        // Em caso de erro, usar valor do localStorage ou padrão
        const nomeSalvo = await apiDataManager.getItem('nomeSistema') || 'Jet Impre';
        setNomeSistema(nomeSalvo);
      } finally {
        setLoading(false);
      }
    };

    carregarNomeSistema();
  }, []);

  const atualizarNomeSistema = async (novoNome) => {
    try {
      // Verificar se estamos em uma rota protegida
      const token = apiDataManager.getToken();
      
      if (!token) {
        // Em rotas públicas, apenas salvar no localStorage
        await apiDataManager.setItem('nomeSistema', novoNome);
        setNomeSistema(novoNome);
        return { success: true };
      }

      // Em rotas protegidas, atualizar na API da empresa
      await empresaService.update({ nome_sistema: novoNome });
      setNomeSistema(novoNome);
      
      // Salvar no localStorage para uso em rotas públicas
      await apiDataManager.setItem('nomeSistema', novoNome);
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar nome do sistema:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <NomeSistemaContext.Provider value={{ 
      nomeSistema, 
      loading, 
      atualizarNomeSistema 
    }}>
      {children}
    </NomeSistemaContext.Provider>
  );
};

export const useNomeSistema = () => {
  const context = useContext(NomeSistemaContext);
  if (!context) {
    throw new Error('useNomeSistema deve ser usado dentro de um NomeSistemaProvider');
  }
  return context;
}; 