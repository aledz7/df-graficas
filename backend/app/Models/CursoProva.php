<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class CursoProva extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'curso_provas';

    protected $fillable = [
        'tenant_id',
        'curso_id',
        'titulo',
        'descricao',
        'nota_minima',
        'tempo_limite_minutos',
        'numero_maximo_tentativas',
        'exigir_aprovacao_certificado',
        'exigir_aprovacao_conclusao',
    ];

    protected $casts = [
        'nota_minima' => 'decimal:2',
        'tempo_limite_minutos' => 'integer',
        'numero_maximo_tentativas' => 'integer',
        'exigir_aprovacao_certificado' => 'boolean',
        'exigir_aprovacao_conclusao' => 'boolean',
    ];

    /**
     * Relacionamento com curso
     */
    public function curso()
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /**
     * Relacionamento com questões
     */
    public function questoes()
    {
        return $this->hasMany(CursoProvaQuestao::class, 'curso_prova_id')->orderBy('ordem');
    }

    /**
     * Relacionamento com tentativas
     */
    public function tentativas()
    {
        return $this->hasMany(CursoProvaTentativa::class, 'curso_prova_id');
    }

    /**
     * Verificar se tem tempo limite
     */
    public function temTempoLimite()
    {
        return $this->tempo_limite_minutos !== null && $this->tempo_limite_minutos > 0;
    }

    /**
     * Verificar se tem limite de tentativas
     */
    public function temLimiteTentativas()
    {
        return $this->numero_maximo_tentativas !== null && $this->numero_maximo_tentativas > 0;
    }
}
