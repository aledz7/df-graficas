<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Traits\Tenantable;
use App\Traits\SoftDeleteWithAudit;

class Venda extends Model
{
    use HasFactory, SoftDeleteWithAudit, Tenantable;

    /**
     * Status disponíveis para uma venda
     */
    const STATUS_ABERTA = 'aberta';
    const STATUS_FINALIZADA = 'finalizada';
    const STATUS_CANCELADA = 'cancelada';
    const STATUS_ESTORNADA = 'estornada';
    const STATUS_PRE_VENDA = 'pre_venda';
    const STATUS_ORCAMENTO = 'orcamento';

    /**
     * Status de pagamento disponíveis
     */
    const PAGAMENTO_PENDENTE = 'pendente';
    const PAGAMENTO_PARCIAL = 'parcial';
    const PAGAMENTO_PAGO = 'pago';
    const PAGAMENTO_ATRASADO = 'atrasado';
    const PAGAMENTO_CANCELADO = 'cancelado';

    /**
     * Tipos de documento
     */
    const TIPO_VENDA = 'venda';
    const TIPO_ORCAMENTO = 'orcamento';
    const TIPO_ORCAMENTO_APROVADO = 'orcamento_aprovado';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'codigo',
        'cliente_id',
        'funcionario_id',
        'usuario_id',
        'vendedor_id',
        'tipo_documento',
        'tipo_pedido',
        'status',
        'status_pagamento',
        'forma_pagamento',
        'cliente_nome',
        'cliente_cpf_cnpj',
        'cliente_telefone',
        'cliente_email',
        'subtotal',
        'desconto',
        'tipo_desconto',
        'valor_desconto_original',
        'acrescimo',
        'acrescimo_percentual',
        'valor_total',
        'valor_pago',
        'valor_restante',
        'observacoes',
        'vendedor_nome',
        'dados_pagamento',
        'metadados',
        'data_emissao',
        'data_finalizacao',
        'data_cancelamento',
        'data_vencimento',
        'chave_acesso',
        'numero_nf',
        'serie_nf',
        'modelo_nf',
        'tenant_id',
        'opcao_frete_id',
        'valor_frete',
        'prazo_frete',
        'entregador_id',
        'bairro_entrega',
        'cidade_entrega',
        'estado_entrega',
        'cep_entrega',
        'usuario_exclusao_id',
        'usuario_exclusao_nome',
        'data_exclusao',
        'justificativa_exclusao',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'subtotal' => 'decimal:2',
        'desconto' => 'decimal:2',
        'tipo_desconto' => 'string',
        'valor_desconto_original' => 'decimal:2',
        'acrescimo' => 'decimal:2',
        'acrescimo_percentual' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'valor_pago' => 'decimal:2',
        'valor_restante' => 'decimal:2',
        'valor_frete' => 'decimal:2',
        'prazo_frete' => 'integer',
        'dados_pagamento' => 'array',
        'metadados' => 'array',
        'data_emissao' => 'datetime',
        'data_finalizacao' => 'datetime',
        'data_cancelamento' => 'datetime',
        'data_vencimento' => 'date',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Chamar o boot do trait SoftDeleteWithAudit
        static::bootSoftDeleteWithAudit();

        // Gerar código único ao criar uma nova venda
        static::creating(function ($venda) {
            if (empty($venda->codigo)) {
                $venda->codigo = static::gerarCodigoUnico();
            }
            
            if (empty($venda->data_emissao)) {
                $venda->data_emissao = now();
            }
            
            // Preencher vendedor_nome automaticamente se não foi fornecido
            if (empty($venda->vendedor_nome)) {
                $vendedorId = $venda->vendedor_id ?? $venda->usuario_id;
                if ($vendedorId) {
                    $vendedor = User::find($vendedorId);
                    if ($vendedor) {
                        $venda->vendedor_nome = $vendedor->name;
                    }
                }
            }
        });
        
