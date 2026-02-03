<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notificacao;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class NotificacaoController extends Controller
{
    /**
     * Obter todas as notificações do usuário
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Notificacao::where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_criacao', 'desc');

            // Filtrar por tipo
            if ($request->has('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            // Filtrar por prioridade
            if ($request->has('prioridade')) {
                $query->where('prioridade', $request->prioridade);
            }

            // Filtrar por status (lida/não lida)
            if ($request->has('lida')) {
                $query->where('lida', $request->boolean('lida'));
            }

            // Limitar quantidade
            $limit = $request->input('limit', 50);
            $notificacoes = $query->limit($limit)->get();

            return response()->json([
                'success' => true,
                'message' => 'Notificações recuperadas com sucesso',
                'data' => $notificacoes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao recuperar notificações: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter notificações não lidas
     */
    public function naoLidas(Request $request): JsonResponse
    {
        try {
            $notificacoes = Notificacao::where('tenant_id', auth()->user()->tenant_id)
                ->where('lida', false)
                ->orderBy('data_criacao', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Notificações não lidas recuperadas com sucesso',
                'data' => $notificacoes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao recuperar notificações não lidas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar notificação como lida
     */
    public function marcarComoLida(Request $request, $id): JsonResponse
    {
        try {
            $notificacao = Notificacao::where('tenant_id', auth()->user()->tenant_id)
                ->findOrFail($id);

            $notificacao->marcarComoLida();

            return response()->json([
                'success' => true,
                'message' => 'Notificação marcada como lida',
                'data' => $notificacao
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar notificação como lida: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar todas as notificações como lidas
     */
    public function marcarTodasComoLidas(Request $request): JsonResponse
    {
        try {
            $count = Notificacao::where('tenant_id', auth()->user()->tenant_id)
                ->where('lida', false)
                ->update([
                    'lida' => true,
                    'data_leitura' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => "{$count} notificações marcadas como lidas",
                'data' => ['count' => $count]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar notificações como lidas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remover notificação
     */
    public function destroy($id): JsonResponse
    {
        try {
            $notificacao = Notificacao::where('tenant_id', auth()->user()->tenant_id)
                ->findOrFail($id);

            $notificacao->delete();

            return response()->json([
                'success' => true,
                'message' => 'Notificação removida com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao remover notificação: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar notificação manual
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tipo' => 'required|string|max:50',
            'titulo' => 'required|string|max:255',
            'mensagem' => 'required|string',
            'produto_id' => 'nullable|exists:produtos,id',
            'prioridade' => 'nullable|in:baixa,media,alta',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $notificacao = Notificacao::create([
                'tenant_id' => auth()->user()->tenant_id,
                'user_id' => auth()->id(),
                'tipo' => $request->tipo,
                'titulo' => $request->titulo,
                'mensagem' => $request->mensagem,
                'produto_id' => $request->produto_id,
                'prioridade' => $request->prioridade ?? 'media',
                'lida' => false,
                'data_criacao' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notificação criada com sucesso',
                'data' => $notificacao
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar notificação: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter estatísticas de notificações
     */
    public function estatisticas(Request $request): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;

            $total = Notificacao::where('tenant_id', $tenantId)->count();
            $naoLidas = Notificacao::where('tenant_id', $tenantId)->where('lida', false)->count();
            $hoje = Notificacao::where('tenant_id', $tenantId)
                ->whereDate('data_criacao', today())
                ->count();

            $porTipo = Notificacao::where('tenant_id', $tenantId)
                ->selectRaw('tipo, count(*) as total')
                ->groupBy('tipo')
                ->get();

            $porPrioridade = Notificacao::where('tenant_id', $tenantId)
                ->selectRaw('prioridade, count(*) as total')
                ->groupBy('prioridade')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Estatísticas recuperadas com sucesso',
                'data' => [
                    'total' => $total,
                    'nao_lidas' => $naoLidas,
                    'hoje' => $hoje,
                    'por_tipo' => $porTipo,
                    'por_prioridade' => $porPrioridade,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao recuperar estatísticas: ' . $e->getMessage()
            ], 500);
        }
    }
} 