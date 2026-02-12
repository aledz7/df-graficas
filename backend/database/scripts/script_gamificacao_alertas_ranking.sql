-- =====================================================
-- SCRIPT DE GAMIFICAÇÃO, ALERTAS E RANKING
-- Execute este script no banco de dados MySQL/MariaDB
-- Data: 2025-01-28
-- =====================================================

-- =====================================================
-- 1. ADICIONAR CAMPOS DE GAMIFICAÇÃO EM METAS_VENDAS
-- =====================================================

-- Verificar e adicionar coluna pontos_meta em metas_vendas (se não existir)
SET @col_pontos = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'metas_vendas' 
    AND column_name = 'pontos_meta'
);

SET @sql = IF(@col_pontos = 0,
    'ALTER TABLE `metas_vendas` ADD COLUMN `pontos_meta` INT NOT NULL DEFAULT 0 AFTER `valor_meta`;',
    'SELECT ''Coluna pontos_meta já existe em metas_vendas.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna percentual_proximo_alerta em metas_vendas (se não existir)
SET @col_percentual = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'metas_vendas' 
    AND column_name = 'percentual_proximo_alerta'
);

SET @sql = IF(@col_percentual = 0,
    'ALTER TABLE `metas_vendas` ADD COLUMN `percentual_proximo_alerta` DECIMAL(5, 2) NULL AFTER `pontos_meta`;',
    'SELECT ''Coluna percentual_proximo_alerta já existe em metas_vendas.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna premiacao em metas_vendas (se não existir)
SET @col_premiacao = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'metas_vendas' 
    AND column_name = 'premiacao'
);

