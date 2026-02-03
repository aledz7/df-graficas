<?php

namespace App\Http\Controllers\Api;

use App\Models\LancamentoCaixa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class LancamentoCaixaController extends ResourceController
{
    protected $model = LancamentoCaixa::class;
    
    protected $storeRules = [
        'conta_id' => 'required|exists:contas_bancarias,id',
        'categoria_id' => 'required|exists:categorias_caixa,id',
        'data_operacao' => 'required|date',
        'tipo' => 'required|in:entrada,saida',
        'valor' => 'required|numeric|min:0.01',
        'descricao' => 'required|string|max:255',
        'observacoes' => 'nullable|string|max:1000',
        'numero_documento' => 'nullable|string|max:50',
        'forma_pagamento' => 'nullable|in:dinheiro,cartao_credito,cartao_debito,pix,boleto,transferencia,outro',
        'centro_custo' => 'nullable|string|max:100',
        'tags' => 'nullable|string|max:255',
        'anexo_url' => 'nullable|url|max:500',
        'conciliado' => 'boolean',
        'data_conciliacao' => 'nullable|date',
        'status' => 'nullable|in:pendente,conciliado,cancelado,concluido',
        'categoria_nome' => 'nullable|string|max:255',
        'conta_nome' => 'nullable|string|max:255',
        'usuario_id' => 'nullable|integer',
        'usuario_nome' => 'nullable|string|max:255',
        'operacao_tipo' => 'nullable|string|max:255',
        'operacao_id' => 'nullable|integer',
        'metadados' => 'nullable|array',
        'anexos' => 'nullable|array',
    ];

    protected $updateRules = [
        'conta_id' => 'sometimes|exists:contas_bancarias,id',
        'categoria_id' => 'sometimes|exists:categorias_caixa,id',
        'data_operacao' => 'sometimes|date',
        'tipo' => 'sometimes|in:entrada,saida',
        'valor' => 'sometimes|numeric|min:0.01',
        'descricao' => 'sometimes|string|max:255',
        'observacoes' => 'nullable|string|max:1000',
        'numero_documento' => 'nullable|string|max:50',
        'forma_pagamento' => 'nullable|in:dinheiro,cartao_credito,cartao_debito,pix,boleto,transferencia,outro',
        'centro_custo' => 'nullable|string|max:100',
        'tags' => 'nullable|string|max:255',
        'anexo_url' => 'nullable|url|max:500',
        'conciliado' => 'boolean',
        'data_conciliacao' => 'nullable|date',
        'status' => 'sometimes|in:pendente,conciliado,cancelado,concluido',
        'categoria_nome' => 'nullable|string|max:255',
        'conta_nome' => 'nullable|string|max:255',
        'usuario_id' => 'nullable|integer',
        'usuario_nome' => 'nullable|string|max:255',
        'operacao_tipo' => 'nullable|string|max:255',
        'operacao_id' => 'nullable|integer',
        'metadados' => 'nullable|array',
        'anexos' => 'nullable|array',
    ];

    protected $with = ['conta', 'categoria', 'usuario'];

    /**
     * Sobrescreve o método store para adicionar tenant_id automaticamente
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        \Log::info('💾 [LancamentoCaixaController] Recebendo requisição para criar lançamento', [
            'dados_recebidos' => $request->all(),
            'conta_id' => $request->input('conta_id'),
            'conta_nome' => $request->input('conta_nome'),
            'metadados' => $request->input('metadados')
        ]);

        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            \Log::warning('💾 [LancamentoCaixaController] Erro de validação', [
                'erros' => $validator->errors()->toArray()
            ]);
            return $this->validationError($validator->errors());
        }

        $data = $request->all();
        $data['tenant_id'] = $request->user() ? $request->user()->tenant_id : auth()->user()->tenant_id;

        \Log::info('💾 [LancamentoCaixaController] Criando lançamento com dados:', [
            'conta_id' => $data['conta_id'],
            'conta_nome' => $data['conta_nome'] ?? null,
            'tipo' => $data['tipo'],
            'valor' => $data['valor']
        ]);

        $lancamento = $this->model::create($data);
        $lancamento->load($this->with);

        \Log::info('💾 [LancamentoCaixaController] Lançamento criado com sucesso', [
            'lancamento_id' => $lancamento->id,
            'conta_id' => $lancamento->conta_id,
            'conta_nome' => $lancamento->conta_nome
        ]);

        return $this->success($lancamento, 'Lançamento criado com sucesso', 201);
    }

    /**
     * Sobrescreve o método update para adicionar usuario_id automaticamente
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id): \Illuminate\Http\JsonResponse
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
        
        $lancamento = $query->find($id);

        if (!$lancamento) {
            return $this->notFound();
        }

        $data = $request->all();

        $lancamento->update($data);
        $lancamento->load($this->with);

        return $this->success($lancamento, 'Lançamento atualizado com sucesso');
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
        // Filtrar por conta bancária
        if ($request->has('conta_id')) {
            $query->where('conta_id', $request->input('conta_id'));
        }

        // Filtrar por categoria
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        // Filtrar por tipo (entrada/saída)
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Filtrar por data
        if ($request->has('data_inicio')) {
            $query->where('data_operacao', '>=', $request->input('data_inicio'));
        }

        if ($request->has('data_fim')) {
            $query->where('data_operacao', '<=', $request->input('data_fim'));
        }

        // Filtrar por valor
        if ($request->has('valor_min')) {
            $query->where('valor', '>=', $request->input('valor_min'));
        }

        if ($request->has('valor_max')) {
            $query->where('valor', '<=', $request->input('valor_max'));
        }

        // Filtrar por forma de pagamento
        if ($request->has('forma_pagamento')) {
            $query->where('forma_pagamento', $request->input('forma_pagamento'));
        }

        // Filtrar por status de conciliação
        if ($request->has('conciliado')) {
            $query->where('conciliado', $request->boolean('conciliado'));
        }

        // Filtrar por centro de custo
        if ($request->has('centro_custo')) {
            $query->where('centro_custo', 'like', '%' . $request->input('centro_custo') . '%');
        }

        // Busca por termo
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('descricao', 'like', "%{$search}%")
                  ->orWhere('observacoes', 'like', "%{$search}%")
                  ->orWhere('numero_documento', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    /**
     * Remover um lançamento específico
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $lancamento = $this->model::find($id);

        if (!$lancamento) {
            return $this->notFound('Lançamento não encontrado');
        }

        // Verificar se o lançamento pode ser excluído (não conciliado)
        if ($lancamento->conciliado) {
            return $this->error('Não é possível excluir um lançamento conciliado', 422);
        }

        try {
            $lancamento->delete();
            return $this->success(null, 'Lançamento removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover o lançamento: ' . $e->getMessage());
        }
    }

    /**
     * Concilia um lançamento
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function conciliar($id)
    {
        $lancamento = $this->model::find($id);

        if (!$lancamento) {
            return $this->notFound();
        }

        if ($lancamento->conciliado) {
            return $this->error('Este lançamento já está conciliado', 400);
        }

        $lancamento->update([
            'conciliado' => true,
            'data_conciliacao' => now()
        ]);

        return $this->success($lancamento, 'Lançamento conciliado com sucesso');
    }

    /**
     * Remove a conciliação de um lançamento
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function desconciliar($id)
    {
        $lancamento = $this->model::find($id);

        if (!$lancamento) {
            return $this->notFound();
        }

        if (!$lancamento->conciliado) {
            return $this->error('Este lançamento não está conciliado', 400);
        }

        $lancamento->update([
            'conciliado' => false,
            'data_conciliacao' => null
        ]);

        return $this->success($lancamento, 'Conciliação removida com sucesso');
    }

    /**
     * Duplica um lançamento
     * 
     * @param int $id
     * @param Request $request
     * @return JsonResponse
     */
    public function duplicar($id, Request $request)
    {
        $lancamentoOriginal = $this->model::find($id);

        if (!$lancamentoOriginal) {
            return $this->notFound();
        }

        $validator = Validator::make($request->all(), [
            'data' => 'required|date',
            'valor' => 'nullable|numeric|min:0.01',
            'descricao' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $novoLancamento = $lancamentoOriginal->replicate();
            $novoLancamento->data = $request->input('data');
            $novoLancamento->valor = $request->input('valor', $lancamentoOriginal->valor);
            $novoLancamento->descricao = $request->input('descricao', $lancamentoOriginal->descricao);
            $novoLancamento->conciliado = false;
            $novoLancamento->data_conciliacao = null;
            $novoLancamento->save();

            $novoLancamento->load($this->with);

            return $this->success($novoLancamento, 'Lançamento duplicado com sucesso', 201);
        } catch (\Exception $e) {
            return $this->error('Não foi possível duplicar o lançamento: ' . $e->getMessage());
        }
    }

    /**
     * Retorna o resumo do fluxo de caixa
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function resumo(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
            'conta_id' => 'nullable|exists:contas_bancarias,id',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $query = $this->model::whereBetween('data_operacao', [
            $request->input('data_inicio'),
            $request->input('data_fim')
        ]);

        if ($request->has('conta_id')) {
            $query->where('conta_id', $request->input('conta_id'));
        }

        // Total de entradas
        $totalEntradas = $query->clone()->where('tipo', 'entrada')->sum('valor');

        // Total de saídas
        $totalSaidas = $query->clone()->where('tipo', 'saida')->sum('valor');

        // Saldo do período
        $saldoPeriodo = $totalEntradas - $totalSaidas;

        // Entradas por categoria
        $entradasPorCategoria = $query->clone()
            ->where('tipo', 'entrada')
            ->select('categoria_id', DB::raw('sum(valor) as total'))
            ->with('categoria:id,nome,cor')
            ->groupBy('categoria_id')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'categoria_id' => $item->categoria_id,
                    'categoria_nome' => $item->categoria->nome ?? 'N/A',
                    'categoria_cor' => $item->categoria->cor ?? '#6B7280',
                    'total' => (float) $item->total
                ];
            });

        // Saídas por categoria
        $saidasPorCategoria = $query->clone()
            ->where('tipo', 'saida')
            ->select('categoria_id', DB::raw('sum(valor) as total'))
            ->with('categoria:id,nome,cor')
            ->groupBy('categoria_id')
            ->orderBy('total', 'desc')
            ->get()
            ->map(function($item) {
                return [
                    'categoria_id' => $item->categoria_id,
                    'categoria_nome' => $item->categoria->nome ?? 'N/A',
                    'categoria_cor' => $item->categoria->cor ?? '#6B7280',
                    'total' => (float) $item->total
                ];
            });

        // Fluxo diário
        $fluxoDiario = $query->clone()
            ->select(
                DB::raw('DATE(data) as data'),
                DB::raw('sum(case when tipo = "entrada" then valor else 0 end) as entradas'),
                DB::raw('sum(case when tipo = "saida" then valor else 0 end) as saidas'),
                DB::raw('sum(case when tipo = "entrada" then valor else -valor end) as saldo_dia')
            )
            ->groupBy(DB::raw('DATE(data)'))
            ->orderBy('data')
            ->get()
            ->map(function($item) {
                return [
                    'data' => $item->data,
                    'entradas' => (float) $item->entradas,
                    'saidas' => (float) $item->saidas,
                    'saldo_dia' => (float) $item->saldo_dia
                ];
            });

        return $this->success([
            'periodo' => [
                'inicio' => $request->input('data_inicio'),
                'fim' => $request->input('data_fim')
            ],
            'total_entradas' => $totalEntradas,
            'total_saidas' => $totalSaidas,
            'saldo_periodo' => $saldoPeriodo,
            'entradas_por_categoria' => $entradasPorCategoria,
            'saidas_por_categoria' => $saidasPorCategoria,
            'fluxo_diario' => $fluxoDiario
        ]);
    }

    /**
     * Retorna as estatísticas de lançamentos
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function estatisticas(Request $request)
    {
        $query = $this->model::query();

        // Aplica filtros comuns
        $this->applyFilters($query, $request);

        // Total de lançamentos
        $totalLancamentos = $query->count();

        // Valor total movimentado
        $valorTotal = $query->sum('valor');

        // Média de valor por lançamento
        $mediaValor = $totalLancamentos > 0 ? $valorTotal / $totalLancamentos : 0;

        // Lançamentos por período (últimos 12 meses)
        $periodos = [];
        for ($i = 11; $i >= 0; $i--) {
            $data = now()->subMonths($i);
            $mesAno = $data->format('Y-m');

            $totalPeriodo = $this->model::whereYear('data', $data->year)
                ->whereMonth('data', $data->month)
                ->sum('valor');

            $periodos[$mesAno] = $totalPeriodo;
        }

        // Lançamentos por forma de pagamento
        $porFormaPagamento = $this->model::select('forma_pagamento', DB::raw('count(*) as total, sum(valor) as valor_total'))
            ->whereNotNull('forma_pagamento')
            ->groupBy('forma_pagamento')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->forma_pagamento => [
                    'total' => $item->total,
                    'valor_total' => (float) $item->valor_total
                ]];
            });

        return $this->success([
            'total_lancamentos' => $totalLancamentos,
            'valor_total' => $valorTotal,
            'media_por_lancamento' => $mediaValor,
            'por_periodo' => $periodos,
            'por_forma_pagamento' => $porFormaPagamento,
        ]);
    }

    /**
     * Busca lançamentos por data específica
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getByDate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
            'tipo' => 'nullable|in:entrada,saida',
            'categoria_id' => 'nullable|exists:categorias_caixa,id',
            'conta_id' => 'nullable|exists:contas_bancarias,id',
            'search' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            \Log::info('=== BUSCANDO LANÇAMENTOS POR DATA ===', [
                'data_inicio' => $request->input('data_inicio'),
                'data_fim' => $request->input('data_fim'),
                'tenant_id' => auth()->user()->tenant_id
            ]);

            $query = $this->model::where('tenant_id', auth()->user()->tenant_id)
                ->whereDate('data_operacao', '>=', $request->input('data_inicio'))
                ->whereDate('data_operacao', '<=', $request->input('data_fim'));

            // Aplicar filtros adicionais
            if ($request->has('tipo')) {
                $query->where('tipo', $request->input('tipo'));
            }

            if ($request->has('categoria_id')) {
                $query->where('categoria_id', $request->input('categoria_id'));
            }

            if ($request->has('conta_id')) {
                $query->where('conta_id', $request->input('conta_id'));
            }

            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('descricao', 'like', "%{$search}%")
                      ->orWhere('observacoes', 'like', "%{$search}%")
                      ->orWhere('numero_documento', 'like', "%{$search}%");
                });
            }

            $lancamentos = $query->with(['conta', 'categoria', 'usuario'])
                ->orderBy('data_operacao', 'desc')
                ->orderBy('id', 'desc')
                ->get();

            \Log::info('=== RESULTADO DA BUSCA ===', [
                'total_lancamentos' => $lancamentos->count(),
                'lancamentos_ids' => $lancamentos->pluck('id')->toArray(),
                'primeiro_lancamento' => $lancamentos->first() ? [
                    'id' => $lancamentos->first()->id,
                    'tipo' => $lancamentos->first()->tipo,
                    'descricao' => $lancamentos->first()->descricao,
                    'data_operacao' => $lancamentos->first()->data_operacao,
                    'valor' => $lancamentos->first()->valor
                ] : null
            ]);

            return $this->success($lancamentos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar lançamentos por data: ' . $e->getMessage());
            return $this->error('Erro ao buscar lançamentos: ' . $e->getMessage());
        }
    }
}
