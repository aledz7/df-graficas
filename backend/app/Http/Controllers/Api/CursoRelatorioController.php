<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\CursoProgresso;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CursoRelatorioController extends Controller
{
    /**
     * Relatório de treinamentos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            // Filtros
            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');
            $area = $request->input('area');
            $usuarioId = $request->input('usuario_id');
            $status = $request->input('status'); // nao_iniciado, em_andamento, concluido, atrasado
            $busca = $request->input('busca');
            $page = $request->input('page', 1);
            $perPage = $request->input('per_page', 25);

            // Query base - mostrar apenas progressos existentes
            $query = CursoProgresso::where('curso_progresso.tenant_id', $tenantId)
                ->join('users', 'curso_progresso.usuario_id', '=', 'users.id')
                ->join('cursos', 'curso_progresso.curso_id', '=', 'cursos.id')
                ->select([
                    'curso_progresso.id',
                    'curso_progresso.usuario_id',
                    'curso_progresso.curso_id',
                    'curso_progresso.iniciado',
                    'curso_progresso.concluido',
                    'curso_progresso.data_inicio',
                    'curso_progresso.data_conclusao',
                    'curso_progresso.tempo_total_segundos',
                    'curso_progresso.percentual_concluido',
                    'users.name as colaborador_nome',
                    'users.cargo as colaborador_cargo',
                    'users.setor as colaborador_setor',
                    'cursos.titulo as treinamento_nome',
                    'cursos.setor as treinamento_setor',
                    'cursos.obrigatorio',
                    'cursos.prazo_conclusao',
                    'cursos.nivel',
                ]);

            // Filtro por período
            if ($dataInicio) {
                $query->where(function($q) use ($dataInicio) {
                    $q->where('curso_progresso.data_inicio', '>=', $dataInicio)
                      ->orWhere('curso_progresso.data_conclusao', '>=', $dataInicio);
                });
            }

            if ($dataFim) {
                $query->where(function($q) use ($dataFim) {
                    $q->where('curso_progresso.data_inicio', '<=', $dataFim . ' 23:59:59')
                      ->orWhere('curso_progresso.data_conclusao', '<=', $dataFim . ' 23:59:59');
                });
            }

            // Filtro por área
            if ($area && $area !== 'todas') {
                $query->where(function($q) use ($area) {
                    $q->where('users.setor', $area)
                      ->orWhere('users.cargo', 'like', "%{$area}%")
                      ->orWhere('cursos.setor', $area);
                });
            }

            // Filtro por usuário
            if ($usuarioId) {
                $query->where('curso_progresso.usuario_id', $usuarioId);
            }

            // Filtro por busca
            if ($busca) {
                $query->where(function($q) use ($busca) {
                    $q->where('users.name', 'like', "%{$busca}%")
                      ->orWhere('cursos.titulo', 'like', "%{$busca}%");
                });
            }

            // Contar total antes de aplicar filtro de status
            $total = $query->count();

            // Aplicar filtro de status
            if ($status && $status !== 'todos') {
                $query->where(function($q) use ($status) {
                    if ($status === 'nao_iniciado') {
                        $q->where('curso_progresso.iniciado', false);
                    } elseif ($status === 'em_andamento') {
                        $q->where('curso_progresso.iniciado', true)
                          ->where('curso_progresso.concluido', false);
                    } elseif ($status === 'concluido') {
                        $q->where('curso_progresso.concluido', true);
                    } elseif ($status === 'atrasado') {
                        $q->where('curso_progresso.concluido', false)
                          ->where('cursos.obrigatorio', true)
                          ->where('cursos.prazo_conclusao', '<', now());
                    }
                });
            }

            // Ordenar
            $query->orderBy('curso_progresso.data_inicio', 'desc')
                  ->orderBy('curso_progresso.data_conclusao', 'desc');

            // Paginação
            $registros = $query->skip(($page - 1) * $perPage)
                              ->take($perPage)
                              ->get();

            // Processar dados
            $dados = $registros->map(function($registro) {
                $statusCalculado = $this->calcularStatus($registro);
                $duracao = $this->calcularDuracao($registro);
                $dentroPrazo = $this->verificarDentroPrazo($registro);

                return [
                    'id' => $registro->id,
                    'colaborador' => [
                        'id' => $registro->usuario_id,
                        'nome' => $registro->colaborador_nome,
                        'cargo' => $registro->colaborador_cargo,
                        'setor' => $registro->colaborador_setor,
                    ],
                    'treinamento' => [
                        'id' => $registro->curso_id,
                        'nome' => $registro->treinamento_nome,
                        'setor' => $registro->treinamento_setor,
                        'nivel' => $registro->nivel,
                        'obrigatorio' => $registro->obrigatorio,
                        'prazo_conclusao' => $registro->prazo_conclusao,
                    ],
                    'status' => $statusCalculado,
                    'data_inicio' => $registro->data_inicio ? $registro->data_inicio->format('Y-m-d H:i:s') : null,
                    'data_conclusao' => $registro->data_conclusao ? $registro->data_conclusao->format('Y-m-d H:i:s') : null,
                    'duracao_total' => $duracao,
                    'duracao_minutos' => $this->segundosParaMinutos($duracao['total_segundos']),
                    'dentro_prazo' => $dentroPrazo,
                    'percentual' => $registro->percentual_concluido ?? 0,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $dados,
                'pagination' => [
                    'total' => $total,
                    'per_page' => $perPage,
                    'current_page' => $page,
                    'last_page' => ceil($total / $perPage),
                ],
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
     * Calcular status do treinamento
     */
    private function calcularStatus($registro)
    {
        if (!$registro->iniciado) {
            return 'nao_iniciado';
        }

        if ($registro->concluido) {
            return 'concluido';
        }

        // Verificar se está atrasado
        if ($registro->obrigatorio && $registro->prazo_conclusao) {
            $prazo = Carbon::parse($registro->prazo_conclusao);
            if (now()->greaterThan($prazo)) {
                return 'atrasado';
            }
        }

        return 'em_andamento';
    }

    /**
     * Calcular duração total
     */
    private function calcularDuracao($registro)
    {
        if (!$registro->data_inicio) {
            return [
                'horas' => 0,
                'minutos' => 0,
                'total_segundos' => 0,
                'formatado' => '0h 0m',
            ];
        }

        $dataFim = $registro->data_conclusao ? Carbon::parse($registro->data_conclusao) : now();
        $dataInicio = is_string($registro->data_inicio) ? Carbon::parse($registro->data_inicio) : $registro->data_inicio;
        
        $totalSegundos = $dataFim->diffInSeconds($dataInicio);
        
        // Se tiver tempo_total_segundos registrado, usar ele (mais preciso)
        if ($registro->tempo_total_segundos && $registro->tempo_total_segundos > 0) {
            $totalSegundos = $registro->tempo_total_segundos;
        }

        $horas = floor($totalSegundos / 3600);
        $minutos = floor(($totalSegundos % 3600) / 60);

        return [
            'horas' => $horas,
            'minutos' => $minutos,
            'total_segundos' => $totalSegundos,
            'formatado' => "{$horas}h {$minutos}m",
        ];
    }

    /**
     * Verificar se concluiu dentro do prazo
     */
    private function verificarDentroPrazo($registro)
    {
        $concluido = is_bool($registro->concluido) ? $registro->concluido : (bool)$registro->concluido;
        
        if (!$registro->obrigatorio || !$registro->prazo_conclusao || !$concluido) {
            return null;
        }

        $prazo = Carbon::parse($registro->prazo_conclusao);
        $conclusao = is_string($registro->data_conclusao) ? Carbon::parse($registro->data_conclusao) : $registro->data_conclusao;

        return $conclusao->lessThanOrEqualTo($prazo);
    }

    /**
     * Converter segundos para minutos
     */
    private function segundosParaMinutos($segundos)
    {
        return round($segundos / 60, 2);
    }

    /**
     * Estatísticas gerais
     */
    public function estatisticas(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $total = CursoProgresso::where('tenant_id', $tenantId)->count();
            $concluidos = CursoProgresso::where('tenant_id', $tenantId)
                ->where('concluido', true)
                ->count();
            $emAndamento = CursoProgresso::where('tenant_id', $tenantId)
                ->where('iniciado', true)
                ->where('concluido', false)
                ->count();
            $naoIniciados = CursoProgresso::where('tenant_id', $tenantId)
                ->where('iniciado', false)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $total,
                    'concluidos' => $concluidos,
                    'em_andamento' => $emAndamento,
                    'nao_iniciados' => $naoIniciados,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter estatísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
