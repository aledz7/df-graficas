<?php

namespace App\Http\Controllers\Api;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\Subcategoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class CategoriaController extends ResourceController
{
    protected $model = Categoria::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100',
        'descricao' => 'nullable|string|max:500',
        'icone' => 'nullable|string|max:50',
        'cor' => 'nullable|string|max:20',
        'ordem' => 'integer|min:0',
        'ativo' => 'boolean',
        'tipo' => 'required|string|max:20', 
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100',
        'descricao' => 'nullable|string|max:500',
        'icone' => 'nullable|string|max:50',
        'cor' => 'nullable|string|max:20',
        'ordem' => 'integer|min:0',
        'ativo' => 'boolean',
        'tipo' => 'sometimes|string|max:20', 
    ];

    protected $with = ['subcategorias'];

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

        // Filtrar por status (ativo/inativo)
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query;
    }

    /**
     * Obter categorias por tenant (rota pública)
     *
     * @param Request $request
     * @param int $tenantId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByTenant(Request $request, $tenantId): \Illuminate\Http\JsonResponse
    {
        try {
            // Desabilitar o TenantScope para esta consulta pública
            $query = Categoria::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                             ->where('tenant_id', $tenantId)
                             ->where('ativo', true)
                             ->where('tipo', 'produto')
                             ->with('subcategorias');

            // Ordenar
            $query->orderBy('ordem', 'asc')->orderBy('nome', 'asc');

            $categorias = $query->get();

            return $this->success($categorias, 'Categorias do tenant recuperadas com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar categorias por tenant:', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage()
            ]);
            return $this->error('Erro ao carregar categorias do tenant');
        }
    }

    /**
     * Armazenar uma categoria recém-criada
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Validação customizada para nome único por tenant
        $rules = [
            'nome' => 'required',
            'tipo' => 'required'
        ];
        
        \Log::info('Dados recebidos para criação de categoria:', [
            'request_data' => $request->all(),
            'tenant_id' => auth()->user()->tenant_id,
            'rules' => $rules,
            'nome' => $request->input('nome'),
            'tipo' => $request->input('tipo'),
            'has_nome' => $request->has('nome'),
            'has_tipo' => $request->has('tipo'),
            'content_type' => $request->header('Content-Type'),
            'method' => $request->method(),
            'all_inputs' => $request->all()
        ]);
        
        // Validação customizada de unicidade por tenant
        $validator = Validator::make($request->all(), $rules);
        
        \Log::info('Resultado da validação:', [
            'validator_fails' => $validator->fails(),
            'errors' => $validator->errors()->toArray(),
            'nome_value' => $request->input('nome'),
            'tipo_value' => $request->input('tipo'),
            'nome_empty' => empty($request->input('nome')),
            'tipo_empty' => empty($request->input('tipo'))
        ]);
        
        // Validação manual do tipo
        $tipo = $request->input('tipo');
        if ($tipo && !in_array($tipo, ['produto', 'financeiro'])) {
            $validator->errors()->add('tipo', 'O tipo deve ser "produto" ou "financeiro".');
        }
        
        // Verificar se o nome já existe para este tenant
        $existingCategory = Categoria::where('nome', $request->input('nome'))
            ->where('tenant_id', auth()->user()->tenant_id)
            ->first();
            
        if ($existingCategory) {
            $validator->errors()->add('nome', 'O nome da categoria já existe para este tenant.');
        }
        
        // Gerar slug único
        $slug = \Illuminate\Support\Str::slug($request->input('nome'));
        $originalSlug = $slug;
        $counter = 1;
        
        while (Categoria::where('slug', $slug)->where('tenant_id', auth()->user()->tenant_id)->exists()) {
            $slug = $originalSlug . '-' . $counter;
            $counter++;
        }

        if ($validator->fails()) {
            \Log::error('Erro de validação na criação de categoria:', [
                'errors' => $validator->errors(),
                'request_data' => $request->all(),
                'existing_category' => $existingCategory ? $existingCategory->toArray() : null,
                'existing_slug' => $existingSlug ? $existingSlug->toArray() : null,
                'validator_fails' => $validator->fails(),
                'has_existing_category' => $existingCategory ? true : false,
                'has_existing_slug' => $existingSlug ? true : false
            ]);
            return $this->validationError($validator->errors());
        }

        $data = $request->all();
        
        // Garantir que o tenant_id seja definido
        $data['tenant_id'] = auth()->user()->tenant_id;

        // Definir valores padrão
        if (!isset($data['ativo'])) {
            $data['ativo'] = true;
        }
        
        if (!isset($data['ordem'])) {
            $ultimaOrdem = Categoria::where('tenant_id', auth()->user()->tenant_id)->max('ordem') ?? 0;
            $data['ordem'] = $ultimaOrdem + 1;
        }
        
        // Usar o slug que foi gerado e verificado anteriormente
        $data['slug'] = $slug;

        try {
            $categoria = Categoria::create($data);
            \Log::info('Categoria criada com sucesso:', [
                'categoria_id' => $categoria->id,
                'nome' => $categoria->nome,
                'tipo' => $categoria->tipo
            ]);
            return $this->success($categoria->load($this->with), 'Categoria criada com sucesso', 201);
        } catch (\Exception $e) {
            \Log::error('Erro ao criar categoria:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'data' => $data
            ]);
            
            // Verificar se é erro de duplicata
            if (strpos($e->getMessage(), 'Duplicate entry') !== false || 
                strpos($e->getMessage(), 'categorias_tenant_id_slug_unique') !== false) {
                return $this->error('Já existe uma categoria com este nome. Por favor, escolha um nome diferente.', 400);
            }
            
            return $this->error('Erro interno ao criar categoria: ' . $e->getMessage());
        }
    }

    /**
     * Atualizar uma categoria específica
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return $this->notFound('Categoria não encontrada');
        }

        // Validação customizada para nome único por tenant
        $rules = $this->updateRules;
        if ($request->has('nome')) {
            $rules['nome'] = 'sometimes|string|max:100|unique:categorias,nome,' . $id . ',id,tenant_id,' . auth()->user()->tenant_id;
        }
        if ($request->has('tipo')) {
            $rules['tipo'] = 'sometimes|string|max:20';
        }
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        // Atualizar apenas os campos fornecidos
        $categoria->fill($request->all());
        
        // Verificar se houve mudanças
        if ($categoria->isDirty()) {
            $categoria->save();
        }

        return $this->success($categoria->load($this->with), 'Categoria atualizada com sucesso');
    }

    /**
     * Remover uma categoria específica
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return $this->notFound('Categoria não encontrada');
        }

        try {
            // Remover referência de produtos para evitar órfãos
            Produto::where('categoria_id', $categoria->id)->update(['categoria_id' => null]);

            // Remover referência de produtos às subcategorias desta categoria
            $subcategoriaIds = Subcategoria::where('categoria_id', $categoria->id)->pluck('id');
            if ($subcategoriaIds->isNotEmpty()) {
                Produto::whereIn('subcategoria_id', $subcategoriaIds)->update(['subcategoria_id' => null]);
            }

            $categoria->delete();
            return $this->success(null, 'Categoria removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a categoria: ' . $e->getMessage());
        }
    }

    /**
     * Retorna as estatísticas da categoria
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function estatisticas($id): JsonResponse
    {
        $categoria = Categoria::withCount(['produtos', 'subcategorias'])->find($id);

        if (!$categoria) {
            return $this->notFound('Categoria não encontrada');
        }

        // Calcular estatísticas adicionais
        $produtosAtivos = $categoria->produtos()->where('ativo', true)->count();
        $valorTotalEstoque = $categoria->produtos()
            ->selectRaw('SUM(preco_custo * estoque_atual) as total')
            ->value('total') ?? 0;

        $estatisticas = [
            'total_produtos' => $categoria->produtos_count,
            'produtos_ativos' => $produtosAtivos,
            'produtos_inativos' => $categoria->produtos_count - $produtosAtivos,
            'total_subcategorias' => $categoria->subcategorias_count,
            'valor_total_estoque' => round($valorTotalEstoque, 2),
        ];

        return $this->success($estatisticas, 'Estatísticas da categoria recuperadas com sucesso');
    }

    /**
     * Reordenar categorias
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function reordenar(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'categorias' => 'required|array',
            'categorias.*.id' => 'required|integer|exists:categorias,id',
            'categorias.*.ordem' => 'required|integer|min:0',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            foreach ($request->input('categorias') as $item) {
                Categoria::where('id', $item['id'])
                        ->update(['ordem' => $item['ordem']]);
            }

            return $this->success(null, 'Categorias reordenadas com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao reordenar categorias: ' . $e->getMessage());
        }
    }

    /**
     * Obter categorias com suas subcategorias
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function comSubcategorias(Request $request): JsonResponse
    {
        $query = Categoria::with(['subcategorias' => function($query) {
            $query->where('ativo', true)->orderBy('ordem');
        }])
        ->where('ativo', true)
        ->orderBy('ordem');

        $categorias = $query->get();

        return $this->success($categorias, 'Categorias com subcategorias recuperadas com sucesso');
    }
}
