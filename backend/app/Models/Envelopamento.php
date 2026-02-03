<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Envelopamento extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'envelopamentos';

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        // Atualizar data_criacao quando o status mudar para Finalizado
        static::updating(function (Envelopamento $envelopamento) {
            if ($envelopamento->isDirty('status') && $envelopamento->status === 'Finalizado') {
                $envelopamento->data_criacao = now();
                \Log::info('Atualizando data_criacao do envelopamento para data de finalização (via Model Observer)', [
                    'envelopamento_id' => $envelopamento->id,
                    'data_anterior' => $envelopamento->getOriginal('data_criacao'),
                    'data_nova' => $envelopamento->data_criacao
                ]);
            }
        });
    }

    protected $fillable = [
        'tenant_id',
        'codigo_orcamento',
        'nome_orcamento',
        'cliente',
        'funcionario_id',
        'selected_pecas',
        'produto',
        'adicionais',
        'area_total_m2',
        'custo_total_material',
        'custo_total_adicionais',
        'servicos_adicionais_aplicados',
        'desconto',
        'desconto_tipo',
        'desconto_calculado',
        'frete',
        'orcamento_total',
        'observacao',
        'status',
        'data_criacao',
        'data_validade',
        'vendedor_id',
        'vendedor_nome',
        'pagamentos',
    ];

    protected $casts = [
        'cliente' => 'array',
        'selected_pecas' => 'array',
        'produto' => 'array',
        'adicionais' => 'array',
        'servicos_adicionais_aplicados' => 'array',
        'pagamentos' => 'array',
        'area_total_m2' => 'decimal:4',
        'custo_total_material' => 'decimal:2',
        'custo_total_adicionais' => 'decimal:2',
        'desconto' => 'decimal:2',
        'desconto_calculado' => 'decimal:2',
        'frete' => 'decimal:2',
        'orcamento_total' => 'decimal:2',
        'data_criacao' => 'datetime',
        'data_validade' => 'datetime',
    ];

    protected $dates = [
        'data_criacao',
        'data_validade',
        'deleted_at',
    ];

    /**
     * Obtém o vendedor do orçamento.
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Obtém o funcionário do orçamento.
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Obtém o tenant do orçamento.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope para filtrar por status.
     */
    public function scopePorStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope para filtrar por vendedor.
     */
    public function scopePorVendedor($query, $vendedorId)
    {
        return $query->where('vendedor_id', $vendedorId);
    }

    /**
     * Scope para filtrar por período.
     */
    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('data_criacao', [$dataInicio, $dataFim]);
    }

    /**
     * Scope para orçamentos não expirados.
     */
    public function scopeNaoExpirados($query)
    {
        return $query->where(function($q) {
            $q->whereNull('data_validade')
              ->orWhere('data_validade', '>', now());
        });
    }

    /**
     * Scope para orçamentos expirados.
     */
    public function scopeExpirados($query)
    {
        return $query->where('data_validade', '<', now());
    }

    /**
     * Verifica se o orçamento está expirado.
     */
    public function estaExpirado()
    {
        return $this->data_validade && $this->data_validade < now();
    }

    /**
     * Verifica se o orçamento pode ser editado.
     */
    public function podeSerEditado()
    {
        return in_array($this->status, ['Rascunho', 'Orçamento Salvo']) && !$this->estaExpirado();
    }

    /**
     * Verifica se o orçamento pode ser finalizado.
     */
    public function podeSerFinalizado()
    {
        return in_array($this->status, ['Rascunho', 'Orçamento Salvo']) && !$this->estaExpirado();
    }
}
