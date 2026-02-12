<?php

namespace App\Observers;

use App\Models\Venda;
use App\Services\GamificacaoService;
use App\Services\AlertasService;

class VendaObserver
{
    protected $gamificacaoService;
    protected $alertasService;

    public function __construct(GamificacaoService $gamificacaoService, AlertasService $alertasService)
    {
        $this->gamificacaoService = $gamificacaoService;
        $this->alertasService = $alertasService;
    }

    /**
     * Handle the Venda "created" event.
     */
    public function created(Venda $venda): void
    {
        // Quando uma venda é criada como finalizada
        if ($venda->status === Venda::STATUS_FINALIZADA && $venda->vendedor_id) {
            $this->gamificacaoService->adicionarPontosVenda($venda);
        }
    }

    /**
     * Handle the Venda "updated" event.
     */
    public function updated(Venda $venda): void
    {
        // Verificar se a venda foi finalizada agora
        if ($venda->isDirty('status') && 
            $venda->status === Venda::STATUS_FINALIZADA && 
            $venda->vendedor_id) {
            
            // Adicionar pontos por venda
            $this->gamificacaoService->adicionarPontosVenda($venda);

            // Verificar se alguma meta foi batida
            $this->verificarMetas($venda);
        }
    }

    /**
     * Verificar se alguma meta foi batida após a venda
     */
    protected function verificarMetas(Venda $venda)
    {
        $hoje = \Carbon\Carbon::today();
        
        // Buscar metas ativas no período
        $metas = \App\Models\MetaVenda::where('tenant_id', $venda->tenant_id)
            ->where('ativo', true)
            ->where('data_inicio', '<=', $hoje)
            ->where('data_fim', '>=', $hoje)
            ->get();

        foreach ($metas as $meta) {
            // Se for meta de vendedor, verificar apenas se for do mesmo vendedor
            if ($meta->tipo === 'vendedor' && $meta->vendedor_id !== $venda->vendedor_id) {
                continue;
            }

            // Calcular vendas realizadas no período
            $vendas = Venda::where('tenant_id', $venda->tenant_id)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$meta->data_inicio, $meta->data_fim]);

            if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
                $vendas->where('vendedor_id', $meta->vendedor_id);
            }

            $valorRealizado = $vendas->sum('valor_total');
            
            // Verificar se meta foi batida
            $this->gamificacaoService->verificarMetaBatida($meta, $valorRealizado);
        }

        // Verificar alertas de meta próxima
        $this->alertasService->verificarMetasProximas($venda->tenant_id);
    }
}
