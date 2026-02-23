-- =====================================================
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS
-- Data: 2025-01-29
-- Descrição: Adiciona campos de finalização obrigatória de OS
--            e expande sistema de notificações
-- =====================================================

-- =====================================================
-- 1. ALTERAÇÕES NA TABELA ordens_servico
-- =====================================================

-- Adicionar campos de finalização obrigatória
ALTER TABLE `ordens_servico` 
ADD COLUMN `tem_arte_pronta` TINYINT(1) NULL DEFAULT NULL AFTER `observacoes_gerais_os`,
ADD COLUMN `destino_os` ENUM('CRIACAO', 'PRODUCAO') NULL DEFAULT NULL AFTER `tem_arte_pronta`,
ADD COLUMN `prazo_tipo` ENUM('PADRAO', 'ESPECIFICO') NULL DEFAULT NULL AFTER `destino_os`,
ADD COLUMN `prazo_datahora` TIMESTAMP NULL DEFAULT NULL AFTER `prazo_tipo`,
ADD COLUMN `responsavel_criacao` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `prazo_datahora`;

-- Adicionar foreign key para responsável pela criação
ALTER TABLE `ordens_servico`
ADD CONSTRAINT `ordens_servico_responsavel_criacao_foreign`
FOREIGN KEY (`responsavel_criacao`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- =====================================================
-- 2. ALTERAÇÕES NA TABELA notifications
-- =====================================================

-- Verificar se a coluna tenant_id já existe (pode já ter sido criada)
-- Se não existir, descomente a linha abaixo:
-- ALTER TABLE `notifications` ADD COLUMN `tenant_id` VARCHAR(255) NULL DEFAULT NULL AFTER `id`;

-- Adicionar coluna os_id (se não existir)
ALTER TABLE `notifications` 
ADD COLUMN `os_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `user_id`;

-- Adicionar foreign key para os_id
ALTER TABLE `notifications`
ADD CONSTRAINT `notifications_os_id_foreign`
FOREIGN KEY (`os_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE;

-- Adicionar índice composto para os_id e read
ALTER TABLE `notifications`
ADD INDEX `notifications_os_id_read_index` (`os_id`, `read`);

-- Adicionar coluna priority (se não existir)
ALTER TABLE `notifications`
ADD COLUMN `priority` ENUM('BAIXA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA' AFTER `type`;

-- Adicionar coluna read_at (se não existir)
ALTER TABLE `notifications`
ADD COLUMN `read_at` TIMESTAMP NULL DEFAULT NULL AFTER `read`;

-- Tornar user_id nullable (se ainda não for)
ALTER TABLE `notifications`
MODIFY COLUMN `user_id` VARCHAR(255) NULL DEFAULT NULL;

-- =====================================================
-- 3. VERIFICAÇÕES E VALIDAÇÕES
-- =====================================================

-- Verificar se as colunas foram criadas corretamente
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'ordens_servico'
AND COLUMN_NAME IN ('tem_arte_pronta', 'destino_os', 'prazo_tipo', 'prazo_datahora', 'responsavel_criacao');

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'notifications'
AND COLUMN_NAME IN ('os_id', 'priority', 'read_at');

-- Verificar foreign keys
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('ordens_servico', 'notifications')
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- =====================================================
-- 4. ATUALIZAÇÃO DE DADOS EXISTENTES (OPCIONAL)
-- =====================================================

-- Atualizar notificações existentes sem priority para MEDIA
UPDATE `notifications`
SET `priority` = 'MEDIA'
WHERE `priority` IS NULL OR `priority` = '';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
