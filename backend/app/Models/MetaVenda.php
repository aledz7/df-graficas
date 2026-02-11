<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class MetaVenda extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'metas_vendas';

    protected $fillable = [
        'tenant_id',
        'tipo', // 'empresa' ou 'vendedor'
        'vendedor_id',
        'data_inicio',
        'data_fim',
        'periodo_tipo', // 'diario', 'mensal', 'personalizado'
        'valor_meta',
        'observacoes',
        'ativo'
    ];

    protected $casts = [
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'valor_meta' => 'decimal:2',
        'ativo' => 'boolean',
    ];

    /**
     * Relacionamento com vendedor (se for meta individual)
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Escopo para metas da empresa
     */
    public function scopeEmpresa($query)
    {
        return $query->where('tipo', 'empresa');
    }

    /**
     * Escopo para metas de vendedores
     */
    public function scopeVendedores($query)
    {
        return $query->where('tipo', 'vendedor');
    }

    /**
     * Escopo para metas ativas
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Escopo para filtrar por período
     * Retorna metas que se sobrepõem ao período informado
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->where(function($q) use ($dataInicio, $dataFim) {
            // Meta que começa dentro do período
            $q->whereBetween('data_inicio', [$dataInicio, $dataFim])
              // Ou meta que termina dentro do período
              ->orWhereBetween('data_fim', [$dataInicio, $dataFim])
              // Ou meta que engloba todo o período
              ->orWhere(function($q2) use ($dataInicio, $dataFim) {
                  $q2->where('data_inicio', '<=', $dataInicio)
                     ->where('data_fim', '>=', $dataFim);
              });
        });
    }
}
