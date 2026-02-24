<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class KanbanColumn extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'kanban_columns';
    
    protected $fillable = [
        'tenant_id',
        'user_id',
        'nome',
        'cor',
        'ordem',
        'is_obrigatoria',
        'is_sistema',
    ];
    
    protected $casts = [
        'is_obrigatoria' => 'boolean',
        'is_sistema' => 'boolean',
        'ordem' => 'integer',
    ];

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relacionamento com posições de OS
     */
    public function osPositions()
    {
        return $this->hasMany(KanbanOSPosition::class, 'kanban_coluna_id');
    }

    /**
     * Relacionamento com OS através das posições
     */
    public function ordensServico()
    {
        return $this->hasManyThrough(
            OrdemServico::class,
            KanbanOSPosition::class,
            'kanban_coluna_id',
            'id',
            'id',
            'ordem_servico_id'
        );
    }
}
