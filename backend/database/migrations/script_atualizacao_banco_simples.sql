-- =====================================================
-- SCRIPT DE ATUALIZAÇÃO DO BANCO DE DADOS - VERSÃO SIMPLES
-- Data: 2025-01-29
-- Descrição: Adiciona campos de finalização obrigatória de OS
--            e expande sistema de notificações
-- 
-- ATENÇÃO: Este script não verifica se as colunas já existem.
--          Use apenas se tiver certeza de que as colunas não existem.
--          Caso contrário, use o script_atualizacao_banco_seguro.sql
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

-- Adicionar coluna os_id
ALTER TABLE `notifications` 
ADD COLUMN `os_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `user_id`;

-- Adicionar foreign key para os_id
ALTER TABLE `notifications`
ADD CONSTRAINT `notifications_os_id_foreign`
FOREIGN KEY (`os_id`) REFERENCES `ordens_servico` (`id`) ON DELETE CASCADE;

-- Adicionar índice composto para os_id e read
ALTER TABLE `notifications`
ADD INDEX `notifications_os_id_read_index` (`os_id`, `read`);

-- Adicionar coluna priority
ALTER TABLE `notifications`
ADD COLUMN `priority` ENUM('BAIXA', 'MEDIA', 'ALTA', 'CRITICA') NOT NULL DEFAULT 'MEDIA' AFTER `type`;

-- Adicionar coluna read_at
ALTER TABLE `notifications`
ADD COLUMN `read_at` TIMESTAMP NULL DEFAULT NULL AFTER `read`;

-- Tornar user_id nullable (se ainda não for)
ALTER TABLE `notifications`
MODIFY COLUMN `user_id` VARCHAR(255) NULL DEFAULT NULL;

-- =====================================================
-- 3. ATUALIZAÇÃO DE DADOS EXISTENTES
-- =====================================================

-- Atualizar notificações existentes sem priority para MEDIA
UPDATE `notifications`
SET `priority` = 'MEDIA'
WHERE `priority` IS NULL OR `priority` = '';

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
