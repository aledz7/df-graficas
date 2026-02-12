<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TreinamentoAviso;
use App\Models\TreinamentoRegraAlerta;
use App\Services\TreinamentoAvisoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TreinamentoAvisoController extends Controller
{
    protected $avisoService;

    public function __construct(TreinamentoAvisoService $avisoService)
    {
        $this->avisoService = $avisoService;
    }

    /**
     * Listar avisos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $query = TreinamentoAviso::where('tenant_id', $tenantId)
                ->with(['usuario:id,name,setor', 'resolvidoPor:id,name']);

            // Filtrar por status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            } else {
                $query->where('status', 'pendente');
            }

            // Filtrar por usuário (se não for admin, mostrar apenas os próprios)
            if (!$request->user()->is_admin) {
                $query->where('usuario_id', $request->user()->id);
            } elseif ($request->has('usuario_id')) {
                $query->where('usuario_id', $request->usuario_id);
            }

            // Filtrar por tipo
            if ($request->has('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            $avisos = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $avisos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar avisos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Marcar aviso como resolvido
     */
    public function marcarComoResolvido(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $aviso = TreinamentoAviso::where('tenant_id', $tenantId)->findOrFail($id);

            // Verificar se o usuário pode resolver (próprio aviso ou admin)
            if (!$request->user()->is_admin && $aviso->usuario_id !== $request->user()->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado'
                ], 403);
            }

            $aviso->marcarComoResolvido($request->user()->id);

            return response()->json([
                'success' => true,
                'message' => 'Aviso marcado como resolvido',
                'data' => $aviso->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao marcar como resolvido',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Executar verificações de atraso
     */
    public function executarVerificacoes(Request $request): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado'
                ], 403);
            }

            $this->avisoService->executarVerificacoes($request->user()->tenant_id);

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

    /**
     * Listar regras de alerta
     */
    public function listarRegras(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $regras = TreinamentoRegraAlerta::where('tenant_id', $tenantId)
                ->orderBy('ativo', 'desc')
                ->orderBy('nome')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $regras
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar regras',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar/atualizar regra de alerta
     */
    public function salvarRegra(Request $request): JsonResponse
    {
        try {
            if (!$request->user()->is_admin) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso negado'
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'id' => 'nullable|exists:treinamento_regras_alerta,id',
                'nome' => 'required|string|max:255',
                'tipo' => 'required|in:nivel_nao_concluido,treinamento_atrasado,setor_incompleto',
                'nivel_alvo' => 'nullable|in:iniciante,intermediario,avancado',
                'setor_alvo' => 'required|in:atendimento,vendas,producao,design,financeiro,geral,todos',
                'prazo_dias' => 'required|integer|min:1',
                'ativo' => 'boolean',
                'notificar_colaborador' => 'boolean',
                'notificar_gestor' => 'boolean',
                'mensagem_personalizada' => 'nullable|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $dados = $validator->validated();
            $dados['tenant_id'] = $request->user()->tenant_id;

            if (!empty($dados['id'])) {
                $regra = TreinamentoRegraAlerta::where('tenant_id', $dados['tenant_id'])
                    ->findOrFail($dados['id']);
                $regra->update($dados);
            } else {
                unset($dados['id']);
                $regra = TreinamentoRegraAlerta::create($dados);
            }

            return response()->json([
                'success' => true,
                'message' => !empty($request->input('id')) ? 'Regra atualizada' : 'Regra criada',
                'data' => $regra->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar regra',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
