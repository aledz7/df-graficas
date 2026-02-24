-- =====================================================
-- SCRIPT INCREMENTAL DE CRIAÇÃO DAS TABELAS DO KANBAN
-- Data: 2026-02-15
-- Descrição: Versão que verifica existência antes de criar
--            Ideal para atualização em produção sem perder dados
-- =====================================================

-- =====================================================
-- TABELA: kanban_columns
-- =====================================================
CREATE TABLE IF NOT EXISTS `kanban_columns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `nome` VARCHAR(255) NOT NULL,
  `cor` VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  `ordem` INT NOT NULL DEFAULT 0,
  `is_obrigatoria` TINYINT(1) NOT NULL DEFAULT 0,
  `is_sistema` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kanban_col_tenant_user_ordem` (`tenant_id`, `user_id`, `ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys se não existirem
SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_columns_tenant_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_columns` ADD CONSTRAINT `kanban_columns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key kanban_columns_tenant_id_foreign already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_columns_user_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_columns` ADD CONSTRAINT `kanban_columns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key kanban_columns_user_id_foreign already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- TABELA: kanban_os_positions
-- =====================================================
CREATE TABLE IF NOT EXISTS `kanban_os_positions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `ordem_servico_id` BIGINT UNSIGNED NOT NULL,
  `kanban_coluna_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `ordem` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_os_user` (`ordem_servico_id`, `user_id`),
  KEY `idx_kanban_pos_tenant_user_col` (`tenant_id`, `user_id`, `kanban_coluna_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys se não existirem
SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_os_positions_tenant_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_os_positions` ADD CONSTRAINT `kanban_os_positions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_os_positions_ordem_servico_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_os_positions` ADD CONSTRAINT `kanban_os_positions_ordem_servico_id_foreign` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_os_positions_kanban_coluna_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_os_positions` ADD CONSTRAINT `kanban_os_positions_kanban_coluna_id_foreign` FOREIGN KEY (`kanban_coluna_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE constraint_name = 'kanban_os_positions_user_id_foreign' 
               AND table_schema = DATABASE());
SET @sqlstmt := IF(@exist = 0, 
  'ALTER TABLE `kanban_os_positions` ADD CONSTRAINT `kanban_os_positions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE',
  'SELECT "Foreign key already exists" AS message');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- TABELA: kanban_movimentacoes
-- =====================================================
CREATE TABLE IF NOT EXISTS `kanban_movimentacoes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `ordem_servico_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `coluna_anterior_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `coluna_nova_id` BIGINT UNSIGNED NOT NULL,
  `data_movimentacao` TIMESTAMP NOT NULL,
  `observacao` TEXT NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_kanban_mov_tenant_user_os` (`tenant_id`, `user_id`, `ordem_servico_id`),
  KEY `idx_kanban_mov_data` (`data_movimentacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys se não existirem (similar ao padrão acima)
-- ... (repetir padrão para todas as foreign keys)

-- =====================================================
-- TABELA: kanban_os_items_progress
-- =====================================================
CREATE TABLE IF NOT EXISTS `kanban_os_items_progress` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` BIGINT UNSIGNED NOT NULL,
  `ordem_servico_id` BIGINT UNSIGNED NOT NULL,
  `ordem_servico_item_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `concluido` TINYINT(1) NOT NULL DEFAULT 0,
  `data_conclusao` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_item_user` (`ordem_servico_item_id`, `user_id`),
  KEY `idx_kanban_progress_tenant_user_os` (`tenant_id`, `user_id`, `ordem_servico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- RECOMENDAÇÃO: Use o script kanban_tables_safe.sql
-- Este script incremental é mais complexo e pode ter problemas
-- =====================================================
