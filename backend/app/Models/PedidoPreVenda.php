<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class PedidoPreVenda extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'pedidos_pre_venda';

    /**
     * Status disponíveis para um pedido
     */
    const STATUS_PENDENTE = 'pendente';
    const STATUS_APROVADO = 'aprovado';
    const STATUS_REJEITADO = 'rejeitado';
    const STATUS_CANCELADO = 'cancelado';
    const STATUS_FINALIZADO = 'finalizado';

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'codigo',
        'cliente_nome',
        'cliente_email',
        'cliente_telefone',
        'cliente_endereco',
        'total',
        'status',
        'origem',
        'observacoes',
        'dados_cliente',
        'dados_itens',
        'metadados',
        'data_pedido',
        'data_aprovacao',
        'data_finalizacao',
        'usuario_aprovacao_id',
        'usuario_aprovacao_nome',
        'venda_gerada_id',
        'venda_gerada_codigo'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'total' => 'decimal:2',
        'dados_cliente' => 'array',
        'dados_itens' => 'array',
        'metadados' => 'array',
        'data_pedido' => 'datetime',
        'data_aprovacao' => 'datetime',
        'data_finalizacao' => 'datetime',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'data_pedido',
        'data_aprovacao',
        'data_finalizacao',
        'deleted_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($pedido) {
            if (empty($pedido->codigo)) {
                $pedido->codigo = static::gerarCodigoUnico();
            }
            
            if (empty($pedido->data_pedido)) {
                $pedido->data_pedido = now();
            }
            
            if (empty($pedido->status)) {
                $pedido->status = self::STATUS_PENDENTE;
            }
        });
    }

    /**
     * Gera um código único para o pedido
     */
    public static function gerarCodigoUnico(): string
    {
        $prefix = 'PED' . date('Ymd');
        $ultimoPedido = static::where('codigo', 'like', "$prefix%")->orderBy('id', 'desc')->first();
        
        if ($ultimoPedido) {
            $numero = (int) substr($ultimoPedido->codigo, -4) + 1;
        } else {
            $numero = 1;
        }
        
        return $prefix . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Verifica se o pedido pode ser aprovado
     */
    public function podeSerAprovado(): bool
    {
        return $this->status === self::STATUS_PENDENTE;
    }

    /**
     * Verifica se o pedido pode ser rejeitado
     */
    public function podeSerRejeitado(): bool
    {
        return in_array($this->status, [self::STATUS_PENDENTE, self::STATUS_APROVADO]);
    }

    /**
     * Verifica se o pedido pode ser cancelado
     */
    public function podeSerCancelado(): bool
    {
        return in_array($this->status, [self::STATUS_PENDENTE, self::STATUS_APROVADO]);
    }

    /**
     * Aprova o pedido
     */
    public function aprovar(int $usuarioId, string $usuarioNome): bool
    {
        if (!$this->podeSerAprovado()) {
            return false;
        }
        
        $this->status = self::STATUS_APROVADO;
        $this->data_aprovacao = now();
        $this->usuario_aprovacao_id = $usuarioId;
        $this->usuario_aprovacao_nome = $usuarioNome;
        
        return $this->save();
    }

    /**
     * Rejeita o pedido
     */
    public function rejeitar(int $usuarioId, string $usuarioNome, string $motivo = null): bool
    {
        if (!$this->podeSerRejeitado()) {
            return false;
        }
        
        $this->status = self::STATUS_REJEITADO;
        $this->usuario_aprovacao_id = $usuarioId;
        $this->usuario_aprovacao_nome = $usuarioNome;
        
        if ($motivo) {
            $metadados = $this->metadados ?? [];
            $metadados['motivo_rejeicao'] = $motivo;
            $this->metadados = $metadados;
        }
        
        return $this->save();
    }

    /**
     * Cancela o pedido
     */
    public function cancelar(string $motivo = null): bool
    {
        if (!$this->podeSerCancelado()) {
            return false;
        }
        
        $this->status = self::STATUS_CANCELADO;
        
        if ($motivo) {
            $metadados = $this->metadados ?? [];
            $metadados['motivo_cancelamento'] = $motivo;
            $this->metadados = $metadados;
        }
        
        return $this->save();
    }

    /**
     * Finaliza o pedido (quando convertido em venda)
     */
    public function finalizar(int $vendaId, string $vendaCodigo): bool
    {
        if ($this->status !== self::STATUS_APROVADO) {
            return false;
        }
        
        $this->status = self::STATUS_FINALIZADO;
        $this->data_finalizacao = now();
        $this->venda_gerada_id = $vendaId;
        $this->venda_gerada_codigo = $vendaCodigo;
        
        return $this->save();
    }

    /**
     * Obtém o tenant ao qual este pedido pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Obtém o usuário que aprovou o pedido.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuarioAprovacao()
    {
        return $this->belongsTo(User::class, 'usuario_aprovacao_id');
    }

    /**
     * Obtém a venda gerada a partir deste pedido.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function vendaGerada()
    {
        return $this->belongsTo(Venda::class, 'venda_gerada_id');
    }

    /**
     * Scope a query to only include pedidos pendentes.
     */
    public function scopePendentes($query)
    {
        return $query->where('status', self::STATUS_PENDENTE);
    }

    /**
     * Scope a query to only include pedidos aprovados.
     */
    public function scopeAprovados($query)
    {
        return $query->where('status', self::STATUS_APROVADO);
    }

    /**
     * Scope a query to only include pedidos rejeitados.
     */
    public function scopeRejeitados($query)
    {
        return $query->where('status', self::STATUS_REJEITADO);
    }

    /**
     * Scope a query to only include pedidos cancelados.
     */
    public function scopeCancelados($query)
    {
        return $query->where('status', self::STATUS_CANCELADO);
    }

    /**
     * Scope a query to only include pedidos finalizados.
     */
    public function scopeFinalizados($query)
    {
        return $query->where('status', self::STATUS_FINALIZADO);
    }

    /**
     * Scope a query to filter by origem.
     */
    public function scopePorOrigem($query, $origem)
    {
        return $query->where('origem', $origem);
    }
} 