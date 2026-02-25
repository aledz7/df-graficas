<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class CursoProvaQuestao extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'curso_prova_questoes';

    protected $fillable = [
        'tenant_id',
        'curso_prova_id',
        'tipo',
        'enunciado',
        'alternativas',
        'respostas_corretas',
        'peso',
        'ordem',
    ];

    protected $casts = [
        'alternativas' => 'array',
        'respostas_corretas' => 'array',
        'peso' => 'decimal:2',
        'ordem' => 'integer',
    ];

    /**
     * Tipos de questão disponíveis
     */
    const TIPO_MULTIPLA_ESCOLHA_UMA = 'multipla_escolha_uma';
    const TIPO_MULTIPLA_ESCOLHA_MULTIPLAS = 'multipla_escolha_multiplas';
    const TIPO_VERDADEIRO_FALSO = 'verdadeiro_falso';
    const TIPO_DISSERTATIVA = 'dissertativa';

    /**
     * Relacionamento com prova
     */
    public function prova()
    {
        return $this->belongsTo(CursoProva::class, 'curso_prova_id');
    }

    /**
     * Relacionamento com respostas
     */
    public function respostas()
    {
        return $this->hasMany(CursoProvaResposta::class, 'curso_prova_questao_id');
    }

    /**
     * Obter nome do tipo
     */
    public static function nomeTipo($tipo)
    {
        return match($tipo) {
            self::TIPO_MULTIPLA_ESCOLHA_UMA => 'Múltipla Escolha (Uma Correta)',
            self::TIPO_MULTIPLA_ESCOLHA_MULTIPLAS => 'Múltipla Escolha (Múltiplas Corretas)',
            self::TIPO_VERDADEIRO_FALSO => 'Verdadeiro ou Falso',
            self::TIPO_DISSERTATIVA => 'Resposta Dissertativa',
            default => 'Desconhecido',
        };
    }

    /**
     * Verificar se a resposta está correta
     */
    public function verificarResposta($resposta)
    {
        if ($this->tipo === self::TIPO_DISSERTATIVA) {
            // Dissertativa precisa de correção manual
            return null;
        }

        if ($this->tipo === self::TIPO_VERDADEIRO_FALSO) {
            $respostaCorreta = $this->respostas_corretas[0] ?? null;
            return $resposta === $respostaCorreta;
        }

        // Múltipla escolha
        if ($this->tipo === self::TIPO_MULTIPLA_ESCOLHA_UMA) {
            $respostaCorreta = $this->respostas_corretas[0] ?? null;
            return $resposta === $respostaCorreta;
        }

        // Múltipla escolha múltiplas
        if ($this->tipo === self::TIPO_MULTIPLA_ESCOLHA_MULTIPLAS) {
            $respostasArray = is_array($resposta) ? $resposta : [$resposta];
            $corretasArray = is_array($this->respostas_corretas) ? $this->respostas_corretas : [];
            
            // Verificar se todas as respostas corretas foram selecionadas e nenhuma incorreta
            sort($respostasArray);
            sort($corretasArray);
            
            return $respostasArray === $corretasArray;
        }

        return false;
    }
}
