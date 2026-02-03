<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServicoAdicional extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'servicos_adicionais';

    protected $fillable = [
        'nome',
        'descricao',
        'preco',
        'unidade',
        'ativo',
        'categoria',
        'ordem',
        'tenant_id'
    ];

    protected $casts = [
        'preco' => 'decimal:2',
        'ativo' => 'boolean',
        'ordem' => 'integer',
        'tenant_id' => 'integer'
    ];

    protected $attributes = [
        'unidade' => 'm²',
        'ativo' => true,
        'ordem' => 0
    ];

    // Relacionamento com tenant
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    // Scopes
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    public function scopePorCategoria($query, $categoria)
    {
        return $query->where('categoria', $categoria);
    }

    public function scopeOrdenados($query)
    {
        return $query->orderBy('ordem')->orderBy('nome');
    }

    public function scopePorTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    // Acessor para manter compatibilidade com o frontend
    public function getPrecoPorM2Attribute()
    {
        return $this->preco;
    }

    public function getUnidadeMedidaAttribute()
    {
        return $this->unidade;
    }

    // Mutator para manter compatibilidade com o frontend
    public function setPrecoPorM2Attribute($value)
    {
        $this->attributes['preco'] = $value;
    }

    public function setUnidadeMedidaAttribute($value)
    {
        $this->attributes['unidade'] = $value;
    }
}
