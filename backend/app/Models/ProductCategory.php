<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductCategory extends Model
{
    protected $fillable = [
        'nome',
        'parent_id',
        'tenant_id',
        'slug',
        'ordem',
        'status'
    ];

    protected $casts = [
        'status' => 'boolean',
        'ordem' => 'integer'
    ];

    /**
     * Escopo para filtrar por tenant
     */
    public function scopeTenant($query, $tenantId = null)
    {
        if (!$tenantId && auth()->check()) {
            $tenantId = auth()->user()->tenant_id;
        }
        
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Relacionamento com categorias filhas
     */
    public function subcategories(): HasMany
    {
        return $this->hasMany(ProductCategory::class, 'parent_id');
    }

    /**
     * Relacionamento com categoria pai
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'parent_id');
    }

    /**
     * Relacionamento com tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com produtos
     */
    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class, 'categoria_id');
    }
}
