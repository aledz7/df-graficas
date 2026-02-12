<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class PosVenda extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'pos_venda';

    protected $fillable = [
        'tenant_id',
        'cliente_id',
        'venda_id',
        'vendedor_id',
        'responsavel_atual_id',
        'tipo',
        'observacao',
        'nota_satisfacao',
        'status',
        'data_abertura',
        'data_resolucao',
        'usuario_abertura_id',
        'usuario_resolucao_id',
    ];

    protected $casts = [
        'nota_satisfacao' => 'integer',
        'data_abertura' => 'datetime',
        'data_resolucao' => 'datetime',
    ];

    /**
     * Relacionamentos
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    public function responsavelAtual()
    {
        return $this->belongsTo(User::class, 'responsavel_atual_id');
    }

    public function usuarioAbertura()
    {
        return $this->belongsTo(User::class, 'usuario_abertura_id');
    }

    public function usuarioResolucao()
    {
        return $this->belongsTo(User::class, 'usuario_resolucao_id');
    }

    public function historico()
    {
        return $this->hasMany(PosVendaHistorico::class, 'pos_venda_id');
    }

    public function transferencias()
    {
        return $this->hasMany(PosVendaTransferencia::class, 'pos_venda_id');
    }

    public function agendamentos()
    {
        return $this->hasMany(PosVendaAgendamento::class, 'pos_venda_id');
    }

    /**
     * Scopes
     */
    public function scopePorStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    public function scopePorVendedor($query, $vendedorId)
    {
        return $query->where('vendedor_id', $vendedorId);
    }

    public function scopePorResponsavel($query, $responsavelId)
    {
        return $query->where('responsavel_atual_id', $responsavelId);
    }

    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    public function scopeEmAndamento($query)
    {
        return $query->where('status', 'em_andamento');
    }

    public function scopeResolvidos($query)
    {
        return $query->where('status', 'resolvido');
    }
}
