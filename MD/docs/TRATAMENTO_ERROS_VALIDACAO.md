# Sistema de Tratamento de Erros de Validação

Este documento descreve o novo sistema implementado para melhorar a exibição de erros de validação no frontend.

## Problema Anterior

Antes da implementação, os erros de validação eram exibidos de forma genérica:

```json
{
  "success": false,
  "message": "Erro de validação",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

Isso resultava em mensagens pouco amigáveis para o usuário.

## Solução Implementada

### 1. Utilitários de Erro (`src/lib/errorUtils.js`)

Criamos um conjunto de funções utilitárias para:

- **Traduzir mensagens de erro** do inglês para português
- **Mapear nomes de campos** para versões mais amigáveis
- **Formatar erros** para exibição em componentes React
- **Detectar tipos de erro** (validação vs outros)

#### Funções Principais:

- `formatValidationErrors(errors)` - Formata erros para exibição
- `createErrorComponent(errors)` - Cria componente React para exibir erros
- `isValidationError(error)` - Verifica se é erro de validação
- `extractValidationErrors(error)` - Extrai erros de validação

### 2. Hook Personalizado (`src/hooks/useValidationError.js`)

Hook que facilita o uso dos utilitários:

```javascript
import { useValidationError } from '@/hooks/useValidationError';

const { showError } = useValidationError();

// No catch:
} catch (error) {
  showError(error, 'Mensagem padrão para outros erros');
}
```

#### Funções Disponíveis:

- `showError(error, defaultMessage)` - Exibe qualquer tipo de erro
- `showValidationError(error)` - Exibe apenas erros de validação
- `showGenericError(error, defaultMessage)` - Exibe apenas outros erros

## Como Usar

### 1. Em Componentes de Formulário

```javascript
import { useValidationError } from '@/hooks/useValidationError';

const MeuFormulario = () => {
  const { showError } = useValidationError();

  const handleSubmit = async (data) => {
    try {
      await api.post('/api/endpoint', data);
      // Sucesso
    } catch (error) {
      showError(error, 'Erro ao salvar dados');
    }
  };
};
```

### 2. Exemplo de Uso Avançado

```javascript
const { showError, showValidationError, showGenericError } = useValidationError();

try {
  await api.post('/api/endpoint', data);
} catch (error) {
  // Opção 1: Tratar todos os tipos de erro
  showError(error, 'Erro ao processar solicitação');
  
  // Opção 2: Tratar apenas erros de validação
  showValidationError(error);
  
  // Opção 3: Tratar apenas outros erros
  showGenericError(error, 'Erro inesperado');
}
```

## Mapeamento de Campos

O sistema inclui mapeamento automático de campos para nomes mais amigáveis:

```javascript
const fieldLabels = {
  'nome_completo': 'Nome Completo',
  'email': 'E-mail',
  'cpf_cnpj': 'CPF/CNPJ',
  'telefone_principal': 'Telefone Principal',
  // ... mais campos
};
```

## Tradução de Mensagens

Mensagens de erro são automaticamente traduzidas:

```javascript
const errorMessageTranslations = {
  'The :attribute field is required.': 'O campo :attribute é obrigatório.',
  'The :attribute field must be a valid email address.': 'O campo :attribute deve ser um e-mail válido.',
  // ... mais traduções
};
```

## Exemplo de Saída

### Antes:
```
The email field is required.
```

### Depois:
```
• E-mail: O campo E-mail é obrigatório.
```

## Componentes Atualizados

Os seguintes componentes já foram atualizados para usar o novo sistema:

- ✅ `ClienteForm` - Formulário de clientes
- ✅ `FuncionarioFormModal` - Formulário de funcionários

## Como Adicionar Novos Campos

### 1. Adicionar Mapeamento de Campo

Em `src/lib/errorUtils.js`, adicione ao objeto `fieldLabels`:

```javascript
const fieldLabels = {
  // ... campos existentes
  'novo_campo': 'Nome Amigável do Campo',
};
```

### 2. Adicionar Tradução de Mensagem

Se necessário, adicione ao objeto `errorMessageTranslations`:

```javascript
const errorMessageTranslations = {
  // ... traduções existentes
  'The :attribute field must be unique.': 'O campo :attribute já está em uso.',
};
```

## Benefícios

1. **Experiência do Usuário Melhorada** - Mensagens claras e em português
2. **Consistência** - Padrão único para todos os formulários
3. **Manutenibilidade** - Centralizado em um local
4. **Flexibilidade** - Fácil de customizar e estender
5. **Reutilização** - Hook pode ser usado em qualquer componente

## Testando

Para testar o sistema, você pode usar o componente de exemplo:

```javascript
import ErrorHandlingExample from '@/components/examples/ErrorHandlingExample';
```

Este componente demonstra todas as funcionalidades do sistema de tratamento de erros.

## Próximos Passos

1. Atualizar outros formulários para usar o novo sistema
2. Adicionar mais traduções conforme necessário
3. Considerar internacionalização para outros idiomas
4. Implementar validação no frontend para feedback mais rápido
