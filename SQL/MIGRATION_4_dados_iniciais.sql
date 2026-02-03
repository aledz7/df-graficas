INSERT INTO `configuracao_fechamento_mes` (`tenant_id`, `dia_fechamento`, `ativo`, `created_at`, `updated_at`)
SELECT `id`, 25, 0, NOW(), NOW() 
FROM `tenants`
WHERE NOT EXISTS (
    SELECT 1 FROM `configuracao_fechamento_mes` 
    WHERE `configuracao_fechamento_mes`.`tenant_id` = `tenants`.`id`
);
