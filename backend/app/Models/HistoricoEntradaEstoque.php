<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class HistoricoEntradaEstoque extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'historico_entrada_estoque';

    protected $fillable = [
        'tenant_id',
        'codigo_entrada',
        'data_entrada',
        'numero_nota',
        'data_nota',
        'fornecedor_id',
        'fornecedor_nome',
        'usuario_id',
        'usuario_nome',
        'itens',
        'observacoes',
        'metadados',
        'status',
        'data_confirmacao'
    ];

    protected $casts = [
        'data_entrada' => 'date',
        'data_nota' => 'date',
        'itens' => 'array',
        'metadados' => 'array',
        'data_confirmacao' => 'datetime'
    ];

    /**
     * Relacionamento com o tenant
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Relacionamento com o usuário responsável
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    /**
     * Scope para dados do tenant atual
     */
    public function scopeDoTenant($query, $tenantId = null)
    {
        $tenantId = $tenantId ?? auth()->user()->tenant_id;
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope para entradas confirmadas
     */
    public function scopeConfirmadas($query)
    {
        return $query->where('status', 'confirmada');
    }

    /**
     * Scope para entradas por período
     */
    public function scopePorPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('data_entrada', [$dataInicio, $dataFim]);
    }

    /**
     * Scope para entradas por fornecedor
     */
    public function scopePorFornecedor($query, $fornecedorId)
    {
        return $query->where('fornecedor_id', $fornecedorId);
    }
} 