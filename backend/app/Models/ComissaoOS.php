<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class ComissaoOS extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'comissoes_os';

    protected $fillable = [
        'tenant_id',
        'funcionario_id',
        'user_id',
        'ordem_servico_id',
        'valor_os',
        'percentual_comissao',
        'valor_comissao',
        'status_pagamento',
        'data_os_finalizada',
        'data_os_paga',
        'data_comissao_paga',
        'observacoes',
    ];

    protected $casts = [
        'valor_os' => 'decimal:2',
        'percentual_comissao' => 'decimal:2',
        'valor_comissao' => 'decimal:2',
        'data_os_finalizada' => 'date',
        'data_os_paga' => 'date',
        'data_comissao_paga' => 'date',
    ];

    /**
     * Relacionamento com a ordem de serviço
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com o usuário (vendedor)
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Relacionamento legado com funcionário (compatibilidade)
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Scope para comissões pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status_pagamento', 'Pendente');
    }

    /**
     * Scope para comissões pagas
     */
    public function scopePagas($query)
    {
        return $query->where('status_pagamento', 'Pago');
    }

    /**
     * Verificar se a comissão pode ser paga
     */
    public function podeSerPaga()
    {
        // Comissão pode ser paga se estiver pendente
        return $this->status_pagamento === 'Pendente';
    }

    /**
     * Marcar comissão como paga
     */
    public function marcarComoPaga()
    {
        $this->update([
            'status_pagamento' => 'Pago',
            'data_comissao_paga' => now()->toDateString(),
        ]);
    }
}
