<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class CursoProgresso extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'curso_progresso';

    protected $fillable = [
        'tenant_id',
        'usuario_id',
        'curso_id',
        'iniciado',
        'concluido',
        'data_inicio',
        'data_conclusao',
        'tempo_total_segundos',
        'percentual_concluido',
        'modulos_concluidos',
        'confirmacao_leitura',
        'data_confirmacao_leitura',
        'observacoes',
    ];

    protected $casts = [
        'iniciado' => 'boolean',
        'concluido' => 'boolean',
        'confirmacao_leitura' => 'boolean',
        'data_inicio' => 'datetime',
        'data_conclusao' => 'datetime',
        'data_confirmacao_leitura' => 'datetime',
        'tempo_total_segundos' => 'integer',
        'percentual_concluido' => 'integer',
        'modulos_concluidos' => 'array',
    ];

    /**
     * Relacionamento com usuário
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Relacionamento com curso
     */
    public function curso()
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /**
     * Marcar como iniciado
     */
    public function marcarComoIniciado()
    {
        if (!$this->iniciado) {
            $this->update([
                'iniciado' => true,
                'data_inicio' => now(),
            ]);
        }
    }

    /**
     * Marcar como concluído
     */
    public function marcarComoConcluido($tempoTotal = null)
    {
        $this->update([
            'concluido' => true,
            'data_conclusao' => now(),
            'percentual_concluido' => 100,
            'tempo_total_segundos' => $tempoTotal ?? $this->tempo_total_segundos,
        ]);
    }

    /**
     * Atualizar percentual de conclusão
     */
    public function atualizarPercentual($percentual)
    {
        $this->update([
            'percentual_concluido' => min(100, max(0, $percentual)),
        ]);
    }

    /**
     * Confirmar leitura
     */
    public function confirmarLeitura()
    {
        $this->update([
            'confirmacao_leitura' => true,
            'data_confirmacao_leitura' => now(),
        ]);
    }
}
