-- =====================================================
-- SQL PARA SISTEMA DE FECHAMENTO AUTOMÁTICO DE MÊS
-- =====================================================
-- Este arquivo contém todas as migrations necessárias
-- para implementar o sistema de fechamento automático
-- de mês para funcionários.
-- =====================================================

-- 1. CRIAR TABELA DE CONFIGURAÇÃO DE FECHAMENTO DE MÊS
-- =====================================================
CREATE TABLE `configuracao_fechamento_mes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `dia_fechamento` int(11) NOT NULL DEFAULT 25,
  `ativo` tinyint(1) NOT NULL DEFAULT 0,
  `usuario_configuracao_id` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `configuracao_fechamento_mes_tenant_id_unique` (`tenant_id`),
  KEY `configuracao_fechamento_mes_tenant_id_index` (`tenant_id`),
  CONSTRAINT `configuracao_fechamento_mes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `configuracao_fechamento_mes_usuario_configuracao_id_foreign` FOREIGN KEY (`usuario_configuracao_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CRIAR TABELA DE HISTÓRICO DE FECHAMENTO DE MÊS
-- =====================================================
CREATE TABLE `historico_fechamento_mes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` enum('fechamento','abertura','reabertura') NOT NULL DEFAULT 'fechamento',
  `mes` int(11) NOT NULL,
  `ano` int(11) NOT NULL,
  `data_acao` timestamp NOT NULL,
  `usuario_id` bigint(20) UNSIGNED DEFAULT NULL,
  `automatico` tinyint(1) NOT NULL DEFAULT 0,
  `quantidade_holerites` int(11) NOT NULL DEFAULT 0,
  `observacoes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `historico_fechamento_mes_tenant_id_index` (`tenant_id`),
  KEY `historico_fechamento_mes_tipo_index` (`tipo`),
  KEY `historico_fechamento_mes_mes_index` (`mes`,`ano`),
  KEY `historico_fechamento_mes_data_acao_index` (`data_acao`),
  CONSTRAINT `historico_fechamento_mes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `historico_fechamento_mes_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ADICIONAR CAMPO CONSUMO INTERNO NA TABELA HOLERITES
-- =====================================================
-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
  AND table_name = 'holerites' 
  AND column_name = 'total_consumo_interno';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE `holerites` ADD `total_consumo_interno` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `total_comissoes`',
  'SELECT "Coluna total_consumo_interno já existe na tabela holerites" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- INSERIR DADOS INICIAIS (OPCIONAL)
-- =====================================================
-- Criar configuração padrão para cada tenant existente
INSERT INTO `configuracao_fechamento_mes` (`tenant_id`, `dia_fechamento`, `ativo`, `created_at`, `updated_at`)
SELECT 
    `id` as `tenant_id`,
    25 as `dia_fechamento`,
    0 as `ativo`,
    NOW() as `created_at`,
    NOW() as `updated_at`
FROM `tenants`
WHERE NOT EXISTS (
    SELECT 1 FROM `configuracao_fechamento_mes` 
    WHERE `configuracao_fechamento_mes`.`tenant_id` = `tenants`.`id`
);

-- =====================================================
-- MIGRAR HISTÓRICO DE FECHAMENTOS ANTIGOS (OPCIONAL)
-- =====================================================
-- Este script migra fechamentos antigos baseado nos holerites existentes
-- Execute apenas se quiser migrar o histórico de fechamentos já existentes

INSERT INTO `historico_fechamento_mes` (
    `tenant_id`, 
    `tipo`, 
    `mes`, 
    `ano`, 
    `data_acao`, 
    `usuario_id`, 
    `automatico`, 
    `quantidade_holerites`, 
    `observacoes`, 
    `created_at`, 
    `updated_at`
)
SELECT 
    `tenant_id`,
    'fechamento' as `tipo`,
    `mes`,
    `ano`,
    COALESCE(`data_fechamento`, `created_at`) as `data_acao`,
    `usuario_fechamento_id` as `usuario_id`,
    0 as `automatico`,
    COUNT(*) as `quantidade_holerites`,
    'Migrado automaticamente de fechamentos antigos' as `observacoes`,
    NOW() as `created_at`,
    NOW() as `updated_at`
FROM `holerites`
WHERE `fechado` = 1
  AND NOT EXISTS (
      SELECT 1 FROM `historico_fechamento_mes` hfm 
      WHERE hfm.`tenant_id` = `holerites`.`tenant_id`
        AND hfm.`mes` = `holerites`.`mes`
        AND hfm.`ano` = `holerites`.`ano`
        AND hfm.`tipo` = 'fechamento'
  )
GROUP BY `tenant_id`, `mes`, `ano`, `data_fechamento`, `usuario_fechamento_id`;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
-- Verificar se as tabelas foram criadas corretamente
SELECT 'Verificação das tabelas criadas:' as status;

SELECT 
    TABLE_NAME as 'Tabela',
    TABLE_ROWS as 'Registros',
    CREATE_TIME as 'Criada em'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('configuracao_fechamento_mes', 'historico_fechamento_mes');

-- Verificar se a coluna foi adicionada na tabela holerites
SELECT 
    COLUMN_NAME as 'Coluna',
    DATA_TYPE as 'Tipo',
    IS_NULLABLE as 'Pode ser NULL',
    COLUMN_DEFAULT as 'Valor Padrão'
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'holerites' 
  AND COLUMN_NAME = 'total_consumo_interno';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
