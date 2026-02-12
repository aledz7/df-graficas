<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PerfilVendedorService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PerfilVendedorController extends Controller
{
    protected $perfilService;

    public function __construct(PerfilVendedorService $perfilService)
    {
        $this->perfilService = $perfilService;
    }

    /**
     * Obter perfil de um vendedor específico
     */
    public function show(Request $request, int $vendedorId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $filtros = $validator->validated();

            $perfil = $this->perfilService->analisarPerfilVendedor($tenantId, $vendedorId, $filtros);

            return response()->json([
                'success' => true,
                'data' => $perfil
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter perfil do vendedor',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar perfis de todos os vendedores
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $filtros = $validator->validated();

            $perfis = $this->perfilService->listarPerfisVendedores($tenantId, $filtros);

            return response()->json([
                'success' => true,
                'data' => $perfis,
                'total' => count($perfis)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar perfis',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
