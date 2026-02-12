<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class HistoricoPontos extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'historico_pontos';

    protected $fillable = [
        'tenant_id',
        'vendedor_id',
        'tipo_acao',
        'pontos',
        'descricao',
        'venda_id',
        'meta_id',
        'dados_adicionais',
        'data_acao'
    ];

    protected $casts = [
        'pontos' => 'integer',
        'dados_adicionais' => 'array',
        'data_acao' => 'date',
    ];

    /**
     * Relacionamento com vendedor
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Relacionamento com meta
     */
    public function meta()
    {
        return $this->belongsTo(MetaVenda::class, 'meta_id');
    }
}
