<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MarketplaceVendaProduto extends Model
{
    use HasFactory;

    protected $table = 'marketplace_venda_produtos';

    protected $fillable = [
        'marketplace_venda_id',
        'produto_id',
        'nome',
        'quantidade',
        'preco_unitario',
        'subtotal',
        'metadados'
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'preco_unitario' => 'decimal:2',
        'subtotal' => 'decimal:2',
        'metadados' => 'array'
    ];

    /**
     * Relacionamento com a venda
     */
    public function venda()
    {
        return $this->belongsTo(MarketplaceVenda::class, 'marketplace_venda_id');
    }

    /**
     * Boot do modelo
     */
    protected static function boot()
    {
        parent::boot();

        // Antes de salvar, calcular o subtotal
        static::saving(function ($model) {
            if ($model->quantidade && $model->preco_unitario) {
                $model->subtotal = $model->quantidade * $model->preco_unitario;
            }
        });
    }
} 