<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class TreinamentoProgresso extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'treinamento_progresso';

    protected $fillable = [
        'tenant_id',
        'usuario_id',
        'treinamento_id',
        'concluido',
        'data_conclusao',
        'tempo_leitura_segundos',
        'observacoes',
    ];

    protected $casts = [
        'concluido' => 'boolean',
        'data_conclusao' => 'datetime',
        'tempo_leitura_segundos' => 'integer',
    ];

    /**
     * Relacionamento com usuário
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Relacionamento com treinamento
     */
    public function treinamento()
    {
        return $this->belongsTo(Treinamento::class, 'treinamento_id');
    }

    /**
     * Marcar como concluído
     */
    public function marcarComoConcluido($tempoLeitura = null)
    {
        $this->update([
            'concluido' => true,
            'data_conclusao' => now(),
            'tempo_leitura_segundos' => $tempoLeitura,
        ]);

        // Atualizar progresso do usuário
        $this->atualizarProgressoUsuario();
    }

    /**
     * Atualizar progresso do usuário
     */
    protected function atualizarProgressoUsuario()
    {
        $usuario = $this->usuario;
        $totalTreinamentos = Treinamento::where('tenant_id', $usuario->tenant_id)
            ->where('ativo', true)
            ->where(function($query) use ($usuario) {
                $query->where('setor', $usuario->setor)
                      ->orWhere('setor', 'geral');
            })
            ->count();

        $concluidos = self::where('usuario_id', $usuario->id)
            ->where('concluido', true)
            ->count();

        $progresso = $totalTreinamentos > 0 
            ? ($concluidos / $totalTreinamentos) * 100 
            : 0;

        $usuario->update([
            'progresso_treinamento' => round($progresso, 2),
            'ultimo_acesso_treinamento' => now(),
        ]);
    }
}
