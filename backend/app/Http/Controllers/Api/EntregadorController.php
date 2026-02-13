<?php

namespace App\Http\Controllers\Api;

use App\Models\Entregador;
use Illuminate\Http\Request;

class EntregadorController extends ResourceController
{
    protected $model = Entregador::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:255',
        'telefone' => 'nullable|string|max:20',
        'tipo' => 'required|in:proprio,terceirizado',
        'valor_padrao_entrega' => 'nullable|numeric|min:0',
        'chave_pix' => 'nullable|string|max:255',
        'funcionario_id' => 'nullable|exists:users,id',
        'ativo' => 'boolean',
        'observacoes' => 'nullable|string',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:255',
        'telefone' => 'nullable|string|max:20',
        'tipo' => 'sometimes|in:proprio,terceirizado',
        'valor_padrao_entrega' => 'nullable|numeric|min:0',
        'chave_pix' => 'nullable|string|max:255',
        'funcionario_id' => 'nullable|exists:users,id',
        'ativo' => 'boolean',
        'observacoes' => 'nullable|string',
    ];

    protected $with = ['funcionario'];

    /**
     * Listar entregadores ativos
     */
    public function ativos(Request $request)
    {
        $entregadores = Entregador::where('tenant_id', auth()->user()->tenant_id)
            ->where('ativo', true)
            ->with($this->with)
            ->get();

        return $this->success($entregadores);
    }

    /**
     * Listar por tipo
     */
    public function porTipo(Request $request, $tipo)
    {
        $entregadores = Entregador::where('tenant_id', auth()->user()->tenant_id)
            ->where('tipo', $tipo)
            ->where('ativo', true)
            ->with($this->with)
            ->get();

        return $this->success($entregadores);
    }
}
