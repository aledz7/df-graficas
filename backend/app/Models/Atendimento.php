<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Atendimento extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'cliente_id',
        'user_id',
        'canal',
        'observacao',
        'metadados'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'metadados' => 'array',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'deleted_at',
    ];

    /**
     * Obtém o cliente deste atendimento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    /**
     * Obtém o usuário que registrou este atendimento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obtém o tenant ao qual este atendimento pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Escopo para atendimentos por canal.
     */
    public function scopePorCanal($query, $canal)
    {
        return $query->where('canal', $canal);
    }

    /**
     * Escopo para atendimentos por usuário.
     */
    public function scopePorUsuario($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Escopo para atendimentos recentes (últimos 30 dias).
     */
    public function scopeRecentes($query)
    {
        return $query->where('created_at', '>=', now()->subDays(30));
    }

    /**
     * Accessor para obter o nome do responsável.
     */
    public function getResponsavelAttribute()
    {
        return $this->user ? $this->user->name : 'Usuário não encontrado';
    }

    /**
     * Accessor para obter a data/hora formatada.
     */
    public function getDataHoraAttribute()
    {
        return $this->created_at;
    }
} 