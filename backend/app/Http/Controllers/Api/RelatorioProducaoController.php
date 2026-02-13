<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RelatorioProducaoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RelatorioProducaoController extends Controller
{
    protected $relatorioProducaoService;

    public function __construct(RelatorioProducaoService $relatorioProducaoService)
    {
        $this->relatorioProducaoService = $relatorioProducaoService;
    }

    /**
     * Obter relatório de produção
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;

            // Validar parâmetros
            $request->validate([
                'data_inicio' => 'required|date',
                'data_fim' => 'required|date|after_or_equal:data_inicio',
            ]);

            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');

            $relatorio = $this->relatorioProducaoService->obterRelatorio($tenantId, $dataInicio, $dataFim);

            return response()->json($relatorio);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro ao obter relatório de produção',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
