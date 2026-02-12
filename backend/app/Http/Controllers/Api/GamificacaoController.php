<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GamificacaoService;
use App\Models\VendedorPontos;
use App\Models\HistoricoPontos;
use App\Models\Premiacao;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GamificacaoController extends Controller
{
    protected $gamificacaoService;

    public function __construct(GamificacaoService $gamificacaoService)
    {
        $this->gamificacaoService = $gamificacaoService;
    }

    /**
     * Obter ranking de pontos
     */
    public function ranking(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $limite = $request->input('limite', 10);

            $ranking = $this->gamificacaoService->obterRanking($tenantId, $limite);

            return response()->json([
                'success' => true,
                'data' => $ranking
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter ranking',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter pontos do vendedor logado
     */
    public function meusPontos(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $vendedorId = $request->user()->id;

            $pontos = $this->gamificacaoService->obterOuCriarPontos($tenantId, $vendedorId);

            return response()->json([
                'success' => true,
                'data' => [
                    'pontos_totais' => $pontos->pontos_totais,
                    'nivel' => $pontos->nivel_atual,
                    'badge' => $pontos->badge_atual,
                    'nome_nivel' => VendedorPontos::nomeNivel($pontos->nivel_atual),
                    'vendas_realizadas' => $pontos->vendas_realizadas,
                    'metas_batidas' => $pontos->metas_batidas,
                    'ticket_medio_batido' => $pontos->ticket_medio_batido,
                    'pontos_proximo_nivel' => VendedorPontos::pontosPorNivel($pontos->nivel_atual + 1),
                    'pontos_faltam' => max(0, VendedorPontos::pontosPorNivel($pontos->nivel_atual + 1) - $pontos->pontos_totais),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter pontos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter histórico de pontos
     */
    public function historico(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $vendedorId = $request->input('vendedor_id', $request->user()->id);

            $historico = HistoricoPontos::where('tenant_id', $tenantId)
                ->where('vendedor_id', $vendedorId)
                ->with(['venda:id,codigo', 'meta:id,valor_meta'])
                ->orderBy('data_acao', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $historico
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter histórico',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter premiações do vendedor
     */
    public function premiacoes(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $vendedorId = $request->input('vendedor_id', $request->user()->id);

            $premiacoes = Premiacao::where('tenant_id', $tenantId)
                ->where('vendedor_id', $vendedorId)
                ->with(['meta:id,valor_meta,data_inicio,data_fim'])
                ->orderBy('created_at', 'desc')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $premiacoes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter premiações',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar status de premiação (entregar)
     */
    public function entregarPremiacao(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $premiacao = Premiacao::where('tenant_id', $tenantId)->findOrFail($id);

            $premiacao->update([
                'status' => 'entregue',
                'data_entrega' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Premiação marcada como entregue',
                'data' => $premiacao
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao entregar premiação',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
