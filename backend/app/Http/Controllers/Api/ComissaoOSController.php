<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComissaoOS;
use App\Models\Funcionario;
use App\Services\ComissaoOSService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ComissaoOSController extends Controller
{
    protected $comissaoService;

    public function __construct(ComissaoOSService $comissaoService)
    {
        $this->comissaoService = $comissaoService;
    }

    /**
     * Listar comissões com filtros
     */
    public function index(Request $request)
    {
        $query = ComissaoOS::with(['funcionario', 'ordemServico']);

        // Filtros
        if ($request->has('funcionario_id')) {
            $query->where('funcionario_id', $request->funcionario_id);
        }

        if ($request->has('status_pagamento')) {
            $query->where('status_pagamento', $request->status_pagamento);
        }

        if ($request->has('data_inicio') && $request->has('data_fim')) {
            $query->whereBetween('data_os_finalizada', [$request->data_inicio, $request->data_fim]);
        }

        $comissoes = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $comissoes
        ]);
    }

    /**
     * Obter comissões de um usuário específico
     */
    public function getComissoesFuncionario(Request $request, $userId)
    {
        $validator = Validator::make($request->all(), [
            'data_inicio' => 'nullable|date',
            'data_fim' => 'nullable|date',
            'status_pagamento' => 'nullable|in:Pendente,Pago,Cancelado'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = \App\Models\User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado'
            ], 404);
        }

        $comissoes = $this->comissaoService->getComissoesUsuario(
            $userId,
            $request->data_inicio,
            $request->data_fim
        );

        $totalPendente = $this->comissaoService->getTotalComissoesUsuario($userId, 'pendente');
        $totalPago = $this->comissaoService->getTotalComissoesUsuario($userId, 'pago');

        return response()->json([
            'success' => true,
            'data' => $comissoes,
            'total_comissoes' => $comissoes->sum('valor_comissao'),
            'total_pendente' => $totalPendente,
            'total_pago' => $totalPago
        ]);
    }

    /**
     * Marcar comissão como paga
     */
    public function marcarComoPaga(Request $request, $comissaoId)
    {
        \Log::info('Tentando marcar comissão como paga', [
            'comissao_id' => $comissaoId,
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        $comissao = ComissaoOS::find($comissaoId);
        
        if (!$comissao) {
            \Log::warning('Comissão não encontrada', ['comissao_id' => $comissaoId]);
            return response()->json([
                'success' => false,
                'message' => 'Comissão não encontrada'
            ], 404);
        }

        \Log::info('Comissão encontrada', [
            'comissao_id' => $comissao->id,
            'status_atual' => $comissao->status_pagamento,
            'pode_ser_paga' => $comissao->podeSerPaga()
        ]);

        if (!$comissao->podeSerPaga()) {
            \Log::warning('Comissão não pode ser marcada como paga', [
                'comissao_id' => $comissao->id,
                'status_atual' => $comissao->status_pagamento
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Comissão não pode ser marcada como paga'
            ], 400);
        }

        $comissao->marcarComoPaga();

        \Log::info('Comissão marcada como paga com sucesso', [
            'comissao_id' => $comissao->id,
            'novo_status' => $comissao->status_pagamento
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Comissão marcada como paga com sucesso',
            'data' => $comissao->fresh()
        ]);
    }

    /**
     * Marcar todas as comissões pendentes de um funcionário como pagas
     */
    public function marcarTodasComoPagas(Request $request, $userId)
    {
        \Log::info('Tentando marcar todas as comissões como pagas', [
            'user_id' => $userId,
            'request_data' => $request->all()
        ]);

        $user = \App\Models\User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado'
            ], 404);
        }

        try {
            // Buscar todas as comissões pendentes do funcionário
            $comissoesPendentes = ComissaoOS::where('funcionario_id', $userId)
                ->where('status_pagamento', 'Pendente')
                ->get();

            if ($comissoesPendentes->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhuma comissão pendente encontrada para este funcionário'
                ], 404);
            }

            $totalComissoes = $comissoesPendentes->count();
            $valorTotal = $comissoesPendentes->sum('valor_comissao');

            // Marcar todas como pagas
            foreach ($comissoesPendentes as $comissao) {
                $comissao->marcarComoPaga();
            }

            \Log::info('Todas as comissões marcadas como pagas com sucesso', [
                'user_id' => $userId,
                'total_comissoes' => $totalComissoes,
                'valor_total' => $valorTotal
            ]);

            return response()->json([
                'success' => true,
                'message' => "Todas as comissões foram marcadas como pagas com sucesso",
                'data' => [
                    'total_comissoes_pagas' => $totalComissoes,
                    'valor_total_pago' => $valorTotal
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Erro ao marcar todas as comissões como pagas', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar comissões como pagas: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Processar comissões pendentes
     */
    public function processarComissoesPendentes()
    {
        try {
            $comissoesCriadas = $this->comissaoService->processarComissoesPendentes();

            return response()->json([
                'success' => true,
                'message' => "Processamento concluído. {$comissoesCriadas} comissões criadas.",
                'data' => [
                    'comissoes_criadas' => $comissoesCriadas
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao processar comissões pendentes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Relatório de comissões
     */
    public function relatorio(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date',
            'funcionario_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = ComissaoOS::with(['funcionario', 'ordemServico'])
            ->whereBetween('data_os_finalizada', [$request->data_inicio, $request->data_fim]);

        if ($request->funcionario_id) {
            $query->where('funcionario_id', $request->funcionario_id);
        }

        $comissoes = $query->get();

        $totais = [
            'total_comissoes' => $comissoes->count(),
            'total_valor' => $comissoes->sum('valor_comissao'),
            'total_pendente' => $comissoes->where('status_pagamento', 'Pendente')->sum('valor_comissao'),
            'total_pago' => $comissoes->where('status_pagamento', 'Pago')->sum('valor_comissao'),
        ];

        $porFuncionario = $comissoes->groupBy('funcionario_id')->map(function ($comissoesFuncionario) {
            return [
                'funcionario' => $comissoesFuncionario->first()->funcionario,
                'total_comissoes' => $comissoesFuncionario->count(),
                'total_valor' => $comissoesFuncionario->sum('valor_comissao'),
                'total_pendente' => $comissoesFuncionario->where('status_pagamento', 'Pendente')->sum('valor_comissao'),
                'total_pago' => $comissoesFuncionario->where('status_pagamento', 'Pago')->sum('valor_comissao'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'periodo' => [
                    'data_inicio' => $request->data_inicio,
                    'data_fim' => $request->data_fim
                ],
                'totais' => $totais,
                'por_funcionario' => $porFuncionario,
                'comissoes' => $comissoes
            ]
        ]);
    }

    /**
     * Obter estatísticas de comissões
     */
    public function estatisticas()
    {
        $totalComissoes = ComissaoOS::count();
        $totalPendente = ComissaoOS::pendentes()->sum('valor_comissao');
        $totalPago = ComissaoOS::pagas()->sum('valor_comissao');
        $comissoesHoje = ComissaoOS::whereDate('created_at', today())->count();

        $topFuncionarios = ComissaoOS::with('funcionario')
            ->selectRaw('funcionario_id, COUNT(*) as total_comissoes, SUM(valor_comissao) as total_valor')
            ->groupBy('funcionario_id')
            ->orderByDesc('total_valor')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_comissoes' => $totalComissoes,
                'total_pendente' => $totalPendente,
                'total_pago' => $totalPago,
                'comissoes_hoje' => $comissoesHoje,
                'top_funcionarios' => $topFuncionarios
            ]
        ]);
    }
}
