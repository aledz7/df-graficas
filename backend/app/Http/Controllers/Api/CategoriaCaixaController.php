<?php

namespace App\Http\Controllers\Api;

use App\Models\CategoriaCaixa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoriaCaixaController extends ResourceController
{
    protected $model = CategoriaCaixa::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100|unique:categorias_caixa',
        'tipo' => 'required|in:entrada,saida',
        'cor' => 'nullable|string|max:20',
        'icone' => 'nullable|string|max:50',
        'descricao' => 'nullable|string|max:500',
        'categoria_pai_id' => 'nullable|exists:categorias_caixa,id',
        'ativo' => 'boolean',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100|unique:categorias_caixa,nome,{id}',
        'tipo' => 'sometimes|in:entrada,saida',
        'cor' => 'nullable|string|max:20',
        'icone' => 'nullable|string|max:50',
        'descricao' => 'nullable|string|max:500',
        'categoria_pai_id' => 'nullable|exists:categorias_caixa,id',
        'ativo' => 'boolean',
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

        // Filtrar por tipo (entrada/saída)
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Filtrar por categoria pai
        if ($request->has('categoria_pai_id')) {
            $categoriaPaiId = $request->input('categoria_pai_id');
            if ($categoriaPaiId === 'null') {
                $query->whereNull('categoria_pai_id');
            } else {
                $query->where('categoria_pai_id', $categoriaPaiId);
            }
        } else {
            // Por padrão, retorna apenas as categorias principais
            $query->whereNull('categoria_pai_id');
        }

        // Filtrar por status (ativo/inativo)
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query;
    }

    /**
     * Remover uma categoria específica
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $categoria = $this->model::find($id);

        if (!$categoria) {
            return $this->notFound('Categoria não encontrada');
        }

        // Verificar se a categoria possui lançamentos
        if ($categoria->lancamentos()->exists()) {
            return $this->error('Não é possível excluir uma categoria que possui lançamentos', 422);
        }

        // Verificar se a categoria possui subcategorias
        if ($categoria->subcategorias()->exists()) {
            return $this->error('Não é possível excluir uma categoria que possui subcategorias', 422);
        }

        try {
            $categoria->delete();
            return $this->success(null, 'Categoria removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a categoria: ' . $e->getMessage());
        }
    }

    /**
     * Retorna a árvore de categorias
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function arvore(Request $request)
    {
        $query = $this->model::query();
        
        // Aplica filtros básicos
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }
        
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }
        
        // Busca todas as categorias principais
        $categorias = $query->whereNull('categoria_pai_id')
            ->with(['subcategorias' => function($q) {
                $q->orderBy('nome');
            }])
            ->orderBy('nome')
            ->get();
        
        return $this->success($categorias);
    }
    
    /**
     * Retorna as estatísticas de uma categoria
     * 
     * @param int $id
     * @param Request $request
     * @return JsonResponse
     */
    public function estatisticas($id, Request $request)
    {
        $categoria = $this->model::find($id);
        
        if (!$categoria) {
            return $this->notFound();
        }
        
        $validator = Validator::make($request->all(), [
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        $dataInicio = $request->input('data_inicio');
        $dataFim = $request->input('data_fim');
        
        // Total de lançamentos nesta categoria
        $totalLancamentos = $categoria->lancamentos()
            ->whereBetween('data', [$dataInicio, $dataFim])
            ->count();
            
        // Valor total movimentado
        $valorTotal = $categoria->lancamentos()
            ->whereBetween('data', [$dataInicio, $dataFim])
            ->sum('valor');
            
        // Média de valor por lançamento
        $mediaValor = $totalLancamentos > 0 ? $valorTotal / $totalLancamentos : 0;
        
        // Lançamentos por período (últimos 12 meses)
        $periodos = [];
        for ($i = 11; $i >= 0; $i--) {
            $data = now()->subMonths($i);
            $mesAno = $data->format('Y-m');
            
            $totalPeriodo = $categoria->lancamentos()
                ->whereYear('data', $data->year)
                ->whereMonth('data', $data->month)
                ->sum('valor');
                
            $periodos[$mesAno] = $totalPeriodo;
        }
        
        // Top 5 contas bancárias com mais movimentação
        $topContas = $categoria->lancamentos()
            ->select('conta_bancaria_id', DB::raw('sum(valor) as total'))
            ->with('contaBancaria')
            ->whereBetween('data', [$dataInicio, $dataFim])
            ->groupBy('conta_bancaria_id')
            ->orderBy('total', 'desc')
            ->limit(5)
            ->get()
            ->map(function($item) {
                return [
                    'conta_id' => $item->conta_bancaria_id,
                    'conta_nome' => $item->contaBancaria->nome ?? 'N/A',
                    'total' => $item->total
                ];
            });
        
        return $this->success([
            'categoria' => $categoria->only(['id', 'nome', 'tipo']),
            'periodo' => [
                'inicio' => $dataInicio,
                'fim' => $dataFim
            ],
            'total_lancamentos' => $totalLancamentos,
            'valor_total' => $valorTotal,
            'media_por_lancamento' => $mediaValor,
            'por_periodo' => $periodos,
            'top_contas' => $topContas
        ]);
    }
    
    /**
     * Retorna as categorias mais utilizadas
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function maisUtilizadas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tipo' => 'nullable|in:entrada,saida',
            'limite' => 'nullable|integer|min:1|max:20',
            'data_inicio' => 'nullable|date',
            'data_fim' => 'nullable|date|after_or_equal:data_inicio',
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        $query = $this->model::query();
        
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }
        
        if ($request->has('data_inicio') && $request->has('data_fim')) {
            $query->whereHas('lancamentos', function($q) use ($request) {
                $q->whereBetween('data', [
                    $request->input('data_inicio'),
                    $request->input('data_fim')
                ]);
            });
        }
        
        $limite = $request->input('limite', 10);
        
        $categorias = $query->withCount('lancamentos')
            ->orderBy('lancamentos_count', 'desc')
            ->limit($limite)
            ->get()
            ->map(function($categoria) {
                return [
                    'id' => $categoria->id,
                    'nome' => $categoria->nome,
                    'tipo' => $categoria->tipo,
                    'total_lancamentos' => $categoria->lancamentos_count,
                    'cor' => $categoria->cor,
                    'icone' => $categoria->icone
                ];
            });
        
        return $this->success($categorias);
    }
}
