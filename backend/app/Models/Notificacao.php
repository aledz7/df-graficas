<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Notificacao extends Model
{
    use HasFactory;

    protected $table = 'notificacoes';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'tipo',
        'titulo',
        'mensagem',
        'produto_id',
        'produto_nome',
        'estoque_atual',
        'estoque_minimo',
        'percentual_atual',
        'prioridade',
        'lida',
        'data_criacao',
        'data_leitura',
        'dados_adicionais',
    ];

    protected $casts = [
        'lida' => 'boolean',
        'data_criacao' => 'datetime',
        'data_leitura' => 'datetime',
        'estoque_atual' => 'decimal:2',
        'estoque_minimo' => 'decimal:2',
        'percentual_atual' => 'decimal:2',
        'dados_adicionais' => 'array',
    ];

    /**
     * Relacionamento com o tenant
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com o usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento com o produto
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    /**
     * Scope para notificações não lidas
     */
    public function scopeNaoLidas($query)
    {
        return $query->where('lida', false);
    }

    /**
     * Scope para notificações por tipo
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Scope para notificações por prioridade
     */
    public function scopePorPrioridade($query, $prioridade)
    {
        return $query->where('prioridade', $prioridade);
    }

    /**
     * Scope para notificações recentes
     */
    public function scopeRecentes($query, $dias = 7)
    {
        return $query->where('data_criacao', '>=', now()->subDays($dias));
    }

    /**
     * Marcar como lida
     */
    public function marcarComoLida()
    {
        $this->update([
            'lida' => true,
            'data_leitura' => now(),
        ]);
    }

    /**
     * Verificar se é recente (últimas 24 horas)
     */
    public function isRecente()
    {
        return $this->data_criacao->isAfter(now()->subDay());
    }

    /**
     * Obter tempo decorrido desde a criação
     */
    public function getTempoDecorridoAttribute()
    {
        return $this->data_criacao->diffForHumans();
    }

    /**
     * Obter cor da prioridade
     */
    public function getCorPrioridadeAttribute()
    {
        switch ($this->prioridade) {
            case 'alta':
                return 'text-red-600 bg-red-100';
            case 'media':
                return 'text-yellow-600 bg-yellow-100';
            case 'baixa':
                return 'text-blue-600 bg-blue-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    }

    /**
     * Obter ícone baseado no tipo
     */
    public function getIconeAttribute()
    {
        switch ($this->tipo) {
            case 'estoque_baixo':
                return 'package';
            case 'alerta':
                return 'alert-triangle';
            case 'sucesso':
                return 'check-circle';
            default:
                return 'bell';
        }
    }
} 