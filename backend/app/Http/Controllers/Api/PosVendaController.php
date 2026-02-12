<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PosVendaService;
use App\Models\PosVenda;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class PosVendaController extends Controller
{
    protected $posVendaService;

    public function __construct(PosVendaService $posVendaService)
    {
        $this->posVendaService = $posVendaService;
    }

    /**
     * Listar pós-vendas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            
            $query = PosVenda::where('tenant_id', $tenantId)
                ->with(['cliente', 'venda', 'vendedor', 'responsavelAtual']);

            // Filtros
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }
            if ($request->has('tipo')) {
                $query->where('tipo', $request->tipo);
            }
            if ($request->has('vendedor_id')) {
                $query->where('vendedor_id', $request->vendedor_id);
            }
            if ($request->has('responsavel_id')) {
                $query->where('responsavel_atual_id', $request->responsavel_id);
            }
            if ($request->has('cliente_id')) {
                $query->where('cliente_id', $request->cliente_id);
            }

            $posVendas = $query->orderBy('data_abertura', 'desc')->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $posVendas
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar pós-vendas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter pós-venda específico
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $posVenda = PosVenda::where('tenant_id', $tenantId)
                ->with([
                    'cliente',
                    'venda',
                    'vendedor',
                    'responsavelAtual',
                    'usuarioAbertura',
                    'usuarioResolucao',
                    'historico.usuario',
                    'transferencias.usuarioOrigem',
                    'transferencias.usuarioDestino',
                    'agendamentos.responsavel'
                ])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $posVenda
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter pós-venda',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar pós-venda
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'cliente_id' => 'required|exists:clientes,id',
                'venda_id' => 'nullable|exists:vendas,id',
                'vendedor_id' => 'nullable|exists:users,id',
                'tipo' => 'required|in:satisfacao,reclamacao,elogio,ajuste_retrabalho,nova_oportunidade,outro',
                'observacao' => 'required|string',
                'nota_satisfacao' => 'nullable|integer|min:1|max:5',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;
            $dados = $validator->validated();

            $posVenda = $this->posVendaService->criar($tenantId, $dados, $usuarioId);

            return response()->json([
                'success' => true,
                'message' => 'Pós-venda criado com sucesso',
                'data' => $posVenda->load(['cliente', 'venda', 'vendedor', 'responsavelAtual'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar pós-venda',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar status
     */
    public function atualizarStatus(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'status' => 'required|in:pendente,em_andamento,resolvido',
                'observacao' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $posVenda = $this->posVendaService->atualizarStatus(
                $tenantId,
                $id,
                $request->status,
                $usuarioId,
                $request->observacao
            );

            return response()->json([
                'success' => true,
                'message' => 'Status atualizado com sucesso',
                'data' => $posVenda->load(['cliente', 'venda', 'vendedor', 'responsavelAtual'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Transferir responsabilidade
     */
    public function transferir(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'novo_responsavel_id' => 'required|exists:users,id',
                'motivo' => 'required|string|min:10',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $posVenda = $this->posVendaService->transferir(
                $tenantId,
                $id,
                $request->novo_responsavel_id,
                $request->motivo,
                $usuarioId
            );

            return response()->json([
                'success' => true,
                'message' => 'Responsabilidade transferida com sucesso',
                'data' => $posVenda->load(['cliente', 'venda', 'vendedor', 'responsavelAtual'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao transferir responsabilidade',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Adicionar observação
     */
    public function adicionarObservacao(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'observacao' => 'required|string|min:5',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $posVenda = $this->posVendaService->adicionarObservacao(
                $tenantId,
                $id,
                $request->observacao,
                $usuarioId
            );

            return response()->json([
                'success' => true,
                'message' => 'Observação adicionada com sucesso',
                'data' => $posVenda->load(['cliente', 'venda', 'vendedor', 'responsavelAtual'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao adicionar observação',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar agendamento
     */
    public function criarAgendamento(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'data_agendamento' => 'required|date|after:now',
                'responsavel_id' => 'nullable|exists:users,id',
                'observacao' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $agendamento = $this->posVendaService->criarAgendamento(
                $tenantId,
                $id,
                $validator->validated(),
                $usuarioId
            );

            return response()->json([
                'success' => true,
                'message' => 'Agendamento criado com sucesso',
                'data' => $agendamento->load(['posVenda', 'responsavel'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar agendamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Concluir agendamento
     */
    public function concluirAgendamento(Request $request, int $agendamentoId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $usuarioId = $request->user()->id;

            $agendamento = $this->posVendaService->concluirAgendamento(
                $tenantId,
                $agendamentoId,
                $usuarioId
            );

            return response()->json([
                'success' => true,
                'message' => 'Agendamento concluído com sucesso',
                'data' => $agendamento->load(['posVenda', 'responsavel'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao concluir agendamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter histórico do cliente
     */
    public function historicoCliente(Request $request, int $clienteId): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            
            $posVendas = PosVenda::where('tenant_id', $tenantId)
                ->where('cliente_id', $clienteId)
                ->with(['venda', 'vendedor', 'responsavelAtual'])
                ->orderBy('data_abertura', 'desc')
                ->get();

            // Estatísticas
            $estatisticas = [
                'total' => $posVendas->count(),
                'por_tipo' => $posVendas->groupBy('tipo')->map->count(),
                'ultimo_feedback' => $posVendas->first(),
                'media_satisfacao' => $posVendas->whereNotNull('nota_satisfacao')->avg('nota_satisfacao'),
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'pos_vendas' => $posVendas,
                    'estatisticas' => $estatisticas,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter histórico',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Executar verificações de alertas
     */
    public function executarVerificacoes(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $this->posVendaService->verificarAlertas($tenantId);

            return response()->json([
                'success' => true,
                'message' => 'Verificações executadas com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao executar verificações',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
