<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QuickActionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QuickActionController extends Controller
{
    protected $quickActionService;

    public function __construct(QuickActionService $quickActionService)
    {
        $this->quickActionService = $quickActionService;
    }

    /**
     * Obter ações rápidas disponíveis para o usuário
     */
    public function getActionsDisponiveis()
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $actions = $this->quickActionService->getActionsDisponiveis($tenantId, $userId);

            return response()->json([
                'success' => true,
                'data' => $actions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter ações rápidas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter todas as ações rápidas (para configuração)
     */
    public function getAllActions()
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $actions = $this->quickActionService->getAllActions($tenantId);

            return response()->json([
                'success' => true,
                'data' => $actions,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter ações rápidas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Criar nova ação rápida
     */
    public function criarAction(Request $request)
    {
        try {
            $dados = $request->validate([
                'codigo' => 'required|string|unique:quick_actions,codigo',
                'nome' => 'required|string',
                'descricao' => 'nullable|string',
                'categoria' => 'nullable|string',
                'icone' => 'nullable|string',
                'cor_padrao' => 'nullable|string',
                'rota' => 'nullable|string',
                'estado' => 'nullable|array',
                'ordem' => 'nullable|integer',
                'permissao_codigo' => 'nullable|string',
            ]);

            $action = $this->quickActionService->criarAction($dados);

            return response()->json([
                'success' => true,
                'data' => $action,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao criar ação rápida',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Atualizar ação rápida
     */
    public function atualizarAction(Request $request, $id)
    {
        try {
            $dados = $request->validate([
                'nome' => 'sometimes|string',
                'descricao' => 'nullable|string',
                'categoria' => 'nullable|string',
                'icone' => 'nullable|string',
                'cor_padrao' => 'nullable|string',
                'rota' => 'nullable|string',
                'estado' => 'nullable|array',
                'ativo' => 'nullable|boolean',
                'ordem' => 'nullable|integer',
                'permissao_codigo' => 'nullable|string',
            ]);

            $success = $this->quickActionService->atualizarAction($id, $dados);

            if ($success) {
                return response()->json([
                    'success' => true,
                    'message' => 'Ação rápida atualizada com sucesso',
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Ação rápida não encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao atualizar ação rápida',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Deletar ação rápida
     */
    public function deletarAction($id)
    {
        try {
            $success = $this->quickActionService->deletarAction($id);

            if ($success) {
                return response()->json([
                    'success' => true,
                    'message' => 'Ação rápida deletada com sucesso',
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => 'Ação rápida não encontrada',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao deletar ação rápida',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
