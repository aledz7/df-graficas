<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class Orcamento extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os status possíveis para um orçamento.
     */
    const STATUS_RASCUNHO = 'Rascunho';
    const STATUS_AGUARDANDO_APROVACAO = 'Aguardando Aprovação';
    const STATUS_APROVADO = 'Aprovado';
    const STATUS_RECUSADO = 'Recusado';
    const STATUS_CANCELADO = 'Cancelado';
    const STATUS_FINALIZADO = 'Finalizado';

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome_orcamento',
        'tipo_orcamento',
        'cliente_id',
        'produto_id',
        'area_total_m2',
        'custo_total_material',
        'custo_total_mao_obra',
        'custo_total_adicional',
        'valor_total',
        'desconto_percentual',
        'desconto_valor',
        'valor_final',
        'observacoes',
        'status',
        'dados_pecas',
        'dados_adicionais',
        'dados_pagamento',
        'vendedor_id',
        'vendedor_nome',
        'data_validade',
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'area_total_m2' => 'decimal:2',
        'custo_total_material' => 'decimal:2',
        'custo_total_mao_obra' => 'decimal:2',
        'custo_total_adicional' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'desconto_percentual' => 'decimal:2',
        'desconto_valor' => 'decimal:2',
        'valor_final' => 'decimal:2',
        'dados_pecas' => 'array',
        'dados_adicionais' => 'array',
        'dados_pagamento' => 'array',
        'data_validade' => 'datetime',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'data_validade',
        'deleted_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($orcamento) {
            if (empty($orcamento->codigo)) {
                $orcamento->codigo = 'ORC-' . strtoupper(Str::random(8));
            }

            if (empty($orcamento->nome_orcamento)) {
                $clienteNome = $orcamento->cliente ? $orcamento->cliente->nome_exibicao : 'Sem Nome';
                $dataAtual = now()->format('d-m-Y');
                $orcamento->nome_orcamento = "Orçamento {$clienteNome} - {$dataAtual}";
            }
        });
    }

    /**
     * Obtém o cliente dono do orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém o produto associado ao orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém o vendedor responsável pelo orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém as vendas relacionadas a este orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class, 'orcamento_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém os itens do orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function itens()
    {
        return $this->hasMany(OrcamentoItem::class, 'orcamento_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Escopo para orçamentos em rascunho.
     */
    public function scopeRascunho($query)
    {
        return $query->where('status', self::STATUS_RASCUNHO);
    }

    /**
     * Escopo para orçamentos aprovados.
     */
    public function scopeAprovados($query)
    {
        return $query->where('status', self::STATUS_APROVADO);
    }

    /**
     * Escopo para orçamentos pendentes de aprovação.
     */
    public function scopePendentes($query)
    {
        return $query->where('status', self::STATUS_AGUARDANDO_APROVACAO);
    }

    /**
     * Escopo para orçamentos vencidos.
     */
    public function scopeVencidos($query)
    {
        return $query->where('data_validade', '<', now())
                    ->whereNotIn('status', [self::STATUS_FINALIZADO, self::STATUS_CANCELADO]);
    }

    /**
     * Verifica se o orçamento está vencido.
     */
    public function estaVencido()
    {
        return $this->data_validade && $this->data_validade->isPast() 
            && !in_array($this->status, [self::STATUS_FINALIZADO, self::STATUS_CANCELADO]);
    }

    /**
     * Aplica um desconto ao orçamento.
     */
    public function aplicarDesconto($percentual, $valorFixo = null)
    {
        if ($valorFixo !== null) {
            $this->desconto_valor = min($valorFixo, $this->valor_total);
            $this->desconto_percentual = ($this->desconto_valor / $this->valor_total) * 100;
        } else {
            $this->desconto_percentual = min($percentual, 100);
            $this->desconto_valor = ($this->valor_total * $this->desconto_percentual) / 100;
        }

        $this->valor_final = $this->valor_total - $this->desconto_valor;
        return $this;
    }

    /**
     * Aprova o orçamento.
     */
    public function aprovar()
    {
        $this->status = self::STATUS_APROVADO;
        return $this->save();
    }

    /**
     * Obtém o tenant ao qual este orçamento pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Recusa o orçamento.
     */
    public function recusar($motivo = null)
    {
        $this->status = self::STATUS_RECUSADO;
        if ($motivo) {
            $this->observacoes = ($this->observacoes ? $this->observacoes . "\n\n" : '') . "Motivo da recusa: " . $motivo;
        }
        return $this->save();
    }

    /**
     * Finaliza o orçamento.
     */
    public function finalizar()
    {
        $this->status = self::STATUS_FINALIZADO;
        return $this->save();
    }

    /**
     * Obtém o status formatado com classes CSS para exibição.
     */
    public function getStatusFormatadoAttribute()
    {
        $statusClasses = [
            self::STATUS_RASCUNHO => 'bg-gray-100 text-gray-800',
            self::STATUS_AGUARDANDO_APROVACAO => 'bg-blue-100 text-blue-800',
            self::STATUS_APROVADO => 'bg-green-100 text-green-800',
            self::STATUS_RECUSADO => 'bg-red-100 text-red-800',
            self::STATUS_CANCELADO => 'bg-yellow-100 text-yellow-800',
            self::STATUS_FINALIZADO => 'bg-purple-100 text-purple-800',
        ];

        $class = $statusClasses[$this->status] ?? 'bg-gray-100 text-gray-800';
        
        return '<span class="px-2 py-1 text-xs font-medium rounded-full ' . $class . '">' . $this->status . '</span>';
    }
}
