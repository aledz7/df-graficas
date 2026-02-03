-- =====================================================
-- Script SQL CORRIGIDO para atualizar o valor da conta a receber do Envelopamento 395
-- =====================================================

-- PASSO 1: Ver os dados do envelopamento 395
SELECT 
    id,
    codigo_orcamento,
    orcamento_total,
    pagamentos
FROM envelopamentos 
WHERE id = 395;

-- PASSO 2: Ver a conta atual
SELECT 
    id,
    envelopamento_id,
    valor_original,
    valor_pendente,
    descricao
FROM contas_receber 
WHERE envelopamento_id = 395;

-- =====================================================
-- PASSO 3: ATUALIZAR o valor usando o total do orçamento
-- Esta é a forma mais simples e confiável
-- =====================================================

UPDATE contas_receber cr
INNER JOIN envelopamentos e ON e.id = cr.envelopamento_id
SET 
    cr.valor_original = e.orcamento_total,
    cr.valor_pendente = e.orcamento_total,
    cr.updated_at = NOW()
WHERE cr.envelopamento_id = 395;

-- =====================================================
-- PASSO 4: Verificar se foi atualizado
-- =====================================================

SELECT 
    id,
    envelopamento_id,
    valor_original,
    valor_pendente,
    descricao
FROM contas_receber 
WHERE envelopamento_id = 395;

-- =====================================================
-- ALTERNATIVA: Se quiser usar valor fixo
-- Descomente e ajuste o valor abaixo
-- =====================================================
/*
UPDATE contas_receber 
SET 
    valor_original = 563.38,
    valor_pendente = 563.38,
    updated_at = NOW()
WHERE envelopamento_id = 395;
*/

