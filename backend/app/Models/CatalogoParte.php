<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class CatalogoParte extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'catalogo_partes';

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'nome',
        'altura',
        'largura',
        'imagem',
        'imagem_url_externa'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'altura' => 'decimal:2',
        'largura' => 'decimal:2'
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'deleted_at'
    ];
} 