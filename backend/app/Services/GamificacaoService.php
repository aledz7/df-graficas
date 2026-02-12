<?php

namespace App\Services;

use App\Models\VendedorPontos;
use App\Models\HistoricoPontos;
use App\Models\Premiacao;
use App\Models\MetaVenda;
use App\Models\Venda;
use Carbon\Carbon;

class GamificacaoService
{
    /**
     * Configuração de pontos por ação
     */
    const PONTOS_VENDA = 10;
    const PONTOS_META_BATIDA = 100;
    const PONTOS_TICKET_MEDIO = 50;
    const PONTOS_BONUS = 25;

    /**
     * Obter ou criar registro de pontos do vendedor
     */
    public function obterOuCriarPontos($tenantId, $vendedorId)
    {
        $pontos = VendedorPontos::where('tenant_id', $tenantId)
            ->where('vendedor_id', $vendedorId)
            ->first();

        if (!$pontos) {
            $pontos = VendedorPontos::create([
                'tenant_id' => $tenantId,
                'vendedor_id' => $vendedorId,
                'pontos_totais' => 0,
                'nivel_atual' => 1,
                'badge_atual' => 'Bronze',
                'vendas_realizadas' => 0,
                'metas_batidas' => 0,
                'ticket_medio_batido' => 0,
            ]);
        }

        return $pontos;
    }

    /**
     * Adicionar pontos por venda realizada
     */
    public function adicionarPontosVenda($venda)
    {
        if (!$venda->vendedor_id) {
            return;
        }

        $pontos = $this->obterOuCriarPontos($venda->tenant_id, $venda->vendedor_id);
        
        $pontos->vendas_realizadas++;
        $pontos->adicionarPontos(
            self::PONTOS_VENDA,
            'venda',
            "Venda realizada: {$venda->codigo}",
            [
                'venda_id' => $venda->id,
                'valor_venda' => $venda->valor_total,
            ]
        );
    }

    /**
     * Verificar e adicionar pontos por meta batida
     */
    public function verificarMetaBatida($meta, $valorRealizado)
    {
        if ($valorRealizado >= $meta->valor_meta) {
            // Meta foi batida
            if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
                $pontos = $this->obterOuCriarPontos($meta->tenant_id, $meta->vendedor_id);
                
                $pontos->metas_batidas++;
                $pontosMeta = $meta->pontos_meta ?? self::PONTOS_META_BATIDA;
                
                $pontos->adicionarPontos(
                    $pontosMeta,
                    'meta_batida',
                    "Meta batida! Valor: R$ " . number_format($meta->valor_meta, 2, ',', '.'),
                    [
                        'meta_id' => $meta->id,
                        'valor_meta' => $meta->valor_meta,
                        'valor_realizado' => $valorRealizado,
                    ]
                );

                // Criar premiação se configurada
                if ($meta->premiacao) {
                    $this->criarPremiacao($meta, $pontos);
                }
            }
        }
    }

    /**
     * Criar premiação quando meta é batida
     */
    protected function criarPremiacao($meta, $pontos)
    {
        $premiacaoData = is_array($meta->premiacao) ? $meta->premiacao : json_decode($meta->premiacao, true);
        
        if (!$premiacaoData || empty($premiacaoData['tipo'])) {
            return;
        }

        Premiacao::create([
            'tenant_id' => $meta->tenant_id,
            'vendedor_id' => $meta->vendedor_id,
            'meta_id' => $meta->id,
            'tipo' => $premiacaoData['tipo'],
            'titulo' => $premiacaoData['titulo'] ?? 'Premiação por Meta Batida',
            'descricao' => $premiacaoData['descricao'] ?? "Parabéns por bater a meta!",
            'valor_bonus' => $premiacaoData['tipo'] === 'bonus' ? ($premiacaoData['valor'] ?? 0) : null,
            'brinde_descricao' => $premiacaoData['tipo'] === 'brinde' ? ($premiacaoData['descricao_brinde'] ?? '') : null,
            'data_folga' => $premiacaoData['tipo'] === 'folga' ? ($premiacaoData['data'] ?? null) : null,
            'status' => 'pendente',
        ]);
    }

    /**
     * Obter ranking de pontos
     */
    public function obterRanking($tenantId, $limite = 10)
    {
        return VendedorPontos::where('tenant_id', $tenantId)
            ->with('vendedor:id,name,email')
            ->orderBy('pontos_totais', 'desc')
            ->orderBy('nivel_atual', 'desc')
            ->limit($limite)
            ->get()
            ->map(function($item, $index) {
                return [
                    'posicao' => $index + 1,
                    'vendedor_id' => $item->vendedor_id,
                    'vendedor_nome' => $item->vendedor->name ?? 'N/A',
                    'pontos_totais' => $item->pontos_totais,
                    'nivel' => $item->nivel_atual,
                    'badge' => $item->badge_atual,
                    'vendas_realizadas' => $item->vendas_realizadas,
                    'metas_batidas' => $item->metas_batidas,
                ];
            });
    }

    /**
     * Obter progresso da meta com gamificação
     */
    public function obterProgressoMeta($meta)
    {
        $hoje = Carbon::today();
        
        // Calcular vendas realizadas
        $vendas = Venda::where('tenant_id', $meta->tenant_id)
            ->where('status', 'finalizada')
            ->whereBetween('data_finalizacao', [$meta->data_inicio, $meta->data_fim]);

        if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
            $vendas->where('vendedor_id', $meta->vendedor_id);
        }

        $valorRealizado = $vendas->sum('valor_total');
        $quantidadeVendas = $vendas->count();
        $percentualAlcancado = $meta->valor_meta > 0 
            ? ($valorRealizado / $meta->valor_meta) * 100 
            : 0;

        // Verificar se meta foi batida
        $metaBatida = $valorRealizado >= $meta->valor_meta;

        // Obter pontos do vendedor se for meta individual
        $pontosVendedor = null;
        if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
            $pontosVendedor = $this->obterOuCriarPontos($meta->tenant_id, $meta->vendedor_id);
        }

        return [
            'meta' => $meta,
            'valor_meta' => (float) $meta->valor_meta,
            'valor_realizado' => (float) $valorRealizado,
            'quantidade_vendas' => $quantidadeVendas,
            'percentual_alcancado' => round($percentualAlcancado, 2),
            'faltam' => max(0, $meta->valor_meta - $valorRealizado),
            'meta_batida' => $metaBatida,
            'dias_restantes' => max(0, $hoje->diffInDays($meta->data_fim, false)),
            'pontos_meta' => $meta->pontos_meta ?? self::PONTOS_META_BATIDA,
            'pontos_vendedor' => $pontosVendedor ? [
                'pontos_totais' => $pontosVendedor->pontos_totais,
                'nivel' => $pontosVendedor->nivel_atual,
                'badge' => $pontosVendedor->badge_atual,
            ] : null,
        ];
    }
}
