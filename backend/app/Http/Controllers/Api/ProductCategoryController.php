<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\ResourceController;
use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductCategoryController extends ResourceController
{
    protected $model = ProductCategory::class;

    /**
     * Define as regras de validação para a criação e atualização
     */
    protected function rules(Request $request, $id = null)
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:product_categories,id'],
            'slug' => ['nullable', 'string', 'max:255'],
            'ordem' => ['nullable', 'integer'],
            'status' => ['nullable', 'boolean']
        ];
    }

    /**
     * Armazenar um recurso recém-criado no armazenamento.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $rules = $this->rules($request);
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $data = $request->all();
        
        // Processar os dados antes de salvar
        if (method_exists($this, 'beforeSave')) {
            $data = $this->beforeSave($data);
        }

        $model = $this->model::create($data);

        return $this->success($model, 'Categoria criada com sucesso', 201);
    }

    /**
     * Processar os dados antes de salvar
     */
    protected function beforeSave($data, $model = null)
    {
        // Sempre gerar um novo slug quando o nome for alterado
        if (isset($data['nome'])) {
            // Se for uma atualização e o nome não mudou, manter o slug existente
            if ($model && $model->nome === $data['nome']) {
                $data['slug'] = $model->slug;
            } else {
                // Gerar novo slug baseado no nome
                $data['slug'] = $this->generateUniqueSlug($data['nome'], $model ? $model->id : null);
            }
        }

        // Definir tenant_id
        if (empty($data['tenant_id'])) {
            $data['tenant_id'] = auth()->user()->tenant_id;
        }

        return $data;
    }

    /**
     * Gera um slug único baseado no nome
     */
    protected function generateUniqueSlug($name, $excludeId = null)
    {
        $slug = Str::slug($name);
        $originalSlug = $slug;
        $count = 1;
        
        $query = $this->model::where('slug', $slug)
            ->where('tenant_id', auth()->user()->tenant_id);
            
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        while ($query->exists()) {
            $slug = $originalSlug . '-' . $count++;
            $query = $this->model::where('slug', $slug)
                ->where('tenant_id', auth()->user()->tenant_id);
                
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
        }
        
        return $slug;
    }

    /**
     * Personalizar a consulta para incluir subcategorias
     */
    protected function query()
    {
        $query = $this->model::query()->where('tenant_id', auth()->user()->tenant_id);
        
        return $query->with('subcategories')
            ->where(function($query) {
                $query->whereNull('parent_id');
            });
    }

    /**
     * Buscar todas as categorias (incluindo subcategorias)
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        $query = $this->model::query()->where('tenant_id', auth()->user()->tenant_id);

        // Filtrar por nome
        if ($request->has('nome')) {
            $query->where('nome', 'like', '%' . $request->nome . '%');
        }

        // Filtrar por status
        if ($request->has('status')) {
            $query->where('status', $request->status == 'true');
        }

        // Filtrar por categorias principais ou todas
        if ($request->has('only_parents') && $request->only_parents == 'true') {
            $query->whereNull('parent_id');
        }

        // Incluir subcategorias
        $query->with('subcategories');

        // Ordenar
        $query->orderBy('ordem', 'asc')->orderBy('nome', 'asc');

        // Paginação
        $perPage = $request->input('per_page', 15);
        $data = $query->paginate($perPage);

        return $this->success($data, 'Categorias listadas com sucesso');
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
            $query = ProductCategory::where('tenant_id', $tenantId)
                                  ->where('status', true)
                                  ->with('subcategories');

            // Filtrar por categorias principais ou todas
            if ($request->has('only_parents') && $request->only_parents == 'true') {
                $query->whereNull('parent_id');
            }

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
}
