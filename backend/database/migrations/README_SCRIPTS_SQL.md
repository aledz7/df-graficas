# Scripts SQL de Atualização do Banco de Dados

Este diretório contém scripts SQL para atualizar o banco de dados online com as alterações implementadas no sistema de notificações e finalização de OS.

## Arquivos Disponíveis

### 1. `script_atualizacao_banco_seguro.sql` ⭐ RECOMENDADO
**Versão com verificações condicionais**

- ✅ Verifica se as colunas já existem antes de criar
- ✅ Verifica se as foreign keys já existem antes de criar
- ✅ Verifica se os índices já existem antes de criar
- ✅ Pode ser executado múltiplas vezes sem erros
- ✅ Mostra mensagens informativas sobre o que já existe

**Uso recomendado para:**
- Ambientes de produção
- Quando não tem certeza se as alterações já foram aplicadas
- Quando precisa executar o script múltiplas vezes

### 2. `script_atualizacao_banco_simples.sql`
**Versão direta sem verificações**

- ⚠️ Não verifica se as colunas já existem
- ⚠️ Pode gerar erros se executado em banco já atualizado
- ✅ Mais rápido de executar
- ✅ Mais fácil de ler e entender

**Uso recomendado para:**
- Ambientes de desenvolvimento
- Quando tem certeza de que as alterações ainda não foram aplicadas
- Quando precisa de um script mais simples

### 3. `script_atualizacao_banco.sql`
**Versão original com comentários**

- Versão intermediária com comentários explicativos
- Inclui queries de verificação ao final

## Alterações Aplicadas

### Tabela `ordens_servico`
1. **tem_arte_pronta** (TINYINT) - Indica se a OS possui arte pronta
2. **destino_os** (ENUM) - Destino da OS: 'CRIACAO' ou 'PRODUCAO'
3. **prazo_tipo** (ENUM) - Tipo de prazo: 'PADRAO' ou 'ESPECIFICO'
4. **prazo_datahora** (TIMESTAMP) - Data e hora do prazo específico
5. **responsavel_criacao** (BIGINT UNSIGNED) - ID do designer responsável
6. **Foreign Key** - `responsavel_criacao` referencia `users.id`

### Tabela `notifications`
1. **os_id** (BIGINT UNSIGNED) - ID da OS relacionada
2. **priority** (ENUM) - Prioridade: 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'
3. **read_at** (TIMESTAMP) - Data/hora em que foi marcada como lida
4. **Foreign Key** - `os_id` referencia `ordens_servico.id` (CASCADE)
5. **Índice** - Composto (`os_id`, `read`) para melhor performance
6. **user_id** - Modificado para aceitar NULL (notificações globais)

## Como Executar

### Opção 1: Via MySQL Command Line
```bash
mysql -u seu_usuario -p nome_do_banco < script_atualizacao_banco_seguro.sql
```

### Opção 2: Via phpMyAdmin
1. Acesse o phpMyAdmin
2. Selecione o banco de dados
3. Vá em "SQL"
4. Cole o conteúdo do script
5. Clique em "Executar"

### Opção 3: Via MySQL Workbench
1. Abra o MySQL Workbench
2. Conecte-se ao servidor
3. Abra o arquivo SQL
4. Execute o script (Ctrl+Shift+Enter)

### Opção 4: Via Laravel Tinker
```php
DB::unprepared(file_get_contents('database/migrations/script_atualizacao_banco_seguro.sql'));
```

## Verificação Pós-Execução

Após executar o script, verifique se as alterações foram aplicadas:

```sql
-- Verificar colunas na tabela ordens_servico
SHOW COLUMNS FROM ordens_servico LIKE 'tem_arte_pronta';
SHOW COLUMNS FROM ordens_servico LIKE 'destino_os';
SHOW COLUMNS FROM ordens_servico LIKE 'prazo_tipo';
SHOW COLUMNS FROM ordens_servico LIKE 'prazo_datahora';
SHOW COLUMNS FROM ordens_servico LIKE 'responsavel_criacao';

-- Verificar colunas na tabela notifications
SHOW COLUMNS FROM notifications LIKE 'os_id';
SHOW COLUMNS FROM notifications LIKE 'priority';
SHOW COLUMNS FROM notifications LIKE 'read_at';

-- Verificar foreign keys
SHOW CREATE TABLE ordens_servico;
SHOW CREATE TABLE notifications;
```

## Rollback (Reversão)

Se precisar reverter as alterações, execute:

```sql
-- Remover foreign keys e colunas da tabela ordens_servico
ALTER TABLE `ordens_servico`
DROP FOREIGN KEY `ordens_servico_responsavel_criacao_foreign`;

ALTER TABLE `ordens_servico`
DROP COLUMN `responsavel_criacao`,
DROP COLUMN `prazo_datahora`,
DROP COLUMN `prazo_tipo`,
DROP COLUMN `destino_os`,
DROP COLUMN `tem_arte_pronta`;

-- Remover foreign keys e colunas da tabela notifications
ALTER TABLE `notifications`
DROP FOREIGN KEY `notifications_os_id_foreign`,
DROP INDEX `notifications_os_id_read_index`;

ALTER TABLE `notifications`
DROP COLUMN `os_id`,
DROP COLUMN `priority`,
DROP COLUMN `read_at`;
```

## Observações Importantes

1. **Backup**: Sempre faça backup do banco antes de executar scripts de alteração
2. **Ambiente de Teste**: Teste primeiro em ambiente de desenvolvimento
3. **Downtime**: As alterações podem causar breve indisponibilidade durante a execução
4. **Compatibilidade**: Scripts testados em MySQL 5.7+ e MariaDB 10.2+

## Suporte

Em caso de problemas:
1. Verifique os logs de erro do MySQL
2. Confirme que tem permissões adequadas (ALTER, CREATE, INDEX)
3. Verifique se as tabelas `users` e `ordens_servico` existem
4. Confirme que não há locks nas tabelas
