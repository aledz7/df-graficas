<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Treinamento;
use App\Models\TreinamentoProgresso;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TreinamentoRelatorioController extends Controller
{
    /**
     * Relatório por setor
     */
    public function porSetor(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $setor = $request->input('setor');

            if (!$setor || $setor === 'todos') {
                // Relatório geral de todos os setores
                return $this->relatorioGeral($tenantId);
            }

            $colaboradores = User::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->where('is_admin', false)
                ->where('setor', $setor)
                ->get();

            $treinamentos = Treinamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->where(function($query) use ($setor) {
                    $query->where('setor', $setor)
                          ->orWhere('setor', 'geral');
                })
                ->get();

            $niveis = ['iniciante', 'intermediario', 'avancado'];
            $estatisticasPorNivel = [];

            foreach ($niveis as $nivel) {
                $treinamentosNivel = $treinamentos->where('nivel', $nivel);
                $totalNivel = $treinamentosNivel->count();

                $concluidosPorColaborador = [];
                foreach ($colaboradores as $colaborador) {
                    $concluidos = TreinamentoProgresso::where('usuario_id', $colaborador->id)
                        ->whereIn('treinamento_id', $treinamentosNivel->pluck('id'))
                        ->where('concluido', true)
                        ->count();
                    
                    $concluidosPorColaborador[] = [
                        'usuario_id' => $colaborador->id,
                        'nome' => $colaborador->name,
                        'concluidos' => $concluidos,
                        'total' => $totalNivel,
                        'percentual' => $totalNivel > 0 ? round(($concluidos / $totalNivel) * 100, 2) : 0,
                    ];
                }

                $totalConcluidos = collect($concluidosPorColaborador)->sum('concluidos');
                $totalGeral = $colaboradores->count() * $totalNivel;
                $percentualMedio = $totalGeral > 0 ? round(($totalConcluidos / $totalGeral) * 100, 2) : 0;

                $estatisticasPorNivel[$nivel] = [
                    'total_treinamentos' => $totalNivel,
                    'total_concluidos' => $totalConcluidos,
                    'total_pendentes' => $totalGeral - $totalConcluidos,
                    'percentual_medio' => $percentualMedio,
                    'colaboradores' => $concluidosPorColaborador,
                ];
            }

            // Progresso geral por colaborador
            $colaboradoresComProgresso = $colaboradores->map(function($colaborador) use ($treinamentos) {
                $totalTreinamentos = $treinamentos->count();
                $concluidos = TreinamentoProgresso::where('usuario_id', $colaborador->id)
                    ->whereIn('treinamento_id', $treinamentos->pluck('id'))
                    ->where('concluido', true)
                    ->count();

                $pendentes = $treinamentos->filter(function($treinamento) use ($colaborador) {
                    $progresso = TreinamentoProgresso::where('usuario_id', $colaborador->id)
                        ->where('treinamento_id', $treinamento->id)
                        ->where('concluido', true)
                        ->first();
                    return !$progresso;
                })->map(function($treinamento) {
                    return [
                        'id' => $treinamento->id,
                        'pergunta' => $treinamento->pergunta,
                        'nivel' => $treinamento->nivel,
                    ];
                })->values();

                return [
                    'id' => $colaborador->id,
                    'nome' => $colaborador->name,
                    'nivel_atual' => $colaborador->nivel_treinamento_liberado,
                    'progresso_percentual' => $totalTreinamentos > 0 
                        ? round(($concluidos / $totalTreinamentos) * 100, 2) 
                        : 0,
                    'total_concluidos' => $concluidos,
                    'total_pendentes' => $totalTreinamentos - $concluidos,
                    'itens_pendentes' => $pendentes,
                ];
            });

            $progressoMedioSetor = $colaboradoresComProgresso->avg('progresso_percentual');

            return response()->json([
                'success' => true,
                'data' => [
                    'setor' => $setor,
                    'total_colaboradores' => $colaboradores->count(),
                    'progresso_medio_setor' => round($progressoMedioSetor, 2),
                    'estatisticas_por_nivel' => $estatisticasPorNivel,
                    'colaboradores' => $colaboradoresComProgresso->values(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar relatório',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório geral de todos os setores
     */
    protected function relatorioGeral(int $tenantId): JsonResponse
    {
        $setores = ['atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral'];
        $resumoSetores = [];

        foreach ($setores as $setor) {
            $colaboradores = User::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->where('is_admin', false)
                ->where('setor', $setor)
                ->count();

            if ($colaboradores > 0) {
                $treinamentos = Treinamento::where('tenant_id', $tenantId)
                    ->where('ativo', true)
                    ->where(function($query) use ($setor) {
                        $query->where('setor', $setor)
                              ->orWhere('setor', 'geral');
                    })
                    ->count();

                $resumoSetores[] = [
                    'setor' => $setor,
                    'total_colaboradores' => $colaboradores,
                    'total_treinamentos' => $treinamentos,
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'resumo_setores' => $resumoSetores,
            ]
        ]);
    }
}
