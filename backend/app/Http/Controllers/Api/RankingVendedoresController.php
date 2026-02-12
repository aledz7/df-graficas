<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venda;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RankingVendedoresController extends Controller
{
    /**
     * Obter ranking de vendedores
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            
            // Filtros de período
            $dataInicio = $request->input('data_inicio', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dataFim = $request->input('data_fim', Carbon::now()->endOfMonth()->format('Y-m-d'));
            $tipoPeriodo = $request->input('tipo_periodo', 'mensal'); // diario, mensal, personalizado

            // Ajustar datas baseado no tipo de período
            if ($tipoPeriodo === 'diario') {
                $dataInicio = Carbon::today()->format('Y-m-d');
                $dataFim = Carbon::today()->format('Y-m-d');
            } elseif ($tipoPeriodo === 'mensal') {
                $mes = $request->input('mes', Carbon::now()->month);
                $ano = $request->input('ano', Carbon::now()->year);
                $dataInicio = Carbon::create($ano, $mes, 1)->startOfMonth()->format('Y-m-d');
                $dataFim = Carbon::create($ano, $mes, 1)->endOfMonth()->format('Y-m-d');
            }

            // Buscar vendas finalizadas no período
            $vendas = Venda::where('tenant_id', $tenantId)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
                ->whereNotNull('vendedor_id')
                ->select([
                    'vendedor_id',
                    DB::raw('SUM(valor_total) as total_vendido'),
                    DB::raw('COUNT(*) as quantidade_vendas'),
                    DB::raw('AVG(valor_total) as ticket_medio')
                ])
                ->groupBy('vendedor_id')
                ->orderBy('total_vendido', 'desc')
                ->get();

            // Calcular total geral para % de contribuição
            $totalGeral = Venda::where('tenant_id', $tenantId)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
                ->sum('valor_total');

            // Buscar informações dos vendedores e montar ranking
            $ranking = [];
            foreach ($vendas as $venda) {
                $vendedor = User::find($venda->vendedor_id);
                if (!$vendedor) continue;

                $percentualContribuicao = $totalGeral > 0 
                    ? ($venda->total_vendido / $totalGeral) * 100 
                    : 0;

                $ranking[] = [
                    'posicao' => count($ranking) + 1,
                    'vendedor_id' => $vendedor->id,
                    'vendedor_nome' => $vendedor->name,
                    'vendedor_email' => $vendedor->email,
                    'total_vendido' => (float) $venda->total_vendido,
                    'quantidade_vendas' => (int) $venda->quantidade_vendas,
                    'ticket_medio' => (float) $venda->ticket_medio,
                    'percentual_contribuicao' => round($percentualContribuicao, 2),
                ];
            }

            // Ordenar por valor vendido (já está ordenado, mas garantindo)
            usort($ranking, function($a, $b) {
                return $b['total_vendido'] <=> $a['total_vendido'];
            });

            // Reordenar posições
            foreach ($ranking as $index => &$item) {
                $item['posicao'] = $index + 1;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'ranking' => $ranking,
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                        'tipo_periodo' => $tipoPeriodo,
                    ],
                    'total_geral' => (float) $totalGeral,
                    'total_vendedores' => count($ranking),
                ]
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
     * Obter ranking por quantidade (não por valor)
     */
    public function porQuantidade(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            
            $dataInicio = $request->input('data_inicio', Carbon::now()->startOfMonth()->format('Y-m-d'));
            $dataFim = $request->input('data_fim', Carbon::now()->endOfMonth()->format('Y-m-d'));
            $tipoPeriodo = $request->input('tipo_periodo', 'mensal');

            if ($tipoPeriodo === 'diario') {
                $dataInicio = Carbon::today()->format('Y-m-d');
                $dataFim = Carbon::today()->format('Y-m-d');
            } elseif ($tipoPeriodo === 'mensal') {
                $mes = $request->input('mes', Carbon::now()->month);
                $ano = $request->input('ano', Carbon::now()->year);
                $dataInicio = Carbon::create($ano, $mes, 1)->startOfMonth()->format('Y-m-d');
                $dataFim = Carbon::create($ano, $mes, 1)->endOfMonth()->format('Y-m-d');
            }

            $vendas = Venda::where('tenant_id', $tenantId)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
                ->whereNotNull('vendedor_id')
                ->select([
                    'vendedor_id',
                    DB::raw('COUNT(*) as quantidade_vendas'),
                    DB::raw('SUM(valor_total) as total_vendido'),
                    DB::raw('AVG(valor_total) as ticket_medio')
                ])
                ->groupBy('vendedor_id')
                ->orderBy('quantidade_vendas', 'desc')
                ->get();

            $totalGeral = Venda::where('tenant_id', $tenantId)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
                ->count();

            $ranking = [];
            foreach ($vendas as $venda) {
                $vendedor = User::find($venda->vendedor_id);
                if (!$vendedor) continue;

                $percentualContribuicao = $totalGeral > 0 
                    ? ($venda->quantidade_vendas / $totalGeral) * 100 
                    : 0;

                $ranking[] = [
                    'posicao' => count($ranking) + 1,
                    'vendedor_id' => $vendedor->id,
                    'vendedor_nome' => $vendedor->name,
                    'vendedor_email' => $vendedor->email,
                    'quantidade_vendas' => (int) $venda->quantidade_vendas,
                    'total_vendido' => (float) $venda->total_vendido,
                    'ticket_medio' => (float) $venda->ticket_medio,
                    'percentual_contribuicao' => round($percentualContribuicao, 2),
                ];
            }

            usort($ranking, function($a, $b) {
                return $b['quantidade_vendas'] <=> $a['quantidade_vendas'];
            });

            foreach ($ranking as $index => &$item) {
                $item['posicao'] = $index + 1;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'ranking' => $ranking,
                    'periodo' => [
                        'data_inicio' => $dataInicio,
                        'data_fim' => $dataFim,
                        'tipo_periodo' => $tipoPeriodo,
                    ],
                    'total_geral_vendas' => $totalGeral,
                    'total_vendedores' => count($ranking),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter ranking por quantidade',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
