<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlertasService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Models\Notificacao;

class AlertasController extends Controller
{
    protected $alertasService;

    public function __construct(AlertasService $alertasService)
    {
        $this->alertasService = $alertasService;
    }

    /**
     * Executar todas as verificações de alertas
     */
    public function executarVerificacoes(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $resultado = $this->alertasService->executarTodasVerificacoes($tenantId);

            return response()->json([
                'success' => true,
                'message' => 'Verificações executadas com sucesso',
                'data' => $resultado
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao executar verificações',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar alertas/notificações
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $userId = $request->user()->id;

            $query = Notificacao::where('tenant_id', $tenantId)
                ->where(function($q) use ($userId) {
                    $q->whereNull('user_id') // Notificações globais
                      ->orWhere('user_id', $userId); // Notificações do usuário
                });

            // Filtros
            if ($request->has('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->has('lida')) {
                $query->where('lida', $request->boolean('lida'));
            }

            if ($request->has('prioridade')) {
                $query->where('prioridade', $request->prioridade);
            }

            $notificacoes = $query->orderBy('data_criacao', 'desc')
                ->paginate($request->get('per_page', 20));

            return response()->json([
                'success' => true,
                'data' => $notificacoes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar alertas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar notificação como lida
     */
    public function marcarComoLida(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $notificacao = Notificacao::where('tenant_id', $tenantId)->findOrFail($id);
            
            $notificacao->update([
                'lida' => true,
                'data_leitura' => now()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Notificação marcada como lida'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar notificação como lida',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar todas as notificações como lidas
     */
    public function marcarTodasComoLidas(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $userId = $request->user()->id;

            Notificacao::where('tenant_id', $tenantId)
                ->where(function($q) use ($userId) {
                    $q->whereNull('user_id')
                      ->orWhere('user_id', $userId);
                })
                ->where('lida', false)
                ->update([
                    'lida' => true,
                    'data_leitura' => now()
                ]);

            return response()->json([
                'success' => true,
                'message' => 'Todas as notificações foram marcadas como lidas'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar notificações como lidas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Contar notificações não lidas
     */
    public function contarNaoLidas(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $userId = $request->user()->id;

            $count = Notificacao::where('tenant_id', $tenantId)
                ->where(function($q) use ($userId) {
                    $q->whereNull('user_id')
                      ->orWhere('user_id', $userId);
                })
                ->where('lida', false)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'count' => $count
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao contar notificações',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
