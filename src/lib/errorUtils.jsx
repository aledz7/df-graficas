import React from 'react';

/**
 * Utilitários para tratamento de erros de validação
 */

// Mapeamento de campos para nomes amigáveis
const fieldLabels = {
  // Clientes
  'nome_completo': 'Nome Completo',
  'nome': 'Nome',
  'email': 'E-mail',
  'cpf_cnpj': 'CPF/CNPJ',
  'telefone_principal': 'Telefone Principal',
  'whatsapp': 'WhatsApp',
  'cep': 'CEP',
  'logradouro': 'Logradouro',
  'numero': 'Número',
  'complemento': 'Complemento',
  'bairro': 'Bairro',
  'cidade': 'Cidade',
  'estado': 'Estado',
  'tipo_pessoa': 'Tipo de Pessoa',
  'rg_ie': 'RG/IE',
  'data_nascimento_abertura': 'Data de Nascimento/Abertura',
  'sexo': 'Sexo',
  'observacoes': 'Observações',
  'autorizado_prazo': 'Autorizado a Prazo',
  'status': 'Status',
  'classificacao_cliente': 'Classificação do Cliente',
  'desconto_fixo_os_terceirizado': 'Desconto Fixo OS Terceirizado',
  
  // Funcionários/Users
  'name': 'Nome',
  'password': 'Senha',
  'password_confirmation': 'Confirmação de Senha',
  'data_nascimento': 'Data de Nascimento',
  'cpf': 'CPF',
  'rg': 'RG',
  'emissor_rg': 'Emissor do RG',
  'endereco': 'Endereço',
  'cargo': 'Cargo',
  'telefone': 'Telefone',
  'celular': 'Celular',
  'comissao_dropshipping': 'Comissão Dropshipping',
  'comissao_servicos': 'Comissão Serviços',
  'permite_receber_comissao': 'Permite Receber Comissão',
  'salario_base': 'Salário Base',
  'vales': 'Vales',
  'faltas': 'Faltas',
  'permissions': 'Permissões',
  'login': 'Login',
  'senha': 'Senha',
  'foto_url': 'Foto',
  'is_admin': 'Administrador',
  'ativo': 'Ativo',
  'theme': 'Tema',
  
  // Produtos
  'codigo_produto': 'Código do Produto',
  'nome': 'Nome',
  'descricao_curta': 'Descrição Curta',
  'descricao_longa': 'Descrição Longa',
  'categoria_id': 'Categoria',
  'subcategoria_id': 'Subcategoria',
  'preco_custo': 'Preço de Custo',
  'preco_venda': 'Preço de Venda',
  'estoque': 'Estoque',
  'estoque_minimo': 'Estoque Mínimo',
  'unidade_medida': 'Unidade de Medida',
  'tipo_produto': 'Tipo de Produto',
  'localizacao': 'Localização',
  'codigo_barras': 'Código de Barras',
  'margem_lucro': 'Margem de Lucro',
  'permite_comissao': 'Permite Comissão',
  'percentual_comissao': 'Percentual de Comissão',
  
  // Ordem de Serviço
  'cliente_id': 'Cliente',
  'vendedor_id': 'Vendedor',
  'responsavel_id': 'Responsável',
  'data_criacao': 'Data de Criação',
  'data_finalizacao': 'Data de Finalização',
  'data_entrega': 'Data de Entrega',
  'valor_total_os': 'Valor Total',
  'status_os': 'Status',
  'observacoes_gerais_os': 'Observações Gerais',
  'status_pagamento': 'Status do Pagamento',
  'forma_pagamento': 'Forma de Pagamento',
  'parcelas': 'Parcelas',
  
  // Vendas
  'cliente_nome': 'Nome do Cliente',
  'total': 'Total',
  'data_emissao': 'Data de Emissão',
  'data_venda': 'Data da Venda',
  'tipo': 'Tipo',
  'status_pagamento': 'Status do Pagamento',
  'observacoes': 'Observações',
  
  // Geral
  'tenant_id': 'Tenant ID',
  'created_at': 'Data de Criação',
  'updated_at': 'Data de Atualização',
  'deleted_at': 'Data de Exclusão',
};

