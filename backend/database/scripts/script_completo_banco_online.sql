-- =====================================================
-- SCRIPT COMPLETO PARA BANCO DE DADOS ONLINE
-- Execute este script no banco de dados MySQL/MariaDB
-- Data inicial: 2025-01-28
-- Última atualização: 2026-02-14 (Dashboard Configurável)
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
-- 5. ALTERAÇÕES - PEDIDOS EM PERMUTA
-- =====================================================
-- Data: 2026-02-13
-- Descrição: Adiciona suporte para pedidos em permuta (sem impacto financeiro)

-- Verificar e adicionar coluna is_cliente_permuta em clientes (se não existir)
SET @col_permuta_cliente = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'clientes' 
    AND column_name = 'is_cliente_permuta'
);

SET @sql = IF(@col_permuta_cliente = 0,
    'ALTER TABLE `clientes` 
    ADD COLUMN `is_cliente_permuta` TINYINT(1) NOT NULL DEFAULT 0 
    AFTER `is_terceirizado`;',
    'SELECT ''Coluna is_cliente_permuta já existe em clientes.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna tipo_pedido em vendas (se não existir)
SET @col_tipo_pedido = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'vendas' 
    AND column_name = 'tipo_pedido'
);

SET @sql = IF(@col_tipo_pedido = 0,
    'ALTER TABLE `vendas` 
    ADD COLUMN `tipo_pedido` VARCHAR(20) NULL 
    AFTER `tipo_documento`;',
    'SELECT ''Coluna tipo_pedido já existe em vendas.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. ALTERAÇÕES - SISTEMA DE FRETES E LOGÍSTICA
-- =====================================================
-- Data: 2026-02-13
-- Descrição: Sistema completo de cadastro de fretes, entregadores e controle de entregas

-- Verificar e criar tabela opcoes_frete (se não existir)
CREATE TABLE IF NOT EXISTS `opcoes_frete` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `titulo` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `prazo_entrega` INT NOT NULL DEFAULT 1,
    `taxa_entrega` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `pedido_minimo` DECIMAL(10, 2) NULL,
    `peso_minimo` DECIMAL(10, 3) NULL,
    `peso_maximo` DECIMAL(10, 3) NULL,
    `tamanho_minimo` DECIMAL(10, 2) NULL,
    `tamanho_maximo` DECIMAL(10, 2) NULL,
    `tipo_limite_geografico` ENUM('localidade', 'cep', 'distancia') NOT NULL DEFAULT 'localidade',
    `produtos_limitados` JSON NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `ordem` INT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_opcoes_frete_tenant_ativo` (`tenant_id`, `ativo`),
    CONSTRAINT `fk_opcoes_frete_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela entregadores (se não existir)
CREATE TABLE IF NOT EXISTS `entregadores` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(255) NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `tipo` ENUM('proprio', 'terceirizado') NOT NULL DEFAULT 'terceirizado',
    `valor_padrao_entrega` DECIMAL(10, 2) NULL,
    `chave_pix` VARCHAR(255) NULL,
    `funcionario_id` BIGINT UNSIGNED NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `observacoes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_entregadores_tenant_ativo` (`tenant_id`, `ativo`),
    INDEX `idx_entregadores_tenant_tipo` (`tenant_id`, `tipo`),
    CONSTRAINT `fk_entregadores_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_entregadores_funcionario` 
        FOREIGN KEY (`funcionario_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela fretes_localidades (se não existir)
CREATE TABLE IF NOT EXISTS `fretes_localidades` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `opcao_frete_id` BIGINT UNSIGNED NOT NULL,
    `estado` VARCHAR(2) NULL,
    `cidade` VARCHAR(255) NULL,
    `bairro` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_fretes_localidades_opcao` (`opcao_frete_id`),
    INDEX `idx_fretes_localidades_estado_cidade_bairro` (`estado`, `cidade`, `bairro`),
    CONSTRAINT `fk_fretes_localidades_opcao` 
        FOREIGN KEY (`opcao_frete_id`) 
        REFERENCES `opcoes_frete` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela fretes_faixas_cep (se não existir)
CREATE TABLE IF NOT EXISTS `fretes_faixas_cep` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `opcao_frete_id` BIGINT UNSIGNED NOT NULL,
    `cep_inicio` VARCHAR(10) NOT NULL,
    `cep_fim` VARCHAR(10) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_fretes_faixas_cep_opcao` (`opcao_frete_id`),
    INDEX `idx_fretes_faixas_cep_inicio_fim` (`cep_inicio`, `cep_fim`),
    CONSTRAINT `fk_fretes_faixas_cep_opcao` 
        FOREIGN KEY (`opcao_frete_id`) 
        REFERENCES `opcoes_frete` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela fretes_entregas (se não existir)
CREATE TABLE IF NOT EXISTS `fretes_entregas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `venda_id` BIGINT UNSIGNED NOT NULL,
    `opcao_frete_id` BIGINT UNSIGNED NULL,
    `entregador_id` BIGINT UNSIGNED NULL,
    `cliente_id` BIGINT UNSIGNED NULL,
    `valor_frete` DECIMAL(10, 2) NOT NULL,
    `prazo_frete` INT NULL,
    `data_entrega` DATE NULL,
    `data_entrega_realizada` DATETIME NULL,
    `bairro` VARCHAR(255) NULL,
    `cidade` VARCHAR(255) NULL,
    `estado` VARCHAR(2) NULL,
    `cep` VARCHAR(10) NULL,
    `status` ENUM('pendente', 'entregue', 'cancelado') NOT NULL DEFAULT 'pendente',
    `status_pagamento` ENUM('pendente', 'pago', 'integrado_holerite') NOT NULL DEFAULT 'pendente',
    `data_pagamento` DATE NULL,
    `forma_pagamento` VARCHAR(50) NULL,
    `observacoes` TEXT NULL,
    `holerite_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_fretes_entregas_tenant_status` (`tenant_id`, `status`),
    INDEX `idx_fretes_entregas_tenant_status_pagamento` (`tenant_id`, `status_pagamento`),
    INDEX `idx_fretes_entregas_tenant_entregador` (`tenant_id`, `entregador_id`),
    INDEX `idx_fretes_entregas_tenant_data` (`tenant_id`, `data_entrega`),
    INDEX `idx_fretes_entregas_venda` (`venda_id`),
    CONSTRAINT `fk_fretes_entregas_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_fretes_entregas_venda` 
        FOREIGN KEY (`venda_id`) 
        REFERENCES `vendas` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_fretes_entregas_opcao` 
        FOREIGN KEY (`opcao_frete_id`) 
        REFERENCES `opcoes_frete` (`id`) 
        ON DELETE SET NULL,
    CONSTRAINT `fk_fretes_entregas_entregador` 
        FOREIGN KEY (`entregador_id`) 
        REFERENCES `entregadores` (`id`) 
        ON DELETE SET NULL,
    CONSTRAINT `fk_fretes_entregas_cliente` 
        FOREIGN KEY (`cliente_id`) 
        REFERENCES `clientes` (`id`) 
        ON DELETE SET NULL,
    CONSTRAINT `fk_fretes_entregas_holerite` 
        FOREIGN KEY (`holerite_id`) 
        REFERENCES `holerites` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e adicionar colunas de frete em vendas (se não existirem)
SET @col_opcao_frete = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'vendas' 
    AND column_name = 'opcao_frete_id'
);

SET @sql = IF(@col_opcao_frete = 0,
    'ALTER TABLE `vendas` 
    ADD COLUMN `opcao_frete_id` BIGINT UNSIGNED NULL AFTER `tipo_pedido`,
    ADD COLUMN `valor_frete` DECIMAL(10, 2) NULL AFTER `opcao_frete_id`,
    ADD COLUMN `prazo_frete` INT NULL AFTER `valor_frete`,
    ADD COLUMN `entregador_id` BIGINT UNSIGNED NULL AFTER `prazo_frete`,
    ADD COLUMN `bairro_entrega` VARCHAR(255) NULL AFTER `entregador_id`,
    ADD COLUMN `cidade_entrega` VARCHAR(255) NULL AFTER `bairro_entrega`,
    ADD COLUMN `estado_entrega` VARCHAR(2) NULL AFTER `cidade_entrega`,
    ADD COLUMN `cep_entrega` VARCHAR(10) NULL AFTER `estado_entrega`,
    ADD CONSTRAINT `fk_vendas_opcao_frete` 
        FOREIGN KEY (`opcao_frete_id`) 
        REFERENCES `opcoes_frete` (`id`) 
        ON DELETE SET NULL,
    ADD CONSTRAINT `fk_vendas_entregador` 
        FOREIGN KEY (`entregador_id`) 
        REFERENCES `entregadores` (`id`) 
        ON DELETE SET NULL;',
    'SELECT ''Colunas de frete já existem em vendas.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 7. RESUMO FINAL
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
SELECT 'Colunas verificadas em clientes:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ is_cliente_permuta'
        ELSE '✗ is_cliente_permuta - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'clientes' 
AND column_name = 'is_cliente_permuta';

SELECT '' AS '';
SELECT 'Colunas verificadas em vendas:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ tipo_pedido'
        ELSE '✗ tipo_pedido - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'vendas' 
AND column_name = 'tipo_pedido';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ opcao_frete_id'
        ELSE '✗ opcao_frete_id - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'vendas' 
AND column_name = 'opcao_frete_id';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ valor_frete'
        ELSE '✗ valor_frete - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'vendas' 
AND column_name = 'valor_frete';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ entregador_id'
        ELSE '✗ entregador_id - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'vendas' 
AND column_name = 'entregador_id';

SELECT '' AS '';
SELECT 'Tabelas de fretes verificadas:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ opcoes_frete - ', COUNT(*), ' registro(s)')
        ELSE '✗ opcoes_frete - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'opcoes_frete';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ entregadores - ', COUNT(*), ' registro(s)')
        ELSE '✗ entregadores - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'entregadores';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ fretes_entregas - ', COUNT(*), ' registro(s)')
        ELSE '✗ fretes_entregas - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'fretes_entregas';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ fretes_localidades - ', COUNT(*), ' registro(s)')
        ELSE '✗ fretes_localidades - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'fretes_localidades';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ fretes_faixas_cep - ', COUNT(*), ' registro(s)')
        ELSE '✗ fretes_faixas_cep - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'fretes_faixas_cep';

SELECT '' AS '';
SELECT 'Colunas verificadas em holerites:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ total_fretes'
        ELSE '✗ total_fretes - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'holerites' 
AND column_name = 'total_fretes';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ fretes_itens'
        ELSE '✗ fretes_itens - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'holerites' 
AND column_name = 'fretes_itens';

-- Adicionar campos de fretes no holerite se não existirem
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'holerites' 
    AND column_name = 'total_fretes'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `holerites` ADD COLUMN `total_fretes` DECIMAL(10,2) DEFAULT 0 COMMENT ''Total de fretes próprios do período'' AFTER `total_comissoes`',
    'SELECT ''Coluna total_fretes já existe'' AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists2 = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'holerites' 
    AND column_name = 'fretes_itens'
);

SET @sql2 = IF(@col_exists2 = 0,
    'ALTER TABLE `holerites` ADD COLUMN `fretes_itens` JSON NULL COMMENT ''Array com detalhes dos fretes próprios'' AFTER `total_fretes`',
    'SELECT ''Coluna fretes_itens já existe'' AS status'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ========================================
-- ROMANEIO DE ENTREGA
-- ========================================

-- Tabela romaneios
CREATE TABLE IF NOT EXISTS `romaneios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `numero_romaneio` VARCHAR(50) NOT NULL,
    `entregador_id` BIGINT UNSIGNED NULL,
    `data_romaneio` DATE NOT NULL,
    `hora_saida` TIME NULL,
    `hora_retorno` TIME NULL,
    `status` ENUM('aberto', 'em_rota', 'finalizado', 'cancelado') NOT NULL DEFAULT 'aberto',
    `quantidade_entregas` INT NOT NULL DEFAULT 0,
    `entregas_realizadas` INT NOT NULL DEFAULT 0,
    `entregas_pendentes` INT NOT NULL DEFAULT 0,
    `observacoes` TEXT NULL,
    `rota_sugerida` JSON NULL COMMENT 'Ordem sugerida dos endereços',
    `distancia_total_km` DECIMAL(10, 2) NULL,
    `tempo_estimado_minutos` INT NULL,
    `endereco_origem` VARCHAR(255) NULL COMMENT 'Endereço da gráfica (ponto de partida)',
    `usuario_criacao_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `romaneios_numero_romaneio_unique` (`numero_romaneio`),
    KEY `romaneios_tenant_id_data_romaneio_index` (`tenant_id`, `data_romaneio`),
    KEY `romaneios_entregador_id_status_index` (`entregador_id`, `status`),
    CONSTRAINT `romaneios_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
    CONSTRAINT `romaneios_entregador_id_foreign` FOREIGN KEY (`entregador_id`) REFERENCES `entregadores` (`id`) ON DELETE SET NULL,
    CONSTRAINT `romaneios_usuario_criacao_id_foreign` FOREIGN KEY (`usuario_criacao_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela romaneio_entregas
CREATE TABLE IF NOT EXISTS `romaneio_entregas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `romaneio_id` BIGINT UNSIGNED NOT NULL,
    `venda_id` BIGINT UNSIGNED NOT NULL,
    `ordem_entrega` INT NOT NULL DEFAULT 0 COMMENT 'Ordem na rota sugerida',
    `status` ENUM('pendente', 'entregue', 'nao_entregue', 'cancelado') NOT NULL DEFAULT 'pendente',
    `data_hora_entrega` DATETIME NULL,
    `observacao_entrega` TEXT NULL,
    `motivo_nao_entrega` TEXT NULL,
    `usuario_confirmacao_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `romaneio_entregas_romaneio_id_venda_id_unique` (`romaneio_id`, `venda_id`),
    KEY `romaneio_entregas_romaneio_id_ordem_entrega_index` (`romaneio_id`, `ordem_entrega`),
    KEY `romaneio_entregas_venda_id_status_index` (`venda_id`, `status`),
    CONSTRAINT `romaneio_entregas_romaneio_id_foreign` FOREIGN KEY (`romaneio_id`) REFERENCES `romaneios` (`id`) ON DELETE CASCADE,
    CONSTRAINT `romaneio_entregas_venda_id_foreign` FOREIGN KEY (`venda_id`) REFERENCES `vendas` (`id`) ON DELETE CASCADE,
    CONSTRAINT `romaneio_entregas_usuario_confirmacao_id_foreign` FOREIGN KEY (`usuario_confirmacao_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar campo endereco_grafica na tabela empresas
SET @col_exists_grafica = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'empresas'
    AND column_name = 'endereco_grafica'
);

SET @sql_grafica = IF(@col_exists_grafica = 0,
    'ALTER TABLE `empresas` ADD COLUMN `endereco_grafica` TEXT NULL COMMENT ''Endereço fixo da gráfica para ponto de partida das rotas'' AFTER `endereco_completo`',
    'SELECT ''Coluna endereco_grafica já existe'' AS status'
);
PREPARE stmt_grafica FROM @sql_grafica;
EXECUTE stmt_grafica;
DEALLOCATE PREPARE stmt_grafica;

-- =====================================================
-- 8. ALTERAÇÕES - RELATÓRIO DE PRODUÇÃO
-- =====================================================
-- Data: 2026-02-14
-- Descrição: Adiciona campos de produção aos itens de OS para relatório de produção

-- Verificar e adicionar coluna data_inicio_producao em ordens_servico_itens (se não existir)
SET @col_inicio_producao = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico_itens' 
    AND column_name = 'data_inicio_producao'
);

SET @sql = IF(@col_inicio_producao = 0,
    'ALTER TABLE `ordens_servico_itens` 
    ADD COLUMN `data_inicio_producao` DATETIME NULL 
    AFTER `detalhes`;',
    'SELECT ''Coluna data_inicio_producao já existe em ordens_servico_itens.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna data_conclusao_producao em ordens_servico_itens (se não existir)
SET @col_conclusao_producao = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico_itens' 
    AND column_name = 'data_conclusao_producao'
);

SET @sql = IF(@col_conclusao_producao = 0,
    'ALTER TABLE `ordens_servico_itens` 
    ADD COLUMN `data_conclusao_producao` DATETIME NULL 
    AFTER `data_inicio_producao`;',
    'SELECT ''Coluna data_conclusao_producao já existe em ordens_servico_itens.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar coluna is_refacao em ordens_servico_itens (se não existir)
SET @col_refacao = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'ordens_servico_itens' 
    AND column_name = 'is_refacao'
);

SET @sql = IF(@col_refacao = 0,
    'ALTER TABLE `ordens_servico_itens` 
    ADD COLUMN `is_refacao` TINYINT(1) NOT NULL DEFAULT 0 
    AFTER `data_conclusao_producao`;',
    'SELECT ''Coluna is_refacao já existe em ordens_servico_itens.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 9. RESUMO FINAL ATUALIZADO
-- =====================================================

SELECT '' AS '';
SELECT 'Colunas verificadas em ordens_servico_itens (Produção):' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ data_inicio_producao'
        ELSE '✗ data_inicio_producao - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'ordens_servico_itens' 
AND column_name = 'data_inicio_producao';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ data_conclusao_producao'
        ELSE '✗ data_conclusao_producao - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'ordens_servico_itens' 
AND column_name = 'data_conclusao_producao';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ is_refacao'
        ELSE '✗ is_refacao - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'ordens_servico_itens' 
AND column_name = 'is_refacao';

-- =====================================================
-- 9. ALTERAÇÕES - DASHBOARD CONFIGURÁVEL
-- =====================================================
-- Data: 2026-02-14
-- Descrição: Sistema de dashboard configurável com widgets personalizáveis e controle de acesso por área

-- Verificar e criar tabela dashboard_widgets (se não existir)
CREATE TABLE IF NOT EXISTS `dashboard_widgets` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(255) NOT NULL UNIQUE,
    `nome` VARCHAR(255) NOT NULL,
    `descricao` TEXT NULL,
    `categoria` VARCHAR(50) NOT NULL DEFAULT 'geral' COMMENT 'geral, financeiro, operacional, vendas, producao',
    `tipo` VARCHAR(50) NOT NULL DEFAULT 'card' COMMENT 'card, grafico, tabela, feed',
    `configuracao_padrao` JSON NULL,
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `ordem` INT NOT NULL DEFAULT 0,
    `icone` VARCHAR(100) NULL,
    `cor_padrao` VARCHAR(50) NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_widgets_categoria` (`categoria`),
    INDEX `idx_widgets_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela dashboard_configs (se não existir)
CREATE TABLE IF NOT EXISTS `dashboard_configs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NULL COMMENT 'null = configuração padrão do tenant',
    `nome_configuracao` VARCHAR(255) NULL COMMENT 'Nome da configuração (para templates)',
    `layout` JSON NULL COMMENT 'Grid layout, posições dos widgets',
    `widgets_visiveis` JSON NULL COMMENT 'Array de códigos de widgets visíveis',
    `is_padrao` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `dashboard_configs_tenant_user_unique` (`tenant_id`, `user_id`),
    INDEX `idx_configs_tenant` (`tenant_id`),
    INDEX `idx_configs_user` (`user_id`),
    CONSTRAINT `fk_dashboard_configs_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_dashboard_configs_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar e criar tabela dashboard_permissions (se não existir)
CREATE TABLE IF NOT EXISTS `dashboard_permissions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `tipo_permissao` VARCHAR(50) NOT NULL DEFAULT 'perfil' COMMENT 'perfil, area, funcao',
    `referencia_id` VARCHAR(255) NULL COMMENT 'ID do perfil, área ou função',
    `widget_codigo` VARCHAR(255) NOT NULL,
    `pode_ver` TINYINT(1) NOT NULL DEFAULT 1,
    `pode_configurar` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_dash_perm_tenant_tipo_ref` (`tenant_id`, `tipo_permissao`, `referencia_id`),
    INDEX `idx_dash_perm_tenant_widget` (`tenant_id`, `widget_codigo`),
    CONSTRAINT `fk_dashboard_permissions_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir widgets padrão
INSERT IGNORE INTO `dashboard_widgets` (`codigo`, `nome`, `descricao`, `categoria`, `tipo`, `icone`, `cor_padrao`, `ordem`, `ativo`) VALUES
('vendas_dia_qtd', 'Vendas do Dia (Qtd)', 'Quantidade de vendas realizadas hoje', 'vendas', 'card', 'ShoppingCart', 'green', 1, 1),
('vendas_dia_valor', 'Vendas do Dia (Valor)', 'Valor total vendido hoje', 'vendas', 'card', 'DollarSign', 'green', 2, 1),
('os_aberto', 'OS em Aberto', 'Quantidade de ordens de serviço em aberto', 'operacional', 'card', 'ClipboardList', 'indigo', 3, 1),
('os_em_producao', 'OS em Produção', 'Quantidade de ordens em produção', 'operacional', 'card', 'Package', 'blue', 4, 1),
('envelopamentos_orcados', 'Orç. Envelopamento', 'Envelopamentos orçados', 'operacional', 'card', 'Palette', 'purple', 5, 1),
('estoque_baixo', 'Estoque Baixo', 'Itens com estoque abaixo do mínimo', 'operacional', 'card', 'Archive', 'orange', 6, 1),
('total_clientes', 'Total de Clientes', 'Quantidade total de clientes cadastrados', 'geral', 'card', 'Users', 'blue', 7, 1),
('total_receber', 'Total à Receber', 'Valor total a receber de clientes', 'financeiro', 'card', 'DollarSign', 'green', 8, 1),
('total_pagar', 'Total à Pagar', 'Valor total a pagar', 'financeiro', 'card', 'MinusCircle', 'red', 9, 1),
('ticket_medio', 'Ticket Médio', 'Valor médio por venda', 'vendas', 'card', 'TrendingUp', 'blue', 10, 1),
('novos_clientes_mes', 'Novos Clientes (Mês)', 'Clientes cadastrados este mês', 'vendas', 'card', 'UserPlus', 'green', 11, 1),
('vendas_mes', 'Vendas do Mês', 'Total de vendas realizadas este mês', 'vendas', 'card', 'Calendar', 'blue', 12, 1),
('faturamento_mes', 'Faturamento do Mês', 'Faturamento total do mês atual', 'financeiro', 'card', 'TrendingUp', 'green', 13, 1),
('producao_trabalhos', 'Trabalhos em Produção', 'Total de trabalhos em produção', 'producao', 'card', 'Factory', 'yellow', 14, 1),
('producao_concluidos', 'Trabalhos Concluídos', 'Trabalhos concluídos no período', 'producao', 'card', 'CheckCircle2', 'green', 15, 1),
('producao_atrasados', 'Trabalhos Atrasados', 'Trabalhos com atraso', 'producao', 'card', 'AlertCircle', 'red', 16, 1),
('feed_vendas', 'Feed de Vendas', 'Últimas vendas realizadas', 'vendas', 'feed', 'ShoppingCart', 'blue', 20, 1),
('feed_os', 'Feed de OS', 'Últimas ordens de serviço', 'operacional', 'feed', 'ClipboardList', 'indigo', 21, 1),
('feed_envelopamentos', 'Feed de Envelopamentos', 'Últimos envelopamentos', 'operacional', 'feed', 'Palette', 'purple', 22, 1),
('grafico_vendas_mes', 'Gráfico de Vendas (Mês)', 'Gráfico de vendas do mês', 'vendas', 'grafico', 'BarChart3', 'blue', 30, 1),
('grafico_faturamento', 'Gráfico de Faturamento', 'Gráfico de faturamento', 'financeiro', 'grafico', 'TrendingUp', 'green', 31, 1),
('tabela_produtos_vendidos', 'Produtos Mais Vendidos', 'Tabela com produtos mais vendidos', 'vendas', 'tabela', 'Package', 'blue', 40, 1),
('tabela_contas_receber', 'Contas a Receber', 'Tabela de contas a receber', 'financeiro', 'tabela', 'DollarSign', 'green', 41, 1),
('tabela_contas_pagar', 'Contas a Pagar', 'Tabela de contas a pagar', 'financeiro', 'tabela', 'MinusCircle', 'red', 42, 1),
('agenda_hoje', 'Agenda de Hoje', 'Compromissos agendados para hoje', 'geral', 'tabela', 'Calendar', 'blue', 50, 1),
('proximos_compromissos', 'Próximos Compromissos', 'Próximos compromissos agendados', 'geral', 'tabela', 'CalendarClock', 'blue', 51, 1);

-- =====================================================
-- 10. RESUMO FINAL ATUALIZADO
-- =====================================================

SELECT '' AS '';
SELECT 'Tabelas de Dashboard verificadas:' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ dashboard_widgets - ', COUNT(*), ' registro(s)')
        ELSE '✗ dashboard_widgets - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'dashboard_widgets';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ dashboard_configs - ', COUNT(*), ' registro(s)')
        ELSE '✗ dashboard_configs - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'dashboard_configs';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ dashboard_permissions - ', COUNT(*), ' registro(s)')
        ELSE '✗ dashboard_permissions - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'dashboard_permissions';

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'FIM DO SCRIPT' AS '';
SELECT '========================================' AS '';
