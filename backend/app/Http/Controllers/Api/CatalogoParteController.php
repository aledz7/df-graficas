<?php

namespace App\Http\Controllers\Api;

use App\Models\CatalogoParte;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use App\Traits\UploadsFiles;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class CatalogoParteController extends ResourceController
{
    use UploadsFiles;

    protected $model = CatalogoParte::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:255',
        'altura' => 'nullable|numeric|min:0',
        'largura' => 'nullable|numeric|min:0',
        'imagem' => 'nullable|string',
        'imagem_url_externa' => 'nullable|string|max:255'
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:255',
        'altura' => 'nullable|numeric|min:0',
        'largura' => 'nullable|numeric|min:0',
        'imagem' => 'nullable|string',
        'imagem_url_externa' => 'nullable|string|max:255'
    ];

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
            $query->where('nome', 'like', "%{$search}%");
        }

        return $query;
    }

    /**
     * Processar os dados antes de salvar
     */
    protected function beforeSave($data, $model = null)
    {
        // Definir tenant_id se não estiver definido
        if (empty($data['tenant_id'])) {
            $data['tenant_id'] = auth()->user()->tenant_id;
        }

        // Remover imagem_url_externa se houver imagem
        if (!empty($data['imagem']) && !empty($data['imagem_url_externa'])) {
            unset($data['imagem_url_externa']);
        }

        return $data;
    }

    /**
     * Sobrescreve o método index do ResourceController para retornar um array simples
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
        
        $items = $query->get()->map(function ($item) {
            if ($item->imagem) {
                $item->imagem = Storage::url($item->imagem);
            }
            return $item;
        });
        
        return response()->json($items);
    }

    /**
     * Upload de imagem para catálogo de partes
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadImagem(Request $request): JsonResponse
    {
        $request->validate([
            'imagem' => 'required|image|max:5120', // 5MB max
        ]);

        try {
            $tenant_id = auth()->user()->tenant_id;
            $image = $request->file('imagem');
            $filename = 'catalogo_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/catalogo-partes',
                $image,
                $filename
            );
            
            // Retorna o caminho da imagem para ser armazenado no banco
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da imagem: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sobrescreve o método destroy para também deletar a imagem
     */
    public function destroy($id): JsonResponse
    {
        try {
            $item = $this->model::findOrFail($id);
            
            // Deleta a imagem se existir
            if ($item->imagem) {
                Storage::disk('public')->delete($item->imagem);
            }
            
            $item->delete();
            
            return response()->json(['message' => 'Item excluído com sucesso']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao excluir item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Retorna uma parte específica do catálogo
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show($id): JsonResponse
    {
        try {
            $item = $this->model::findOrFail($id);
            
            if ($item->imagem) {
                $item->imagem = Storage::url($item->imagem);
            }
            
            return response()->json($item);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao buscar item: ' . $e->getMessage()], 500);
        }
    }
} 