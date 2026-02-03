-- =====================================================
-- Script SQL para criar conta a receber do Envelopamento 395
-- =====================================================
-- 
-- PASSO 1: Verificar os dados do envelopamento 395
-- Execute este SELECT primeiro para obter os valores corretos
-- =====================================================

SELECT 
    id,
    tenant_id,
    codigo_orcamento,
    cliente,
    funcionario_id,
    vendedor_id,
    orcamento_total,
    pagamentos,
    data_criacao,
    observacao,
    -- Extrair cliente_id do JSON
    CASE 
        WHEN JSON_EXTRACT(cliente, '$.id') IS NOT NULL THEN CAST(JSON_EXTRACT(cliente, '$.id') AS UNSIGNED)
        WHEN JSON_EXTRACT(cliente, '$.cliente_id') IS NOT NULL THEN CAST(JSON_EXTRACT(cliente, '$.cliente_id') AS UNSIGNED)
        ELSE NULL
    END as cliente_id_extraido,
    -- Verificar se tem pagamento em crediário
    JSON_SEARCH(pagamentos, 'one', 'Crediário', NULL, '$[*].metodo') as tem_crediario
FROM envelopamentos 
WHERE id = 395;

-- =====================================================
-- PASSO 2: Verificar se já existe conta a receber
-- =====================================================

SELECT * FROM contas_receber 
WHERE envelopamento_id = 395;

-- =====================================================
-- PASSO 3: Criar a conta a receber
-- IMPORTANTE: Ajuste os valores abaixo conforme o resultado do PASSO 1
-- =====================================================

-- Opção A: SQL com valores fixos (mais simples, mas você precisa preencher manualmente)
-- Descomente e ajuste os valores:

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
    1,  -- tenant_id (ajuste conforme necessário)
    123,  -- cliente_id (extraia do campo cliente do envelopamento)
    1,  -- user_id (funcionario_id ou vendedor_id do envelopamento)
    'Envelopamento #395',  -- descricao
    1000.00,  -- valor_original (valor do pagamento em crediário)
    1000.00,  -- valor_pendente (igual ao valor_original)
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),  -- data_vencimento (30 dias a partir de hoje)
    CURDATE(),  -- data_emissao (data de criação do envelopamento)
    'pendente',  -- status
    'Envelopamento - [CODIGO_ORCAMENTO] - Crediário',  -- observacoes (ajuste o código)
    395,  -- envelopamento_id
    0.00,  -- juros_aplicados
    NOW(),  -- created_at
    NOW()   -- updated_at
);
*/

-- =====================================================
-- Opção B: SQL dinâmico (extrai valores automaticamente)
-- Use esta versão se o MySQL suportar JSON_EXTRACT corretamente
-- =====================================================

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
    -- Extrair cliente_id do JSON cliente
    CASE 
        WHEN JSON_EXTRACT(e.cliente, '$.id') IS NOT NULL 
            THEN CAST(REPLACE(JSON_EXTRACT(e.cliente, '$.id'), '"', '') AS UNSIGNED)
        WHEN JSON_EXTRACT(e.cliente, '$.cliente_id') IS NOT NULL 
            THEN CAST(REPLACE(JSON_EXTRACT(e.cliente, '$.cliente_id'), '"', '') AS UNSIGNED)
        ELSE NULL
    END as cliente_id,
    -- Usar funcionario_id ou vendedor_id
    COALESCE(e.funcionario_id, e.vendedor_id) as user_id,
    -- Descrição
    CONCAT('Envelopamento #', e.id, 
           IF(e.observacao IS NOT NULL AND e.observacao != '', 
              CONCAT(' - ', e.observacao), '')) as descricao,
    -- Valor do pagamento em crediário
    -- Buscar o primeiro pagamento com método "Crediário"
    CAST(
        COALESCE(
            JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
            JSON_EXTRACT(e.pagamentos, '$[0].valor'),
            e.orcamento_total
        ) AS DECIMAL(10,2)
    ) as valor_original,
    -- Valor pendente (igual ao original)
    CAST(
        COALESCE(
            JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
            JSON_EXTRACT(e.pagamentos, '$[0].valor'),
            e.orcamento_total
        ) AS DECIMAL(10,2)
    ) as valor_pendente,
    -- Data de vencimento (30 dias a partir da criação ou data do pagamento)
    COALESCE(
        DATE(JSON_EXTRACT(e.pagamentos, '$[0].dataVencimento')),
        DATE_ADD(DATE(e.data_criacao), INTERVAL 30 DAY)
    ) as data_vencimento,
    -- Data de emissão
    DATE(e.data_criacao) as data_emissao,
    -- Status sempre pendente para crediário
    'pendente' as status,
    -- Observações
    CONCAT('Envelopamento - ', e.codigo_orcamento, ' - Crediário',
           IF(e.observacao IS NOT NULL AND e.observacao != '', 
              CONCAT('\n', e.observacao), '')) as observacoes,
    -- ID do envelopamento
    e.id as envelopamento_id,
    -- Juros aplicados (zero inicialmente)
    0.00 as juros_aplicados,
    -- Timestamps
    NOW() as created_at,
    NOW() as updated_at
FROM envelopamentos e
WHERE e.id = 395
  -- Verificar se não existe conta de crediário já criada
  AND NOT EXISTS (
      SELECT 1 
      FROM contas_receber cr 
      WHERE cr.envelopamento_id = 395 
        AND (
            cr.status = 'pendente' 
            OR cr.observacoes LIKE '%Crediário%' 
            OR cr.observacoes LIKE '%crediário%'
            OR cr.observacoes LIKE '%Crediario%'
            OR cr.observacoes LIKE '%crediario%'
        )
  )
  -- Verificar se existe pagamento (mesmo que não seja crediário, vamos criar)
  AND e.pagamentos IS NOT NULL;

-- =====================================================
-- PASSO 4: Verificar se a conta foi criada
-- =====================================================

SELECT * FROM contas_receber WHERE envelopamento_id = 395;
