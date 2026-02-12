<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class VendedorPontos extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'vendedor_pontos';

    protected $fillable = [
        'tenant_id',
        'vendedor_id',
        'pontos_totais',
        'nivel_atual',
        'badge_atual',
        'vendas_realizadas',
        'metas_batidas',
        'ticket_medio_batido',
        'ultima_atualizacao'
    ];

    protected $casts = [
        'pontos_totais' => 'integer',
        'nivel_atual' => 'integer',
        'vendas_realizadas' => 'integer',
        'metas_batidas' => 'integer',
        'ticket_medio_batido' => 'integer',
        'ultima_atualizacao' => 'date',
    ];

    /**
     * Níveis de gamificação
     */
    const NIVEL_BRONZE = 1;
    const NIVEL_PRATA = 2;
    const NIVEL_OURO = 3;
    const NIVEL_PLATINA = 4;
    const NIVEL_DIAMANTE = 5;

    /**
     * Pontos necessários para cada nível
     */
    public static function pontosPorNivel($nivel)
    {
        return match($nivel) {
            1 => 0,      // Bronze - inicial
            2 => 100,    // Prata
            3 => 500,    // Ouro
            4 => 1500,   // Platina
            5 => 5000,   // Diamante
            default => 0
        };
    }

    /**
     * Nome do nível
     */
    public static function nomeNivel($nivel)
    {
        return match($nivel) {
            1 => 'Bronze',
            2 => 'Prata',
            3 => 'Ouro',
            4 => 'Platina',
            5 => 'Diamante',
            default => 'Iniciante'
        };
    }

    /**
     * Relacionamento com vendedor
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Relacionamento com histórico de pontos
     */
    public function historico()
    {
        return $this->hasMany(HistoricoPontos::class, 'vendedor_id', 'vendedor_id');
    }

    /**
     * Calcular e atualizar nível baseado nos pontos
     */
    public function atualizarNivel()
    {
        $nivelAnterior = $this->nivel_atual;
        
        // Determinar nível baseado nos pontos
        if ($this->pontos_totais >= self::pontosPorNivel(5)) {
            $this->nivel_atual = 5;
            $this->badge_atual = 'Diamante';
        } elseif ($this->pontos_totais >= self::pontosPorNivel(4)) {
            $this->nivel_atual = 4;
            $this->badge_atual = 'Platina';
        } elseif ($this->pontos_totais >= self::pontosPorNivel(3)) {
            $this->nivel_atual = 3;
            $this->badge_atual = 'Ouro';
        } elseif ($this->pontos_totais >= self::pontosPorNivel(2)) {
            $this->nivel_atual = 2;
            $this->badge_atual = 'Prata';
        } else {
            $this->nivel_atual = 1;
            $this->badge_atual = 'Bronze';
        }

        $this->ultima_atualizacao = now();
        $this->save();

        // Se subiu de nível, criar notificação
        if ($nivelAnterior < $this->nivel_atual) {
            // Criar notificação de subida de nível
            \App\Models\Notificacao::create([
                'tenant_id' => $this->tenant_id,
                'user_id' => $this->vendedor_id,
                'tipo' => 'nivel_alcancado',
                'titulo' => 'Parabéns! Você subiu de nível!',
                'mensagem' => "Você alcançou o nível {$this->badge_atual}! Continue assim!",
                'prioridade' => 'alta',
            ]);
        }

        return $this;
    }

    /**
     * Adicionar pontos
     */
    public function adicionarPontos($pontos, $tipoAcao, $descricao, $dadosAdicionais = [])
    {
        $this->pontos_totais += $pontos;
        $this->ultima_atualizacao = now();
        $this->save();

        // Registrar no histórico
        HistoricoPontos::create([
            'tenant_id' => $this->tenant_id,
            'vendedor_id' => $this->vendedor_id,
            'tipo_acao' => $tipoAcao,
            'pontos' => $pontos,
            'descricao' => $descricao,
            'dados_adicionais' => $dadosAdicionais,
            'data_acao' => now(),
        ]);

        // Atualizar nível se necessário
        $this->atualizarNivel();

        return $this;
    }
}
