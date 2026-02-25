<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;
use Carbon\Carbon;

class CursoProvaTentativa extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'curso_prova_tentativas';

    protected $fillable = [
        'tenant_id',
        'curso_id',
        'curso_prova_id',
        'usuario_id',
        'numero_tentativa',
        'data_inicio',
        'data_envio',
        'nota_obtida',
        'aprovado',
        'status',
        'tempo_gasto_segundos',
    ];

    protected $casts = [
        'numero_tentativa' => 'integer',
        'data_inicio' => 'datetime',
        'data_envio' => 'datetime',
        'nota_obtida' => 'decimal:2',
        'aprovado' => 'boolean',
        'tempo_gasto_segundos' => 'integer',
    ];

    /**
     * Status disponíveis
     */
    const STATUS_EM_ANDAMENTO = 'em_andamento';
    const STATUS_FINALIZADA = 'finalizada';
    const STATUS_EXPIRADA = 'expirada';

    /**
     * Relacionamento com curso
     */
    public function curso()
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /**
     * Relacionamento com prova
     */
    public function prova()
    {
        return $this->belongsTo(CursoProva::class, 'curso_prova_id');
    }

    /**
     * Relacionamento com usuário
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Relacionamento com respostas
     */
    public function respostas()
    {
        return $this->hasMany(CursoProvaResposta::class, 'curso_prova_tentativa_id');
    }

    /**
     * Calcular nota final
     */
    public function calcularNota()
    {
        $totalPeso = 0;
        $pontuacaoTotal = 0;

        foreach ($this->respostas as $resposta) {
            $questao = $resposta->questao;
            $totalPeso += $questao->peso;
            $pontuacaoTotal += $resposta->pontuacao_obtida * $questao->peso;
        }

        if ($totalPeso == 0) {
            return 0;
        }

        // Calcular nota percentual
        $notaMaxima = $this->prova->questoes->sum('peso');
        $notaPercentual = ($pontuacaoTotal / $notaMaxima) * 100;

        return round($notaPercentual, 2);
    }

    /**
     * Verificar se está aprovado
     */
    public function verificarAprovacao()
    {
        $notaMinima = $this->prova->nota_minima;
        return $this->nota_obtida >= $notaMinima;
    }

    /**
     * Verificar se expirou
     */
    public function verificarExpiracao()
    {
        if (!$this->prova->temTempoLimite() || !$this->data_inicio) {
            return false;
        }

        $tempoLimite = $this->prova->tempo_limite_minutos;
        $dataExpiracao = Carbon::parse($this->data_inicio)->addMinutes($tempoLimite);
        
        return now()->greaterThan($dataExpiracao);
    }
}
