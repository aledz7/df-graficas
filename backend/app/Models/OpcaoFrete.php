<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class OpcaoFrete extends Model
{
    use SoftDeletes, Tenantable;

    protected $table = 'opcoes_frete';

    protected $fillable = [
        'tenant_id',
        'titulo',
        'descricao',
        'prazo_entrega',
        'taxa_entrega',
        'pedido_minimo',
        'peso_minimo',
        'peso_maximo',
        'tamanho_minimo',
        'tamanho_maximo',
        'tipo_limite_geografico',
        'produtos_limitados',
        'ativo',
        'ordem',
    ];

    protected $casts = [
        'prazo_entrega' => 'integer',
        'taxa_entrega' => 'decimal:2',
        'pedido_minimo' => 'decimal:2',
        'peso_minimo' => 'decimal:3',
        'peso_maximo' => 'decimal:3',
        'tamanho_minimo' => 'decimal:2',
        'tamanho_maximo' => 'decimal:2',
        'produtos_limitados' => 'array',
        'ativo' => 'boolean',
        'ordem' => 'integer',
    ];

    /**
     * Relacionamento com localidades
     */
    public function localidades()
    {
        return $this->hasMany(FreteLocalidade::class, 'opcao_frete_id');
    }

    /**
     * Relacionamento com faixas de CEP
     */
    public function faixasCep()
    {
        return $this->hasMany(FreteFaixaCep::class, 'opcao_frete_id');
    }

    /**
     * Relacionamento com vendas
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class, 'opcao_frete_id');
    }

    /**
     * Scope para opções ativas
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope ordenado
     */
    public function scopeOrdenadas($query)
    {
        return $query->orderBy('ordem')->orderBy('titulo');
    }
}
