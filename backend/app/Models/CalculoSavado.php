<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CalculoSavado extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'calculos_salvos';

    protected $fillable = [
        'user_id',
        'nome',
        'cliente',
        'config',
        'dados_calculo',
        'resultado',
        'descricao',
        'itens',
        'produtos',
        'servicos_adicionais',
        'tenant_id',
        'status',
        'data_criacao',
        'data_atualizacao'
    ];

    protected $casts = [
        'cliente' => 'array',
        'config' => 'array',
        'dados_calculo' => 'array',
        'resultado' => 'decimal:2',
        'itens' => 'array',
        'produtos' => 'array',
        'servicos_adicionais' => 'array',
        'data_criacao' => 'datetime',
        'data_atualizacao' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime'
    ];

    protected $dates = [
        'data_criacao',
        'data_atualizacao',
        'created_at',
        'updated_at',
        'deleted_at'
    ];

    // Relacionamentos
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    // Scopes
    public function scopeAtivo($query)
    {
        return $query->where('status', 'ativo');
    }

    public function scopePorTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopePorUsuario($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Acessors
    public function getValorTotalAttribute()
    {
        return $this->resultado ?? 0;
    }

    public function getDataFormatadaAttribute()
    {
        return $this->data_criacao ? $this->data_criacao->format('d/m/Y H:i') : '';
    }

    public function getClienteNomeAttribute()
    {
        return $this->cliente['nome'] ?? 'Cliente não informado';
    }

    // Métodos auxiliares
    public function getItensArray()
    {
        return $this->itens ?? [];
    }

    public function getProdutosArray()
    {
        return $this->produtos ?? [];
    }

    public function getServicosAdicionaisArray()
    {
        return $this->servicos_adicionais ?? [];
    }

    public function getConfigArray()
    {
        return $this->config ?? [];
    }

    public function getDadosCalculoArray()
    {
        return $this->dados_calculo ?? [];
    }
}
