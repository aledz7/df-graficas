<?php

namespace App\Http\Controllers\Api;

use App\Models\Subcategoria;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class SubcategoriaController extends ResourceController
{
    protected $model = Subcategoria::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100',
        'categoria_id' => 'required|exists:categorias,id',
        'descricao' => 'nullable|string|max:500',
        'icone' => 'nullable|string|max:50',
        'cor' => 'nullable|string|max:20',
        'ordem' => 'integer|min:0',
        'ativo' => 'boolean',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100',
        'categoria_id' => 'sometimes|exists:categorias,id',
        'descricao' => 'nullable|string|max:500',
        'icone' => 'nullable|string|max:50',
        'cor' => 'nullable|string|max:20',
        'ordem' => 'integer|min:0',
        'ativo' => 'boolean',
    ];

    protected $with = ['categoria'];

    /**
     * Armazenar uma subcategoria recém-criada
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Log para debug
            \Log::info('Criando subcategoria com dados: ' . json_encode($request->all()));
            \Log::info('Tenant ID do usuário: ' . auth()->user()->tenant_id);
            
            // Validação customizada para nome único por categoria e tenant
            $rules = $this->storeRules;
            $rules['nome'] = [
                'required',
                'string',
                'max:100',
                Rule::unique('subcategorias')->where(function ($query) use ($request) {
                    return $query->where('categoria_id', $request->input('categoria_id'))
                                ->where('tenant_id', auth()->user()->tenant_id);
                })
            ];

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                \Log::warning('Validação falhou: ' . json_encode($validator->errors()->toArray()));
                return $this->validationError($validator->errors());
            }

            $data = $request->all();
            
            // Buscar categoria para garantir que estamos no tenant correto
            $categoria = \App\Models\Categoria::find($data['categoria_id']);
            if (!$categoria) {
                return $this->notFound('Categoria não encontrada');
            }
            
            // Usar o tenant_id da categoria para garantir consistência
            $data['tenant_id'] = $categoria->tenant_id;
            \Log::info('Tenant ID da categoria: ' . $categoria->tenant_id);
            \Log::info('Tenant ID do usuário: ' . auth()->user()->tenant_id);
            \Log::info('Tenant ID definido para subcategoria: ' . $data['tenant_id']);

            // Definir ordem automaticamente se não fornecida
            if (!isset($data['ordem'])) {
                $ultimaOrdem = Subcategoria::where('categoria_id', $data['categoria_id'])
                                          ->max('ordem') ?? 0;
                $data['ordem'] = $ultimaOrdem + 1;
            }
            
            // Gerar slug automaticamente
            if (!isset($data['slug']) || empty($data['slug'])) {
                $data['slug'] = \Illuminate\Support\Str::slug($data['nome']);
                
                // Verificar se o slug já existe para este tenant
                $slugCount = Subcategoria::where('slug', $data['slug'])
                                        ->where('tenant_id', $data['tenant_id'])
                                        ->count();
                                        
                if ($slugCount > 0) {
                    $data['slug'] = $data['slug'] . '-' . ($slugCount + 1);
                }
            }

            $subcategoria = Subcategoria::create($data);
            \Log::info('Subcategoria criada com ID: ' . $subcategoria->id);

            return $this->success($subcategoria->load($this->with), 'Subcategoria criada com sucesso', 201);
        } catch (\Exception $e) {
            \Log::error('Erro ao criar subcategoria: ' . $e->getMessage());
            return $this->error('Erro ao criar subcategoria: ' . $e->getMessage());
        }
    }

    /**
     * Atualizar uma subcategoria específica
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $subcategoria = Subcategoria::find($id);

        if (!$subcategoria) {
            return $this->notFound('Subcategoria não encontrada');
        }

        // Validação customizada para nome único por categoria e tenant
        $rules = $this->updateRules;
        if ($request->has('nome')) {
            $categoriaId = $request->has('categoria_id') ? $request->input('categoria_id') : $subcategoria->categoria_id;
            $rules['nome'] = [
                'sometimes',
                'string',
                'max:100',
                Rule::unique('subcategorias')->where(function ($query) use ($categoriaId) {
                    return $query->where('categoria_id', $categoriaId)
                                ->where('tenant_id', auth()->user()->tenant_id);
                })->ignore($id)
            ];
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        // Atualizar apenas os campos fornecidos
        $subcategoria->fill($request->all());
        
        // Verificar se houve mudanças
        if ($subcategoria->isDirty()) {
            $subcategoria->save();
        }

        return $this->success($subcategoria->load($this->with), 'Subcategoria atualizada com sucesso');
    }

    /**
     * Remover uma subcategoria específica
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        $subcategoria = Subcategoria::find($id);

        if (!$subcategoria) {
            return $this->notFound('Subcategoria não encontrada');
        }

        try {
            // Remover referência de produtos para evitar órfãos
            Produto::where('subcategoria_id', $subcategoria->id)->update(['subcategoria_id' => null]);

            $subcategoria->delete();
            return $this->success(null, 'Subcategoria removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a subcategoria: ' . $e->getMessage());
        }
    }

    /**
     * Aplica filtros à consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por termo de busca
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('descricao', 'like', "%{$search}%");
            });
        }

        // Filtrar por categoria
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        // Filtrar por status (ativo/inativo)
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query;
    }

    /**
     * Retorna as estatísticas da subcategoria
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function estatisticas($id): JsonResponse
    {
        $subcategoria = Subcategoria::withCount('produtos')->find($id);

        if (!$subcategoria) {
            return $this->notFound('Subcategoria não encontrada');
        }

        // Calcular estatísticas adicionais
        $produtosAtivos = $subcategoria->produtos()->where('ativo', true)->count();
        $valorTotalEstoque = $subcategoria->produtos()
            ->selectRaw('SUM(preco_custo * estoque_atual) as total')
            ->value('total') ?? 0;

        $estatisticas = [
            'total_produtos' => $subcategoria->produtos_count,
            'produtos_ativos' => $produtosAtivos,
            'produtos_inativos' => $subcategoria->produtos_count - $produtosAtivos,
            'valor_total_estoque' => round($valorTotalEstoque, 2),
        ];

        return $this->success($estatisticas, 'Estatísticas da subcategoria recuperadas com sucesso');
    }

    /**
     * Retorna todas as subcategorias de uma categoria específica
     * 
     * @param int $categoriaId
     * @return JsonResponse
     */
    public function porCategoria($categoriaId): JsonResponse
    {
        try {
            // Log para debug
            \Log::info('Buscando subcategorias para categoria: ' . $categoriaId);
            \Log::info('Tenant ID do usuário: ' . auth()->user()->tenant_id);
            
            // Primeiro buscar sem filtro de tenant para debug
            $todasSubcategorias = Subcategoria::where('categoria_id', $categoriaId)->get();
            \Log::info('Total de subcategorias sem filtro de tenant: ' . $todasSubcategorias->count());
            
            // Buscar categoria para garantir que estamos no tenant correto
            $categoria = \App\Models\Categoria::find($categoriaId);
            if (!$categoria) {
                return $this->notFound('Categoria não encontrada');
            }
            
            // Usar o tenant_id da categoria para garantir consistência
            $subcategorias = Subcategoria::where('categoria_id', $categoriaId)
                ->where('tenant_id', $categoria->tenant_id)
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get();
                
            // Log para debug
            \Log::info('Tenant ID da categoria: ' . $categoria->tenant_id);
            \Log::info('Tenant ID do usuário: ' . auth()->user()->tenant_id);
            \Log::info('Total de subcategorias encontradas: ' . $subcategorias->count());
            
            \Log::info('Total de subcategorias com filtro de tenant: ' . $subcategorias->count());
            
            return $this->success([
                'data' => $subcategorias,
                'total' => $subcategorias->count()
            ], 'Subcategorias da categoria recuperadas com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar subcategorias: ' . $e->getMessage());
            return $this->error('Erro ao buscar subcategorias: ' . $e->getMessage());
        }
    }

    /**
     * Reordenar subcategorias
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function reordenar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'subcategorias' => 'required|array',
            'subcategorias.*.id' => 'required|integer|exists:subcategorias,id',
            'subcategorias.*.ordem' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $tenantId = auth()->user()->tenant_id;
            $subcategoriaIds = collect($request->input('subcategorias'))->pluck('id');
            
            // Verificar se todas as subcategorias pertencem ao tenant atual
            $subcategoriasCount = Subcategoria::whereIn('id', $subcategoriaIds)
                ->where('tenant_id', $tenantId)
                ->count();
                
            if ($subcategoriasCount !== count($subcategoriaIds)) {
                return $this->error('Algumas subcategorias não pertencem ao seu tenant', 403);
            }
            
            // Atualizar a ordem
            foreach ($request->input('subcategorias') as $item) {
                Subcategoria::where('id', $item['id'])
                           ->where('tenant_id', $tenantId)
                           ->update(['ordem' => $item['ordem']]);
            }


            return $this->success(null, 'Subcategorias reordenadas com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao reordenar subcategorias: ' . $e->getMessage());
        }
    }
    /**
     * Obter subcategorias ativas
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function ativas(Request $request): JsonResponse
    {
        $query = Subcategoria::where('ativo', true)
                            ->where('tenant_id', auth()->user()->tenant_id)
                            ->with('categoria')
                            ->orderBy('categoria_id')
                            ->orderBy('ordem')
                            ->orderBy('nome');

        // Filtrar por categoria se fornecida
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        $subcategorias = $query->get();

        return $this->success($subcategorias, 'Subcategorias ativas recuperadas com sucesso');
    }
}
