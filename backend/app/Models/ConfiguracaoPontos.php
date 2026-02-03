<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfiguracaoPontos extends Model
{
    protected $table = 'configuracoes_pontos';

    protected $fillable = [
        'tenant_id',
        'ativo',
        'pontos_por_reais',
        'validade_meses',
        'resgate_minimo',
        'descricao',
        'regras_adicionais',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'pontos_por_reais' => 'decimal:2',
        'validade_meses' => 'integer',
        'resgate_minimo' => 'integer',
        'regras_adicionais' => 'array',
    ];

    /**
     * Relacionamento com o tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope para filtrar por tenant
     */
    public function scopeByTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope para filtrar apenas configurações ativas
     */
    public function scopeAtivo($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Obter configuração padrão
     */
    public static function getConfiguracaoPadrao()
    {
        return [
            'ativo' => true,
            'pontos_por_reais' => 50.00,
            'validade_meses' => 12,
            'resgate_minimo' => 50,
            'descricao' => 'Programa de fidelidade padrão',
            'regras_adicionais' => [],
        ];
    }
}
