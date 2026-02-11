-- =====================================================
-- SCRIPT DE CRIAÇÃO DA TABELA METAS_VENDAS
-- Execute este script no banco de dados online
-- =====================================================

-- Verificar se a tabela já existe antes de criar
SET @table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'metas_vendas'
);

-- Criar tabela apenas se não existir
SET @sql = IF(@table_exists = 0,
    'CREATE TABLE `metas_vendas` (
        `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        `tenant_id` BIGINT UNSIGNED NOT NULL,
        `tipo` VARCHAR(255) NOT NULL DEFAULT ''empresa'' COMMENT ''empresa ou vendedor'',
        `vendedor_id` BIGINT UNSIGNED NULL,
        `data_inicio` DATE NOT NULL,
        `data_fim` DATE NOT NULL,
        `periodo_tipo` VARCHAR(255) NOT NULL DEFAULT ''mensal'' COMMENT ''diario, mensal, personalizado'',
        `valor_meta` DECIMAL(15, 2) NOT NULL,
        `observacoes` TEXT NULL,
        `ativo` TINYINT(1) NOT NULL DEFAULT 1,
        `created_at` TIMESTAMP NULL DEFAULT NULL,
        `updated_at` TIMESTAMP NULL DEFAULT NULL,
        `deleted_at` TIMESTAMP NULL DEFAULT NULL,
        PRIMARY KEY (`id`),
        INDEX `idx_tenant_tipo_datas` (`tenant_id`, `tipo`, `data_inicio`, `data_fim`),
        INDEX `idx_tenant_vendedor_datas` (`tenant_id`, `vendedor_id`, `data_inicio`, `data_fim`),
        CONSTRAINT `fk_metas_vendas_tenant` 
            FOREIGN KEY (`tenant_id`) 
            REFERENCES `tenants` (`id`) 
            ON DELETE CASCADE,
        CONSTRAINT `fk_metas_vendas_vendedor` 
            FOREIGN KEY (`vendedor_id`) 
            REFERENCES `users` (`id`) 
            ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;',
    'SELECT ''Tabela metas_vendas já existe. Nenhuma alteração necessária.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar se a tabela foi criada com sucesso
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Tabela metas_vendas criada/verificada com sucesso!'
        ELSE 'Erro ao criar tabela metas_vendas'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'metas_vendas';
