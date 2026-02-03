<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PublicProdutoController extends Controller
{
    /**
     * Obter produtos por tenant (rota pública)
     *
     * @param Request $request
     * @param int $tenantId
     * @return JsonResponse
     */
    public function getByTenant(Request $request, $tenantId): JsonResponse
    {
        try {
            $query = Produto::withoutTenant()
                           ->where('tenant_id', $tenantId)
                           ->with([
                               'categoria' => function($query) use ($tenantId) {
                                   $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                                         ->where('tenant_id', $tenantId);
                               },
                               'subcategoria' => function($query) use ($tenantId) {
                                   $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                                         ->where('tenant_id', $tenantId);
                               }
                           ]);

            // Aplicar filtros se existirem
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('nome', 'like', "%{$search}%")
                      ->orWhere('codigo_barras', 'like', "%{$search}%")
                      ->orWhere('descricao_curta', 'like', "%{$search}%")
                      ->orWhere('descricao_longa', 'like', "%{$search}%");
                });
            }

            // Filtrar por categoria
            if ($request->has('categoria_id')) {
                $query->where('categoria_id', $request->input('categoria_id'));
            }

            // Filtrar por subcategoria
            if ($request->has('subcategoria_id')) {
                $query->where('subcategoria_id', $request->input('subcategoria_id'));
            }

            // Filtrar por faixa de preço
            if ($request->has('preco_min')) {
                $query->where('preco_venda', '>=', $request->input('preco_min'));
            }

            if ($request->has('preco_max')) {
                $query->where('preco_venda', '<=', $request->input('preco_max'));
            }

            // Aplicar ordenação
            $sortField = $request->input('sort_by', 'nome');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortField, $sortOrder);

            $produtos = $query->get();

            return response()->json([
                'success' => true,
                'data' => $produtos,
                'message' => 'Produtos do tenant recuperados com sucesso'
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produtos por tenant:', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar produtos do tenant'
            ], 400);
        }
    }

    /**
     * Obter produto específico por ID (rota pública)
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getById($id): JsonResponse
    {
        try {
            $produto = Produto::withoutTenant()
                ->with([
                    'categoria',
                    'subcategoria'
                ])
                ->where('status', true) // Apenas produtos ativos
                ->find($id);

            if (!$produto) {
                return response()->json([
                    'success' => false,
                    'message' => 'Produto não encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $produto
            ]);

        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produto público por ID: ' . $e->getMessage(), [
                'produto_id' => $id,
                'error' => $e->getMessage()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar produto'
            ], 400);
        }
    }
}
