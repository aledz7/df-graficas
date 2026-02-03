<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

abstract class ResourceController extends BaseController
{
    /**
     * O modelo Eloquent associado ao controlador
     *
     * @var string
     */
    protected $model;

    /**
     * As regras de validação para criação
     *
     * @var array
     */
    protected $storeRules = [];

    /**
     * As regras de validação para atualização
     *
     * @var array
     */
    protected $updateRules = [];

    /**
     * Os relacionamentos para carregar ao buscar um recurso
     *
     * @var array
     */
    protected $with = [];

    /**
     * Exibir uma lista do recurso.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        $query = $this->model::query();

        // Aplicar escopo do tenant se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        // Aplicar filtros
        if (method_exists($this, 'applyFilters')) {
            $query = $this->applyFilters($query, $request);
        }

        // Aplicar ordenação
        $sortField = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortField, $sortOrder);

        // Carregar relacionamentos
        $withParam = $request->input('with');
        if ($withParam !== null) {
            // Se o parâmetro 'with' foi fornecido, usar ele (pode ser vazio para não carregar relacionamentos)
            if ($withParam) {
                $relationships = explode(',', $withParam);
                $query->with($relationships);
            }
        } elseif (!empty($this->with)) {
            // Se não foi fornecido parâmetro 'with', usar o padrão da classe
            $query->with($this->with);
        }

        // Paginação
        $perPage = min($request->input('per_page', 15), 1000); // Máximo de 1000 itens por página
        $data = $query->paginate($perPage);

        return $this->success($data);
    }

    /**
     * Armazenar um recurso recém-criado no armazenamento.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $data = $request->all();
        
        // Adicionar tenant_id se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $data['tenant_id'] = auth()->user()->tenant_id;
        }

        $model = $this->model::create($data);

        return $this->success($model, 'Recurso criado com sucesso', 201);
    }

    /**
     * Exibir o recurso especificado.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show($id): JsonResponse
    {
        $query = $this->model::query();
        
        // Aplicar escopo do tenant se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }
        
        if (!empty($this->with)) {
            $query->with($this->with);
        }
        
        $model = $query->find($id);

        if (!$model) {
            return $this->notFound();
        }

        return $this->success($model);
    }

    /**
     * Atualizar o recurso especificado no armazenamento.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->updateRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $query = $this->model::query();
        
        // Aplicar escopo do tenant se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }
        
        $model = $query->find($id);

        if (!$model) {
            return $this->notFound();
        }

        // Processar os dados antes de salvar
        $data = $request->all();
        if (method_exists($this, 'beforeSave')) {
            $data = $this->beforeSave($data, $model);
        }

        $model->update($data);

        return $this->success($model, 'Recurso atualizado com sucesso');
    }

    /**
     * Remover o recurso especificado do armazenamento.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        $query = $this->model::query();
        
        // Aplicar escopo do tenant se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }
        
        $model = $query->find($id);

        if (!$model) {
            return $this->notFound();
        }

        // Verificar se o modelo usa soft delete
        if (method_exists($model, 'trashed') && $model->trashed()) {
            return $this->error('O recurso já foi removido', 410);
        }

        try {
            $model->delete();
            return $this->success(null, 'Recurso removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover o recurso: ' . $e->getMessage());
        }
    }
}
