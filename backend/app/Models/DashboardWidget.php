<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DashboardWidget extends Model
{
    use HasFactory;

    protected $table = 'dashboard_widgets';
    
    protected $fillable = [
        'codigo',
        'nome',
        'descricao',
        'categoria',
        'tipo',
        'configuracao_padrao',
        'ativo',
        'ordem',
        'icone',
        'cor_padrao',
    ];

    protected $casts = [
        'configuracao_padrao' => 'array',
        'ativo' => 'boolean',
    ];

    /**
     * Relacionamento com permissões
     */
    public function permissions()
    {
        return $this->hasMany(DashboardPermission::class, 'widget_codigo', 'codigo');
    }
}
