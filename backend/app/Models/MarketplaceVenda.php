<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class MarketplaceVenda extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'marketplace_vendas';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'id_venda',
        'data_venda',
        'valor_total',
        'status_pedido',
        'observacoes',
        'cliente_nome',
        'cliente_contato',
        'cliente_endereco',
        'codigo_rastreio',
        'link_produto',
        'vendedor_id',
        'vendedor_nome',
        'fotos_produto',
        'metadados'
    ];

    protected $casts = [
        'data_venda' => 'datetime',
        'valor_total' => 'decimal:2',
        'fotos_produto' => 'array',
        'metadados' => 'array',
        'deleted_at' => 'datetime'
    ];

    protected $dates = [
        'data_venda',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    /**
     * Relacionamento com o usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento com os produtos da venda
     */
    public function produtos()
    {
        return $this->hasMany(MarketplaceVendaProduto::class);
    }

    /**
     * Scope para vendas do usuário atual
     */
    public function scopeDoUsuario($query, $userId = null)
    {
        $userId = $userId ?? auth()->id();
        return $query->where('user_id', $userId);
    }

    /**
     * Scope para filtrar por status
     */
    public function scopePorStatus($query, $status)
    {
        return $query->where('status_pedido', $status);
    }

    /**
     * Scope para filtrar por cliente
     */
    public function scopePorCliente($query, $clienteNome)
    {
        return $query->where('cliente_nome', 'like', "%{$clienteNome}%");
    }

    /**
     * Scope para filtrar por data
     */
    public function scopePorData($query, $dataInicio = null, $dataFim = null)
    {
        if ($dataInicio) {
            $query->where('data_venda', '>=', $dataInicio);
        }
        if ($dataFim) {
            $query->where('data_venda', '<=', $dataFim);
        }
        return $query;
    }

    /**
     * Boot do modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Antes de salvar, garantir que o tenant_id está definido
        static::creating(function ($model) {
            if (!$model->tenant_id && auth()->check()) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }
} 