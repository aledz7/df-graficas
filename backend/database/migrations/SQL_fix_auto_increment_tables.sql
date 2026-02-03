-- Script SQL para corrigir campos id que não são auto-incremento
-- Execute este script diretamente no banco de dados MySQL

-- Corrigir tabela migrations
ALTER TABLE `migrations` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Corrigir tabela personal_access_tokens
ALTER TABLE `personal_access_tokens` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;

-- Verificar outras tabelas comuns do Laravel que podem ter o mesmo problema
-- Se necessário, adicione mais tabelas aqui seguindo o mesmo padrão

