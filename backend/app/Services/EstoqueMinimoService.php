<?php

namespace App\Services;

use App\Models\Produto;
use Illuminate\Support\Facades\Log;

class EstoqueMinimoService
{
    /**
     * Verifica se o estoque está no limite mínimo ou abaixo
     */
    public function isEstoqueNoLimiteMinimo(Produto $produto): bool
    {
        if (!$produto->estoque_minimo || $produto->estoque_minimo <= 0) {
            return false;
        }

        return $produto->estoque <= $produto->estoque_minimo;
    }

    /**
     * Verifica se o estoque está abaixo do limite mínimo
     */
    public function isEstoqueAbaixoMinimo(Produto $produto): bool
    {
        if (!$produto->estoque_minimo || $produto->estoque_minimo <= 0) {
            return false;
        }

        return $produto->estoque < $produto->estoque_minimo;
    }

    /**
     * Verifica se é possível consumir estoque sem atingir o limite mínimo
     */
    public function podeConsumirEstoque(Produto $produto, float $quantidadeConsumir): bool
    {
        if (!$produto->estoque_minimo || $produto->estoque_minimo <= 0) {
            return true; // Se não há estoque mínimo definido, permite consumo
        }

        return ($produto->estoque - $quantidadeConsumir) >= $produto->estoque_minimo;
    }

    /**
     * Valida se é possível adicionar um item à OS considerando estoque mínimo
     */
    public function validarAdicaoItem(array $item): array
    {
        $errors = [];

        if (!isset($item['produto_id']) || !$item['produto_id']) {
            return $errors; // Se não há produto, não há validação de estoque
        }

        $produto = Produto::find($item['produto_id']);
        if (!$produto) {
            $errors[] = "Produto não encontrado";
            return $errors;
        }

        // Verificar se estoque está no limite mínimo
        if ($this->isEstoqueNoLimiteMinimo($produto)) {
            $errors[] = "O produto '{$produto->nome}' está no limite mínimo de estoque ({$produto->estoque_minimo} {$produto->unidade_medida}). Não é possível adicionar novos itens até que o estoque seja reposto.";
            return $errors;
        }

        // Verificar consumo baseado no tipo de item
        if ($item['tipo_item'] === 'm2' && $produto->unidade_medida === 'm2') {
            $altura = floatval($item['altura'] ?? 0);
            $largura = floatval($item['largura'] ?? 0);
            $quantidade = intval($item['quantidade'] ?? 1);
            $areaNecessaria = $altura * $largura * $quantidade;

            if (!$this->podeConsumirEstoque($produto, $areaNecessaria)) {
                $errors[] = "Consumir {$areaNecessaria} m² do produto '{$produto->nome}' levaria o estoque abaixo do mínimo ({$produto->estoque_minimo} m²). Estoque atual: {$produto->estoque} m².";
            }
        } elseif ($item['tipo_item'] === 'unidade') {
            $quantidade = intval($item['quantidade'] ?? 1);

            if (!$this->podeConsumirEstoque($produto, $quantidade)) {
                $errors[] = "Consumir {$quantidade} unidades do produto '{$produto->nome}' levaria o estoque abaixo do mínimo ({$produto->estoque_minimo} {$produto->unidade_medida}). Estoque atual: {$produto->estoque} {$produto->unidade_medida}.";
            }
        }

        return $errors;
    }

    /**
     * Valida se é possível atualizar um item da OS considerando estoque mínimo
     */
    public function validarAtualizacaoItem(array $item, array $itemOriginal = null): array
    {
        $errors = [];

        if (!isset($item['produto_id']) || !$item['produto_id']) {
            return $errors; // Se não há produto, não há validação de estoque
        }

        $produto = Produto::find($item['produto_id']);
        if (!$produto) {
            $errors[] = "Produto não encontrado";
            return $errors;
        }

        // Verificar se estoque está no limite mínimo
        if ($this->isEstoqueNoLimiteMinimo($produto)) {
            $errors[] = "O produto '{$produto->nome}' está no limite mínimo de estoque ({$produto->estoque_minimo} {$produto->unidade_medida}). Não é possível atualizar itens até que o estoque seja reposto.";
            return $errors;
        }

        // Calcular consumo considerando devolução do item original
        $consumoLiquido = $this->calcularConsumoLiquido($item, $itemOriginal, $produto);

        if ($consumoLiquido > 0 && !$this->podeConsumirEstoque($produto, $consumoLiquido)) {
            $errors[] = "O consumo líquido de {$consumoLiquido} {$produto->unidade_medida} do produto '{$produto->nome}' levaria o estoque abaixo do mínimo ({$produto->estoque_minimo} {$produto->unidade_medida}). Estoque atual: {$produto->estoque} {$produto->unidade_medida}.";
        }

        return $errors;
    }

    /**
     * Calcula o consumo líquido considerando devolução do item original
     */
    private function calcularConsumoLiquido(array $item, ?array $itemOriginal, Produto $produto): float
    {
        $consumoNovo = 0;
        $devolucaoOriginal = 0;

        if ($item['tipo_item'] === 'm2' && $produto->unidade_medida === 'm2') {
            $altura = floatval($item['altura'] ?? 0);
            $largura = floatval($item['largura'] ?? 0);
            $quantidade = intval($item['quantidade'] ?? 1);
            $consumoNovo = $altura * $largura * $quantidade;

            if ($itemOriginal && $itemOriginal['produto_id'] == $item['produto_id']) {
                $alturaOriginal = floatval($itemOriginal['altura'] ?? 0);
                $larguraOriginal = floatval($itemOriginal['largura'] ?? 0);
                $quantidadeOriginal = intval($itemOriginal['quantidade'] ?? 1);
                $devolucaoOriginal = $alturaOriginal * $larguraOriginal * $quantidadeOriginal;
            }
        } elseif ($item['tipo_item'] === 'unidade') {
            $consumoNovo = intval($item['quantidade'] ?? 1);

            if ($itemOriginal && $itemOriginal['produto_id'] == $item['produto_id']) {
                $devolucaoOriginal = intval($itemOriginal['quantidade'] ?? 0);
            }
        }

        return $consumoNovo - $devolucaoOriginal;
    }
}