SET @sql = IF(@col_premiacao = 0,
    'ALTER TABLE `metas_vendas` ADD COLUMN `premiacao` JSON NULL AFTER `percentual_proximo_alerta`;',
    'SELECT ''Coluna premiacao já existe em metas_vendas.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. CRIAR TABELA VENDEDOR_PONTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS `vendedor_pontos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `vendedor_id` BIGINT UNSIGNED NOT NULL,
    `pontos_totais` INT NOT NULL DEFAULT 0 COMMENT 'Total de pontos acumulados',
    `nivel_atual` INT NOT NULL DEFAULT 1 COMMENT 'Nível atual (Bronze=1, Prata=2, Ouro=3, Platina=4, Diamante=5)',
    `badge_atual` VARCHAR(255) NULL COMMENT 'Badge atual do vendedor',
    `vendas_realizadas` INT NOT NULL DEFAULT 0 COMMENT 'Total de vendas realizadas',
    `metas_batidas` INT NOT NULL DEFAULT 0 COMMENT 'Total de metas batidas',
    `ticket_medio_batido` INT NOT NULL DEFAULT 0 COMMENT 'Vezes que bateu ticket médio',
    `ultima_atualizacao` DATE NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_vendedor_pontos_tenant_vendedor` (`tenant_id`, `vendedor_id`),
    INDEX `idx_vendedor_pontos_tenant_pontos` (`tenant_id`, `pontos_totais`),
    INDEX `idx_vendedor_pontos_tenant_nivel` (`tenant_id`, `nivel_atual`),
    UNIQUE INDEX `vendedor_pontos_tenant_vendedor_unique` (`tenant_id`, `vendedor_id`),
    CONSTRAINT `fk_vendedor_pontos_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_vendedor_pontos_vendedor` 
        FOREIGN KEY (`vendedor_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. CRIAR TABELA HISTORICO_PONTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS `historico_pontos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `vendedor_id` BIGINT UNSIGNED NOT NULL,
    `tipo_acao` VARCHAR(255) NOT NULL COMMENT 'venda, meta_batida, ticket_medio, bonus, penalidade',
    `pontos` INT NOT NULL COMMENT 'Pontos ganhos ou perdidos (negativo para penalidades)',
    `descricao` VARCHAR(255) NOT NULL COMMENT 'Descrição da ação',
    `venda_id` BIGINT UNSIGNED NULL,
    `meta_id` BIGINT UNSIGNED NULL,
    `dados_adicionais` JSON NULL COMMENT 'Dados extras sobre a ação',
    `data_acao` DATE NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_historico_tenant_vendedor_data` (`tenant_id`, `vendedor_id`, `data_acao`),
    INDEX `idx_historico_tenant_tipo` (`tenant_id`, `tipo_acao`),
    INDEX `idx_historico_vendedor_data` (`vendedor_id`, `data_acao`),
    CONSTRAINT `fk_historico_pontos_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_historico_pontos_vendedor` 
        FOREIGN KEY (`vendedor_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_historico_pontos_venda` 
        FOREIGN KEY (`venda_id`) 
        REFERENCES `vendas` (`id`) 
        ON DELETE SET NULL,
    CONSTRAINT `fk_historico_pontos_meta` 
        FOREIGN KEY (`meta_id`) 
        REFERENCES `metas_vendas` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. CRIAR TABELA PREMIACOES
-- =====================================================

CREATE TABLE IF NOT EXISTS `premiacoes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `vendedor_id` BIGINT UNSIGNED NOT NULL,
    `meta_id` BIGINT UNSIGNED NULL,
    `tipo` VARCHAR(255) NOT NULL COMMENT 'bonus, brinde, folga, premio_especial',
    `titulo` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `valor_bonus` DECIMAL(10, 2) NULL COMMENT 'Valor do bônus se tipo for bonus',
    `brinde_descricao` VARCHAR(255) NULL COMMENT 'Descrição do brinde se tipo for brinde',
    `data_folga` DATE NULL COMMENT 'Data da folga se tipo for folga',
    `status` ENUM('pendente', 'entregue', 'cancelado') NOT NULL DEFAULT 'pendente',
    `data_entrega` DATE NULL,
    `observacoes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_premiacoes_tenant_vendedor` (`tenant_id`, `vendedor_id`),
    INDEX `idx_premiacoes_tenant_status` (`tenant_id`, `status`),
    INDEX `idx_premiacoes_meta` (`meta_id`),
    CONSTRAINT `fk_premiacoes_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_premiacoes_vendedor` 
        FOREIGN KEY (`vendedor_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_premiacoes_meta` 
        FOREIGN KEY (`meta_id`) 
        REFERENCES `metas_vendas` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. ADICIONAR CAMPO DADOS_ADICIONAIS EM NOTIFICACOES
-- =====================================================

-- Verificar e adicionar coluna dados_adicionais em notificacoes (se não existir)
SET @col_dados = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'notificacoes' 
    AND column_name = 'dados_adicionais'
);

SET @sql = IF(@col_dados = 0,
    'ALTER TABLE `notificacoes` ADD COLUMN `dados_adicionais` JSON NULL AFTER `percentual_atual`;',
    'SELECT ''Coluna dados_adicionais já existe em notificacoes.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. VERIFICAÇÕES E VALIDAÇÕES
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT '========================================' AS '';
SELECT 'VERIFICAÇÃO DE TABELAS' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ vendedor_pontos - ', COUNT(*), ' registro(s)')
        ELSE '✗ vendedor_pontos - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'vendedor_pontos';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ historico_pontos - ', COUNT(*), ' registro(s)')
        ELSE '✗ historico_pontos - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'historico_pontos';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ premiacoes - ', COUNT(*), ' registro(s)')
        ELSE '✗ premiacoes - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'premiacoes';

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE COLUNAS EM METAS_VENDAS' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ pontos_meta'
        ELSE '✗ pontos_meta - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'metas_vendas' 
AND column_name = 'pontos_meta';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ percentual_proximo_alerta'
        ELSE '✗ percentual_proximo_alerta - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'metas_vendas' 
AND column_name = 'percentual_proximo_alerta';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ premiacao'
        ELSE '✗ premiacao - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'metas_vendas' 
AND column_name = 'premiacao';

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE COLUNAS EM NOTIFICACOES' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ dados_adicionais'
        ELSE '✗ dados_adicionais - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'notificacoes' 
AND column_name = 'dados_adicionais';

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'SCRIPT EXECUTADO COM SUCESSO!' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT 'Tabelas criadas:' AS '';
SELECT '  - vendedor_pontos' AS '';
SELECT '  - historico_pontos' AS '';
SELECT '  - premiacoes' AS '';
SELECT '' AS '';
SELECT 'Colunas adicionadas:' AS '';
SELECT '  - metas_vendas.pontos_meta' AS '';
SELECT '  - metas_vendas.percentual_proximo_alerta' AS '';
SELECT '  - metas_vendas.premiacao' AS '';
SELECT '  - notificacoes.dados_adicionais' AS '';
SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'FIM DO SCRIPT' AS '';
SELECT '========================================' AS '';
