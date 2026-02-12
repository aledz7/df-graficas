<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TreinamentoProgresso;
use App\Models\Treinamento;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TreinamentoProgressoController extends Controller
{
    /**
     * Obter progresso do usuário autenticado
     */
    public function meuProgresso(Request $request): JsonResponse
    {
        try {
            $usuario = $request->user();
            $tenantId = $usuario->tenant_id;

            // Treinamentos disponíveis para o usuário
            $treinamentos = Treinamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->where(function($query) use ($usuario) {
                    $query->where('setor', $usuario->setor)
                          ->orWhere('setor', 'geral');
                })
                ->orderBy('ordem')
                ->orderBy('id')
                ->get();

            // Progresso de cada treinamento
            $progressos = TreinamentoProgresso::where('usuario_id', $usuario->id)
                ->whereIn('treinamento_id', $treinamentos->pluck('id'))
                ->get()
                ->keyBy('treinamento_id');

            $treinamentosComProgresso = $treinamentos->map(function($treinamento) use ($progressos) {
                $progresso = $progressos->get($treinamento->id);
                return [
                    'id' => $treinamento->id,
                    'pergunta' => $treinamento->pergunta,
                    'setor' => $treinamento->setor,
                    'nivel' => $treinamento->nivel,
                    'ordem' => $treinamento->ordem,
                    'concluido' => $progresso ? $progresso->concluido : false,
                    'data_conclusao' => $progresso?->data_conclusao,
                    'tempo_leitura_segundos' => $progresso?->tempo_leitura_segundos,
                ];
            });

            $concluidos = $treinamentosComProgresso->where('concluido', true)->count();
            $total = $treinamentosComProgresso->count();
            $progressoPercentual = $total > 0 ? ($concluidos / $total) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'usuario' => [
                        'id' => $usuario->id,
                        'name' => $usuario->name,
                        'setor' => $usuario->setor,
                        'nivel_liberado' => $usuario->nivel_treinamento_liberado,
                        'progresso_geral' => round($usuario->progresso_treinamento, 2),
                        'ultimo_acesso' => $usuario->ultimo_acesso_treinamento,
                    ],
                    'estatisticas' => [
                        'total' => $total,
                        'concluidos' => $concluidos,
                        'pendentes' => $total - $concluidos,
                        'progresso_percentual' => round($progressoPercentual, 2),
                    ],
                    'treinamentos' => $treinamentosComProgresso->values(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter progresso',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar treinamento como concluído
     */
    public function marcarComoConcluido(Request $request, $treinamentoId): JsonResponse
    {
        try {
            $usuario = $request->user();
            $tenantId = $usuario->tenant_id;

            $treinamento = Treinamento::where('tenant_id', $tenantId)
                ->where('id', $treinamentoId)
                ->where('ativo', true)
                ->firstOrFail();

            $validator = Validator::make($request->all(), [
                'tempo_leitura_segundos' => 'nullable|integer|min:0',
                'observacoes' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $progresso = TreinamentoProgresso::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'usuario_id' => $usuario->id,
                    'treinamento_id' => $treinamentoId,
                ],
                [
                    'concluido' => false,
                ]
            );

            if (!$progresso->concluido) {
                $progresso->marcarComoConcluido($request->input('tempo_leitura_segundos'));
                
                if ($request->has('observacoes')) {
                    $progresso->update(['observacoes' => $request->input('observacoes')]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Treinamento marcado como concluído',
                'data' => $progresso->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar como concluído',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter progresso de um colaborador específico (apenas admin/gestor)
     */
    public function progressoColaborador(Request $request, $usuarioId): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado'
                ], 403);
            }

            $tenantId = $request->user()->tenant_id;
            $usuario = User::where('tenant_id', $tenantId)->findOrFail($usuarioId);

            // Mesma lógica do meuProgresso, mas para outro usuário
            $treinamentos = Treinamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->where(function($query) use ($usuario) {
                    $query->where('setor', $usuario->setor)
                          ->orWhere('setor', 'geral');
                })
                ->orderBy('ordem')
                ->orderBy('id')
                ->get();

            $progressos = TreinamentoProgresso::where('usuario_id', $usuario->id)
                ->whereIn('treinamento_id', $treinamentos->pluck('id'))
                ->get()
                ->keyBy('treinamento_id');

            $treinamentosComProgresso = $treinamentos->map(function($treinamento) use ($progressos) {
                $progresso = $progressos->get($treinamento->id);
                return [
                    'id' => $treinamento->id,
                    'pergunta' => $treinamento->pergunta,
                    'setor' => $treinamento->setor,
                    'nivel' => $treinamento->nivel,
                    'concluido' => $progresso ? $progresso->concluido : false,
                    'data_conclusao' => $progresso?->data_conclusao,
                ];
            });

            $concluidos = $treinamentosComProgresso->where('concluido', true)->count();
            $total = $treinamentosComProgresso->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'usuario' => [
                        'id' => $usuario->id,
                        'name' => $usuario->name,
                        'setor' => $usuario->setor,
                        'nivel_liberado' => $usuario->nivel_treinamento_liberado,
                        'progresso_geral' => round($usuario->progresso_treinamento, 2),
                        'ultimo_acesso' => $usuario->ultimo_acesso_treinamento,
                    ],
                    'estatisticas' => [
                        'total' => $total,
                        'concluidos' => $concluidos,
                        'pendentes' => $total - $concluidos,
                    ],
                    'treinamentos' => $treinamentosComProgresso->values(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter progresso',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar dados de treinamento do colaborador (apenas admin/gestor)
     */
    public function atualizarColaborador(Request $request, $usuarioId): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'setor' => 'nullable|in:atendimento,vendas,producao,design,financeiro,geral',
                'nivel_treinamento_liberado' => 'nullable|in:iniciante,intermediario,avancado',
                'resetar_progresso' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuario = User::where('tenant_id', $tenantId)->findOrFail($usuarioId);

            $dados = [];
            if ($request->has('setor')) {
                $dados['setor'] = $request->setor;
            }
            if ($request->has('nivel_treinamento_liberado')) {
                $dados['nivel_treinamento_liberado'] = $request->nivel_treinamento_liberado;
            }

            if (!empty($dados)) {
                $usuario->update($dados);
            }

            // Resetar progresso se solicitado
            if ($request->boolean('resetar_progresso')) {
                TreinamentoProgresso::where('usuario_id', $usuario->id)->delete();
                $usuario->update([
                    'progresso_treinamento' => 0,
                    'ultimo_acesso_treinamento' => null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Dados atualizados com sucesso',
                'data' => $usuario->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
