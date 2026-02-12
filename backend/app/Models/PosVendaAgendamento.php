<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;

class PosVendaAgendamento extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'pos_venda_agendamentos';

    protected $fillable = [
        'tenant_id',
        'pos_venda_id',
        'responsavel_id',
        'data_agendamento',
        'observacao',
        'concluido',
        'data_conclusao',
        'usuario_conclusao_id',
    ];

    protected $casts = [
        'data_agendamento' => 'datetime',
        'data_conclusao' => 'datetime',
        'concluido' => 'boolean',
    ];

    public function posVenda()
    {
        return $this->belongsTo(PosVenda::class, 'pos_venda_id');
    }

    public function responsavel()
    {
        return $this->belongsTo(User::class, 'responsavel_id');
    }

    public function usuarioConclusao()
    {
        return $this->belongsTo(User::class, 'usuario_conclusao_id');
    }

    public function scopePendentes($query)
    {
        return $query->where('concluido', false);
    }

    public function scopeConcluidos($query)
    {
        return $query->where('concluido', true);
    }
}
