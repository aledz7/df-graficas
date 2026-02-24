<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class KanbanMovimentacao extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'kanban_movimentacoes';
    
    protected $fillable = [
        'tenant_id',
        'ordem_servico_id',
        'user_id',
        'coluna_anterior_id',
        'coluna_nova_id',
        'data_movimentacao',
        'observacao',
    ];
    
    protected $casts = [
        'data_movimentacao' => 'datetime',
    ];

    /**
     * Relacionamento com OS
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relacionamento com coluna anterior
     */
    public function colunaAnterior()
    {
        return $this->belongsTo(KanbanColumn::class, 'coluna_anterior_id');
    }

    /**
     * Relacionamento com coluna nova
     */
    public function colunaNova()
    {
        return $this->belongsTo(KanbanColumn::class, 'coluna_nova_id');
    }
}
