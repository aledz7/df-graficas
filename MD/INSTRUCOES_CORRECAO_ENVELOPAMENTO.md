# Correção: ClienteId no Modal de Pagamento de Envelopamento

## Problema Identificado
O modal `OSPagamentoModal` estava recebendo `clienteId: undefined` quando usado nas páginas de Envelopamento, mesmo com o cliente selecionado.

## Causa Raiz
O problema estava na passagem do `clienteId` para o modal:
- **Antes**: `clienteId={orcamento.cliente_id}` (campo inexistente)
- **Depois**: `clienteId={orcamento.cliente?.id}` (campo correto)

## Arquivos Corrigidos

### 1. EnvelopamentoPage.jsx
```javascript
// ANTES (linha 510)
clienteId={orcamento.cliente_id}

// DEPOIS
clienteId={orcamento.cliente?.id}
```

### 2. EditarOrcamentoEnvelopamentoPage.jsx
```javascript
// ANTES (linha 421)
clienteId={orcamento.cliente_id}

// DEPOIS
clienteId={orcamento.cliente?.id}
```

## Como Testar

### Passo 1: Testar Página de Envelopamento
1. Acesse a página de Envelopamento (`/operacional/envelopamento`)
2. Abra o console do navegador
3. Clique em "Selecionar Cliente"
4. Escolha um cliente (ex: ID 17)
5. Adicione algumas peças ao orçamento
6. Clique em "Finalizar Orçamento"
7. Verifique os logs no console

**Logs Esperados (CORRIGIDO):**
```
🔍 OSPagamentoModal - Modal fechado ou clienteId inválido: {open: true, clienteId: 17}
🔍 OSPagamentoModal - Carregando informações do cliente ID: 17
```

**Logs Anteriores (PROBLEMA):**
```
🔍 OSPagamentoModal - Modal fechado ou clienteId inválido: {open: true, clienteId: undefined}
⚠️ OSPagamentoModal - Modal aberto sem cliente válido. clienteId: undefined
```

### Passo 2: Testar Página de Edição
1. Acesse a página de Editar Orçamento de Envelopamento
2. Siga os mesmos passos acima
3. Verifique se o modal abre corretamente com o cliente selecionado

### Passo 3: Verificar Crediário
1. Com o modal de pagamento aberto, verifique se a opção "Crediário" aparece
2. Se o cliente 17 estiver autorizado a prazo, o crediário deve estar habilitado
3. Se não estiver autorizado, deve estar desabilitado

## Estrutura do Cliente no Orçamento

### Antes da Correção
```javascript
orcamento = {
  cliente_id: undefined,  // ❌ Campo inexistente
  cliente: { id: 17, nome: "Nome do Cliente" }  // ✅ Estrutura correta
}
```

### Depois da Correção
```javascript
// Agora usa corretamente:
clienteId={orcamento.cliente?.id}  // ✅ Acessa cliente.id = 17
```

## Verificações Adicionais

### 1. Console do Navegador
- Não deve haver erros de `clienteId undefined`
- O modal deve carregar as informações do cliente corretamente

### 2. Interface do Modal
- O modal deve mostrar as informações do cliente selecionado
- A opção de crediário deve estar disponível se o cliente estiver autorizado

### 3. Funcionalidade
- O pagamento deve funcionar normalmente
- O crediário deve estar disponível para clientes autorizados

## Próximos Passos

1. **Teste a correção** seguindo os passos acima
2. **Verifique os logs** no console do navegador
3. **Confirme que o crediário** aparece para clientes autorizados
4. **Me informe o resultado** dos testes

## Arquivos Relacionados

- `src/pages/EnvelopamentoPage.jsx` - Página principal de Envelopamento
- `src/pages/EditarOrcamentoEnvelopamentoPage.jsx` - Página de edição
- `src/components/envelopamento/EnvelopamentoPagamentoModal.jsx` - Wrapper do modal
- `src/components/os/OSPagamentoModal.jsx` - Modal de pagamento principal

## Status da Correção

- ✅ **Problema identificado**: `cliente_id` vs `cliente.id`
- ✅ **Arquivos corrigidos**: EnvelopamentoPage e EditarOrcamentoEnvelopamentoPage
- ✅ **Estrutura corrigida**: Agora usa `orcamento.cliente?.id`
- 🔄 **Aguardando teste**: Execute os testes para confirmar a correção
