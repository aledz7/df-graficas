<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Models\Traits\Tenantable;

class ItemVenda extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'itens_venda';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'venda_id',
        'venda_referencia_id', // Para OS, Envelopamento, Marketplace (quando não estão na tabela vendas)
        'tipo_venda', // 'pdv', 'os', 'envelopamento', 'marketplace'
        'produto_id',
        'produto_nome',
        'produto_codigo',
        'produto_unidade',
        'produto_descricao',
        'quantidade',
        'valor_unitario',
        'desconto_percentual',
        'desconto_valor',
        'acrescimo_percentual',
        'acrescimo_valor',
        'valor_total',
        'observacoes',
        'dados_adicionais',
        'orcamento_item_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'quantidade' => 'decimal:3',
        'valor_unitario' => 'decimal:2',
        'desconto_percentual' => 'decimal:2',
        'desconto_valor' => 'decimal:2',
        'acrescimo_percentual' => 'decimal:2',
        'acrescimo_valor' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'dados_adicionais' => 'array',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();
    }

    /**
     * Get the venda that owns the item.
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Get the produto that owns the item.
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class);
    }

    /**
     * Get the tenant that owns the item.
     */
    /**
     * Obtém o tenant ao qual este item de venda pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the orcamento item that owns the item.
     */
    public function orcamentoItem()
    {
        return $this->belongsTo(OrcamentoItem::class, 'orcamento_item_id');
    }

    /**
     * Calculate the total value of the item.
     */
    public function calcularTotal(): void
    {
        $valorBruto = $this->valor_unitario * $this->quantidade;
        
        // Aplicar desconto
        $desconto = $this->desconto_valor;
        if ($this->desconto_percentual > 0) {
            $desconto = ($valorBruto * $this->desconto_percentual) / 100;
        }
        
        $valorComDesconto = $valorBruto - $desconto;
        
        // Aplicar acréscimo
        $acrescimo = $this->acrescimo_valor;
        if ($this->acrescimo_percentual > 0) {
            $acrescimo = ($valorComDesconto * $this->acrescimo_percentual) / 100;
        }
        
        $this->valor_total = $valorComDesconto + $acrescimo;
    }

    /**
     * Create an item from a product.
     */
    public static function criarAPartirDoProduto(Produto $produto, float $quantidade = 1, ?float $valorUnitario = null): self
    {
        $item = new self([
            'produto_id' => $produto->id,
            'produto_nome' => $produto->nome,
            'produto_codigo' => $produto->codigo,
            'produto_unidade' => $produto->unidade,
            'produto_descricao' => $produto->descricao,
            'quantidade' => $quantidade,
            'valor_unitario' => $valorUnitario ?? $produto->preco_venda,
            'desconto_percentual' => 0,
            'desconto_valor' => 0,
            'acrescimo_percentual' => 0,
            'acrescimo_valor' => 0,
        ]);

        $item->calcularTotal();
        
        return $item;
    }

    /**
     * Apply a discount to the item.
     */
    public function aplicarDesconto(float $valor, string $tipo = 'valor'): void
    {
        if ($tipo === 'percentual') {
            $this->desconto_percentual = $valor;
            $this->desconto_valor = 0;
        } else {
            $this->desconto_valor = $valor;
            $this->desconto_percentual = 0;
        }
        
        $this->calcularTotal();
    }

    /**
     * Apply an increase to the item.
     */
    public function aplicarAcrescimo(float $valor, string $tipo = 'valor'): void
    {
        if ($tipo === 'percentual') {
            $this->acrescimo_percentual = $valor;
            $this->acrescimo_valor = 0;
        } else {
            $this->acrescimo_valor = $valor;
            $this->acrescimo_percentual = 0;
        }
        
        $this->calcularTotal();
    }

    /**
     * Get the valor unitário formatado.
     */
    public function getValorUnitarioFormatadoAttribute(): string
    {
        return 'R$ ' . number_format($this->valor_unitario, 2, ',', '.');
    }

    /**
     * Get the valor total formatado.
     */
    public function getValorTotalFormatadoAttribute(): string
    {
        return 'R$ ' . number_format($this->valor_total, 2, ',', '.');
    }

    /**
     * Get the quantidade formatada.
     */
    public function getQuantidadeFormatadaAttribute(): string
    {
        return number_format($this->quantidade, 3, ',', '.');
    }

    /**
     * Get the desconto formatado.
     */
    public function getDescontoFormatadoAttribute(): string
    {
        if ($this->desconto_percentual > 0) {
            return number_format($this->desconto_percentual, 2, ',', '.') . '%';
        }
        
        return 'R$ ' . number_format($this->desconto_valor, 2, ',', '.');
    }

    /**
     * Get the acréscimo formatado.
     */
    public function getAcrescimoFormatadoAttribute(): string
    {
        if ($this->acrescimo_percentual > 0) {
            return number_format($this->acrescimo_percentual, 2, ',', '.') . '%';
        }
        
        return 'R$ ' . number_format($this->acrescimo_valor, 2, ',', '.');
    }

    /**
     * Scope a query to only include itens do produto especificado.
     */
    public function scopeDoProduto($query, $produtoId)
    {
        return $query->where('produto_id', $produtoId);
    }

    /**
     * Scope a query to only include itens da venda especificada.
     */
    public function scopeDaVenda($query, $vendaId)
    {
        return $query->where('venda_id', $vendaId);
    }

    /**
     * Scope a query to only include itens do período especificado.
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim = null)
    {
        $dataFim = $dataFim ?: now();
        
        return $query->whereHas('venda', function($query) use ($dataInicio, $dataFim) {
            $query->whereBetween('data_emissao', [$dataInicio, $dataFim]);
        });
    }
}
