-- =====================================================
-- Script SQL para CORRIGIR o valor da conta a receber do Envelopamento 395
-- =====================================================

-- PASSO 1: Ver os dados do envelopamento 395 (especialmente os pagamentos)
SELECT 
    id,
    codigo_orcamento,
    orcamento_total,
    pagamentos,
    -- Tentar extrair o valor do pagamento em crediário
    JSON_EXTRACT(pagamentos, '$[*]') as todos_pagamentos,
    -- Procurar pagamento com método "Crediário"
    JSON_SEARCH(pagamentos, 'one', 'Crediário', NULL, '$[*].metodo') as posicao_crediario
FROM envelopamentos 
WHERE id = 395;

-- PASSO 2: Ver a conta atual
SELECT 
    id,
    envelopamento_id,
    valor_original,
    valor_pendente,
    descricao,
    observacoes
FROM contas_receber 
WHERE envelopamento_id = 395;

-- PASSO 3: Ver o valor correto que deveria estar
-- Este SELECT mostra o valor do pagamento em crediário
SELECT 
    e.id,
    e.orcamento_total,
    e.pagamentos,
    -- Tentar encontrar o valor do crediário
    CASE 
        -- Procurar em cada posição do array
        WHEN JSON_EXTRACT(e.pagamentos, '$[0].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[0].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[1].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[1].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[1].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[2].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[2].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[2].valor')
            ) AS DECIMAL(10,2))
        -- Se não encontrar crediário específico, usar o total
        ELSE e.orcamento_total
    END as valor_crediario_correto
FROM envelopamentos e
WHERE e.id = 395;

-- =====================================================
-- PASSO 4: ATUALIZAR o valor da conta a receber
-- =====================================================

UPDATE contas_receber cr
INNER JOIN envelopamentos e ON e.id = cr.envelopamento_id
SET 
    cr.valor_original = CASE 
        -- Procurar pagamento com método "Crediário" em cada posição
        WHEN JSON_EXTRACT(e.pagamentos, '$[0].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[0].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[1].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[1].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[1].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[2].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[2].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[2].valor')
            ) AS DECIMAL(10,2))
        -- Se não encontrar crediário específico, usar o total do orçamento
        ELSE e.orcamento_total
    END,
    cr.valor_pendente = CASE 
        -- Mesma lógica para valor_pendente
        WHEN JSON_EXTRACT(e.pagamentos, '$[0].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[0].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[0].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[1].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[1].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[1].valor')
            ) AS DECIMAL(10,2))
        WHEN JSON_EXTRACT(e.pagamentos, '$[2].metodo') = 'Crediário' 
            THEN CAST(COALESCE(
                JSON_EXTRACT(e.pagamentos, '$[2].valorFinal'),
                JSON_EXTRACT(e.pagamentos, '$[2].valor')
            ) AS DECIMAL(10,2))
        ELSE e.orcamento_total
    END,
    cr.updated_at = NOW()
WHERE cr.envelopamento_id = 395;

-- =====================================================
-- VERSÃO ALTERNATIVA COM VALOR FIXO
-- Use esta se o UPDATE acima não funcionar
-- =====================================================
/*
UPDATE contas_receber 
SET 
    valor_original = 563.38,  -- AJUSTE: valor correto do envelopamento
    valor_pendente = 563.38,  -- AJUSTE: mesmo valor
    updated_at = NOW()
WHERE envelopamento_id = 395;
*/

-- PASSO 5: Verificar se foi atualizado
SELECT 
    id,
    envelopamento_id,
    valor_original,
    valor_pendente,
    descricao
FROM contas_receber 
WHERE envelopamento_id = 395;

