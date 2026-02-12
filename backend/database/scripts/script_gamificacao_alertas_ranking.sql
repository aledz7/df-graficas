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
SELECT 'Tabela adicional criada:' AS '';
SELECT '  - impressoras_config (para cálculo de aproveitamento de folha)' AS '';
-- =====================================================
-- 7. CRIAR TABELA IMPRESSORAS_CONFIG
-- =====================================================

CREATE TABLE IF NOT EXISTS `impressoras_config` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(255) NOT NULL COMMENT 'Nome da impressora ou configuração',
    `margem_superior_mm` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Margem superior não imprimível em mm',
    `margem_inferior_mm` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Margem inferior não imprimível em mm',
    `margem_esquerda_mm` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Margem esquerda não imprimível em mm',
    `margem_direita_mm` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Margem direita não imprimível em mm',
    `padrao` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Se é a configuração padrão',
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_impressoras_tenant_ativo` (`tenant_id`, `ativo`),
    INDEX `idx_impressoras_tenant_padrao` (`tenant_id`, `padrao`),
    CONSTRAINT `fk_impressoras_config_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE TABELA IMPRESSORAS_CONFIG' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ impressoras_config - ', COUNT(*), ' registro(s)')
        ELSE '✗ impressoras_config - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'impressoras_config';

-- =====================================================
-- 8. CRIAR TABELA TREINAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS `treinamento` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `pergunta` VARCHAR(500) NOT NULL,
    `resposta` TEXT NOT NULL,
    `setor` ENUM('atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral') NOT NULL DEFAULT 'geral',
    `nivel` ENUM('iniciante', 'intermediario', 'avancado') NOT NULL DEFAULT 'iniciante',
    `ordem` INT NOT NULL DEFAULT 0 COMMENT 'Ordem de aprendizado',
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `usuario_criacao_id` BIGINT UNSIGNED NULL,
    `usuario_edicao_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_treinamento_tenant_setor_ativo` (`tenant_id`, `setor`, `ativo`),
    INDEX `idx_treinamento_tenant_nivel_ordem` (`tenant_id`, `nivel`, `ordem`),
    INDEX `idx_treinamento_tenant_ativo_ordem` (`tenant_id`, `ativo`, `ordem`),
    FULLTEXT INDEX `idx_treinamento_busca` (`pergunta`, `resposta`),
    CONSTRAINT `fk_treinamento_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_treinamento_usuario_criacao` 
        FOREIGN KEY (`usuario_criacao_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL,
    CONSTRAINT `fk_treinamento_usuario_edicao` 
        FOREIGN KEY (`usuario_edicao_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE TABELA TREINAMENTO' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ treinamento - ', COUNT(*), ' registro(s)')
        ELSE '✗ treinamento - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'treinamento';

-- =====================================================
-- 9. ADICIONAR CAMPOS DE TREINAMENTO EM USERS
-- =====================================================

SET @col_setor = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'setor'
);

SET @sql = IF(@col_setor = 0,
    'ALTER TABLE `users` ADD COLUMN `setor` ENUM(''atendimento'', ''vendas'', ''producao'', ''design'', ''financeiro'', ''geral'') NULL AFTER `cargo`;',
    'SELECT ''Coluna setor já existe em users.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_nivel = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'nivel_treinamento_liberado'
);

SET @sql = IF(@col_nivel = 0,
    'ALTER TABLE `users` ADD COLUMN `nivel_treinamento_liberado` ENUM(''iniciante'', ''intermediario'', ''avancado'') NOT NULL DEFAULT ''iniciante'' AFTER `setor`;',
    'SELECT ''Coluna nivel_treinamento_liberado já existe em users.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_progresso = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'progresso_treinamento'
);

SET @sql = IF(@col_progresso = 0,
    'ALTER TABLE `users` ADD COLUMN `progresso_treinamento` DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT ''Percentual de progresso no treinamento'' AFTER `nivel_treinamento_liberado`;',
    'SELECT ''Coluna progresso_treinamento já existe em users.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_ultimo_acesso = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND column_name = 'ultimo_acesso_treinamento'
);

