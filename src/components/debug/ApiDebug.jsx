import React, { useState } from 'react';
import { authService } from '@/services/api';

const ApiDebug = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const testApiConnection = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Teste 1: Verificar variáveis de ambiente
      addResult(`VITE_API_URL: ${import.meta.env.VITE_API_URL}`, 'info');
      addResult(`VITE_APP_ENV: ${import.meta.env.VITE_APP_ENV}`, 'info');

      // Teste 2: Testar conectividade básica
      addResult('Testando conectividade com a API...', 'info');
      
      const testUrl = `${import.meta.env.VITE_API_URL}/api/login`;
      addResult(`URL de teste: ${testUrl}`, 'info');

      // Teste 3: Tentar fazer uma requisição OPTIONS (CORS preflight)
      try {
        const corsResponse = await fetch(testUrl, {
          method: 'OPTIONS',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        addResult(`CORS preflight: ${corsResponse.status} ${corsResponse.statusText}`, 'success');
      } catch (error) {
        addResult(`Erro CORS: ${error.message}`, 'error');
      }

      // Teste 4: Tentar fazer login com credenciais inválidas
      try {
        const loginResponse = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@test.com',
            password: 'wrongpassword'
          })
        });

        const responseText = await loginResponse.text();
        addResult(`Login response status: ${loginResponse.status}`, 'info');
        addResult(`Login response headers: ${JSON.stringify(Object.fromEntries(loginResponse.headers.entries()))}`, 'info');
        
        if (responseText.includes('<!DOCTYPE html>')) {
          addResult('ERRO: API retornando HTML em vez de JSON', 'error');
          addResult(`Response preview: ${responseText.substring(0, 200)}...`, 'error');
        } else {
          addResult(`Response preview: ${responseText.substring(0, 200)}...`, 'info');
        }
      } catch (error) {
        addResult(`Erro na requisição de login: ${error.message}`, 'error');
      }

      // Teste 5: Verificar se o backend está acessível
      try {
        const healthResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        addResult(`Health check (/api/me): ${healthResponse.status}`, 'info');
      } catch (error) {
        addResult(`Erro no health check: ${error.message}`, 'error');
      }

    } catch (error) {
      addResult(`Erro geral: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Debug da API</h2>
      
      <button
        onClick={testApiConnection}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Testando...' : 'Testar Conexão com API'}
      </button>

      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded text-sm font-mono ${
              result.type === 'error' ? 'bg-red-100 text-red-800' :
              result.type === 'success' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="font-bold">{result.timestamp}</div>
            <div>{result.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApiDebug; 