-- =====================================================
-- SQL SIMPLES - FECHAMENTO AUTOMÁTICO DE MÊS
-- =====================================================

-- 1. CRIAR TABELA DE CONFIGURAÇÃO
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

-- 2. CRIAR TABELA DE HISTÓRICO
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

-- 3. ADICIONAR COLUNA CONSUMO INTERNO
ALTER TABLE `holerites` ADD `total_consumo_interno` decimal(10,2) NOT NULL DEFAULT 0.00 AFTER `total_comissoes`;

-- 4. CRIAR CONFIGURAÇÕES PADRÃO PARA CADA TENANT
INSERT INTO `configuracao_fechamento_mes` (`tenant_id`, `dia_fechamento`, `ativo`, `created_at`, `updated_at`)
SELECT `id`, 25, 0, NOW(), NOW() FROM `tenants`;
