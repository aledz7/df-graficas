-- SQL para adicionar coluna servicos_adicionais_aplicados na tabela envelopamentos
-- Execute este SQL no banco de dados online

-- Verificar se a coluna já existe antes de adicionar
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'envelopamentos' 
    AND COLUMN_NAME = 'servicos_adicionais_aplicados'
);

-- Adicionar a coluna apenas se ela não existir
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `envelopamentos` 
     ADD COLUMN `servicos_adicionais_aplicados` JSON NULL 
     COMMENT ''Array de serviços adicionais aplicados com id e nome''
     AFTER `custo_total_adicionais`',
    'SELECT ''Coluna servicos_adicionais_aplicados já existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Versão alternativa sem verificação (use apenas se tiver certeza que a coluna não existe):
-- ALTER TABLE `envelopamentos` 
-- ADD COLUMN `servicos_adicionais_aplicados` JSON NULL 
-- COMMENT 'Array de serviços adicionais aplicados com id e nome'
-- AFTER `custo_total_adicionais`;

