-- Script para debugar problema de cliente bloqueado para crediário
-- Execute este script no seu banco de dados para verificar o status

-- 1. Verificar todos os clientes e seus status de autorização para prazo
SELECT 
    id,
    nome_completo,
    autorizado_prazo,
    CASE 
        WHEN autorizado_prazo = 1 THEN 'SIM - Autorizado'
        WHEN autorizado_prazo = 0 THEN 'NÃO - Bloqueado'
        WHEN autorizado_prazo IS NULL THEN 'NULL - Não definido'
        ELSE 'OUTRO - ' || autorizado_prazo
    END as status_autorizacao,
    tenant_id,
    created_at,
    updated_at
FROM clientes 
WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = 1 LIMIT 1) -- Ajuste o ID do usuário conforme necessário
ORDER BY nome_completo;

-- 2. Verificar se há inconsistências no campo autorizado_prazo
SELECT 
    autorizado_prazo,
    COUNT(*) as total_clientes,
    GROUP_CONCAT(nome_completo SEPARATOR ', ') as nomes_clientes
FROM clientes 
WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = 1 LIMIT 1)
GROUP BY autorizado_prazo;

-- 3. Verificar estrutura da tabela clientes
DESCRIBE clientes;

-- 4. Verificar se o campo autorizado_prazo tem valores corretos
SELECT DISTINCT autorizado_prazo FROM clientes WHERE autorizado_prazo IS NOT NULL;

-- 5. Verificar clientes específicos por nome (ajuste o nome conforme necessário)
SELECT 
    id,
    nome_completo,
    autorizado_prazo,
    CASE 
        WHEN autorizado_prazo = 1 THEN 'SIM - Autorizado'
        WHEN autorizado_prazo = 0 THEN 'NÃO - Bloqueado'
        WHEN autorizado_prazo IS NULL THEN 'NULL - Não definido'
        ELSE 'OUTRO - ' || autorizado_prazo
    END as status_autorizacao
FROM clientes 
WHERE nome_completo LIKE '%NOME_DO_CLIENTE%' -- Substitua pelo nome do cliente que está sendo testado
AND tenant_id = (SELECT tenant_id FROM users WHERE id = 1 LIMIT 1);
