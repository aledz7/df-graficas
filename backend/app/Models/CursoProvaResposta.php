<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class CursoProvaResposta extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'curso_prova_respostas';

    protected $fillable = [
        'tenant_id',
        'curso_prova_tentativa_id',
        'curso_prova_questao_id',
        'resposta',
        'correta',
        'pontuacao_obtida',
    ];

    protected $casts = [
        'correta' => 'boolean',
        'pontuacao_obtida' => 'decimal:2',
    ];

    /**
     * Relacionamento com tentativa
     */
    public function tentativa()
    {
        return $this->belongsTo(CursoProvaTentativa::class, 'curso_prova_tentativa_id');
    }

    /**
     * Relacionamento com questão
     */
    public function questao()
    {
        return $this->belongsTo(CursoProvaQuestao::class, 'curso_prova_questao_id');
    }
}
