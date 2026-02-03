import React, { useState, useEffect } from 'react';
import { apiDataManager } from '../lib/apiDataManager';
import { dadosUsuarioService } from '../services/api';

const TestDataManagerPage = () => {
  const [testValue, setTestValue] = useState('');
  const [retrievedValue, setRetrievedValue] = useState('');
  const [apiDirectValue, setApiDirectValue] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testSetValue = async () => {
    try {
      addLog(`Testando setData com valor: ${testValue}`);
      await apiDataManager.setData('test_theme', testValue);
      addLog(`✅ setData concluído`);
    } catch (error) {
      addLog(`❌ Erro no setData: ${error.message}`);
    }
  };

  const testGetValue = async () => {
    try {
      addLog(`Testando getData...`);
      const value = await apiDataManager.getData('test_theme', 'default');
      setRetrievedValue(value);
      addLog(`✅ getData retornou: ${value}`);
    } catch (error) {
      addLog(`❌ Erro no getData: ${error.message}`);
    }
  };

  const testApiDirect = async () => {
    try {
      addLog(`Testando API diretamente...`);
      const value = await dadosUsuarioService.get('test_theme');
      setApiDirectValue(value);
      addLog(`✅ API direta retornou: ${value}`);
    } catch (error) {
      addLog(`❌ Erro na API direta: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testSequence = async () => {
    clearLogs();
    addLog('🚀 Iniciando teste completo...');
    
    // Definir valor
    setTestValue('light');
    await new Promise(resolve => setTimeout(resolve, 100));
    await testSetValue();
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Buscar via apiDataManager
    await testGetValue();
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Buscar diretamente da API
    await testApiDirect();
    
    addLog('🏁 Teste completo finalizado');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste do API Data Manager</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Valor de Teste:</label>
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Digite um valor para testar"
            />
          </div>
          
          <div className="space-y-2">
            <button
              onClick={testSetValue}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Testar setData
            </button>
            
            <button
              onClick={testGetValue}
              className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Testar getData
            </button>
            
            <button
              onClick={testApiDirect}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
            >
              Testar API Direta
            </button>
            
            <button
              onClick={testSequence}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
            >
              Teste Completo
            </button>
          </div>
          
          <div className="space-y-2">
            <div>
              <strong>Valor do apiDataManager:</strong> {retrievedValue || 'Nenhum'}
            </div>
            <div>
              <strong>Valor da API Direta:</strong> {apiDirectValue || 'Nenhum'}
            </div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Logs</h3>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              Limpar
            </button>
          </div>
          <div className="bg-gray-100 p-4 rounded-md h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Nenhum log ainda...</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h4 className="font-semibold text-yellow-800 mb-2">Como usar:</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Digite um valor no campo de teste (ex: "light", "dark")</li>
          <li>Clique em "Teste Completo" para executar a sequência completa</li>
          <li>Observe os logs para ver o que está acontecendo</li>
          <li>Compare os valores retornados pelo apiDataManager e pela API direta</li>
        </ol>
      </div>
    </div>
  );
};

export default TestDataManagerPage; 