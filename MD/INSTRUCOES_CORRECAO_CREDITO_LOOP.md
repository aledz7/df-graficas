# Instruções para Correção dos Problemas Identificados

## Problema 1: Cliente Bloqueado para Crediário

### Descrição
O cliente está aparecendo como "não autorizado" para crediário mesmo quando deveria estar autorizado.

### Causa Identificada
O problema está na forma como os dados são acessados no frontend. A API retorna os dados no formato:
```json
{
  "success": true,
  "message": "Operação realizada com sucesso",
  "data": { ... dados do cliente ... }
}
```

Mas o frontend estava tentando acessar `cliente.autorizado_prazo` quando deveria acessar `cliente.data.autorizado_prazo`.

### Correção Aplicada
✅ **Frontend corrigido** - O componente `OSPagamentoModal.jsx` foi atualizado para extrair corretamente os dados do cliente da resposta da API.

### Logs Adicionados
✅ **Logs de debug adicionados** - Agora o console mostrará informações detalhadas sobre:
- Dados recebidos da API
- Valor do campo `autorizado_prazo`
- Tipo de dados do campo
- Comparações booleanas
- Status final de autorização

### Como Testar
1. Abra o modal de pagamento de uma OS
2. Abra o console do navegador (F12)
3. Procure pelos logs com emojis 🔍📋🔐✅
4. Verifique se o campo `autorizado_prazo` está sendo recebido corretamente

## Problema 2: Loop Infinito nas Requisições de Serviços Adicionais

### Descrição
As requisições para `/api/servicos-adicionais` estavam sendo feitas em loop infinito.

### Causa Identificada
**Hook useServicosAdicionais:** O `useEffect` tinha `loadServicos` como dependência, mas `loadServicos` é recriado a cada render, causando um loop infinito.

**Hook useEnvelopamento:** O sistema de retry estava tentando recarregar infinitamente quando não havia serviços cadastrados, sem limite de tentativas.

### Correção Aplicada
✅ **Hook useServicosAdicionais corrigido** - O `useEffect` agora executa apenas uma vez na inicialização, usando `useRef` para controlar se já foi carregado.

✅ **Hook useEnvelopamento corrigido** - Adicionado sistema de contagem de tentativas com limite máximo de 3 tentativas. Após atingir o limite, para de tentar e define configurações vazias.

### Logs Adicionados
✅ **Logs de debug adicionados** - Agora o console mostrará quando os serviços estão sendo carregados e quantos foram carregados.

✅ **Logs de tentativas** - Mostra quantas tentativas foram feitas e quando o limite é atingido.

## Verificação no Banco de Dados

### Script SQL Criado
✅ **Arquivo `DEBUG_CLIENTE_CREDITO.sql`** criado com consultas para verificar:
- Status de todos os clientes
- Valores do campo `autorizado_prazo`
- Estrutura da tabela
- Clientes específicos

### Como Usar
1. Execute o script no seu banco de dados
2. Verifique se o campo `autorizado_prazo` tem os valores corretos (1 = autorizado, 0 = bloqueado, NULL = não definido)
3. Confirme se o cliente em questão tem o valor correto

## Próximos Passos

### 1. Testar as Correções
- Abra uma OS e teste o modal de pagamento
- Verifique os logs no console
- Confirme se o cliente aparece como autorizado para crediário
- Verifique se o loop infinito de serviços parou

### 2. Verificar Banco de Dados
- Execute o script SQL para verificar os dados
- Confirme se o campo `autorizado_prazo` está correto para o cliente testado

### 3. Se o Problema Persistir
- Verifique se há outros componentes usando o mesmo hook
- Confirme se não há cache interferindo
- Verifique se o tenant_id está correto

## Arquivos Modificados

1. **`src/components/os/OSPagamentoModal.jsx`**
   - Adicionados logs de debug
   - Corrigida extração de dados da API

2. **`src/hooks/useServicosAdicionais.js`**
   - Corrigido loop infinito
   - Adicionados logs de debug
   - Usado useRef para controle de inicialização

3. **`src/hooks/useEnvelopamento.js`**
   - Corrigido loop infinito de retry
   - Adicionado sistema de contagem de tentativas
   - Limite máximo de 3 tentativas antes de parar

4. **`DEBUG_CLIENTE_CREDITO.sql`**
   - Script para verificação no banco de dados

## Observações Importantes

- **Nunca execute `php artisan migrate:fresh`** em produção
- Os logs de debug podem ser removidos após a correção
- O problema pode estar relacionado ao tenant_id ou permissões
- Verifique se o usuário logado tem acesso ao tenant correto
- **O loop infinito foi corrigido em ambos os hooks** - useServicosAdicionais e useEnvelopamento
