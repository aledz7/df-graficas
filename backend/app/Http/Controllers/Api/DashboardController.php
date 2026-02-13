<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    protected $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * Obter widgets disponíveis para o usuário
     */
    public function getWidgetsDisponiveis()
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $widgets = $this->dashboardService->getWidgetsDisponiveis($tenantId, $userId);

            return response()->json([
                'success' => true,
                'data' => $widgets,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter widgets disponíveis',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter configuração do dashboard do usuário
     */
    public function getConfiguracao()
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $config = $this->dashboardService->getConfiguracao($tenantId, $userId);

            return response()->json([
                'success' => true,
                'data' => $config,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter configuração',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Salvar configuração do dashboard
     */
    public function salvarConfiguracao(Request $request)
    {
        try {
            $request->validate([
                'layout' => 'nullable|array',
                'widgets_visiveis' => 'required|array',
                'nome_configuracao' => 'nullable|string|max:255',
                'is_padrao' => 'nullable|boolean',
            ]);

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $result = $this->dashboardService->salvarConfiguracao(
                $tenantId,
                $userId,
                $request->all()
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao salvar configuração',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter dados de um widget específico
     */
    public function getDadosWidget(Request $request, string $widgetCodigo)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            $filtros = $request->all();
            $dados = $this->dashboardService->getDadosWidget($tenantId, $widgetCodigo, $filtros);

            return response()->json([
                'success' => true,
                'data' => $dados,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter dados do widget',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter dados de múltiplos widgets de uma vez
     */
    public function getDadosWidgets(Request $request)
    {
        try {
            $request->validate([
                'widgets' => 'required|array',
                'widgets.*' => 'required|string',
            ]);

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $filtros = $request->except(['widgets']);

            $dados = [];
            foreach ($request->widgets as $widgetCodigo) {
                $dados[$widgetCodigo] = $this->dashboardService->getDadosWidget($tenantId, $widgetCodigo, $filtros);
            }

            return response()->json([
                'success' => true,
                'data' => $dados,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter dados dos widgets',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
