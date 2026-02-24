# Scripts SQL para Sistema Kanban

Este diretório contém scripts SQL para criar as tabelas do sistema Kanban no banco de dados.

## 📋 Arquivos Disponíveis

### 1. `kanban_tables_safe.sql` ⭐ **RECOMENDADO**
**Use este script para produção!**

- ✅ Remove tabelas existentes antes de criar (se houver)
- ✅ Cria todas as tabelas do zero
- ✅ Mais seguro e confiável
- ⚠️ **ATENÇÃO**: Remove dados existentes se as tabelas já existirem

**Quando usar:**
- Primeira instalação
- Quando não há dados importantes nas tabelas do Kanban
- Quando quer garantir estrutura limpa

### 2. `kanban_tables.sql`
**Versão com verificação de existência**

- ✅ Verifica se a tabela existe antes de criar
- ✅ Não remove dados existentes
- ⚠️ Pode falhar se a estrutura for diferente

**Quando usar:**
- Quando as tabelas podem já existir
- Quando quer preservar dados existentes
- Atualização incremental

### 3. `kanban_tables_incremental.sql`
**Versão mais complexa (não recomendada)**

- ⚠️ Mais complexo
- ⚠️ Pode ter problemas com foreign keys
- ⚠️ Use apenas se necessário

## 🚀 Como Executar

### Opção 1: Via phpMyAdmin / Adminer
1. Acesse o painel do banco de dados
2. Selecione o banco de dados
3. Vá em "SQL" ou "Importar"
4. Cole o conteúdo do arquivo `kanban_tables_safe.sql`
5. Execute

### Opção 2: Via Linha de Comando MySQL
```bash
mysql -u seu_usuario -p nome_do_banco < SQL/kanban_tables_safe.sql
```

### Opção 3: Via Laravel Migration (Recomendado)
```bash
cd backend
php artisan migrate
```

## ⚠️ IMPORTANTE - ANTES DE EXECUTAR

1. **FAÇA BACKUP DO BANCO DE DADOS!**
   ```bash
   mysqldump -u usuario -p nome_banco > backup_antes_kanban.sql
   ```

2. **Verifique se as tabelas dependentes existem:**
   - `tenants`
   - `users`
   - `ordens_servico`
   - `ordens_servico_itens`

3. **Teste primeiro em ambiente de desenvolvimento**

## 📊 Tabelas Criadas

1. **kanban_columns** - Colunas do Kanban por usuário
2. **kanban_os_positions** - Posições das OS nas colunas
3. **kanban_movimentacoes** - Log de movimentações
4. **kanban_os_items_progress** - Progresso dos itens (checklist)

## ✅ Verificação Pós-Instalação

Execute estas queries para verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas
SHOW TABLES LIKE 'kanban%';

-- Verificar estrutura
DESCRIBE kanban_columns;
DESCRIBE kanban_os_positions;
DESCRIBE kanban_movimentacoes;
DESCRIBE kanban_os_items_progress;

-- Verificar foreign keys
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE 'kanban%'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

## 🔧 Troubleshooting

### Erro: "Identifier name is too long"
✅ **Resolvido!** Os índices agora têm nomes curtos (máximo 35 caracteres)

### Erro: "Foreign key constraint fails"
- Verifique se as tabelas `tenants`, `users`, `ordens_servico` e `ordens_servico_itens` existem
- Verifique se há dados nas tabelas referenciadas

### Erro: "Table already exists"
- Use o script `kanban_tables_safe.sql` que remove e recria
- Ou use `DROP TABLE IF EXISTS` antes de criar

## 📝 Notas

- Todos os scripts usam `utf8mb4` e `utf8mb4_unicode_ci`
- Todas as foreign keys usam `ON DELETE CASCADE` (exceto `coluna_anterior_id` que usa `SET NULL`)
- Os índices têm nomes curtos para evitar problemas com MySQL

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do MySQL
2. Execute as queries de verificação acima
3. Verifique se todas as dependências estão corretas
