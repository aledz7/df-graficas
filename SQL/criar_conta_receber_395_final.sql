-- =====================================================
-- Script SQL para criar conta a receber do Envelopamento 395
-- =====================================================

-- PASSO 1: Ver dados do envelopamento 395
SELECT 
    id,
    tenant_id,
    codigo_orcamento,
    cliente,
    funcionario_id,
    vendedor_id,
    orcamento_total,
    pagamentos,
    DATE(data_criacao) as data_criacao,
    observacao
FROM envelopamentos 
WHERE id = 395;

-- PASSO 2: Verificar se já existe conta
SELECT * FROM contas_receber WHERE envelopamento_id = 395;

-- PASSO 3: INSERIR CONTA A RECEBER
-- Este SQL extrai automaticamente os valores do envelopamento
-- IMPORTANTE: Você precisa ajustar o cliente_id e valor_original manualmente
-- se o JSON não for extraído corretamente

INSERT INTO contas_receber (
    tenant_id,
    cliente_id,
    user_id,
    descricao,
    valor_original,
    valor_pendente,
    data_vencimento,
    data_emissao,
    status,
    observacoes,
    envelopamento_id,
    juros_aplicados,
    created_at,
    updated_at
)
SELECT 
    e.tenant_id,
    -- Extrair cliente_id do JSON (ajuste se necessário)
    CASE 
        WHEN JSON_EXTRACT(e.cliente, '$.id') IS NOT NULL 
            THEN CAST(REPLACE(REPLACE(JSON_EXTRACT(e.cliente, '$.id'), '"', ''), 'funcionario_', '') AS UNSIGNED)
        WHEN JSON_EXTRACT(e.cliente, '$.cliente_id') IS NOT NULL 
            THEN CAST(REPLACE(JSON_EXTRACT(e.cliente, '$.cliente_id'), '"', '') AS UNSIGNED)
        ELSE NULL
    END as cliente_id,
    -- user_id
    COALESCE(e.funcionario_id, e.vendedor_id) as user_id,
    -- descricao
    CONCAT('Envelopamento #395', 
           IF(e.observacao IS NOT NULL AND e.observacao != '', 
              CONCAT(' - ', e.observacao), '')) as descricao,
    -- valor_original (AJUSTE MANUALMENTE se necessário)
    -- Tenta extrair do JSON pagamentos, senão usa orcamento_total
    CAST(
        COALESCE(
            JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
            JSON_EXTRACT(e.pagamentos, '$[0].valor'),
            e.orcamento_total
        ) AS DECIMAL(10,2)
    ) as valor_original,
    -- valor_pendente (igual ao original)
    CAST(
        COALESCE(
            JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
            JSON_EXTRACT(e.pagamentos, '$[0].valor'),
            e.orcamento_total
        ) AS DECIMAL(10,2)
    ) as valor_pendente,
    -- data_vencimento (30 dias a partir da criação)
    DATE_ADD(DATE(e.data_criacao), INTERVAL 30 DAY) as data_vencimento,
    -- data_emissao
    DATE(e.data_criacao) as data_emissao,
    -- status
    'pendente' as status,
    -- observacoes
    CONCAT('Envelopamento - ', e.codigo_orcamento, ' - Crediário',
           IF(e.observacao IS NOT NULL AND e.observacao != '', 
              CONCAT('\n', e.observacao), '')) as observacoes,
    -- envelopamento_id
    395 as envelopamento_id,
    -- juros_aplicados
    0.00 as juros_aplicados,
    -- timestamps
    NOW() as created_at,
    NOW() as updated_at
FROM envelopamentos e
WHERE e.id = 395
  -- Só cria se não existir conta de crediário
  AND NOT EXISTS (
      SELECT 1 FROM contas_receber cr 
      WHERE cr.envelopamento_id = 395 
        AND (
            cr.status = 'pendente' 
            OR cr.observacoes LIKE '%Crediário%' 
            OR cr.observacoes LIKE '%crediário%'
            OR cr.observacoes LIKE '%Crediario%'
            OR cr.observacoes LIKE '%crediario%'
        )
  );

-- PASSO 4: Verificar se foi criada
SELECT * FROM contas_receber WHERE envelopamento_id = 395;

-- =====================================================
-- VERSÃO ALTERNATIVA COM VALORES FIXOS
-- Use esta se o SQL acima não funcionar
-- =====================================================
/*
INSERT INTO contas_receber (
    tenant_id,
    cliente_id,
    user_id,
    descricao,
    valor_original,
    valor_pendente,
    data_vencimento,
    data_emissao,
    status,
    observacoes,
    envelopamento_id,
    juros_aplicados,
    created_at,
    updated_at
) VALUES (
    1,                    -- tenant_id (ajuste)
    123,                  -- cliente_id (ajuste - extraia do campo cliente)
    1,                    -- user_id (ajuste - funcionario_id ou vendedor_id)
    'Envelopamento #395', -- descricao
    1500.00,              -- valor_original (ajuste - valor do crediário)
    1500.00,              -- valor_pendente (igual ao original)
    '2024-12-15',         -- data_vencimento (ajuste - 30 dias após criação)
    '2024-11-15',         -- data_emissao (ajuste - data de criação)
    'pendente',           -- status
    'Envelopamento - [CODIGO] - Crediário', -- observacoes (ajuste código)
    395,                  -- envelopamento_id
    0.00,                 -- juros_aplicados
    NOW(),                -- created_at
    NOW()                 -- updated_at
);
*/

