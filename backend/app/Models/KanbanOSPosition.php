<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class KanbanOSPosition extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'kanban_os_positions';
    
    protected $fillable = [
        'tenant_id',
        'ordem_servico_id',
        'kanban_coluna_id',
        'user_id',
        'ordem',
    ];
    
    protected $casts = [
        'ordem' => 'integer',
    ];

    /**
     * Relacionamento com OS
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com coluna
     */
    public function coluna()
    {
        return $this->belongsTo(KanbanColumn::class, 'kanban_coluna_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
