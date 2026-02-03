# Debug: Cliente Não Selecionado

## Problema Identificado
O `clienteId` está chegando como `undefined` no modal `OSPagamentoModal`, mesmo com o cliente selecionado.

## Logs Atuais Disponíveis

### 1. OSPagamentoModal.jsx
```
🔍 OSPagamentoModal - Modal fechado ou clienteId inválido: {open: true, clienteId: undefined}
⚠️ OSPagamentoModal - Modal aberto sem cliente válido. clienteId: undefined
```

### 2. Hooks e Componentes
- ✅ useOSHandlers.js - Log na função handleClienteSelecionado
- ✅ useOSState.js - Log na função resetOrdemServico
- ✅ useOrdemServico.js - Log das funções retornadas
- ✅ OrdensServicoPage.jsx - useEffect para monitorar mudanças

## Passos de Debug

### Passo 1: Selecionar um Cliente
1. Abra a página de Ordens de Serviço
2. Abra o console do navegador
3. Clique em "Selecionar Cliente"
4. Escolha o cliente com ID 17
5. Verifique os logs:

**Logs Esperados:**
```
🔍 useOSHandlers - handleClienteSelecionado chamado com: {cliente: {...}, clienteId: 17}
🔍 useOSHandlers - Estado ANTES da atualização: {...}
✅ useOSHandlers - Cliente selecionado e estado atualizado
🔍 OrdensServicoPage - clienteSelecionado mudou: {clienteSelecionado: {...}, clienteId: 17}
```

### Passo 2: Verificar Estado do Cliente
1. Após selecionar o cliente, verifique se aparece na interface
2. Verifique no console se o `clienteSelecionado` tem o `id`
3. Se o cliente não estiver selecionado, o problema está na seleção

### Passo 3: Abrir Modal de Pagamento
1. Com o cliente selecionado, clique em "Finalizar OS"
2. Verifique os logs do modal:

**Logs Esperados:**
```
🔍 OSPagamentoModal - Modal fechado ou clienteId inválido: {open: true, clienteId: 17}
🔍 OSPagamentoModal - Carregando informações do cliente ID: 17
```

**Logs Atuais (PROBLEMA):**
```
🔍 OSPagamentoModal - Modal fechado ou clienteId inválido: {open: true, clienteId: undefined}
⚠️ OSPagamentoModal - Modal aberto sem cliente válido. clienteId: undefined
```

## Possíveis Causas

### 1. Cliente não sendo selecionado
- A função `handleClienteSelecionado` não está sendo chamada
- A função está sendo chamada mas não está atualizando o estado

### 2. Estado sendo perdido
- O estado está sendo resetado em algum momento
- Há um problema na passagem do estado entre componentes

### 3. Problema na prop clienteId
- O `clienteSelecionado?.id` está retornando `undefined`
- Há um problema na estrutura do objeto cliente

## Soluções a Testar

### Solução 1: Verificar estrutura do cliente
```javascript
// No handleClienteSelecionado, adicionar:
console.log('Cliente completo:', JSON.stringify(cliente, null, 2));
console.log('Cliente.id:', cliente.id);
console.log('Cliente.client_id:', cliente.client_id);
console.log('Todas as chaves:', Object.keys(cliente));
```

### Solução 2: Verificar estado em tempo real
```javascript
// Antes de abrir o modal, verificar:
console.log('Estado antes do modal:', {
  clienteSelecionado,
  clienteId: clienteSelecionado?.id
});
```

### Solução 3: Usar fallback
```javascript
// No OSPagamentoModal, usar:
clienteId={clienteSelecionado?.id || clienteSelecionado?.cliente_id || clienteSelecionado?.pk}
```

## Execute o Debug

1. **Teste de Seleção**: Selecione um cliente e verifique os logs
2. **Teste de Estado**: Verifique se o estado persiste
3. **Teste de Modal**: Abra o modal e verifique os logs
4. **Identifique o Problema**: Com base nos logs, identifique onde está o problema
5. **Aplique a Solução**: Use uma das soluções acima baseada no problema identificado

## Próximos Passos

Após executar o debug, me informe:
1. Os logs exatos que aparecem
2. Em que momento o `clienteId` vira `undefined`
3. Se o cliente aparece selecionado na interface
4. Se a função `handleClienteSelecionado` está sendo chamada
