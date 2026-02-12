<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Premiacao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'premiacoes';

    protected $fillable = [
        'tenant_id',
        'vendedor_id',
        'meta_id',
        'tipo',
        'titulo',
        'descricao',
        'valor_bonus',
        'brinde_descricao',
        'data_folga',
        'status',
        'data_entrega',
        'observacoes'
    ];

    protected $casts = [
        'valor_bonus' => 'decimal:2',
        'data_folga' => 'date',
        'data_entrega' => 'date',
    ];

    /**
     * Relacionamento com vendedor
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Relacionamento com meta
     */
    public function meta()
    {
        return $this->belongsTo(MetaVenda::class, 'meta_id');
    }
}
