<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class TreinamentoAviso extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'treinamento_avisos';

    protected $fillable = [
        'tenant_id',
        'usuario_id',
        'tipo',
        'titulo',
        'mensagem',
        'nivel_esperado',
        'dias_atraso',
        'data_limite',
        'status',
        'data_resolucao',
        'resolvido_por_id',
    ];

    protected $casts = [
        'data_limite' => 'date',
        'data_resolucao' => 'datetime',
        'dias_atraso' => 'integer',
    ];

    /**
     * Relacionamento com usuário
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Relacionamento com quem resolveu
     */
    public function resolvidoPor()
    {
        return $this->belongsTo(User::class, 'resolvido_por_id');
    }

    /**
     * Scope para pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Marcar como resolvido
     */
    public function marcarComoResolvido($resolvidoPorId = null)
    {
        $this->update([
            'status' => 'resolvido',
            'data_resolucao' => now(),
            'resolvido_por_id' => $resolvidoPorId,
        ]);
    }
}
