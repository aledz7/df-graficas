<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class TreinamentoRegraAlerta extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'treinamento_regras_alerta';

    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo',
        'nivel_alvo',
        'setor_alvo',
        'prazo_dias',
        'ativo',
        'notificar_colaborador',
        'notificar_gestor',
        'mensagem_personalizada',
    ];

    protected $casts = [
        'prazo_dias' => 'integer',
        'ativo' => 'boolean',
        'notificar_colaborador' => 'boolean',
        'notificar_gestor' => 'boolean',
    ];
}
