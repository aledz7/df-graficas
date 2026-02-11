<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MetaVenda;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class MetaVendaController extends Controller
{
    /**
     * Listar todas as metas
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $query = MetaVenda::where('tenant_id', $tenantId)
                ->with('vendedor:id,name,email')
                ->orderBy('data_inicio', 'desc');

            // Filtros
            if ($request->has('tipo')) {
                $query->where('tipo', $request->tipo);
            }

            if ($request->has('vendedor_id')) {
                $query->where('vendedor_id', $request->vendedor_id);
            }

            if ($request->has('ativo')) {
                $query->where('ativo', $request->boolean('ativo'));
            }

            $metas = $query->get();

            return response()->json([
                'success' => true,
                'data' => $metas
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar metas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar nova meta
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'tipo' => 'required|in:empresa,vendedor',
                'vendedor_id' => 'required_if:tipo,vendedor|exists:users,id',
                'data_inicio' => 'required|date',
                'data_fim' => 'required|date|after_or_equal:data_inicio',
                'periodo_tipo' => 'required|in:diario,mensal,personalizado',
                'valor_meta' => 'required|numeric|min:0.01',
                'observacoes' => 'nullable|string',
                'ativo' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            $data['tenant_id'] = $request->user()->tenant_id;

            // Se for meta de empresa, remover vendedor_id
            if ($data['tipo'] === 'empresa') {
                $data['vendedor_id'] = null;
            }

            $meta = MetaVenda::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Meta criada com sucesso',
                'data' => $meta->load('vendedor:id,name,email')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar meta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar meta
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $meta = MetaVenda::where('tenant_id', $tenantId)->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'tipo' => 'sometimes|in:empresa,vendedor',
                'vendedor_id' => 'required_if:tipo,vendedor|exists:users,id',
                'data_inicio' => 'sometimes|date',
                'data_fim' => 'sometimes|date|after_or_equal:data_inicio',
                'periodo_tipo' => 'sometimes|in:diario,mensal,personalizado',
                'valor_meta' => 'sometimes|numeric|min:0.01',
                'observacoes' => 'nullable|string',
                'ativo' => 'boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // Se for meta de empresa, remover vendedor_id
            if (isset($data['tipo']) && $data['tipo'] === 'empresa') {
                $data['vendedor_id'] = null;
            }

            $meta->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Meta atualizada com sucesso',
                'data' => $meta->load('vendedor:id,name,email')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar meta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir meta
     */
    public function destroy($id): JsonResponse
    {
        try {
            $tenantId = request()->user()->tenant_id;
            $meta = MetaVenda::where('tenant_id', $tenantId)->findOrFail($id);
            $meta->delete();

            return response()->json([
                'success' => true,
                'message' => 'Meta excluída com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir meta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter meta para um período específico
     */
    public function getMetaPeriodo(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');
            $tipo = $request->input('tipo', 'empresa');
            $vendedorId = $request->input('vendedor_id');

            if (!$dataInicio || !$dataFim) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data início e data fim são obrigatórias'
                ], 422);
            }

            $query = MetaVenda::where('tenant_id', $tenantId)
                ->where('tipo', $tipo)
                ->where('ativo', true)
                ->noPeriodo($dataInicio, $dataFim);

            if ($tipo === 'vendedor' && $vendedorId) {
                $query->where('vendedor_id', $vendedorId);
            }

            $meta = $query->first();

            return response()->json([
                'success' => true,
                'data' => $meta ? $meta->load('vendedor:id,name,email') : null
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar meta',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
