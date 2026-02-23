-- =====================================================
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS - VERSÃO SEGURA
-- Data: 2025-01-29
-- Descrição: Adiciona campos de finalização obrigatória de OS
--            e expande sistema de notificações
-- 
-- IMPORTANTE: Execute este script em um ambiente de teste primeiro!
--             Faça backup do banco antes de executar!
-- =====================================================

-- =====================================================
-- 1. ALTERAÇÕES NA TABELA ordens_servico
-- =====================================================

-- Verificar e adicionar campo tem_arte_pronta
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND COLUMN_NAME = 'tem_arte_pronta'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico` ADD COLUMN `tem_arte_pronta` TINYINT(1) NULL DEFAULT NULL AFTER `observacoes_gerais_os`',
    'SELECT "Coluna tem_arte_pronta já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar campo destino_os
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND COLUMN_NAME = 'destino_os'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico` ADD COLUMN `destino_os` ENUM(\'CRIACAO\', \'PRODUCAO\') NULL DEFAULT NULL AFTER `tem_arte_pronta`',
    'SELECT "Coluna destino_os já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar campo prazo_tipo
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND COLUMN_NAME = 'prazo_tipo'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico` ADD COLUMN `prazo_tipo` ENUM(\'PADRAO\', \'ESPECIFICO\') NULL DEFAULT NULL AFTER `destino_os`',
    'SELECT "Coluna prazo_tipo já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar campo prazo_datahora
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND COLUMN_NAME = 'prazo_datahora'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico` ADD COLUMN `prazo_datahora` TIMESTAMP NULL DEFAULT NULL AFTER `prazo_tipo`',
    'SELECT "Coluna prazo_datahora já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar campo responsavel_criacao
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND COLUMN_NAME = 'responsavel_criacao'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico` ADD COLUMN `responsavel_criacao` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `prazo_datahora`',
    'SELECT "Coluna responsavel_criacao já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar foreign key para responsavel_criacao
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ordens_servico' 
    AND CONSTRAINT_NAME = 'ordens_servico_responsavel_criacao_foreign'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `ordens_servico` ADD CONSTRAINT `ordens_servico_responsavel_criacao_foreign` FOREIGN KEY (`responsavel_criacao`) REFERENCES `users` (`id`) ON DELETE SET NULL',
    'SELECT "Foreign key ordens_servico_responsavel_criacao_foreign já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. ALTERAÇÕES NA TABELA notifications
-- =====================================================

-- Verificar e adicionar coluna os_id
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND COLUMN_NAME = 'os_id'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `notifications` ADD COLUMN `os_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `user_id`',
    'SELECT "Coluna os_id já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar foreign key para os_id
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND CONSTRAINT_NAME = 'notifications_os_id_foreign'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `notifications` ADD CONSTRAINT `notifications_os_id_foreign` FOREIGN KEY (`os_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE',
    'SELECT "Foreign key notifications_os_id_foreign já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar índice composto para os_id e read
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND INDEX_NAME = 'notifications_os_id_read_index'
);

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE `notifications` ADD INDEX `notifications_os_id_read_index` (`os_id`, `read`)',
    'SELECT "Índice notifications_os_id_read_index já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna priority
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND COLUMN_NAME = 'priority'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `notifications` ADD COLUMN `priority` ENUM(\'BAIXA\', \'MEDIA\', \'ALTA\', \'CRITICA\') NOT NULL DEFAULT \'MEDIA\' AFTER `type`',
    'SELECT "Coluna priority já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna read_at
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND COLUMN_NAME = 'read_at'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `notifications` ADD COLUMN `read_at` TIMESTAMP NULL DEFAULT NULL AFTER `read`',
    'SELECT "Coluna read_at já existe" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tornar user_id nullable (se ainda não for)
-- Verificar se user_id já é nullable
SET @is_nullable = (
    SELECT IS_NULLABLE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'notifications' 
    AND COLUMN_NAME = 'user_id'
);

SET @sql = IF(@is_nullable = 'NO',
    'ALTER TABLE `notifications` MODIFY COLUMN `user_id` VARCHAR(255) NULL DEFAULT NULL',
    'SELECT "Coluna user_id já é nullable" AS mensagem'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. ATUALIZAÇÃO DE DADOS EXISTENTES
-- =====================================================

-- Atualizar notificações existentes sem priority para MEDIA
UPDATE `notifications`
SET `priority` = 'MEDIA'
WHERE `priority` IS NULL OR `priority` = '';

-- =====================================================
-- 4. VERIFICAÇÕES FINAIS
-- =====================================================

-- Verificar colunas criadas na tabela ordens_servico
SELECT 
    'ordens_servico' AS tabela,
    COLUMN_NAME AS coluna, 
    DATA_TYPE AS tipo, 
    IS_NULLABLE AS nullable, 
    COLUMN_DEFAULT AS valor_padrao
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'ordens_servico'
AND COLUMN_NAME IN ('tem_arte_pronta', 'destino_os', 'prazo_tipo', 'prazo_datahora', 'responsavel_criacao')
ORDER BY ORDINAL_POSITION;

-- Verificar colunas criadas na tabela notifications
SELECT 
    'notifications' AS tabela,
    COLUMN_NAME AS coluna, 
    DATA_TYPE AS tipo, 
    IS_NULLABLE AS nullable, 
    COLUMN_DEFAULT AS valor_padrao
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'notifications'
AND COLUMN_NAME IN ('os_id', 'priority', 'read_at')
ORDER BY ORDINAL_POSITION;

-- Verificar foreign keys criadas
SELECT 
    TABLE_NAME AS tabela,
    CONSTRAINT_NAME AS constraint_name,
    COLUMN_NAME AS coluna,
    REFERENCED_TABLE_NAME AS tabela_referenciada,
    REFERENCED_COLUMN_NAME AS coluna_referenciada
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('ordens_servico', 'notifications')
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
-- 
-- Script executado com sucesso!
-- Todas as alterações foram aplicadas ao banco de dados.
-- =====================================================
