-- =====================================================
-- SCRIPT SQL PARA CORRIGIR CONTAS A RECEBER
-- Data: 16/10/2025
-- Objetivo: Vincular contas a receber às suas OS
-- =====================================================

-- PRIMEIRO: Verificar quais contas precisam ser corrigidas
SELECT 
    c.id as conta_id,
    c.descricao,
    c.valor_original,
    c.observacoes,
    REGEXP_SUBSTR(c.observacoes, 'OS-[a-zA-Z0-9-]+') as os_encontrada
FROM contas_receber c
WHERE c.os_id IS NULL 
  AND c.observacoes LIKE '%Ordem de Serviço:%'
ORDER BY c.id;

-- =====================================================
-- SEGUNDO: Executar a correção (descomente para usar)
-- =====================================================

-- ATENÇÃO: Descomente as linhas abaixo apenas depois de verificar o resultado acima!

/*
UPDATE contas_receber c
SET os_id = (
    SELECT os.id 
    FROM ordens_servico os 
    WHERE os.id_os = REGEXP_SUBSTR(c.observacoes, 'OS-[a-zA-Z0-9-]+')
    LIMIT 1
)
WHERE c.os_id IS NULL 
  AND c.observacoes LIKE '%Ordem de Serviço:%'
  AND EXISTS (
    SELECT 1 
    FROM ordens_servico os 
    WHERE os.id_os = REGEXP_SUBSTR(c.observacoes, 'OS-[a-zA-Z0-9-]+')
  );
*/

-- =====================================================
-- TERCEIRO: Verificar o resultado da correção
-- =====================================================

-- Contar quantas contas foram corrigidas
SELECT 
    COUNT(*) as total_contas_sem_vinculo
FROM contas_receber c
WHERE c.os_id IS NULL 
  AND c.observacoes LIKE '%Ordem de Serviço:%';

-- Mostrar contas que ainda não têm vínculo (se houver)
SELECT 
    c.id,
    c.descricao,
    c.valor_original,
    REGEXP_SUBSTR(c.observacoes, 'OS-[a-zA-Z0-9-]+') as os_nao_encontrada
FROM contas_receber c
WHERE c.os_id IS NULL 
  AND c.observacoes LIKE '%Ordem de Serviço:%';

-- =====================================================
-- QUARTO: Verificar contas corrigidas
-- =====================================================

-- Mostrar algumas contas corrigidas como exemplo
SELECT 
    c.id as conta_id,
    c.descricao,
    c.valor_original,
    c.os_id,
    os.id_os,
    os.valor_total_os
FROM contas_receber c
JOIN ordens_servico os ON c.os_id = os.id
WHERE c.os_id IS NOT NULL
ORDER BY c.id DESC
LIMIT 10;

-- =====================================================
-- RESUMO FINAL
-- =====================================================

SELECT 
    'RESUMO DA CORREÇÃO' as status,
    COUNT(*) as total_contas,
    SUM(CASE WHEN os_id IS NOT NULL THEN 1 ELSE 0 END) as contas_com_vinculo,
    SUM(CASE WHEN os_id IS NULL THEN 1 ELSE 0 END) as contas_sem_vinculo
FROM contas_receber 
WHERE observacoes LIKE '%Ordem de Serviço:%';
