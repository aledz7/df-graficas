import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import { apiDataManager } from '@/lib/apiDataManager';

const TestApiPage = () => {
  const { toast } = useToast();
  const [authStatus, setAuthStatus] = useState('Verificando...');
  const [apiStatus, setApiStatus] = useState('Não testado');
  const [token, setToken] = useState('Carregando...');

  useEffect(() => {
        const loadData = async () => {
    const loadInitialData = async () => {
      const storedToken = await apiDataManager.getItem('token') || 'Não encontrado';
      setToken(storedToken);
      checkAuthStatus();
    };
    loadInitialData();
  
        };
        
        loadData();
    }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/me');
      setAuthStatus(`Autenticado como: ${response.data.name} (${response.data.email})`);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setAuthStatus(`Não autenticado: ${error.response?.status || 'Erro desconhecido'} - ${error.message}`);
    }
  };

  const testApiConnection = async () => {
    try {
      setApiStatus('Testando...');
      const response = await api.get('/api/clientes');
      setApiStatus(`Sucesso! Recebidos ${response.data.data?.length || 0} clientes`);
      toast({
        title: 'API funcionando!',
        description: `Conexão bem-sucedida. Recebidos ${response.data.data?.length || 0} clientes.`
      });
    } catch (error) {
      console.error('Erro ao testar API:', error);
      setApiStatus(`Falha: ${error.response?.status || 'Erro desconhecido'} - ${error.message}`);
      toast({
        title: 'Erro na API',
        description: `Status: ${error.response?.status || 'Desconhecido'} - ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const testCreateClient = async () => {
    try {
      setApiStatus('Criando cliente de teste...');
      const testClient = {
        nome_completo: `Cliente Teste ${new Date().toISOString()}`,
        email: `teste_${Date.now()}@example.com`,
        telefone_principal: '(11) 99999-9999'
      };
      
      const response = await api.post('/api/clientes', testClient);
      setApiStatus(`Cliente criado com sucesso! ID: ${response.data.id || response.data.data?.id || 'N/A'}`);
      toast({
        title: 'Cliente criado!',
        description: `ID: ${response.data.id || response.data.data?.id || 'N/A'}`
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      setApiStatus(`Falha ao criar: ${error.response?.status || 'Erro desconhecido'} - ${error.message}`);
      toast({
        title: 'Erro ao criar cliente',
        description: `Status: ${error.response?.status || 'Desconhecido'} - ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Teste de API e Autenticação</h1>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Status da Autenticação</h2>
        <p className="mb-2">{authStatus}</p>
        <p className="mb-4"><strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'Não encontrado'}</p>
        <Button onClick={checkAuthStatus}>Verificar Novamente</Button>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Teste de Conexão API</h2>
        <p className="mb-4">{apiStatus}</p>
        <div className="flex gap-4">
          <Button onClick={testApiConnection}>Testar Conexão</Button>
          <Button onClick={testCreateClient} variant="outline">Criar Cliente Teste</Button>
        </div>
      </div>
    </div>
  );
};

export default TestApiPage;
