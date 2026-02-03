<?php

namespace App\Http\Controllers\Api;

use App\Models\Cor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class CorController extends ResourceController
{
    protected $model = Cor::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100',
        'hex' => 'nullable|string|max:20',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100',
        'hex' => 'nullable|string|max:20',
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
                  ->orWhere('hex', 'like', "%{$search}%");
            });
        }

        return $query;
    }
}
