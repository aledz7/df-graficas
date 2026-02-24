<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class KanbanOSItemProgress extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'kanban_os_items_progress';
    
    protected $fillable = [
        'tenant_id',
        'ordem_servico_id',
        'ordem_servico_item_id',
        'user_id',
        'concluido',
        'data_conclusao',
    ];
    
    protected $casts = [
        'concluido' => 'boolean',
        'data_conclusao' => 'datetime',
    ];

    /**
     * Relacionamento com OS
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com item da OS
     */
    public function item()
    {
        return $this->belongsTo(OrdemServicoItem::class, 'ordem_servico_item_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
