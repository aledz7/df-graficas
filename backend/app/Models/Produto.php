<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Produto extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'codigo_produto',
        'nome',
        'status',
        'unidade_medida',
        'tipo_produto',
        'categoria_id',
        'subcategoria_id',
        'descricao_curta',
        'descricao_longa',
        'localizacao',
        'codigo_barras',
        'imagem_principal',
        'galeria_urls',
        'preco_custo',
        'preco_m2',
        'margem_lucro',
        'preco_venda',
        'medida_chapa_largura_cm',
        'medida_chapa_altura_cm',
        'valor_chapa',
        'promocao_ativa',
        'preco_promocional',
        'promo_data_inicio',
        'promo_data_fim',
        'permite_comissao',
        'percentual_comissao',
        'estoque',
        'estoque_minimo',
        'variacoes_ativa',
        'variacao_obrigatoria',
        'variacoes',
        'is_composto',
        'composicao',
        'tipo_precificacao',
        'tabela_precos',
        'preco_metro_linear',
        'valor_minimo'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'status' => 'boolean',
        'promocao_ativa' => 'boolean',
        'permite_comissao' => 'boolean',
        'variacoes_ativa' => 'boolean',
        'variacao_obrigatoria' => 'boolean',
        'is_composto' => 'boolean',
        'preco_custo' => 'decimal:2',
        'preco_m2' => 'decimal:2',
        'margem_lucro' => 'decimal:2',
        'preco_venda' => 'decimal:2',
        'medida_chapa_largura_cm' => 'decimal:2',
        'medida_chapa_altura_cm' => 'decimal:2',
        'valor_chapa' => 'decimal:2',
        'preco_promocional' => 'decimal:2',
        'percentual_comissao' => 'decimal:2',
        'estoque' => 'decimal:2',
        'estoque_minimo' => 'decimal:2',
        'preco_metro_linear' => 'decimal:2',
        'valor_minimo' => 'decimal:2',
        'galeria_urls' => 'array',
        'variacoes' => 'array',
        'composicao' => 'array',
        'tabela_precos' => 'array',
        'promo_data_inicio' => 'datetime',
        'promo_data_fim' => 'datetime',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'promo_data_inicio',
        'promo_data_fim',
        'deleted_at',
    ];

    /**
     * Obtém a categoria do produto.
     */
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    /**
     * Obtém a subcategoria do produto.
     */
    public function subcategoria()
    {
        return $this->belongsTo(Subcategoria::class, 'subcategoria_id');
    }

    /**
     * Obtém os itens de venda associados a este produto.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function itensVenda()
    {
        return $this->hasMany(ItemVenda::class, 'produto_id');
    }

    /**
     * Obtém os itens de orçamento associados a este produto.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function orcamentoItens()
    {
        return $this->hasMany(OrcamentoItem::class, 'produto_id');
    }

    /**
     * Obtém o tenant ao qual este produto pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Escopo para produtos ativos.
     */
    public function scopeAtivos($query)
    {
        return $query->where('status', true);
    }

    /**
     * Escopo para produtos em promoção.
     */
    public function scopeEmPromocao($query)
    {
        $now = now();
        return $query->where('promocao_ativa', true)
                    ->where('promo_data_inicio', '<=', $now)
                    ->where('promo_data_fim', '>=', $now);
    }

    /**
     * Verifica se o produto está em promoção.
     */
    public function estaEmPromocao()
    {
        if (!$this->promocao_ativa) {
            return false;
        }

        $now = now();
        return $this->promo_data_inicio <= $now && 
               $this->promo_data_fim >= $now;
    }

    /**
     * Obtém o preço atual do produto (considerando promoção).
     */
    public function getPrecoAtualAttribute()
    {
        return $this->estaEmPromocao() 
            ? $this->preco_promocional 
            : $this->preco_venda;
    }
}
