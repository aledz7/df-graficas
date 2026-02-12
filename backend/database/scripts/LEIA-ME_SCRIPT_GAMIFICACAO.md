# Script SQL - Gamificação, Alertas e Ranking

## 📋 Descrição

Este script SQL aplica todas as alterações necessárias no banco de dados para as funcionalidades de:
- 🔔 **Alertas e Notificações**
- 🏆 **Ranking de Vendedores**
- 🎮 **Sistema de Metas Gamificado**

## 📁 Arquivo

`script_gamificacao_alertas_ranking.sql`

## ✅ O que o script faz:

### 1. **Alterações na tabela `metas_vendas`:**
   - Adiciona coluna `pontos_meta` (INT) - Pontos ao bater a meta
   - Adiciona coluna `percentual_proximo_alerta` (DECIMAL) - % para alertar que está próximo
   - Adiciona coluna `premiacao` (JSON) - Informações sobre premiação

### 2. **Cria tabela `vendedor_pontos`:**
   - Armazena pontos totais, nível atual, badge
   - Contadores de vendas, metas batidas, ticket médio
   - Relacionamento com tenant e vendedor

### 3. **Cria tabela `historico_pontos`:**
   - Registro de todas as ações que geraram pontos
   - Tipo de ação, pontos ganhos/perdidos
   - Relacionamento com vendas e metas

### 4. **Cria tabela `premiacoes`:**
   - Premiações concedidas aos vendedores
   - Tipos: bonus, brinde, folga, premio_especial
   - Status: pendente, entregue, cancelado

### 5. **Alterações na tabela `notificacoes`:**
   - Adiciona coluna `dados_adicionais` (JSON) - Dados extras das notificações

## 🚀 Como Executar

### Opção 1: Via phpMyAdmin ou Adminer
1. Acesse o painel do banco de dados
2. Selecione o banco de dados
3. Vá em "SQL" ou "Importar"
4. Cole o conteúdo do script
5. Execute

### Opção 2: Via linha de comando MySQL
```bash
mysql -u seu_usuario -p nome_do_banco < script_gamificacao_alertas_ranking.sql
```

### Opção 3: Via cliente MySQL
```sql
SOURCE /caminho/para/script_gamificacao_alertas_ranking.sql;
```

## ⚠️ Importante

- ✅ O script é **seguro** - verifica se colunas/tabelas já existem antes de criar
- ✅ Pode ser executado **múltiplas vezes** sem problemas
- ✅ Não apaga dados existentes
- ✅ Usa `IF NOT EXISTS` e verificações condicionais

## 📊 Verificações

O script inclui verificações automáticas que mostram:
- ✅ Quais tabelas foram criadas
- ✅ Quais colunas foram adicionadas
- ❌ Se algo não foi criado (com mensagem de erro)

## 🔍 Resultado Esperado

Após executar, você verá:
```
========================================
VERIFICAÇÃO DE TABELAS
========================================

✓ vendedor_pontos - 0 registro(s)
✓ historico_pontos - 0 registro(s)
✓ premiacoes - 0 registro(s)

VERIFICAÇÃO DE COLUNAS EM METAS_VENDAS
✓ pontos_meta
✓ percentual_proximo_alerta
✓ premiacao

VERIFICAÇÃO DE COLUNAS EM NOTIFICACOES
✓ dados_adicionais

========================================
SCRIPT EXECUTADO COM SUCESSO!
========================================
```

## 📝 Notas

- O script cria as tabelas vazias (0 registros inicialmente)
- Os dados serão populados automaticamente quando:
  - Vendas forem finalizadas (pontos por venda)
  - Metas forem batidas (pontos por meta)
  - Alertas forem executados (notificações criadas)

## 🆘 Problemas?

Se encontrar erros:
1. Verifique se o banco de dados está acessível
2. Verifique se o usuário tem permissões de ALTER e CREATE
3. Verifique se as tabelas `tenants`, `users`, `vendas` e `metas_vendas` existem
4. Verifique os logs de erro do MySQL

---

**Data:** 28/01/2025  
**Versão:** 1.0
