<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FormaPagamento;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class FormaPagamentoController extends Controller
{
    /**
     * Listar todas as formas de pagamento
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = FormaPagamento::query();
            
            // Filtrar por tenant
            $tenantId = auth()->user()->tenant_id ?? null;
            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }
            
            // Filtros opcionais
            if ($request->has('ativo')) {
                $query->where('ativo', $request->boolean('ativo'));
            }
            
            if ($request->has('exibir_catalogo')) {
                $query->where('exibir_catalogo', $request->boolean('exibir_catalogo'));
            }
            
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('nome', 'like', "%{$search}%")
                      ->orWhere('codigo', 'like', "%{$search}%");
                });
            }
            
            // Ordenação
            $query->orderBy('ordem', 'asc')->orderBy('nome', 'asc');
            
            // Paginação opcional
            if ($request->has('per_page')) {
                $formasPagamento = $query->paginate($request->per_page);
            } else {
                $formasPagamento = $query->get();
            }
            
            return response()->json([
                'success' => true,
                'data' => $formasPagamento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar formas de pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar nova forma de pagamento
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:100',
                'codigo' => 'nullable|string|max:50',
                'icone' => 'nullable|string|max:50',
                'ativo' => 'boolean',
                'exibir_catalogo' => 'boolean',
                'ordem' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            $data['tenant_id'] = auth()->user()->tenant_id ?? null;
            
            // Gerar código se não informado
            if (empty($data['codigo'])) {
                $data['codigo'] = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $data['nome']));
            }
            
            // Definir ordem se não informada
            if (!isset($data['ordem'])) {
                $maxOrdem = FormaPagamento::where('tenant_id', $data['tenant_id'])->max('ordem') ?? 0;
                $data['ordem'] = $maxOrdem + 1;
            }

            $formaPagamento = FormaPagamento::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Forma de pagamento criada com sucesso',
                'data' => $formaPagamento
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar forma de pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exibir uma forma de pagamento específica
     */
    public function show($id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $formaPagamento = FormaPagamento::where('tenant_id', $tenantId)
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $formaPagamento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Forma de pagamento não encontrada',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Atualizar uma forma de pagamento
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $formaPagamento = FormaPagamento::where('tenant_id', $tenantId)
                ->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'nome' => 'sometimes|required|string|max:100',
                'codigo' => 'nullable|string|max:50',
                'icone' => 'nullable|string|max:50',
                'ativo' => 'boolean',
                'exibir_catalogo' => 'boolean',
                'ordem' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $formaPagamento->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Forma de pagamento atualizada com sucesso',
                'data' => $formaPagamento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar forma de pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir uma forma de pagamento
     */
    public function destroy($id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;
            
            $formaPagamento = FormaPagamento::where('tenant_id', $tenantId)
                ->findOrFail($id);

            $formaPagamento->delete();

            return response()->json([
                'success' => true,
                'message' => 'Forma de pagamento excluída com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir forma de pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar formas de pagamento para o catálogo público (por tenant)
     */
    public function getByTenant($tenantId): JsonResponse
    {
        try {
            $formasPagamento = FormaPagamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->where('exibir_catalogo', true)
                ->orderBy('ordem', 'asc')
                ->orderBy('nome', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $formasPagamento
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar formas de pagamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
