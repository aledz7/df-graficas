<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FormaPagamento extends Model
{
    use HasFactory, SoftDeletes;
    
    /**
     * Nome da tabela associada ao modelo.
     *
     * @var string
     */
    protected $table = 'formas_pagamento';
    
    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nome',
        'codigo',
        'icone',
        'ativo',
        'exibir_catalogo',
        'ordem',
        'tenant_id'
    ];
    
    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'ativo' => 'boolean',
        'exibir_catalogo' => 'boolean',
        'ordem' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    /**
     * Escopo para filtrar por tenant
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int|null $tenantId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeTenant($query, $tenantId = null)
    {
        if ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        }
        
        return $query->where(function($q) {
            $q->whereNull('tenant_id')
              ->orWhere('tenant_id', auth()->user()->tenant_id ?? null);
        });
    }
    
    /**
     * Escopo para filtrar apenas ativos
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }
    
    /**
     * Escopo para filtrar apenas as que exibem no catálogo
     */
    public function scopeExibirCatalogo($query)
    {
        return $query->where('exibir_catalogo', true);
    }
}
