<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use App\Models\Traits\Tenantable;

class OrcamentoItem extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'orcamento_itens';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'orcamento_id',
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
        'status',
        'venda_item_id',
        'data_aprovacao',
        'data_conversao',
        'usuario_cadastro_id',
        'usuario_alteracao_id',
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
        'data_aprovacao' => 'datetime',
        'data_conversao' => 'datetime',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($item) {
            if (auth()->check() && empty($item->usuario_cadastro_id)) {
                $item->usuario_cadastro_id = auth()->id();
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($item) {
            if (auth()->check()) {
                $item->usuario_alteracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the orçamento item.
     */
    /**
     * Obtém o tenant ao qual este item de orçamento pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the orçamento that owns the item.
     */
    /**
     * Obtém o orçamento ao qual este item pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function orcamento()
    {
        return $this->belongsTo(Orcamento::class, 'orcamento_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the produto that owns the item.
     */
    /**
     * Obtém o produto associado a este item.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the venda item associated with the orçamento item.
     */
    /**
     * Obtém o item de venda associado a este item de orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vendaItem()
    {
        return $this->belongsTo(ItemVenda::class, 'venda_item_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who created the orçamento item.
     */
    /**
     * Obtém o usuário que criou o item de orçamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who last updated the orçamento item.
     */
    /**
     * Obtém o usuário que atualizou o item de orçamento pela última vez.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Scope a query to only include itens with a specific status.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $status
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope a query to only include itens from a specific orçamento.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $orcamentoId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDoOrcamento($query, $orcamentoId)
    {
        return $query->where('orcamento_id', $orcamentoId);
    }

    /**
     * Calculate the total value of the item.
     *
     * @return float
     */
    public function calcularValorTotal()
    {
        $valorBase = $this->valor_unitario * $this->quantidade;
        $desconto = $this->desconto_valor + ($valorBase * ($this->desconto_percentual / 100));
        $acrescimo = $this->acrescimo_valor + ($valorBase * ($this->acrescimo_percentual / 100));
        
        return max(0, $valorBase - $desconto + $acrescimo);
    }

    /**
     * Aprovar o item do orçamento.
     *
     * @param  string  $observacoes
     * @return bool
     */
    public function aprovar($observacoes = null)
    {
        $this->status = 'aprovado';
        $this->data_aprovacao = now();
        
        if ($observacoes) {
            $this->observacoes = $observacoes;
        }
        
        return $this->save();
    }

    /**
     * Reprovar o item do orçamento.
     *
     * @param  string  $observacoes
     * @return bool
     */
    public function reprovar($observacoes = null)
    {
        $this->status = 'reprovado';
        $this->data_aprovacao = now();
        
        if ($observacoes) {
            $this->observacoes = $observacoes;
        }
        
        return $this->save();
    }

    /**
     * Marcar o item como convertido em venda.
     *
     * @param  int  $vendaItemId
     * @return bool
     */
    public function marcarComoConvertido($vendaItemId)
    {
        $this->status = 'convertido';
        $this->venda_item_id = $vendaItemId;
        $this->data_conversao = now();
        
        return $this->save();
    }

    /**
     * Check if the item is approved.
     *
     * @return bool
     */
    public function isAprovado()
    {
        return $this->status === 'aprovado';
    }

    /**
     * Check if the item is converted to a sale.
     *
     * @return bool
     */
    public function isConvertido()
    {
        return $this->status === 'convertido';
    }

    /**
     * Get the status options for the item.
     *
     * @return array
     */
    public static function getStatusOptions()
    {
        return [
            'pendente' => 'Pendente',
            'aprovado' => 'Aprovado',
            'reprovado' => 'Reprovado',
            'convertido' => 'Convertido em Venda',
        ];
    }

    /**
     * Get the status label for the item.
     *
     * @return string
     */
    public function getStatusLabelAttribute()
    {
        $statuses = self::getStatusOptions();
        return $statuses[$this->status] ?? $this->status;
    }

    /**
     * Get the CSS class for the status badge.
     *
     * @return string
     */
    public function getStatusBadgeClassAttribute()
    {
        $classes = [
            'pendente' => 'bg-yellow-100 text-yellow-800',
            'aprovado' => 'bg-green-100 text-green-800',
            'reprovado' => 'bg-red-100 text-red-800',
            'convertido' => 'bg-blue-100 text-blue-800',
        ];
        
        return $classes[$this->status] ?? 'bg-gray-100 text-gray-800';
    }
}
