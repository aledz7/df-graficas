<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClienteTendenciaService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ClienteTendenciaController extends Controller
{
    protected $tendenciaService;

    public function __construct(ClienteTendenciaService $tendenciaService)
    {
        $this->tendenciaService = $tendenciaService;
    }

    /**
     * Listar clientes com queda nas compras
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'periodo_recente_dias' => 'nullable|integer|min:1|max:365',
                'periodo_anterior_dias' => 'nullable|integer|min:1|max:365',
                'percentual_queda_minimo' => 'nullable|numeric|min:0|max:100',
                'valor_minimo_vendas' => 'nullable|numeric|min:0',
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

            $clientes = $this->tendenciaService->listarClientesComQueda($tenantId, $filtros);

            return response()->json([
                'success' => true,
                'data' => $clientes,
                'total' => count($clientes)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar clientes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar alertas de clientes com queda
     */
    public function gerarAlertas(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'periodo_recente_dias' => 'nullable|integer|min:1|max:365',
                'periodo_anterior_dias' => 'nullable|integer|min:1|max:365',
                'percentual_queda_minimo' => 'nullable|numeric|min:0|max:100',
                'valor_minimo_vendas' => 'nullable|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $config = $validator->validated();

            $alertasCriados = $this->tendenciaService->gerarAlertas($tenantId, $config);

            return response()->json([
                'success' => true,
                'message' => "Foram criados {$alertasCriados} alertas de clientes com queda nas compras",
                'data' => [
                    'alertas_criados' => $alertasCriados
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar alertas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
