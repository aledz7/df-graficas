<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class ContaPagar extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'contas_pagar';

    protected $fillable = [
        'user_id',
        'descricao',
        'valor',
        'data_vencimento',
        'data_pagamento',
        'fornecedor_id',
        'categoria_id',
        'status',
        'recorrencia',
        'data_fim_contrato',
        'data_inicio_contrato',
        'observacoes',
        'metadados'
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'data_vencimento' => 'date',
        'data_pagamento' => 'date',
        'data_fim_contrato' => 'date',
        'data_inicio_contrato' => 'date',
        'metadados' => 'array',
    ];

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento com fornecedor (cliente)
     */
    public function fornecedor()
    {
        return $this->belongsTo(Cliente::class, 'fornecedor_id');
    }

    /**
     * Obtém o ID do fornecedor (pode vir do campo fornecedor_id ou dos metadados)
     */
    public function getFornecedorIdAttribute()
    {
        try {
            // Se existe fornecedor_id no campo principal
            if (isset($this->attributes['fornecedor_id']) && $this->attributes['fornecedor_id']) {
                return $this->attributes['fornecedor_id'];
            }
            
            // Se existe fornecedor_id nos metadados
            if ($this->metadados && is_array($this->metadados) && isset($this->metadados['fornecedor_id'])) {
                return $this->metadados['fornecedor_id'];
            }
            
            return null;
        } catch (\Exception $e) {
            \Log::error('Erro ao obter fornecedor_id:', [
                'error' => $e->getMessage(),
                'attributes' => $this->attributes ?? [],
                'metadados' => $this->metadados ?? null
            ]);
            return null;
        }
    }

    /**
     * Relacionamento com categoria
     */
    public function categoria()
    {
        return $this->belongsTo(CategoriaCaixa::class, 'categoria_id');
    }

    /**
     * Scope para contas pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Scope para contas pagas
     */
    public function scopePagas($query)
    {
        return $query->where('status', 'pago');
    }

    /**
     * Scope para contas vencidas
     */
    public function scopeVencidas($query)
    {
        return $query->where('status', 'vencido');
    }

    /**
     * Scope para contas em atraso
     */
    public function scopeEmAtraso($query)
    {
        return $query->where('data_vencimento', '<', now())
                    ->where('status', '!=', 'pago');
    }

    /**
     * Scope para contas recorrentes
     */
    public function scopeRecorrentes($query)
    {
        return $query->where('recorrencia', '!=', 'nao_recorre');
    }

    /**
     * Verifica se a conta está em atraso
     */
    public function getEmAtrasoAttribute()
    {
        return $this->data_vencimento < now() && $this->status !== 'pago';
    }

    /**
     * Calcula os dias em atraso
     */
    public function getDiasAtrasoAttribute()
    {
        if (!$this->em_atraso) {
            return 0;
        }

        return now()->diffInDays($this->data_vencimento);
    }

    /**
     * Verifica se a conta está vencendo em breve (30 dias)
     */
    public function getVencendoBreveAttribute()
    {
        $diasParaVencimento = now()->diffInDays($this->data_vencimento, false);
        return $diasParaVencimento >= 0 && $diasParaVencimento <= 30 && $this->status !== 'pago';
    }

    /**
     * Marca a conta como paga
     */
    public function marcarComoPaga($dataPagamento = null)
    {
        $this->status = 'pago';
        $this->data_pagamento = $dataPagamento ?? now();
        $this->save();
    }

    /**
     * Atualiza status baseado na data de vencimento
     */
    public function atualizarStatus()
    {
        if ($this->status === 'pendente' && $this->data_vencimento < now()) {
            $this->status = 'vencido';
            $this->save();
        }
    }

    /**
     * Boot do modelo para atualizar status automaticamente
     */
    protected static function boot()
    {
        parent::boot();

        static::retrieved(function ($conta) {
            $conta->atualizarStatus();
        });
    }
}