SET @sql = IF(@col_ultimo_acesso = 0,
    'ALTER TABLE `users` ADD COLUMN `ultimo_acesso_treinamento` TIMESTAMP NULL AFTER `progresso_treinamento`;',
    'SELECT ''Coluna ultimo_acesso_treinamento já existe em users.'' AS mensagem;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 10. CRIAR TABELA TREINAMENTO_PROGRESSO
-- =====================================================

CREATE TABLE IF NOT EXISTS `treinamento_progresso` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `treinamento_id` BIGINT UNSIGNED NOT NULL,
    `concluido` TINYINT(1) NOT NULL DEFAULT 0,
    `data_conclusao` TIMESTAMP NULL,
    `tempo_leitura_segundos` INT NULL COMMENT 'Tempo gasto lendo o conteúdo',
    `observacoes` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `unique_usuario_treinamento` (`usuario_id`, `treinamento_id`),
    INDEX `idx_progresso_tenant_usuario_concluido` (`tenant_id`, `usuario_id`, `concluido`),
    INDEX `idx_progresso_tenant_treinamento_concluido` (`tenant_id`, `treinamento_id`, `concluido`),
    CONSTRAINT `fk_treinamento_progresso_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_treinamento_progresso_usuario` 
        FOREIGN KEY (`usuario_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_treinamento_progresso_treinamento` 
        FOREIGN KEY (`treinamento_id`) 
        REFERENCES `treinamento` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. CRIAR TABELA TREINAMENTO_AVISOS
-- =====================================================

CREATE TABLE IF NOT EXISTS `treinamento_avisos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `usuario_id` BIGINT UNSIGNED NOT NULL,
    `tipo` ENUM('nivel_nao_concluido', 'treinamento_atrasado', 'setor_incompleto') NOT NULL DEFAULT 'treinamento_atrasado',
    `titulo` VARCHAR(255) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `nivel_esperado` ENUM('iniciante', 'intermediario', 'avancado') NULL,
    `dias_atraso` INT NOT NULL DEFAULT 0,
    `data_limite` DATE NULL,
    `status` ENUM('pendente', 'resolvido', 'ignorado') NOT NULL DEFAULT 'pendente',
    `data_resolucao` TIMESTAMP NULL,
    `resolvido_por_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_avisos_tenant_usuario_status` (`tenant_id`, `usuario_id`, `status`),
    INDEX `idx_avisos_tenant_status_tipo` (`tenant_id`, `status`, `tipo`),
    INDEX `idx_avisos_tenant_data_limite_status` (`tenant_id`, `data_limite`, `status`),
    CONSTRAINT `fk_treinamento_avisos_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_treinamento_avisos_usuario` 
        FOREIGN KEY (`usuario_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE CASCADE,
    CONSTRAINT `fk_treinamento_avisos_resolvido_por` 
        FOREIGN KEY (`resolvido_por_id`) 
        REFERENCES `users` (`id`) 
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. CRIAR TABELA TREINAMENTO_REGRAS_ALERTA
-- =====================================================

CREATE TABLE IF NOT EXISTS `treinamento_regras_alerta` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tenant_id` BIGINT UNSIGNED NOT NULL,
    `nome` VARCHAR(255) NOT NULL COMMENT 'Nome da regra (ex: Nível 1 em 7 dias)',
    `tipo` ENUM('nivel_nao_concluido', 'treinamento_atrasado', 'setor_incompleto') NOT NULL DEFAULT 'treinamento_atrasado',
    `nivel_alvo` ENUM('iniciante', 'intermediario', 'avancado') NULL,
    `setor_alvo` ENUM('atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral', 'todos') NOT NULL DEFAULT 'todos',
    `prazo_dias` INT NOT NULL COMMENT 'Prazo em dias para concluir',
    `ativo` TINYINT(1) NOT NULL DEFAULT 1,
    `notificar_colaborador` TINYINT(1) NOT NULL DEFAULT 1,
    `notificar_gestor` TINYINT(1) NOT NULL DEFAULT 1,
    `mensagem_personalizada` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_regras_tenant_ativo` (`tenant_id`, `ativo`),
    INDEX `idx_regras_tenant_tipo_ativo` (`tenant_id`, `tipo`, `ativo`),
    CONSTRAINT `fk_treinamento_regras_tenant` 
        FOREIGN KEY (`tenant_id`) 
        REFERENCES `tenants` (`id`) 
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE TABELAS DE TREINAMENTO' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ treinamento_progresso - ', COUNT(*), ' registro(s)')
        ELSE '✗ treinamento_progresso - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'treinamento_progresso';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ treinamento_avisos - ', COUNT(*), ' registro(s)')
        ELSE '✗ treinamento_avisos - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'treinamento_avisos';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ treinamento_regras_alerta - ', COUNT(*), ' registro(s)')
        ELSE '✗ treinamento_regras_alerta - Tabela não encontrada'
    END AS status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'treinamento_regras_alerta';

SELECT '' AS '';
SELECT 'VERIFICAÇÃO DE COLUNAS EM USERS' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ setor'
        ELSE '✗ setor - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'users' 
AND column_name = 'setor';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ nivel_treinamento_liberado'
        ELSE '✗ nivel_treinamento_liberado - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'users' 
AND column_name = 'nivel_treinamento_liberado';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ progresso_treinamento'
        ELSE '✗ progresso_treinamento - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'users' 
AND column_name = 'progresso_treinamento';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ ultimo_acesso_treinamento'
        ELSE '✗ ultimo_acesso_treinamento - Coluna não encontrada'
    END AS status
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
AND table_name = 'users' 
AND column_name = 'ultimo_acesso_treinamento';

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'FIM DO SCRIPT' AS '';
SELECT '========================================' AS '';
