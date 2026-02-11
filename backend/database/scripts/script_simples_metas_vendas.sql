-- =====================================================
-- SCRIPT SIMPLIFICADO - APENAS TABELA METAS_VENDAS
-- Execute este script no banco de dados MySQL/MariaDB
-- =====================================================

-- Criar tabela metas_vendas (se não existir)
CREATE TABLE IF NOT EXISTS `metas_vendas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `tipo` VARCHAR(255) NOT NULL DEFAULT 'empresa',
    `vendedor_id` BIGINT UNSIGNED NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `periodo_tipo` VARCHAR(255) NOT NULL DEFAULT 'mensal',
    `valor_meta` DECIMAL(15, 2) NOT NULL,
    `observacoes` TEXT NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_metas_tenant_tipo_datas` (`tenant_id`, `tipo`, `data_inicio`, `data_fim`),
    INDEX `idx_metas_tenant_vendedor_datas` (`tenant_id`, `vendedor_id`, `data_inicio`, `data_fim`),
    CONSTRAINT `fk_metas_vendas_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_metas_vendas_vendedor` 
        FOREIGN KEY (`vendedor_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se foi criada com sucesso
SELECT 'Tabela metas_vendas criada/verificada com sucesso!' AS status;
