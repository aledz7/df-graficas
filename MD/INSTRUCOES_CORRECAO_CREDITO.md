# Instruções para Corrigir o Problema do Crédiário

## Problema Identificado
O cliente com ID 17 não está conseguindo usar o crédiário porque o campo `autorizado_prazo` não está sendo reconhecido corretamente pelo sistema.

## Causa do Problema
O sistema estava fazendo comparação estrita (`=== true`) com o campo `autorizado_prazo`, mas o banco de dados pode estar retornando o valor como `1` (integer) em vez de `true` (boolean).

## Correções Aplicadas

### 1. Frontend (React)
- ✅ Corrigido `ClienteCrediarioCheck.jsx` para aceitar tanto `true` quanto `1`
- ✅ Corrigido `OSPagamentoModal.jsx` para aceitar tanto `true` quanto `1`
- ✅ Adicionados logs de debug para facilitar troubleshooting

### 2. Backend (Laravel)
- ✅ O modelo `Cliente` já tem o cast correto: `'autorizado_prazo' => 'boolean'`
- ✅ A migração está correta com `$table->boolean('autorizado_prazo')->default(false);`

## Comandos SQL para Executar

### 1. Verificar o Cliente 17
Execute o arquivo `verificar_cliente_17_detalhado.sql` para ver o estado atual do cliente.

### 2. Corrigir o Cliente 17
Execute o arquivo `corrigir_cliente_17.sql` para marcar o cliente como autorizado a prazo.

### 3. Verificar a Correção
Após executar a correção, execute novamente o arquivo `verificar_cliente_17_detalhado.sql` para confirmar.

## Estrutura dos Arquivos SQL

1. **`verificar_cliente_17_detalhado.sql`** - Verifica o estado atual do cliente
2. **`corrigir_cliente_17.sql`** - Corrige o problema marcando como autorizado
3. **`verificar_cliente_17.sql`** - Verificação simples (opcional)

## Como Executar

1. Abra seu cliente MySQL/phpMyAdmin
2. Execute os comandos na seguinte ordem:
   - Primeiro: `verificar_cliente_17_detalhado.sql`
   - Segundo: `corrigir_cliente_17.sql`
   - Terceiro: `verificar_cliente_17_detalhado.sql` (para confirmar)

## Resultado Esperado
Após a correção, o cliente 17 deve aparecer como "Autorizado a prazo" e o sistema deve permitir o uso do crédiário.

## Logs de Debug
Os logs de debug foram adicionados ao console do navegador. Verifique o console para ver:
- 🔍 Resposta completa da API
- 📋 Dados do cliente extraídos
- 🔐 Valores dos campos autorizado_prazo e status
- ✅ Resultado da verificação de autorização

## Próximos Passos
1. Execute os comandos SQL
2. Teste o sistema com o cliente 17
3. Verifique se o crédiário está funcionando
4. Se necessário, execute os comandos para outros clientes que possam ter o mesmo problema
