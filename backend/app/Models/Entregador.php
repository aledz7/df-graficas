<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Entregador extends Model
{
    use SoftDeletes, Tenantable;

    protected $table = 'entregadores';

    protected $fillable = [
        'tenant_id',
        'nome',
        'telefone',
        'tipo',
        'valor_padrao_entrega',
        'chave_pix',
        'funcionario_id',
        'ativo',
        'observacoes',
    ];

    protected $casts = [
        'valor_padrao_entrega' => 'decimal:2',
        'ativo' => 'boolean',
    ];

    /**
     * Relacionamento com funcionário (se for próprio)
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Relacionamento com entregas
     */
    public function entregas()
    {
        return $this->hasMany(FreteEntrega::class, 'entregador_id');
    }

    /**
     * Scope para entregadores ativos
     */
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope para tipo específico
     */
    public function scopeDoTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Verifica se é próprio
     */
    public function isProprio(): bool
    {
        return $this->tipo === 'proprio';
    }

    /**
     * Verifica se é terceirizado
     */
    public function isTerceirizado(): bool
    {
        return $this->tipo === 'terceirizado';
    }
}
