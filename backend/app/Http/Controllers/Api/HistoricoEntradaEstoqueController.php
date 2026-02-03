<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\HistoricoEntradaEstoque;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class HistoricoEntradaEstoqueController extends BaseController
{
    /**
     * Lista todas as entradas de estoque
     */
    public function index(Request $request)
    {
        try {
            $query = HistoricoEntradaEstoque::doTenant()
                ->with('usuario')
                ->orderBy('data_entrada', 'desc');

            // Filtros
            if ($request->has('fornecedor_id')) {
                $query->porFornecedor($request->fornecedor_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('data_inicio') && $request->has('data_fim')) {
                $query->porPeriodo($request->data_inicio, $request->data_fim);
            }

            // Paginação
            $perPage = $request->get('per_page', 15);
            $entradas = $query->paginate($perPage);

            return $this->success($entradas, 'Histórico de entradas carregado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao carregar histórico de entradas: ' . $e->getMessage());
        }
    }

    /**
     * Mostra uma entrada específica
     */
    public function show($id)
    {
        try {
            $entrada = HistoricoEntradaEstoque::doTenant()
                ->with('usuario')
                ->findOrFail($id);

            return $this->success($entrada, 'Entrada encontrada');
        } catch (\Exception $e) {
            return $this->error('Entrada não encontrada: ' . $e->getMessage());
        }
    }

    /**
     * Cria uma nova entrada
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo_entrada' => 'required|string|max:50',
            'data_entrada' => 'required|date',
            'numero_nota' => 'nullable|string|max:50',
            'data_nota' => 'nullable|date',
            'fornecedor_id' => 'nullable|string',
            'fornecedor_nome' => 'nullable|string',
            'itens' => 'required|array',
            'itens.*.id' => 'required',
            'itens.*.nome' => 'required|string',
            'itens.*.quantidade' => 'required|numeric|min:0',
            'itens.*.custoUnitario' => 'required|numeric|min:0',
            'observacoes' => 'nullable|string',
            'metadados' => 'nullable|array'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $entrada = HistoricoEntradaEstoque::create([
                'tenant_id' => auth()->user()->tenant_id,
                'codigo_entrada' => $request->codigo_entrada,
                'data_entrada' => $request->data_entrada,
                'numero_nota' => $request->numero_nota,
                'data_nota' => $request->data_nota,
                'fornecedor_id' => $request->fornecedor_id,
                'fornecedor_nome' => $request->fornecedor_nome,
                'usuario_id' => auth()->id(),
                'usuario_nome' => auth()->user()->name,
                'itens' => $request->itens,
                'observacoes' => $request->observacoes,
                'metadados' => $request->metadados,
                'status' => 'confirmada',
                'data_confirmacao' => now()
            ]);

            return $this->success($entrada, 'Entrada registrada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao registrar entrada: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza uma entrada
     */
    public function update(Request $request, $id)
    {
        try {
            $entrada = HistoricoEntradaEstoque::doTenant()->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'numero_nota' => 'nullable|string|max:50',
                'data_nota' => 'nullable|date',
                'fornecedor_id' => 'nullable|string',
                'fornecedor_nome' => 'nullable|string',
                'observacoes' => 'nullable|string',
                'metadados' => 'nullable|array',
                'status' => 'nullable|in:confirmada,cancelada,pendente'
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator->errors());
            }

            $entrada->update($request->only([
                'numero_nota',
                'data_nota',
                'fornecedor_id',
                'fornecedor_nome',
                'observacoes',
                'metadados',
                'status'
            ]));

            if ($request->has('status') && $request->status === 'confirmada') {
                $entrada->update(['data_confirmacao' => now()]);
            }

            return $this->success($entrada, 'Entrada atualizada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar entrada: ' . $e->getMessage());
        }
    }

    /**
     * Remove uma entrada
     */
    public function destroy($id)
    {
        try {
            $entrada = HistoricoEntradaEstoque::doTenant()->findOrFail($id);
            $entrada->delete();

            return $this->success(null, 'Entrada removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover entrada: ' . $e->getMessage());
        }
    }

    /**
     * Estatísticas das entradas
     */
    public function estatisticas(Request $request)
    {
        try {
            $query = HistoricoEntradaEstoque::doTenant()->confirmadas();

            if ($request->has('data_inicio') && $request->has('data_fim')) {
                $query->porPeriodo($request->data_inicio, $request->data_fim);
            }

            $estatisticas = [
                'total_entradas' => $query->count(),
                'total_itens' => $query->get()->sum(function ($entrada) {
                    return collect($entrada->itens)->sum('quantidade');
                }),
                'valor_total' => $query->get()->sum(function ($entrada) {
                    return collect($entrada->itens)->sum(function ($item) {
                        return $item['quantidade'] * $item['custoUnitario'];
                    });
                }),
                'fornecedores_unicos' => $query->distinct('fornecedor_id')->count('fornecedor_id')
            ];

            return $this->success($estatisticas, 'Estatísticas carregadas com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao carregar estatísticas: ' . $e->getMessage());
        }
    }
} 