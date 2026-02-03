import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useValidationError } from '@/hooks/useValidationError';

/**
 * Componente de exemplo que demonstra como usar os novos utilitários de tratamento de erro
 */
const ErrorHandlingExample = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: ''
  });
  
  const { showError, showValidationError, showGenericError } = useValidationError();

  // Simular erro de validação
  const simulateValidationError = () => {
    const mockError = {
      response: {
        status: 422,
        data: {
          success: false,
          message: 'Erro de validação',
          errors: {
            name: ['The name field is required.'],
            email: ['The email field must be a valid email address.'],
            cpf: ['The cpf field must be a valid CPF.']
          }
        }
      }
    };
    
    showError(mockError, 'Erro ao processar formulário');
  };

  // Simular erro genérico
  const simulateGenericError = () => {
    const mockError = {
      message: 'Erro de conexão com o servidor'
    };
    
    showError(mockError, 'Erro inesperado');
  };

  // Simular apenas erro de validação
  const simulateOnlyValidationError = () => {
    const mockError = {
      response: {
        status: 422,
        data: {
          errors: {
            email: ['The email field is required.']
          }
        }
      }
    };
    
    showValidationError(mockError);
  };

  // Simular apenas erro genérico
  const simulateOnlyGenericError = () => {
    const mockError = {
      message: 'Falha na autenticação'
    };
    
    showGenericError(mockError, 'Erro de autenticação');
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo de Tratamento de Erros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite seu nome"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Digite seu e-mail"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="Digite seu CPF"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Button 
              onClick={simulateValidationError}
              variant="outline"
              className="w-full"
            >
              Simular Erro de Validação
            </Button>
            
            <Button 
              onClick={simulateGenericError}
              variant="outline"
              className="w-full"
            >
              Simular Erro Genérico
            </Button>
            
            <Button 
              onClick={simulateOnlyValidationError}
              variant="outline"
              className="w-full"
            >
              Apenas Erro de Validação
            </Button>
            
            <Button 
              onClick={simulateOnlyGenericError}
              variant="outline"
              className="w-full"
            >
              Apenas Erro Genérico
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">1. Importar o hook:</h4>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`import { useValidationError } from '@/hooks/useValidationError';`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">2. Usar no componente:</h4>
            <pre className="bg-gray-100 p-2 rounded text-sm">
{`const { showError } = useValidationError();

// No catch do try/catch:
} catch (error) {
  showError(error, 'Mensagem padrão para outros erros');
}`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">3. Funções disponíveis:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>showError(error, defaultMessage)</code> - Exibe qualquer tipo de erro</li>
              <li><code>showValidationError(error)</code> - Exibe apenas erros de validação</li>
              <li><code>showGenericError(error, defaultMessage)</code> - Exibe apenas outros erros</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorHandlingExample;
