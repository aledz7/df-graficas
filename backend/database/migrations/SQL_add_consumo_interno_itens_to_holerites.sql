-- Migration: Add consumo_interno_itens column to holerites table
-- Date: 2025-01-26

-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'holerites'
    AND COLUMN_NAME = 'consumo_interno_itens'
);

-- Adicionar coluna se não existir
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `holerites` ADD COLUMN `consumo_interno_itens` JSON NULL AFTER `total_consumo_interno`',
    'SELECT "Column consumo_interno_itens already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Versão simplificada (sem verificação):
-- ALTER TABLE `holerites` ADD COLUMN `consumo_interno_itens` JSON NULL AFTER `total_consumo_interno`;

-- Para reverter (remover a coluna):
-- ALTER TABLE `holerites` DROP COLUMN IF EXISTS `consumo_interno_itens`;

