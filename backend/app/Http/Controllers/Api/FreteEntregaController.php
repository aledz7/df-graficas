<?php

namespace App\Http\Controllers\Api;

use App\Models\FreteEntrega;
use App\Models\Venda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FreteEntregaController extends BaseController
{
    /**
     * Relatório de fretes por período
     */
    public function relatorio(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        
        $query = FreteEntrega::where('tenant_id', $tenantId)
            ->with(['venda', 'opcaoFrete', 'entregador', 'cliente']);

        // Filtros
        if ($request->has('data_inicio')) {
            $query->where('data_entrega', '>=', $request->data_inicio);
        }

        if ($request->has('data_fim')) {
            $query->where('data_entrega', '<=', $request->data_fim);
        }

        if ($request->has('entregador_id')) {
            $query->where('entregador_id', $request->entregador_id);
        }

        if ($request->has('tipo')) {
            $query->whereHas('entregador', function($q) use ($request) {
                $q->where('tipo', $request->tipo);
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('status_pagamento')) {
            $query->where('status_pagamento', $request->status_pagamento);
        }

        if ($request->has('bairro')) {
            $query->where('bairro', 'like', '%' . $request->bairro . '%');
        }

        if ($request->has('cidade')) {
            $query->where('cidade', 'like', '%' . $request->cidade . '%');
        }

        // Ordenação
        $sortField = $request->input('sort_by', 'data_entrega');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortField, $sortOrder);

        // Paginação
        $perPage = min($request->input('per_page', 50), 1000);
        $entregas = $query->paginate($perPage);

        // Totais
        $totalEntregas = $entregas->total();
        $totalValor = FreteEntrega::where('tenant_id', $tenantId)
            ->when($request->has('data_inicio'), function($q) use ($request) {
                $q->where('data_entrega', '>=', $request->data_inicio);
            })
            ->when($request->has('data_fim'), function($q) use ($request) {
                $q->where('data_entrega', '<=', $request->data_fim);
            })
            ->when($request->has('entregador_id'), function($q) use ($request) {
                $q->where('entregador_id', $request->entregador_id);
            })
            ->sum('valor_frete');

        $totalPendente = FreteEntrega::where('tenant_id', $tenantId)
            ->where('status_pagamento', 'pendente')
            ->when($request->has('data_inicio'), function($q) use ($request) {
                $q->where('data_entrega', '>=', $request->data_inicio);
            })
            ->when($request->has('data_fim'), function($q) use ($request) {
                $q->where('data_entrega', '<=', $request->data_fim);
            })
            ->when($request->has('entregador_id'), function($q) use ($request) {
                $q->where('entregador_id', $request->entregador_id);
            })
            ->sum('valor_frete');

        return $this->success([
            'entregas' => $entregas,
            'resumo' => [
                'total_entregas' => $totalEntregas,
                'total_valor' => $totalValor,
                'total_pendente' => $totalPendente,
                'total_pago' => $totalValor - $totalPendente,
            ]
        ]);
    }

    /**
     * Criar entrega a partir de uma venda
     */
    public function criarEntrega(Request $request, $vendaId)
    {
        $venda = Venda::where('tenant_id', auth()->user()->tenant_id)->findOrFail($vendaId);

        $validator = \Validator::make($request->all(), [
            'entregador_id' => 'required|exists:entregadores,id',
            'data_entrega' => 'nullable|date',
            'observacoes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $entrega = FreteEntrega::create([
            'tenant_id' => auth()->user()->tenant_id,
            'venda_id' => $venda->id,
            'opcao_frete_id' => $venda->opcao_frete_id,
            'entregador_id' => $request->entregador_id,
            'cliente_id' => $venda->cliente_id,
            'valor_frete' => $venda->valor_frete ?? 0,
            'prazo_frete' => $venda->prazo_frete,
            'data_entrega' => $request->data_entrega ?: now(),
            'bairro' => $venda->bairro_entrega,
            'cidade' => $venda->cidade_entrega,
            'estado' => $venda->estado_entrega,
            'cep' => $venda->cep_entrega,
            'status' => 'pendente',
            'status_pagamento' => 'pendente',
            'observacoes' => $request->observacoes,
        ]);

        $entrega->load(['venda', 'opcaoFrete', 'entregador', 'cliente']);

        return $this->success($entrega, 'Entrega criada com sucesso', 201);
    }

    /**
     * Marcar entrega como paga
     */
    public function marcarComoPago(Request $request, $id)
    {
        $entrega = FreteEntrega::where('tenant_id', auth()->user()->tenant_id)->findOrFail($id);

        $validator = \Validator::make($request->all(), [
            'data_pagamento' => 'nullable|date',
            'forma_pagamento' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $entrega->marcarComoPago(
            $request->data_pagamento,
            $request->forma_pagamento
        );

        $entrega->load(['venda', 'opcaoFrete', 'entregador', 'cliente']);

        return $this->success($entrega, 'Entrega marcada como paga');
    }

    /**
     * Integrar com holerite (para entregadores próprios)
     * Agora os fretes são integrados automaticamente ao fechar o mês,
     * mas este método permite marcar manualmente uma entrega como integrada
     */
    public function integrarHolerite(Request $request, $id)
    {
        $entrega = FreteEntrega::where('tenant_id', auth()->user()->tenant_id)
            ->with('entregador')
            ->findOrFail($id);

        if (!$entrega->entregador || $entrega->entregador->tipo !== 'proprio') {
            return $this->error('Apenas entregas de entregadores próprios podem ser integradas ao holerite', 422);
        }

        $validator = \Validator::make($request->all(), [
            'holerite_id' => 'nullable|exists:holerites,id',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        // Se não foi informado holerite_id, buscar o holerite do mês da entrega
        if (!$request->holerite_id) {
            $dataEntrega = \Carbon\Carbon::parse($entrega->data_entrega);
            $mes = $dataEntrega->month;
            $ano = $dataEntrega->year;
            
            // Buscar funcionário vinculado ao entregador
            $funcionario = \App\Models\User::where('tenant_id', auth()->user()->tenant_id)
                ->where('id', $entrega->entregador->funcionario_id)
                ->first();
            
            if (!$funcionario) {
                return $this->error('Entregador não está vinculado a um funcionário', 422);
            }
            
            $holerite = \App\Models\Holerite::where('tenant_id', auth()->user()->tenant_id)
                ->where('funcionario_id', $funcionario->id)
                ->where('mes', $mes)
                ->where('ano', $ano)
                ->first();
            
            if (!$holerite) {
                return $this->error('Holerite não encontrado para o período da entrega. Feche o mês primeiro.', 422);
            }
            
            $holeriteId = $holerite->id;
        } else {
            $holeriteId = $request->holerite_id;
        }

        $entrega->holerite_id = $holeriteId;
        $entrega->status_pagamento = 'integrado_holerite';
        $entrega->save();

        $entrega->load(['venda', 'opcaoFrete', 'entregador', 'cliente', 'holerite']);

        return $this->success($entrega, 'Entrega integrada ao holerite com sucesso');
    }
}