        // Preencher vendedor_nome ao atualizar se não foi fornecido
        static::updating(function ($venda) {
            if (empty($venda->vendedor_nome)) {
                $vendedorId = $venda->vendedor_id ?? $venda->usuario_id;
                if ($vendedorId) {
                    $vendedor = User::find($vendedorId);
                    if ($vendedor) {
                        $venda->vendedor_nome = $vendedor->name;
                    }
                }
            }
        });
    }

    /**
     * Gera um código único para a venda
     */
    public static function gerarCodigoUnico(): string
    {
        // Usar timestamp para garantir unicidade
        $timestamp = now()->format('ymdHis'); // 12 caracteres
        $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT); // 3 caracteres
        return 'VEN' . $timestamp . $random; // VEN + 12 + 3 = 18 caracteres
    }

    /**
     * Verifica se a venda está vencida
     */
    public function estaVencida(): bool
    {
        if (!$this->data_vencimento) {
            return false;
        }
        
        return $this->data_vencimento->isPast() && 
               $this->status_pagamento !== self::PAGAMENTO_PAGO &&
               $this->status_pagamento !== self::PAGAMENTO_CANCELADO;
    }

    /**
     * Verifica se a venda pode ser cancelada
     */
    public function podeSerCancelada(): bool
    {
        return in_array($this->status, [self::STATUS_ABERTA, self::STATUS_FINALIZADA]) &&
               $this->status_pagamento !== self::PAGAMENTO_CANCELADO;
    }

    /**
     * Aplica um desconto à venda
     */
    public function aplicarDesconto(float $valor, string $tipo = 'valor'): void
    {
        $this->tipo_desconto = $tipo;
        $this->valor_desconto_original = $valor;
        
        if ($tipo === 'percentual') {
            $this->desconto = ($this->subtotal * $valor) / 100;
        } else {
            $this->desconto = $valor;
        }
        
        $this->calcularTotal();
    }

    /**
     * Calcula o valor total da venda
     */
    public function calcularTotal(): void
    {
        $this->valor_total = $this->subtotal - $this->desconto + $this->acrescimo;
        $this->valor_restante = $this->valor_total - $this->valor_pago;
        
        // Atualizar status de pagamento
        if ($this->valor_restante <= 0) {
            $this->status_pagamento = self::PAGAMENTO_PAGO;
        } elseif ($this->valor_pago > 0) {
            $this->status_pagamento = self::PAGAMENTO_PARCIAL;
        } else {
            $this->status_pagamento = $this->estaVencida() ? self::PAGAMENTO_ATRASADO : self::PAGAMENTO_PENDENTE;
        }
    }

    /**
     * Obtém o tenant ao qual esta venda pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Finaliza a venda
     */
    public function finalizar(): bool
    {
        if ($this->status === self::STATUS_FINALIZADA) {
            return true;
        }
        
        $this->status = self::STATUS_FINALIZADA;
        $this->data_finalizacao = now();
        
        return $this->save();
    }

    /**
     * Cancela a venda
     */
    public function cancelar(string $motivo = null): bool
    {
        if (!$this->podeSerCancelada()) {
            return false;
        }
        
        $this->status = self::STATUS_CANCELADA;
        $this->status_pagamento = self::PAGAMENTO_CANCELADO;
        $this->data_cancelamento = now();
        
        if ($motivo) {
            $metadados = $this->metadados ?? [];
            $metadados['motivo_cancelamento'] = $motivo;
            $this->metadados = $metadados;
        }
        
        return $this->save();
    }

    /**
     * Estorna a venda
     */
    public function estornar(string $motivo = null): bool
    {
        if ($this->status !== self::STATUS_FINALIZADA) {
            return false;
        }
        
        $this->status = self::STATUS_ESTORNADA;
        $this->status_pagamento = self::PAGAMENTO_CANCELADO;
        
        if ($motivo) {
            $metadados = $this->metadados ?? [];
            $metadados['motivo_estorno'] = $motivo;
            $this->metadados = $metadados;
        }
        
        return $this->save();
    }

    /**
     * Registra um pagamento na venda
     */
    public function registrarPagamento(float $valor, array $dadosPagamento = []): bool
    {
        $this->valor_pago += $valor;
        $this->calcularTotal();
        
        // Registrar o pagamento nos metadados
        $pagamento = [
            'data' => now()->toDateTimeString(),
            'valor' => $valor,
            'forma_pagamento' => $dadosPagamento['forma_pagamento'] ?? $this->forma_pagamento,
            'detalhes' => $dadosPagamento,
        ];
        
        $metadados = $this->metadados ?? [];
        $metadados['pagamentos'] = $metadados['pagamentos'] ?? [];
        $metadados['pagamentos'][] = $pagamento;
        $this->metadados = $metadados;
        
        return $this->save();
    }

    /**
     * Get the cliente that owns the venda.
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    /**
     * Get the usuario that owns the venda.
     */
    public function usuario()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the vendedor that owns the venda.
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Get the funcionario that owns the venda.
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Get the itens for the venda.
     */
    public function itens()
    {
        return $this->hasMany(ItemVenda::class);
    }

    public function posVendas()
    {
        return $this->hasMany(\App\Models\PosVenda::class, 'venda_id');
    }

    /**
     * Get the contas a receber for the venda.
     */
    public function contasReceber()
    {
        return $this->hasMany(ContaReceber::class);
    }

    /**
     * Relacionamento com opção de frete
     */
    public function opcaoFrete()
    {
        return $this->belongsTo(OpcaoFrete::class);
    }

    /**
     * Relacionamento com entregador
     */
    public function entregador()
    {
        return $this->belongsTo(Entregador::class);
    }

    /**
     * Relacionamento com entrega de frete
     */
    public function freteEntrega()
    {
        return $this->hasOne(FreteEntrega::class);
    }

    /**
     * Scope a query to only include vendas abertas.
     */
    public function scopeAbertas($query)
    {
        return $query->where('status', self::STATUS_ABERTA);
    }

    /**
     * Scope a query to only include vendas finalizadas.
     */
    public function scopeFinalizadas($query)
    {
        return $query->where('status', self::STATUS_FINALIZADA);
    }

    /**
     * Scope a query to only include vendas de pré-venda.
     */
    public function scopePreVenda($query)
    {
        return $query->where('status', self::STATUS_PRE_VENDA);
    }

    /**
     * Scope a query to only include vendas pendentes de pagamento.
     */
    public function scopePendentes($query)
    {
        return $query->where('status_pagamento', self::PAGAMENTO_PENDENTE);
    }

    /**
     * Scope a query to only include vendas pagas.
     */
    public function scopePagas($query)
    {
        return $query->where('status_pagamento', self::PAGAMENTO_PAGO);
    }

    /**
     * Scope a query to only include vendas vencidas.
     */
    public function scopeVencidas($query)
    {
        return $query->where('status_pagamento', self::PAGAMENTO_ATRASADO)
                    ->orWhere(function ($query) {
                        $query->where('data_vencimento', '<', now())
                              ->where('status_pagamento', '!=', self::PAGAMENTO_PAGO)
                              ->where('status_pagamento', '!=', self::PAGAMENTO_CANCELADO);
                    });
    }

    /**
     * Scope a query to only include vendas do tipo especificado.
     */
    public function scopeDoTipo($query, string $tipo)
    {
        return $query->where('tipo_documento', $tipo);
    }

    /**
     * Scope a query to only include vendas do período especificado.
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim = null)
    {
        $dataFim = $dataFim ?: now();
        
        return $query->whereBetween('data_emissao', [
            $dataInicio,
            $dataFim
        ]);
    }

    /**
     * Scope a query to only include vendas do cliente especificado.
     */
    public function scopeDoCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    /**
     * Scope a query to only include vendas do vendedor especificado.
     */
    public function scopeDoVendedor($query, $vendedorId)
    {
        return $query->where('vendedor_id', $vendedorId);
    }

    /**
     * Get the status formatado.
     */
    public function getStatusFormatadoAttribute(): string
    {
        $statuses = [
            self::STATUS_ABERTA => 'Aberta',
            self::STATUS_FINALIZADA => 'Finalizada',
            self::STATUS_CANCELADA => 'Cancelada',
            self::STATUS_ESTORNADA => 'Estornada',
            self::STATUS_PRE_VENDA => 'Pré-venda',
        ];

        return $statuses[$this->status] ?? $this->status;
    }

    /**
     * Get the status de pagamento formatado.
     */
    public function getStatusPagamentoFormatadoAttribute(): string
    {
        $statuses = [
            self::PAGAMENTO_PENDENTE => 'Pendente',
            self::PAGAMENTO_PARCIAL => 'Parcial',
            self::PAGAMENTO_PAGO => 'Pago',
            self::PAGAMENTO_ATRASADO => 'Atrasado',
            self::PAGAMENTO_CANCELADO => 'Cancelado',
        ];

        return $statuses[$this->status_pagamento] ?? $this->status_pagamento;
    }

    /**
     * Get the tipo de documento formatado.
     */
    public function getTipoDocumentoFormatadoAttribute(): string
    {
        $tipos = [
            self::TIPO_VENDA => 'Venda',
            self::TIPO_ORCAMENTO => 'Orçamento',
            self::TIPO_ORCAMENTO_APROVADO => 'Orçamento Aprovado',
        ];

        return $tipos[$this->tipo_documento] ?? $this->tipo_documento;
    }

    /**
     * Get the valor restante formatado.
     */
    public function getValorRestanteFormatadoAttribute(): string
    {
        return 'R$ ' . number_format($this->valor_restante, 2, ',', '.');
    }

    /**
     * Get the valor total formatado.
     */
    public function getValorTotalFormatadoAttribute(): string
    {
        return 'R$ ' . number_format($this->valor_total, 2, ',', '.');
    }

    /**
     * Get the valor pago formatado.
     */
    public function getValorPagoFormatadoAttribute(): string
    {
        return 'R$ ' . number_format($this->valor_pago, 2, ',', '.');
    }

    /**
     * Get the data de emissão formatada.
     */
    public function getDataEmissaoFormatadaAttribute(): string
    {
        return $this->data_emissao->format('d/m/Y H:i');
    }

    /**
     * Get the data de vencimento formatada.
     */
    public function getDataVencimentoFormatadaAttribute(): ?string
    {
        return $this->data_vencimento ? $this->data_vencimento->format('d/m/Y') : null;
    }
    
    /**
     * Get the vendedor_nome attribute, preenchendo automaticamente se necessário
     */
    public function getVendedorNomeAttribute($value)
    {
        // Se já tem valor, retorna
        if (!empty($value)) {
            return $value;
        }
        
        // Se não tem valor, tenta buscar do relacionamento
        $vendedorId = $this->vendedor_id ?? $this->usuario_id;
        if ($vendedorId) {
            $vendedor = User::find($vendedorId);
            if ($vendedor) {
                return $vendedor->name;
            }
        }
        
        return 'N/A';
    }

    /**
     * Accessor para retornar o desconto como objeto estruturado
     */
    public function getDescontoAttribute($value)
    {
        // Valor do desconto aplicado (já calculado)
        $valorAplicado = (float)($this->attributes['desconto'] ?? 0);
        // Valor original do desconto (percentual ou fixo)
        $valorOriginal = (float)($this->attributes['valor_desconto_original'] ?? 0);
        // Tipo do desconto
        $tipo = $this->attributes['tipo_desconto'] ?? 'valor';
        return [
            'tipo' => $tipo === 'percentual' ? 'percent' : 'fixed',
            'valor' => $valorOriginal,
            'valor_aplicado' => $valorAplicado
        ];
    }
    
    /**
     * Get the raw discount value for mathematical operations
     */
    public function getDescontoValorAttribute()
    {
        return (float)($this->attributes['desconto'] ?? 0);
    }
}
