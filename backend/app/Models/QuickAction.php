<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class QuickAction extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'quick_actions';
    
    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'descricao',
        'categoria',
        'icone',
        'cor_padrao',
        'rota',
        'estado',
        'ativo',
        'ordem',
        'permissao_codigo',
    ];

    protected $casts = [
        'estado' => 'array',
        'ativo' => 'boolean',
    ];

    /**
     * Relacionamento com permissões
     */
    public function permissions()
    {
        return $this->hasMany(QuickActionPermission::class, 'action_codigo', 'codigo');
    }
}
