CREATE TABLE IF NOT EXISTS `configuracao_fechamento_mes` (
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
