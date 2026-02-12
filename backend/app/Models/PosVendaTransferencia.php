<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;

class PosVendaTransferencia extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'pos_venda_transferencias';

    protected $fillable = [
        'tenant_id',
        'pos_venda_id',
        'usuario_origem_id',
        'usuario_destino_id',
        'motivo',
        'usuario_transferencia_id',
    ];

    public function posVenda()
    {
        return $this->belongsTo(PosVenda::class, 'pos_venda_id');
    }

    public function usuarioOrigem()
    {
        return $this->belongsTo(User::class, 'usuario_origem_id');
    }

    public function usuarioDestino()
    {
        return $this->belongsTo(User::class, 'usuario_destino_id');
    }

    public function usuarioTransferencia()
    {
        return $this->belongsTo(User::class, 'usuario_transferencia_id');
    }
}
