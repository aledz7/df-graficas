-- =====================================================
-- SCRIPT COMPLETO PARA BANCO DE DADOS ONLINE
-- Execute este script no banco de dados MySQL/MariaDB
-- Data: 2025-01-28
-- =====================================================

-- =====================================================
-- 1. TABELA METAS_VENDAS
-- =====================================================

-- Verificar e criar tabela metas_vendas
CREATE TABLE IF NOT EXISTS `metas_vendas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `tipo` VARCHAR(255) NOT NULL DEFAULT 'empresa' COMMENT 'empresa ou vendedor',
    `vendedor_id` BIGINT UNSIGNED NULL,
    `data_inicio` DATE NOT NULL,
    `data_fim` DATE NOT NULL,
    `periodo_tipo` VARCHAR(255) NOT NULL DEFAULT 'mensal' COMMENT 'diario, mensal, personalizado',
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

-- =====================================================
-- 2. VERIFICAÇÕES E CORREÇÕES DE TABELAS EXISTENTES
-- =====================================================

-- Verificar e adicionar coluna id_item_os em ordens_servico_itens (se não existir)
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico_itens' 
    AND column_name = 'id_item_os'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `ordens_servico_itens` ADD COLUMN `id_item_os` VARCHAR(255) NULL AFTER `id`;',
    'SELECT ''Coluna id_item_os já existe em ordens_servico_itens.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar colunas de consumo material em ordens_servico_itens (se não existirem)
SET @col_consumo = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico_itens' 
    AND column_name = 'consumo_material_utilizado'
);

SET @sql = IF(@col_consumo = 0,
    'ALTER TABLE `ordens_servico_itens` 
    ADD COLUMN `consumo_material_utilizado` VARCHAR(255) NULL AFTER `detalhes`,
    ADD COLUMN `consumo_largura_peca` DECIMAL(10, 2) NULL AFTER `consumo_material_utilizado`,
    ADD COLUMN `consumo_altura_peca` DECIMAL(10, 2) NULL AFTER `consumo_largura_peca`,
    ADD COLUMN `consumo_quantidade_solicitada` INT NULL AFTER `consumo_altura_peca`,
    ADD COLUMN `consumo_largura_chapa` DECIMAL(10, 2) NULL AFTER `consumo_quantidade_solicitada`,
    ADD COLUMN `consumo_altura_chapa` DECIMAL(10, 2) NULL AFTER `consumo_largura_chapa`,
    ADD COLUMN `consumo_valor_unitario_chapa` DECIMAL(10, 2) NULL AFTER `consumo_altura_chapa`,
    ADD COLUMN `consumo_pecas_por_chapa` INT NULL AFTER `consumo_valor_unitario_chapa`,
    ADD COLUMN `consumo_chapas_necessarias` INT NULL AFTER `consumo_pecas_por_chapa`,
    ADD COLUMN `consumo_custo_total` DECIMAL(12, 2) NULL AFTER `consumo_chapas_necessarias`,
    ADD COLUMN `consumo_custo_unitario` DECIMAL(12, 4) NULL AFTER `consumo_custo_total`,
    ADD COLUMN `consumo_aproveitamento_percentual` DECIMAL(5, 2) NULL AFTER `consumo_custo_unitario`;',
    'SELECT ''Colunas de consumo material já existem em ordens_servico_itens.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar colunas de chapa em produtos (se não existirem)
SET @col_chapa = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'produtos' 
    AND column_name = 'medida_chapa_largura_cm'
);

SET @sql = IF(@col_chapa = 0,
    'ALTER TABLE `produtos` 
    ADD COLUMN `medida_chapa_largura_cm` DECIMAL(10, 2) NULL AFTER `preco_m2`,
    ADD COLUMN `medida_chapa_altura_cm` DECIMAL(10, 2) NULL AFTER `medida_chapa_largura_cm`,
    ADD COLUMN `valor_chapa` DECIMAL(10, 2) NULL AFTER `medida_chapa_altura_cm`;',
    'SELECT ''Colunas de chapa já existem em produtos.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna valor_minimo em produtos (se não existir)
SET @col_valor_minimo = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'produtos' 
    AND column_name = 'valor_minimo'
);

SET @sql = IF(@col_valor_minimo = 0,
    'ALTER TABLE `produtos` 
    ADD COLUMN `valor_minimo` DECIMAL(10, 2) NULL DEFAULT NULL 
    AFTER `preco_metro_linear`
    COMMENT ''Valor mínimo de venda para este produto. Quando o cálculo resultar em valor menor, usar este valor.'';',
    'SELECT ''Coluna valor_minimo já existe em produtos.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar colunas tipo_venda e venda_referencia_id em itens_venda (se não existirem)
SET @col_tipo_venda = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'itens_venda' 
    AND column_name = 'tipo_venda'
);

SET @sql = IF(@col_tipo_venda = 0,
    'ALTER TABLE `itens_venda` 
    ADD COLUMN `venda_referencia_id` BIGINT UNSIGNED NULL AFTER `venda_id`,
    ADD COLUMN `tipo_venda` VARCHAR(20) NOT NULL DEFAULT ''pdv'' AFTER `venda_referencia_id`;',
    'SELECT ''Colunas tipo_venda e venda_referencia_id já existem em itens_venda.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Adicionar índices em itens_venda (se não existirem)
SET @idx_tipo = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'itens_venda' 
    AND index_name = 'itens_venda_tenant_id_tipo_venda_index'
);

SET @sql = IF(@idx_tipo = 0,
    'ALTER TABLE `itens_venda` 
    ADD INDEX `itens_venda_tenant_id_tipo_venda_index` (`tenant_id`, `tipo_venda`);',
    'SELECT ''Índice itens_venda_tenant_id_tipo_venda_index já existe.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_ref = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'itens_venda' 
    AND index_name = 'itens_venda_tenant_id_venda_referencia_id_index'
);

SET @sql = IF(@idx_ref = 0,
    'ALTER TABLE `itens_venda` 
    ADD INDEX `itens_venda_tenant_id_venda_referencia_id_index` (`tenant_id`, `venda_referencia_id`);',
    'SELECT ''Índice itens_venda_tenant_id_venda_referencia_id_index já existe.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. VERIFICAÇÕES DE ÍNDICES ÚNICOS
-- =====================================================

-- Verificar e corrigir índice único de id_os em ordens_servico
SET @idx_os_old = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico' 
    AND index_name = 'ordens_servico_id_os_unique'
);

SET @idx_os_new = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico' 
    AND index_name = 'ordens_servico_tenant_id_os_unique'
);

SET @sql = IF(@idx_os_old > 0 AND @idx_os_new = 0,
    'ALTER TABLE `ordens_servico` 
    DROP INDEX `ordens_servico_id_os_unique`,
    ADD UNIQUE INDEX `ordens_servico_tenant_id_os_unique` (`tenant_id`, `id_os`);',
    IF(@idx_os_new > 0,
        'SELECT ''Índice único de id_os já está correto em ordens_servico.'' AS mensagem;',
        IF(@idx_os_old = 0,
            'ALTER TABLE `ordens_servico` 
            ADD UNIQUE INDEX `ordens_servico_tenant_id_os_unique` (`tenant_id`, `id_os`);',
            'SELECT ''Nenhuma alteração necessária em ordens_servico.'' AS mensagem;'
        )
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e corrigir índice único de codigo_produto em produtos
SET @idx_prod_old = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'produtos' 
    AND index_name = 'produtos_codigo_produto_unique'
);

SET @idx_prod_new = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'produtos' 
    AND index_name = 'produtos_tenant_codigo_produto_unique'
);

SET @sql = IF(@idx_prod_old > 0 AND @idx_prod_new = 0,
    'ALTER TABLE `produtos` 
    DROP INDEX `produtos_codigo_produto_unique`,
    ADD UNIQUE INDEX `produtos_tenant_codigo_produto_unique` (`tenant_id`, `codigo_produto`);',
    IF(@idx_prod_new > 0,
        'SELECT ''Índice único de codigo_produto já está correto em produtos.'' AS mensagem;',
        IF(@idx_prod_old = 0,
            'ALTER TABLE `produtos` 
            ADD UNIQUE INDEX `produtos_tenant_codigo_produto_unique` (`tenant_id`, `codigo_produto`);',
            'SELECT ''Nenhuma alteração necessária em produtos.'' AS mensagem;'
        )
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 4. VERIFICAÇÕES DE TABELAS DE FECHAMENTO
-- =====================================================

-- Verificar e criar tabela configuracao_fechamento_mes (se não existir)
CREATE TABLE IF NOT EXISTS `configuracao_fechamento_mes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `dia_fechamento` INT NOT NULL DEFAULT 25,
    `ativo` TINYINT(1) NOT NULL DEFAULT 0,
    `usuario_configuracao_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_config_fechamento_tenant` (`tenant_id`),
    UNIQUE INDEX `configuracao_fechamento_mes_tenant_id_unique` (`tenant_id`),
    CONSTRAINT `fk_config_fechamento_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_config_fechamento_usuario` 
        FOREIGN KEY (`usuario_configuracao_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela historico_fechamento_mes (se não existir)
CREATE TABLE IF NOT EXISTS `historico_fechamento_mes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `tipo` ENUM('fechamento', 'abertura', 'reabertura') NOT NULL DEFAULT 'fechamento',
    `mes` INT NOT NULL,
    `ano` INT NOT NULL,
    `data_acao` TIMESTAMP NOT NULL,
    `usuario_id` BIGINT UNSIGNED NULL,
    `automatico` TINYINT(1) NOT NULL DEFAULT 0,
    `quantidade_holerites` INT NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_historico_tenant` (`tenant_id`),
    INDEX `idx_historico_tipo` (`tipo`),
    INDEX `idx_historico_mes_ano` (`mes`, `ano`),
    INDEX `idx_historico_data_acao` (`data_acao`),
    CONSTRAINT `fk_historico_fechamento_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_historico_fechamento_usuario` 
        FOREIGN KEY (`usuario_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. RESUMO FINAL
-- =====================================================

SELECT '========================================' AS '';
SELECT 'SCRIPT EXECUTADO COM SUCESSO!' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';
SELECT 'Tabelas verificadas/criadas:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ metas_vendas - ', COUNT(*), ' registro(s)')
        ELSE '✗ metas_vendas - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'metas_vendas';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ configuracao_fechamento_mes - ', COUNT(*), ' registro(s)')
        ELSE '✗ configuracao_fechamento_mes - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'configuracao_fechamento_mes';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ historico_fechamento_mes - ', COUNT(*), ' registro(s)')
        ELSE '✗ historico_fechamento_mes - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'historico_fechamento_mes';

SELECT '' AS '';
SELECT 'Colunas verificadas em ordens_servico_itens:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ id_item_os'
        ELSE '✗ id_item_os - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'ordens_servico_itens' 
AND column_name = 'id_item_os';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ consumo_material_utilizado'
        ELSE '✗ consumo_material_utilizado - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'ordens_servico_itens' 
AND column_name = 'consumo_material_utilizado';

SELECT '' AS '';
SELECT 'Colunas verificadas em produtos:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ medida_chapa_largura_cm'
        ELSE '✗ medida_chapa_largura_cm - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'produtos' 
AND column_name = 'medida_chapa_largura_cm';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ valor_minimo'
        ELSE '✗ valor_minimo - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'produtos' 
AND column_name = 'valor_minimo';

SELECT '' AS '';
SELECT 'Colunas verificadas em itens_venda:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ tipo_venda'
        ELSE '✗ tipo_venda - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'itens_venda' 
AND column_name = 'tipo_venda';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ venda_referencia_id'
        ELSE '✗ venda_referencia_id - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'itens_venda' 
AND column_name = 'venda_referencia_id';

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'FIM DO SCRIPT' AS '';
SELECT '========================================' AS '';
