<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class FreteEntrega extends Model
{
    use SoftDeletes, Tenantable;

    protected $table = 'fretes_entregas';

    protected $fillable = [
        'tenant_id',
        'venda_id',
        'opcao_frete_id',
        'entregador_id',
        'cliente_id',
        'valor_frete',
        'prazo_frete',
        'data_entrega',
        'data_entrega_realizada',
        'bairro',
        'cidade',
        'estado',
        'cep',
        'status',
        'status_pagamento',
        'data_pagamento',
        'forma_pagamento',
        'observacoes',
        'holerite_id',
    ];

    protected $casts = [
        'valor_frete' => 'decimal:2',
        'prazo_frete' => 'integer',
        'data_entrega' => 'date',
        'data_entrega_realizada' => 'datetime',
        'data_pagamento' => 'date',
    ];

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Relacionamento com opção de frete
     */
    public function opcaoFrete()
    {
        return $this->belongsTo(OpcaoFrete::class, 'opcao_frete_id');
    }

    /**
     * Relacionamento com entregador
     */
    public function entregador()
    {
        return $this->belongsTo(Entregador::class);
    }

    /**
     * Relacionamento com cliente
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    /**
     * Relacionamento com holerite (se for próprio)
     */
    public function holerite()
    {
        return $this->belongsTo(Holerite::class);
    }

    /**
     * Relacionamento com romaneio entrega (através da venda)
     */
    public function romaneioEntrega()
    {
        return $this->hasOne(RomaneioEntrega::class, 'venda_id', 'venda_id');
    }

    /**
     * Relacionamento com romaneio (através de romaneioEntrega)
     */
    public function romaneio()
    {
        return $this->hasOneThrough(
            Romaneio::class,
            RomaneioEntrega::class,
            'venda_id', // Foreign key on romaneio_entregas table
            'id', // Foreign key on romaneios table
            'venda_id', // Local key on fretes_entregas table
            'romaneio_id' // Local key on romaneio_entregas table
        );
    }

    /**
     * Scope para entregas pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Scope para entregas pagas
     */
    public function scopePagas($query)
    {
        return $query->where('status_pagamento', 'pago');
    }

    /**
     * Scope para período
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim = null)
    {
        $dataFim = $dataFim ?: now();
        return $query->whereBetween('data_entrega', [$dataInicio, $dataFim]);
    }

    /**
     * Marcar como pago
     */
    public function marcarComoPago($dataPagamento = null, $formaPagamento = null)
    {
        $this->status_pagamento = 'pago';
        $this->data_pagamento = $dataPagamento ?: now();
        if ($formaPagamento) {
            $this->forma_pagamento = $formaPagamento;
        }
        return $this->save();
    }
}
