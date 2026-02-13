<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RomaneioEntrega extends Model
{
    protected $table = 'romaneio_entregas';

    protected $fillable = [
        'romaneio_id',
        'venda_id',
        'ordem_entrega',
        'status',
        'data_hora_entrega',
        'observacao_entrega',
        'motivo_nao_entrega',
        'usuario_confirmacao_id',
    ];

    protected $casts = [
        'ordem_entrega' => 'integer',
        'data_hora_entrega' => 'datetime',
    ];

    /**
     * Relacionamento com romaneio
     */
    public function romaneio()
    {
        return $this->belongsTo(Romaneio::class);
    }

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Relacionamento com usuário que confirmou a entrega
     */
    public function usuarioConfirmacao()
    {
        return $this->belongsTo(User::class, 'usuario_confirmacao_id');
    }

    /**
     * Scope para entregas pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Scope para entregas realizadas
     */
    public function scopeEntregues($query)
    {
        return $query->where('status', 'entregue');
    }

    /**
     * Scope para entregas não realizadas
     */
    public function scopeNaoEntregues($query)
    {
        return $query->where('status', 'nao_entregue');
    }
}
