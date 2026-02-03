<?php

namespace App\Http\Controllers\Api;

use App\Models\Tamanho;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class TamanhoController extends ResourceController
{
    protected $model = Tamanho::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100',
        'descricao' => 'nullable|string|max:255',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100',
        'descricao' => 'nullable|string|max:255',
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
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('descricao', 'like', "%{$search}%");
            });
        }

        return $query;
    }
}
