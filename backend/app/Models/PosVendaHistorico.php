<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;

class PosVendaHistorico extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'pos_venda_historico';

    protected $fillable = [
        'tenant_id',
        'pos_venda_id',
        'tipo_acao',
        'status_anterior',
        'status_novo',
        'descricao',
        'usuario_id',
        'dados_adicionais',
    ];

    protected $casts = [
        'dados_adicionais' => 'array',
    ];

    public function posVenda()
    {
        return $this->belongsTo(PosVenda::class, 'pos_venda_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
