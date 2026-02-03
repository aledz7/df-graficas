<?php

namespace App\Http\Controllers\Api;

use App\Models\ContaBancaria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ContaBancariaController extends ResourceController
{
    protected $model = ContaBancaria::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:100',
        'nome_banco' => 'nullable|string|max:100',
        'agencia' => 'nullable|string|max:20',
        'conta' => 'nullable|string|max:20',
        'digito_conta' => 'nullable|string|max:5',
        'tipo' => 'required|string|max:50',
        'saldo_inicial' => 'nullable|numeric',
        'data_saldo_inicial' => 'nullable|date',
        'titular_nome' => 'nullable|string|max:100',
        'titular_documento' => 'nullable|string|max:20',
        'telefone_contato' => 'nullable|string|max:20',
        'email_contato' => 'nullable|string|max:100',
        'ativo' => 'boolean',
        'incluir_fluxo_caixa' => 'boolean',
        'conta_padrao' => 'boolean',
        'cor' => 'nullable|string|max:20',
        'icone' => 'nullable|string|max:50',
        'observacoes' => 'nullable|string',
        'metadados' => 'nullable|array',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:100',
        'nome_banco' => 'nullable|string|max:100',
        'agencia' => 'nullable|string|max:20',
        'conta' => 'nullable|string|max:20',
        'digito_conta' => 'nullable|string|max:5',
        'tipo' => 'sometimes|string|max:50',
        'saldo_inicial' => 'nullable|numeric',
        'data_saldo_inicial' => 'nullable|date',
        'titular_nome' => 'nullable|string|max:100',
        'titular_documento' => 'nullable|string|max:20',
        'telefone_contato' => 'nullable|string|max:20',
        'email_contato' => 'nullable|string|max:100',
        'ativo' => 'boolean',
        'incluir_fluxo_caixa' => 'boolean',
        'conta_padrao' => 'boolean',
        'cor' => 'nullable|string|max:20',
        'icone' => 'nullable|string|max:50',
        'observacoes' => 'nullable|string',
        'metadados' => 'nullable|array',
    ];

    protected $with = [];

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
                  ->orWhere('conta', 'like', "%{$search}%")
                  ->orWhere('agencia', 'like', "%{$search}%");
            });
        }

        // Filtrar por nome do banco
        if ($request->has('nome_banco')) {
            $query->where('nome_banco', 'like', '%' . $request->input('nome_banco') . '%');
        }

        // Filtrar por tipo de conta
        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        // Filtrar por status (ativo/inativo)
        if ($request->has('ativo')) {
            $query->where('ativo', $request->boolean('ativo'));
        }

        return $query;
    }

    /**
     * Remover uma conta bancária específica
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $conta = $this->model::find($id);

        if (!$conta) {
            return $this->notFound('Conta bancária não encontrada');
        }

        // Verificar se a conta possui lançamentos
        if ($conta->lancamentos()->exists()) {
            return $this->error('Não é possível excluir uma conta bancária que possui lançamentos', 422);
        }

        try {
            $conta->delete();
            return $this->success(null, 'Conta bancária removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a conta bancária: ' . $e->getMessage());
        }
    }

    /**
     * Retorna o saldo atual da conta
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function saldo($id)
    {
        $conta = $this->model::find($id);

        if (!$conta) {
            return $this->notFound();
        }

        // Aqui você pode implementar a lógica para calcular o saldo atual
        // baseado nos lançamentos de caixa
        $saldoAtual = $conta->saldo_inicial;
        
        // Exemplo de cálculo do saldo (ajuste conforme sua lógica de negócios)
        $entradas = $conta->lancamentosEntrada()->sum('valor');
        $saidas = $conta->lancamentosSaida()->sum('valor');
        $saldoAtual += ($entradas - $saidas);

        return $this->success([
            'conta_id' => $conta->id,
            'nome_conta' => $conta->nome,
            'saldo_inicial' => $conta->saldo_inicial,
            'saldo_atual' => $saldoAtual,
            'data_consulta' => now()->toDateTimeString()
        ]);
    }

    /**
     * Retorna o extrato da conta
     * 
     * @param int $id
     * @param Request $request
     * @return JsonResponse
     */
    public function extrato($id, Request $request)
    {
        $conta = $this->model::find($id);

        if (!$conta) {
            return $this->notFound();
        }

        $validator = Validator::make($request->all(), [
            'data_inicio' => 'required|date',
            'data_fim' => 'required|date|after_or_equal:data_inicio',
            'tipo' => 'nullable|in:entrada,saida',
            'categoria_id' => 'nullable|exists:categorias_caixa,id',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $query = $conta->lancamentos()
            ->whereBetween('data', [
                $request->input('data_inicio'),
                $request->input('data_fim')
            ]);

        if ($request->has('tipo')) {
            $query->where('tipo', $request->input('tipo'));
        }

        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        $lancamentos = $query->orderBy('data', 'asc')
            ->orderBy('id', 'asc')
            ->with('categoria', 'usuario')
            ->get();

        // Calcula o saldo acumulado
        $saldo = $conta->saldo_inicial;
        $lancamentos = $lancamentos->map(function($item) use (&$saldo) {
            $saldo += ($item->tipo === 'entrada' ? $item->valor : -$item->valor);
            $item->saldo_apos = $saldo;
            return $item;
        });

        return $this->success([
            'conta' => $conta->only(['id', 'nome', 'banco_id']),
            'periodo' => [
                'inicio' => $request->input('data_inicio'),
                'fim' => $request->input('data_fim')
            ],
            'saldo_inicial' => $conta->saldo_inicial,
            'saldo_final' => $saldo,
            'total_entradas' => $lancamentos->where('tipo', 'entrada')->sum('valor'),
            'total_saidas' => $lancamentos->where('tipo', 'saida')->sum('valor'),
            'lancamentos' => $lancamentos
        ]);
    }

    /**
     * Retorna o saldo consolidado de todas as contas
     * 
     * @return JsonResponse
     */
    public function saldoConsolidado()
    {
        $contas = $this->model::where('ativo', true)->get();
        
        $saldoTotal = 0;
        $detalhes = [];
        
        foreach ($contas as $conta) {
            // Aqui você pode implementar a lógica para calcular o saldo atual
            // baseado nos lançamentos de caixa (similar ao método saldo)
            $saldo = $conta->saldo_inicial;
            $entradas = $conta->lancamentosEntrada()->sum('valor');
            $saidas = $conta->lancamentosSaida()->sum('valor');
            $saldo += ($entradas - $saidas);
            
            $detalhes[] = [
                'conta_id' => $conta->id,
                'nome' => $conta->nome,
                'banco' => $conta->banco->nome ?? 'Não informado',
                'saldo' => $saldo,
                'moeda' => 'BRL' // Ajuste conforme necessário
            ];
            
            $saldoTotal += $saldo;
        }
        
        return $this->success([
            'data_consulta' => now()->toDateTimeString(),
            'total_contas' => $contas->count(),
            'saldo_total' => $saldoTotal,
            'moeda' => 'BRL', // Ajuste conforme necessário
            'contas' => $detalhes
        ]);
    }
}
