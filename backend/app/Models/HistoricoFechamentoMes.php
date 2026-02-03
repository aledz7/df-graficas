<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;
use Carbon\Carbon;

class HistoricoFechamentoMes extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'historico_fechamento_mes';

    protected $fillable = [
        'tenant_id',
        'tipo',
        'mes',
        'ano',
        'data_acao',
        'usuario_id',
        'automatico',
        'quantidade_holerites',
        'observacoes',
    ];

    protected $casts = [
        'mes' => 'integer',
        'ano' => 'integer',
        'data_acao' => 'datetime',
        'automatico' => 'boolean',
        'quantidade_holerites' => 'integer',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir tenant_id e data_acao automaticamente
        static::creating(function ($historico) {
            if (auth()->check() && empty($historico->tenant_id)) {
                $historico->tenant_id = auth()->user()->tenant_id;
            }
            if (empty($historico->data_acao)) {
                $historico->data_acao = now();
            }
        });
    }

    /**
     * Get the tenant that owns the history record.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who performed the action.
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Obter nome do mês em português
     */
    public function getMesNomeAttribute()
    {
        $meses = [
            1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
            5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
            9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
        ];
        
        return $meses[$this->mes] ?? 'Mês inválido';
    }

    /**
     * Obter período formatado
     */
    public function getPeriodoAttribute()
    {
        return "{$this->mes_nome} de {$this->ano}";
    }

    /**
     * Registrar fechamento de mês
     */
    public static function registrarFechamento($mes, $ano, $quantidadeHolerites, $observacoes = null, $automatico = false)
    {
        return static::create([
            'tipo' => 'fechamento',
            'mes' => $mes,
            'ano' => $ano,
            'usuario_id' => auth()->check() ? auth()->id() : null,
            'automatico' => $automatico,
            'quantidade_holerites' => $quantidadeHolerites,
            'observacoes' => $observacoes,
        ]);
    }

    /**
     * Registrar abertura de mês
     */
    public static function registrarAbertura($mes, $ano, $quantidadeHolerites, $observacoes = null, $automatico = false)
    {
        return static::create([
            'tipo' => 'abertura',
            'mes' => $mes,
            'ano' => $ano,
            'usuario_id' => auth()->check() ? auth()->id() : null,
            'automatico' => $automatico,
            'quantidade_holerites' => $quantidadeHolerites,
            'observacoes' => $observacoes,
        ]);
    }

    /**
     * Registrar reabertura de mês
     */
    public static function registrarReabertura($mes, $ano, $quantidadeHolerites, $observacoes = null)
    {
        return static::create([
            'tipo' => 'reabertura',
            'mes' => $mes,
            'ano' => $ano,
            'usuario_id' => auth()->check() ? auth()->id() : null,
            'automatico' => false,
            'quantidade_holerites' => $quantidadeHolerites,
            'observacoes' => $observacoes,
        ]);
    }
}

