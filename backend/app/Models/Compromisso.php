<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Compromisso extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'user_id',
        'title',
        'start',
        'end',
        'all_day',
        'cliente_id',
        'funcionario_id',
        'observacoes',
        'status',
        'cor',
        'local',
        'descricao',
        'metadados'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'start' => 'datetime',
        'end' => 'datetime',
        'all_day' => 'boolean',
        'metadados' => 'array',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'start',
        'end',
        'deleted_at',
    ];

    /**
     * Obtém o usuário que criou o compromisso.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém o cliente associado ao compromisso.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }

    /**
     * Obtém o funcionário responsável pelo compromisso.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Scope para compromissos de hoje.
     */
    public function scopeHoje($query)
    {
        return $query->whereDate('start', today());
    }

    /**
     * Scope para compromissos futuros.
     */
    public function scopeFuturos($query)
    {
        return $query->where('start', '>', now());
    }

    /**
     * Scope para compromissos passados.
     */
    public function scopePassados($query)
    {
        return $query->where('end', '<', now());
    }

    /**
     * Scope para compromissos em um período específico.
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim)
    {
        return $query->whereBetween('start', [$dataInicio, $dataFim]);
    }

    /**
     * Scope para compromissos de um funcionário específico.
     */
    public function scopeDoFuncionario($query, $funcionarioId)
    {
        return $query->where('funcionario_id', $funcionarioId);
    }

    /**
     * Scope para compromissos de um cliente específico.
     */
    public function scopeDoCliente($query, $clienteId)
    {
        return $query->where('cliente_id', $clienteId);
    }

    /**
     * Verifica se o compromisso está acontecendo agora.
     */
    public function getEstaAcontecendoAttribute()
    {
        $agora = now();
        return $this->start <= $agora && $this->end >= $agora;
    }

    /**
     * Verifica se o compromisso já passou.
     */
    public function getJaPassouAttribute()
    {
        return $this->end < now();
    }

    /**
     * Verifica se o compromisso ainda não começou.
     */
    public function getNaoComecouAttribute()
    {
        return $this->start > now();
    }

    /**
     * Obtém a duração do compromisso em minutos.
     */
    public function getDuracaoMinutosAttribute()
    {
        return $this->start->diffInMinutes($this->end);
    }

    /**
     * Obtém a duração formatada do compromisso.
     */
    public function getDuracaoFormatadaAttribute()
    {
        $minutos = $this->duracao_minutos;
        
        if ($minutos < 60) {
            return "{$minutos} min";
        }
        
        $horas = floor($minutos / 60);
        $minutosRestantes = $minutos % 60;
        
        if ($minutosRestantes === 0) {
            return "{$horas}h";
        }
        
        return "{$horas}h {$minutosRestantes}min";
    }
} 