-- =====================================================
-- Script SQL SIMPLES para criar conta a receber do Envelopamento 395
-- =====================================================
-- 
-- INSTRUÇÕES:
-- 1. Execute primeiro o SELECT abaixo para ver os dados
-- 2. Copie os valores e ajuste o INSERT
-- 3. Execute o INSERT
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
-- IMPORTANTE: Ajuste os valores abaixo com base no resultado do PASSO 1
-- 
-- Para obter o cliente_id: 
--   - Se cliente é JSON, extraia o campo "id" 
--   - Exemplo: {"id": 123, "nome": "João"} -> cliente_id = 123
--
-- Para obter o valor:
--   - Procure no JSON pagamentos o pagamento com "metodo": "Crediário"
--   - Use o campo "valorFinal" ou "valor"
--   - Exemplo: [{"metodo": "Crediário", "valorFinal": 1500.00}] -> valor = 1500.00

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
    (SELECT tenant_id FROM envelopamentos WHERE id = 395),  -- tenant_id
    NULL,  -- cliente_id (AJUSTE: extraia do campo cliente do envelopamento)
    (SELECT COALESCE(funcionario_id, vendedor_id) FROM envelopamentos WHERE id = 395),  -- user_id
    CONCAT('Envelopamento #395', 
           IFNULL(CONCAT(' - ', (SELECT observacao FROM envelopamentos WHERE id = 395)), '')),  -- descricao
    0.00,  -- valor_original (AJUSTE: valor do pagamento em crediário)
    0.00,  -- valor_pendente (AJUSTE: mesmo valor do valor_original)
    DATE_ADD((SELECT DATE(data_criacao) FROM envelopamentos WHERE id = 395), INTERVAL 30 DAY),  -- data_vencimento
    (SELECT DATE(data_criacao) FROM envelopamentos WHERE id = 395),  -- data_emissao
    'pendente',  -- status
    CONCAT('Envelopamento - ', (SELECT codigo_orcamento FROM envelopamentos WHERE id = 395), ' - Crediário',
           IFNULL(CONCAT('\n', (SELECT observacao FROM envelopamentos WHERE id = 395)), '')),  -- observacoes
    395,  -- envelopamento_id
    0.00,  -- juros_aplicados
    NOW(),  -- created_at
    NOW()   -- updated_at
)
WHERE NOT EXISTS (
    SELECT 1 FROM contas_receber 
    WHERE envelopamento_id = 395 
    AND (status = 'pendente' OR observacoes LIKE '%Crediário%' OR observacoes LIKE '%crediário%')
);

-- PASSO 4: Verificar se foi criada
SELECT * FROM contas_receber WHERE envelopamento_id = 395;