// Mapeamento de mensagens de erro para versões mais amigáveis
const errorMessageTranslations = {
  'The :attribute field is required.': 'O campo :attribute é obrigatório.',
  'The :attribute field must be a valid email address.': 'O campo :attribute deve ser um e-mail válido.',
  'The :attribute field must be a string.': 'O campo :attribute deve ser um texto.',
  'The :attribute field must be a number.': 'O campo :attribute deve ser um número.',
  'The :attribute field must be an integer.': 'O campo :attribute deve ser um número inteiro.',
  'The :attribute field must be between :min and :max.': 'O campo :attribute deve estar entre :min e :max.',
  'The :attribute field must be at least :min characters.': 'O campo :attribute deve ter pelo menos :min caracteres.',
  'The :attribute field may not be greater than :max characters.': 'O campo :attribute não pode ter mais que :max caracteres.',
  'The :attribute field must be unique.': 'O campo :attribute já está em uso.',
  'The :attribute field must be a valid date.': 'O campo :attribute deve ser uma data válida.',
  'The :attribute field must be a valid URL.': 'O campo :attribute deve ser uma URL válida.',
  'The :attribute field must be confirmed.': 'O campo :attribute deve ser confirmado.',
  'The :attribute field does not match.': 'O campo :attribute não confere.',
  'The :attribute field must be accepted.': 'O campo :attribute deve ser aceito.',
  'The :attribute field must be a boolean.': 'O campo :attribute deve ser verdadeiro ou falso.',
  'The :attribute field must be an array.': 'O campo :attribute deve ser uma lista.',
  'The :attribute field must be a file.': 'O campo :attribute deve ser um arquivo.',
  'The :attribute field must be an image.': 'O campo :attribute deve ser uma imagem.',
  'The :attribute field must be a valid image.': 'O campo :attribute deve ser uma imagem válida.',
  'The :attribute field must be a valid mime type.': 'O campo :attribute deve ser um tipo de arquivo válido.',
  'The :attribute field must be a valid phone number.': 'O campo :attribute deve ser um telefone válido.',
  'The :attribute field must be a valid CPF.': 'O campo :attribute deve ser um CPF válido.',
  'The :attribute field must be a valid CNPJ.': 'O campo :attribute deve ser um CNPJ válido.',
  'The :attribute field must be a valid CEP.': 'O campo :attribute deve ser um CEP válido.',
  'The :attribute field must be a valid RG.': 'O campo :attribute deve ser um RG válido.',
  'The :attribute field must be a valid credit card number.': 'O campo :attribute deve ser um número de cartão válido.',
  'The :attribute field must be a valid credit card expiry date.': 'O campo :attribute deve ser uma data de validade válida.',
  'The :attribute field must be a valid credit card CVV.': 'O campo :attribute deve ser um CVV válido.',
};

/**
 * Traduz uma mensagem de erro
 * @param {string} message - Mensagem original
 * @param {string} field - Nome do campo
 * @returns {string} - Mensagem traduzida
 */
function translateErrorMessage(message, field) {
  let translatedMessage = errorMessageTranslations[message] || message;
  
  // Substituir :attribute pelo nome do campo
  const fieldLabel = fieldLabels[field] || field;
  translatedMessage = translatedMessage.replace(/:attribute/g, fieldLabel);
  
  return translatedMessage;
}

/**
 * Formata erros de validação para exibição amigável
 * @param {Object} errors - Objeto de erros do backend
 * @returns {Object} - Objeto formatado com erros traduzidos
 */
export function formatValidationErrors(errors) {
  if (!errors || typeof errors !== 'object') {
    return {};
  }

  const formattedErrors = {};
  
  Object.entries(errors).forEach(([field, messages]) => {
    if (Array.isArray(messages)) {
      formattedErrors[field] = messages.map(message => 
        translateErrorMessage(message, field)
      );
    } else if (typeof messages === 'string') {
      formattedErrors[field] = [translateErrorMessage(messages, field)];
    } else {
      formattedErrors[field] = [messages];
    }
  });
  
  return formattedErrors;
}

/**
 * Cria uma mensagem de erro formatada para toast
 * @param {Object} errors - Objeto de erros do backend
 * @returns {string} - Mensagem formatada
 */
export function createErrorMessage(errors) {
  const formattedErrors = formatValidationErrors(errors);
  
  if (Object.keys(formattedErrors).length === 0) {
    return 'Ocorreu um erro de validação.';
  }
  
  const errorMessages = Object.entries(formattedErrors)
    .map(([field, messages]) => {
      const fieldLabel = fieldLabels[field] || field;
      return messages.map(msg => `• ${fieldLabel}: ${msg}`);
    })
    .flat();
  
  return errorMessages.join('\n');
}

/**
 * Cria um componente React para exibir erros de validação
 * @param {Object} errors - Objeto de erros do backend
 * @returns {JSX.Element} - Componente React
 */
export function createErrorComponent(errors) {
  const formattedErrors = formatValidationErrors(errors);
  
  if (Object.keys(formattedErrors).length === 0) {
    return (
      <div className="space-y-2">
        <p>Ocorreu um erro de validação.</p>
      </div>
    );
  }
  
  const errorMessages = Object.entries(formattedErrors)
    .map(([field, messages]) => {
      const fieldLabel = fieldLabels[field] || field;
      return messages.map(msg => `• ${fieldLabel}: ${msg}`);
    })
    .flat();
  
  return (
    <div className="space-y-2">
      <p>Por favor, corrija os seguintes erros:</p>
      <div className="text-sm bg-red-50 p-2 rounded border border-red-200 max-h-40 overflow-y-auto">
        {errorMessages.map((msg, i) => (
          <p key={i} className="text-red-700 text-xs">{msg}</p>
        ))}
      </div>
    </div>
  );
}

/**
 * Verifica se um erro é de validação
 * @param {Object} error - Objeto de erro
 * @returns {boolean} - True se for erro de validação
 */
export function isValidationError(error) {
  return error?.response?.status === 422 || 
         error?.isValidationError ||
         (error?.response?.data?.errors && Object.keys(error.response.data.errors).length > 0);
}

/**
 * Extrai erros de validação de um erro
 * @param {Object} error - Objeto de erro
 * @returns {Object} - Objeto de erros de validação
 */
export function extractValidationErrors(error) {
  if (error?.response?.data?.errors) {
    return error.response.data.errors;
  }
  
  if (error?.validationErrors) {
    return error.validationErrors;
  }
  
  return {};
}
