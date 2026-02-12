<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TermometroService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TermometroController extends Controller
{
    protected $termometroService;

    public function __construct(TermometroService $termometroService)
    {
        $this->termometroService = $termometroService;
    }

    /**
     * Obter status do termômetro
     */
    public function status(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $userId = $request->user()->id;
            $isAdmin = $request->user()->is_admin ?? false;

            $status = $this->termometroService->calcularStatus($tenantId, $userId, $isAdmin);

            return response()->json([
                'success' => true,
                'data' => $status
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter status do termômetro',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter configuração (apenas admin)
     */
    public function config(Request $request): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas administradores podem acessar as configurações'
                ], 403);
            }

            $tenantId = $request->user()->tenant_id;
            $config = $this->termometroService->obterConfig($tenantId);

            return response()->json([
                'success' => true,
                'data' => $config
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter configuração',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar configuração (apenas admin)
     */
    public function atualizarConfig(Request $request): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Apenas administradores podem atualizar as configurações'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'todos_usuarios' => 'nullable|boolean',
                'apenas_admin' => 'nullable|boolean',
                'usuarios_permitidos' => 'nullable|array',
                'usuarios_permitidos.*' => 'integer|exists:users,id',
                'configuracoes_limites' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $dados = $validator->validated();

            $config = $this->termometroService->atualizarPermissoes($tenantId, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Configuração atualizada com sucesso',
                'data' => $config
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar configuração',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
