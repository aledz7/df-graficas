# Scripts SQL para Banco de Dados Online

Este diretório contém scripts SQL para executar diretamente no banco de dados online.

## 📋 Scripts Disponíveis

### 1. `script_simples_metas_vendas.sql`
**Uso:** Apenas cria a tabela `metas_vendas` (recomendado se você só precisa dessa funcionalidade)

**O que faz:**
- Cria a tabela `metas_vendas` se não existir
- Inclui todas as colunas, índices e foreign keys necessárias

**Como executar:**
```sql
-- Copie e cole o conteúdo do arquivo no seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)
-- Ou execute via linha de comando:
mysql -u seu_usuario -p nome_do_banco < script_simples_metas_vendas.sql
```

### 2. `script_completo_banco_online.sql`
**Uso:** Script completo que verifica e cria todas as estruturas necessárias

**O que faz:**
- Cria a tabela `metas_vendas`
- Verifica e adiciona colunas faltantes em outras tabelas:
  - `ordens_servico_itens`: `id_item_os`, campos de consumo material
  - `produtos`: campos de chapa, `valor_minimo`
  - `itens_venda`: `tipo_venda`, `venda_referencia_id`
- Verifica e corrige índices únicos:
  - `ordens_servico`: índice único de `id_os` por tenant
  - `produtos`: índice único de `codigo_produto` por tenant
- Cria tabelas de fechamento de mês (se não existirem)
- Mostra resumo final de todas as verificações

**Como executar:**
```sql
-- Copie e cole o conteúdo do arquivo no seu cliente MySQL
-- Ou execute via linha de comando:
mysql -u seu_usuario -p nome_do_banco < script_completo_banco_online.sql
```

## ⚠️ Importante

1. **Backup:** Sempre faça backup do banco de dados antes de executar scripts
2. **Teste:** Execute primeiro em um ambiente de teste
3. **Permissões:** Certifique-se de ter permissões para criar tabelas e modificar estruturas
4. **Foreign Keys:** Os scripts assumem que as tabelas `tenants` e `users` já existem

## 🔍 Verificação Pós-Execução

Após executar o script, você pode verificar se tudo foi criado corretamente:

```sql
-- Verificar se a tabela metas_vendas existe
SHOW TABLES LIKE 'metas_vendas';

-- Verificar estrutura da tabela
DESCRIBE metas_vendas;

-- Verificar índices
SHOW INDEXES FROM metas_vendas;
```

## 📝 Notas

- Os scripts usam `CREATE TABLE IF NOT EXISTS` e verificações condicionais para evitar erros
- Todas as foreign keys têm `ON DELETE CASCADE` para manter integridade referencial
- Os índices foram otimizados para consultas frequentes por tenant e período
