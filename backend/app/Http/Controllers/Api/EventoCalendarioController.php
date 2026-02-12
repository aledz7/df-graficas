<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EventoCalendarioService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class EventoCalendarioController extends Controller
{
    protected $eventoService;

    public function __construct(EventoCalendarioService $eventoService)
    {
        $this->eventoService = $eventoService;
    }

    /**
     * Listar eventos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'data_inicio' => 'nullable|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'mes' => 'nullable|integer|min:1|max:12',
                'ano' => 'nullable|integer|min:2000|max:2100',
                'tipo' => 'nullable|in:volta_aulas,eleicoes,datas_comerciais,feriado,evento_especial,outro',
                'impacto' => 'nullable|in:alto,medio,baixo',
                'incluir_inativos' => 'nullable|boolean',
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

            $eventos = $this->eventoService->listarEventos($tenantId, $filtros);

            return response()->json([
                'success' => true,
                'data' => $eventos,
                'total' => count($eventos)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar eventos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter evento específico
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $evento = \App\Models\EventoCalendario::where('tenant_id', $tenantId)->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $evento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar evento
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'titulo' => 'required|string|max:255',
                'descricao' => 'nullable|string',
                'data_inicio' => 'required|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'required|in:volta_aulas,eleicoes,datas_comerciais,feriado,evento_especial,outro',
                'impacto' => 'nullable|in:alto,medio,baixo',
                'recorrente' => 'nullable|boolean',
                'frequencia_recorrencia' => 'nullable|in:anual,mensal,semanal',
                'ativo' => 'nullable|boolean',
                'observacoes' => 'nullable|string',
                'metadados' => 'nullable|array',
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

            $evento = $this->eventoService->criarEvento($tenantId, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Evento criado com sucesso',
                'data' => $evento
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar evento
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'titulo' => 'sometimes|required|string|max:255',
                'descricao' => 'nullable|string',
                'data_inicio' => 'sometimes|required|date',
                'data_fim' => 'nullable|date|after_or_equal:data_inicio',
                'tipo' => 'sometimes|required|in:volta_aulas,eleicoes,datas_comerciais,feriado,evento_especial,outro',
                'impacto' => 'nullable|in:alto,medio,baixo',
                'recorrente' => 'nullable|boolean',
                'frequencia_recorrencia' => 'nullable|in:anual,mensal,semanal',
                'ativo' => 'nullable|boolean',
                'observacoes' => 'nullable|string',
                'metadados' => 'nullable|array',
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

            $evento = $this->eventoService->atualizarEvento($tenantId, $id, $dados);

            return response()->json([
                'success' => true,
                'message' => 'Evento atualizado com sucesso',
                'data' => $evento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir evento
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $this->eventoService->excluirEvento($tenantId, $id);

            return response()->json([
                'success' => true,
                'message' => 'Evento excluído com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir evento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter eventos próximos
     */
    public function proximos(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'dias' => 'nullable|integer|min:1|max:365',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = $request->user()->tenant_id;
            $dias = $request->input('dias', 30);

            $eventos = $this->eventoService->obterEventosProximos($tenantId, $dias);

            return response()->json([
                'success' => true,
                'data' => $eventos,
                'total' => count($eventos)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter eventos próximos',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
