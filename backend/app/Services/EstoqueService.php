<?php

namespace App\Services;

use App\Models\Produto;

class EstoqueService
{
    /**
     * Ajusta o estoque com base em uma lista de itens.
     * Usado por VendaController (PDV), MarketplaceController e outros fluxos.
     *
     * @param array $itens Array de itens com produto_id, quantidade, dados_adicionais, variacao
     * @param string $operacao 'increment' (estorno) ou 'decrement' (baixa)
     * @return void
     */
    public function ajustarEstoqueFromItens(array $itens, string $operacao): void
    {
        foreach ($itens as $item) {
            $produtoId = $item['produto_id'] ?? null;
            if ($produtoId === null || $produtoId === '') {
                continue;
            }

            $produto = Produto::find((int) $produtoId);
            if (!$produto) {
                continue;
            }

            $this->ajustarEstoqueItem($produto, $item, $operacao);
        }
    }

    /**
     * Ajusta estoque de um único item (produto principal, composição e variação).
     */
    protected function ajustarEstoqueItem(Produto $produto, array $item, string $operacao): void
    {
        $isComposto = (bool) ($produto->is_composto ?? false);
        $composicao = $produto->composicao ?? [];

        $variacaoDataCheck = $item['dados_adicionais']['variacao'] ?? $item['variacao'] ?? null;
        $variacaoData = null;
        if ($variacaoDataCheck) {
            $variacaoData = is_array($variacaoDataCheck) ? $variacaoDataCheck : json_decode($variacaoDataCheck, true);
        }
        $temVariacaoNoItem = $variacaoData && !empty($variacaoData['id_variacao'] ?? $variacaoData['id'] ?? null);
        $temVariacoesAtivas = (bool) ($produto->variacoes_ativa ?? false) && is_array($produto->variacoes ?? null) && count($produto->variacoes ?? []) > 0;

        if (!($temVariacaoNoItem && $temVariacoesAtivas)) {
            $ajustePrincipal = $operacao === 'increment' ? (float) $item['quantidade'] : -(float) $item['quantidade'];
            $produto->increment('estoque', $ajustePrincipal);
        }

        if ($isComposto && is_array($composicao) && count($composicao) > 0) {
            foreach ($composicao as $comp) {
                $compIdRaw = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                $compQtd = (float) ($comp['quantidade'] ?? 0);
                if (!$compIdRaw || $compQtd <= 0) continue;

                $compProduto = is_numeric($compIdRaw) ? Produto::find($compIdRaw) : null;
                if (!$compProduto) {
                    $compProduto = Produto::where('codigo_produto', $compIdRaw)->orWhere('codigo', $compIdRaw)->first();
                }
                if ($compProduto) {
                    $delta = $compQtd * (float) $item['quantidade'];
                    $ajuste = $operacao === 'increment' ? $delta : -$delta;
                    $compProduto->increment('estoque', $ajuste);
                }
            }
        }

        $variacaoId = ($variacaoData && is_array($variacaoData)) ? ($variacaoData['id_variacao'] ?? $variacaoData['id'] ?? null) : null;
        if ($variacaoData && $variacaoId !== null && $variacaoId !== '') {
            $variacoes = $produto->variacoes ?? [];
            foreach ($variacoes as $index => $variacao) {
                $idVariacaoAtual = (string) ($variacao['id'] ?? $variacao['id_variacao'] ?? '');
                if ($idVariacaoAtual !== '' && $idVariacaoAtual === (string) $variacaoId) {
                    $estoqueAtual = (float) ($variacao['estoque_var'] ?? 0);
                    $ajusteVariacao = $operacao === 'increment' ? (float) $item['quantidade'] : -(float) $item['quantidade'];
                    $variacoes[$index]['estoque_var'] = $estoqueAtual + $ajusteVariacao;
                    $produto->variacoes = $variacoes;
                    $produto->save();
                    break;
                }
            }
        }
    }
}
