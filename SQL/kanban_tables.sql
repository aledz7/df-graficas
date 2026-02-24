-- =====================================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS DO KANBAN
-- Data: 2026-02-15
-- Descrição: Criação das tabelas para o sistema Kanban
-- =====================================================

-- Verificar e criar tabela de colunas Kanban
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
  KEY `kanban_columns_tenant_id_foreign` (`tenant_id`),
  KEY `kanban_columns_user_id_foreign` (`user_id`),
  KEY `idx_kanban_col_tenant_user_ordem` (`tenant_id`, `user_id`, `ordem`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys para kanban_columns
ALTER TABLE `kanban_columns`
  ADD CONSTRAINT `kanban_columns_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_columns_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- Verificar e criar tabela de posições das OS no Kanban
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
  KEY `kanban_os_positions_tenant_id_foreign` (`tenant_id`),
  KEY `kanban_os_positions_ordem_servico_id_foreign` (`ordem_servico_id`),
  KEY `kanban_os_positions_kanban_coluna_id_foreign` (`kanban_coluna_id`),
  KEY `kanban_os_positions_user_id_foreign` (`user_id`),
  KEY `idx_kanban_pos_tenant_user_col` (`tenant_id`, `user_id`, `kanban_coluna_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys para kanban_os_positions
ALTER TABLE `kanban_os_positions`
  ADD CONSTRAINT `kanban_os_positions_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_positions_ordem_servico_id_foreign` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_positions_kanban_coluna_id_foreign` FOREIGN KEY (`kanban_coluna_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_positions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- Verificar e criar tabela de movimentações (log)
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
  KEY `kanban_movimentacoes_tenant_id_foreign` (`tenant_id`),
  KEY `kanban_movimentacoes_ordem_servico_id_foreign` (`ordem_servico_id`),
  KEY `kanban_movimentacoes_user_id_foreign` (`user_id`),
  KEY `kanban_movimentacoes_coluna_anterior_id_foreign` (`coluna_anterior_id`),
  KEY `kanban_movimentacoes_coluna_nova_id_foreign` (`coluna_nova_id`),
  KEY `idx_kanban_mov_tenant_user_os` (`tenant_id`, `user_id`, `ordem_servico_id`),
  KEY `idx_kanban_mov_data` (`data_movimentacao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys para kanban_movimentacoes
ALTER TABLE `kanban_movimentacoes`
  ADD CONSTRAINT `kanban_movimentacoes_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_movimentacoes_ordem_servico_id_foreign` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_movimentacoes_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_movimentacoes_coluna_anterior_id_foreign` FOREIGN KEY (`coluna_anterior_id`) REFERENCES `kanban_columns` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `kanban_movimentacoes_coluna_nova_id_foreign` FOREIGN KEY (`coluna_nova_id`) REFERENCES `kanban_columns` (`id`) ON DELETE CASCADE;

-- Verificar e criar tabela de progresso de itens da OS (checklist)
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
  KEY `kanban_os_items_progress_tenant_id_foreign` (`tenant_id`),
  KEY `kanban_os_items_progress_ordem_servico_id_foreign` (`ordem_servico_id`),
  KEY `kanban_os_items_progress_ordem_servico_item_id_foreign` (`ordem_servico_item_id`),
  KEY `kanban_os_items_progress_user_id_foreign` (`user_id`),
  KEY `idx_kanban_progress_tenant_user_os` (`tenant_id`, `user_id`, `ordem_servico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adicionar foreign keys para kanban_os_items_progress
ALTER TABLE `kanban_os_items_progress`
  ADD CONSTRAINT `kanban_os_items_progress_tenant_id_foreign` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_items_progress_ordem_servico_id_foreign` FOREIGN KEY (`ordem_servico_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_items_progress_ordem_servico_item_id_foreign` FOREIGN KEY (`ordem_servico_item_id`) REFERENCES `ordens_servico_itens` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `kanban_os_items_progress_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
