-- Script SQL para identificar contas a receber problemáticas
-- Execute no MySQL para identificar de onde vêm os valores "Não informado"

-- 1. Contas com cliente_id NULL
SELECT 
    id,
    cliente_id,
    descricao,
    valor_original,
    valor_pendente,
    status,
    venda_id,
    os_id,
    envelopamento_id,
    data_emissao,
    data_vencimento,
    created_at
FROM contas_receber
WHERE cliente_id IS NULL;

-- 2. Contas com cliente_id que não existe na tabela clientes
SELECT 
    cr.id,
    cr.cliente_id,
    cr.descricao,
    cr.valor_original,
    cr.valor_pendente,
    cr.status,
    cr.venda_id,
    cr.os_id,
    cr.envelopamento_id
FROM contas_receber cr
LEFT JOIN clientes c ON cr.cliente_id = c.id
WHERE cr.cliente_id IS NOT NULL 
AND c.id IS NULL;

-- 3. Contas com cliente válido mas sem nome
SELECT 
    cr.id,
    cr.cliente_id,
    c.nome_completo,
    c.apelido_fantasia,
    cr.descricao,
    cr.valor_original,
    cr.valor_pendente,
    cr.status
FROM contas_receber cr
INNER JOIN clientes c ON cr.cliente_id = c.id
WHERE (c.nome_completo IS NULL OR c.nome_completo = '')
AND (c.apelido_fantasia IS NULL OR c.apelido_fantasia = '');

-- 4. Total de contas problemáticas por origem
SELECT 
    CASE 
        WHEN venda_id IS NOT NULL THEN 'Venda'
        WHEN os_id IS NOT NULL THEN 'Ordem de Serviço'
        WHEN envelopamento_id IS NOT NULL THEN 'Envelopamento'
        ELSE 'Lançamento Manual'
    END AS origem,
    COUNT(*) as quantidade,
    SUM(valor_original) as valor_total_original,
    SUM(valor_pendente) as valor_total_pendente,
    status
FROM contas_receber cr
LEFT JOIN clientes c ON cr.cliente_id = c.id
WHERE cr.cliente_id IS NULL 
   OR c.id IS NULL
   OR ((c.nome_completo IS NULL OR c.nome_completo = '') AND (c.apelido_fantasia IS NULL OR c.apelido_fantasia = ''))
GROUP BY origem, status;

-- 5. Listar TODAS as contas problemáticas com seus valores
SELECT 
    cr.id,
    cr.cliente_id,
    COALESCE(c.nome_completo, c.apelido_fantasia, 'SEM NOME') as nome_cliente,
    cr.descricao,
    cr.valor_original,
    cr.valor_pendente,
    cr.juros_aplicados,
    cr.status,
    CASE 
        WHEN cr.venda_id IS NOT NULL THEN CONCAT('Venda #', cr.venda_id)
        WHEN cr.os_id IS NOT NULL THEN CONCAT('OS #', cr.os_id)
        WHEN cr.envelopamento_id IS NOT NULL THEN CONCAT('ENV #', cr.envelopamento_id)
        ELSE 'Lançamento Manual'
    END AS origem,
    cr.data_emissao,
    cr.created_at
FROM contas_receber cr
LEFT JOIN clientes c ON cr.cliente_id = c.id
WHERE cr.cliente_id IS NULL 
   OR c.id IS NULL
   OR ((c.nome_completo IS NULL OR c.nome_completo = '') AND (c.apelido_fantasia IS NULL OR c.apelido_fantasia = ''))
ORDER BY cr.created_at DESC;

