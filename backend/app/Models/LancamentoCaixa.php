<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\Traits\Tenantable;

class LancamentoCaixa extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'lancamentos_caixa';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'codigo',
        'tipo',
        'descricao',
        'valor',
        'data_operacao',
        'data_conciliacao',
        'status',
        'categoria_id',
        'categoria_nome',
        'conta_id',
        'conta_nome',
        'conta_destino_id',
        'conta_destino_nome',
        'operacao_tipo',
        'operacao_id',
        'usuario_id',
        'usuario_nome',
        'observacoes',
        'anexos',
        'metadados',
        'comprovante_numero',
        'comprovante_tipo',
        'forma_pagamento',
        'codigo_barras',
        'numero_documento',
        'historico_banco',
        'tenant_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'valor' => 'decimal:2',
        'data_operacao' => 'datetime',
        'data_conciliacao' => 'date',
        'anexos' => 'array',
        'metadados' => 'array',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array
     */
    protected $appends = [
        'valor_formatado',
        'data_formatada',
        'tipo_formatado',
        'status_formatado',
        'cor_status',
        'eh_transferencia',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Gerar código único
        static::creating(function ($lancamento) {
            if (empty($lancamento->codigo)) {
                $lancamento->codigo = static::gerarCodigo($lancamento->tipo);
            }
            
            // Associar ao usuário autenticado
            if (auth()->check() && empty($lancamento->usuario_id)) {
                $lancamento->usuario_id = auth()->id();
                $lancamento->usuario_nome = auth()->user()->name;
            }
            
            // Preencher nome da categoria se não informado
            if ($lancamento->categoria_id && empty($lancamento->categoria_nome)) {
                $categoria = CategoriaCaixa::where('id', $lancamento->categoria_id)
                    ->where('tenant_id', $lancamento->tenant_id)
                    ->first();
                    
                if ($categoria) {
                    $lancamento->categoria_nome = $categoria->nome;
                }
            }
            
            // Preencher nome da conta se não informado
            if ($lancamento->conta_id && empty($lancamento->conta_nome)) {
                $conta = ContaBancaria::where('id', $lancamento->conta_id)
                    ->where('tenant_id', $lancamento->tenant_id)
                    ->first();
                    
                if ($conta) {
                    $lancamento->conta_nome = $conta->nome;
                }
            }
            
            // Para transferências, preencher nome da conta de destino se não informado
            if ($lancamento->tipo === 'transferencia' && $lancamento->conta_destino_id && empty($lancamento->conta_destino_nome)) {
                $contaDestino = ContaBancaria::where('id', $lancamento->conta_destino_id)
                    ->where('tenant_id', $lancamento->tenant_id)
                    ->first();
                    
                if ($contaDestino) {
                    $lancamento->conta_destino_nome = $contaDestino->nome;
                }
            }
            
            // Definir data de operação padrão
            if (empty($lancamento->data_operacao)) {
                $lancamento->data_operacao = now();
            }
            
            // Definir status padrão
            if (empty($lancamento->status)) {
                $lancamento->status = 'pendente';
            }
        });

        // Atualizar saldos das contas ao criar/atualizar/excluir lançamentos
        static::saved(function ($lancamento) {
            $lancamento->atualizarSaldosContas();
        });
        
        static::deleted(function ($lancamento) {
            $lancamento->atualizarSaldosContas();
        });
    }

    /**
     * Gera um código único para o lançamento.
     *
     * @param  string  $tipo
     * @return string
     */
    public static function gerarCodigo($tipo)
    {
        $prefixo = strtoupper(substr($tipo, 0, 1));
        $ano = date('Y');
        $mes = date('m');
        
        // Obter o tenant_id do usuário autenticado
        $tenantId = auth()->check() ? auth()->user()->tenant_id : 1;
        
        // Tentar até 10 vezes para evitar conflitos de concorrência
        for ($tentativa = 0; $tentativa < 10; $tentativa++) {
            try {
                // Usar transação para evitar condições de corrida
                return \DB::transaction(function () use ($prefixo, $ano, $mes, $tenantId, $tipo) {
                    
                    // Buscar o último código do mês atual - usar created_at para garantir ordem cronológica
                    $ultimoCodigo = static::where('tipo', $tipo)
                        ->where('tenant_id', $tenantId)
                        ->whereYear('created_at', $ano)
                        ->whereMonth('created_at', $mes)
                        ->orderBy('id', 'desc') // Usar ID em vez de código para garantir ordem
                        ->lockForUpdate() // Bloquear para evitar concorrência
                        ->value('codigo');
                    
                    $sequencia = 1;
                    if ($ultimoCodigo) {
                        // Extrair o número sequencial do último código
                        $numeroAtual = (int) substr($ultimoCodigo, -5);
                        $sequencia = $numeroAtual + 1;
                    }
                    
                    // Adicionar microtime para garantir unicidade em chamadas simultâneas
                    $microtime = (int) (microtime(true) * 1000000); // Usar microssegundos
                    $sequencia = ($sequencia * 1000) + ($microtime % 1000); // Combinar sequência com microtime
                    
                    // Garantir que não ultrapasse 5 dígitos
                    if ($sequencia > 99999) {
                        $sequencia = $sequencia % 100000;
                        if ($sequencia == 0) $sequencia = 1;
                    }
                    
                    $novoCodigo = sprintf('%s%s%s%05d', $prefixo, $ano, $mes, $sequencia);
                    
                    // Verificar se o código já existe (double-check)
                    $codigoExiste = static::where('tenant_id', $tenantId)
                        ->where('codigo', $novoCodigo)
                        ->exists();
                    
                    if ($codigoExiste) {
                        // Se existe, incrementar a sequência até encontrar um disponível
                        do {
                            $sequencia++;
                            $novoCodigo = sprintf('%s%s%s%05d', $prefixo, $ano, $mes, $sequencia);
                            $codigoExiste = static::where('tenant_id', $tenantId)
                                ->where('codigo', $novoCodigo)
                                ->exists();
                        } while ($codigoExiste && $sequencia < 99999);
                        
                        if ($sequencia >= 99999) {
                            throw new \Exception('Limite de códigos do mês atingido');
                        }
                    }
                    
                    return $novoCodigo;
                });
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                // Se ainda assim houver conflito, tentar novamente com delay
                if ($tentativa < 9) {
                    usleep(rand(10000, 50000)); // Delay aleatório entre 10-50ms
                    continue;
                }
                throw $e;
            }
        }
        
        // Se chegou aqui, algo deu muito errado
        throw new \Exception('Não foi possível gerar código único após 10 tentativas');
    }

    /**
     * Get the tenant that owns the lançamento.
     */
    /**
     * Obtém o tenant ao qual este lançamento de caixa pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Obtém a conta bancária associada a este lançamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function conta()
    {
        return $this->belongsTo(ContaBancaria::class, 'conta_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém a conta de destino para transferências.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function contaDestino()
    {
        return $this->belongsTo(ContaBancaria::class, 'conta_destino_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém a categoria associada a este lançamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function categoria()
    {
        return $this->belongsTo(CategoriaCaixa::class, 'categoria_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém o usuário que criou o lançamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Obtém a operação relacionada ao lançamento.
     *
     * @return \Illuminate\Database\Eloquent\Relations\MorphTo|null
     */
    public function operacao()
    {
        if ($this->operacao_tipo && $this->operacao_id) {
            $modelClass = '\\App\\Models\\' . Str::studly($this->operacao_tipo);
            
            if (class_exists($modelClass)) {
                // Verifica se o modelo usa o trait Tenantable
                $usesTrait = in_array(
                    'App\\Models\\Traits\\Tenantable', 
                    class_uses_recursive($modelClass) ?: []
                );
                
                $relation = $this->morphTo('operacao', 'operacao_tipo', 'operacao_id');
                
                // Aplica o escopo de tenant se o modelo usar o trait Tenantable
                if ($usesTrait) {
                    $relation->where('tenant_id', $this->tenant_id);
                }
                
                return $relation;
            }
        }
        
        return $this->morphTo('operacao', 'operacao_tipo', 'operacao_id');
    }

    /**
     * Get the valor formatado.
     *
     * @return string
     */
    public function getValorFormatadoAttribute()
    {
        return 'R$ ' . number_format($this->valor, 2, ',', '.');
    }

    /**
     * Get the data formatada.
     *
     * @return string
     */
    public function getDataFormatadaAttribute()
    {
        return $this->data_operacao->format('d/m/Y');
    }

    /**
     * Get the tipo formatado.
     *
     * @return string
     */
    public function getTipoFormatadoAttribute()
    {
        $tipos = [
            'entrada' => 'Entrada',
            'saida' => 'Saída',
            'transferencia' => 'Transferência',
            'abertura' => 'Abertura de Caixa',
            'fechamento' => 'Fechamento de Caixa',
        ];

        return $tipos[$this->tipo] ?? Str::title($this->tipo);
    }

    /**
     * Get the status formatado.
     *
     * @return string
     */
    public function getStatusFormatadoAttribute()
    {
        $status = [
            'pendente' => 'Pendente',
            'conciliado' => 'Conciliado',
            'cancelado' => 'Cancelado',
        ];

        return $status[$this->status] ?? Str::title($this->status);
    }

    /**
     * Get the cor do status.
     *
     * @return string
     */
    public function getCorStatusAttribute()
    {
        $cores = [
            'pendente' => 'yellow',
            'conciliado' => 'green',
            'cancelado' => 'red',
        ];

        return $cores[$this->status] ?? 'gray';
    }

    /**
     * Verifica se o lançamento é uma transferência.
     *
     * @return bool
     */
    public function getEhTransferenciaAttribute()
    {
        return $this->tipo === 'transferencia';
    }

    /**
     * Atualiza os saldos das contas afetadas pelo lançamento.
     *
     * @return void
     */
    public function atualizarSaldosContas()
    {
        if ($this->conta) {
            $this->conta->atualizarSaldo();
        }
        
        if ($this->contaDestino) {
            $this->contaDestino->atualizarSaldo();
        }
    }

    /**
     * Concilia o lançamento.
     *
     * @param  string  $dataConciliacao
     * @return bool
     */
    public function conciliar($dataConciliacao = null)
    {
        if ($this->status === 'conciliado') {
            return true;
        }
        
        $this->status = 'conciliado';
        $this->data_conciliacao = $dataConciliacao ?? now();
        
        return $this->save();
    }

    /**
     * Desconciliar o lançamento.
     *
     * @return bool
     */
    public function desconciliar()
    {
        if ($this->status !== 'conciliado') {
            return true;
        }
        
        $this->status = 'pendente';
        $this->data_conciliacao = null;
        
        return $this->save();
    }

    /**
     * Cancela o lançamento.
     *
     * @param  string  $motivo
     * @return bool
     */
    public function cancelar($motivo = null)
    {
        if ($this->status === 'cancelado') {
            return true;
        }
        
        $this->status = 'cancelado';
        
        if ($motivo) {
            $metadados = $this->metadados ?? [];
            $metadados['motivo_cancelamento'] = $motivo;
            $this->metadados = $metadados;
        }
        
        return $this->save();
    }

    /**
     * Scope a query to only include lançamentos de um determinado tipo.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string|array  $tipos
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDoTipo($query, $tipos)
    {
        if (!is_array($tipos)) {
            $tipos = [$tipos];
        }
        
        return $query->whereIn('tipo', $tipos);
    }

    /**
     * Scope a query to only include lançamentos conciliados.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeConciliados($query)
    {
        return $query->where('status', 'conciliado');
    }

    /**
     * Scope a query to only include lançamentos pendentes.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Scope a query to only include lançamentos em um período.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string|\Carbon\Carbon  $dataInicio
     * @param  string|\Carbon\Carbon|null  $dataFim
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNoPeriodo($query, $dataInicio, $dataFim = null)
    {
        $dataInicio = $dataInicio instanceof Carbon ? $dataInicio : Carbon::parse($dataInicio)->startOfDay();
        $dataFim = $dataFim ? ($dataFim instanceof Carbon ? $dataFim : Carbon::parse($dataFim)->endOfDay()) : now();
        
        return $query->whereBetween('data_operacao', [$dataInicio, $dataFim]);
    }

    /**
     * Scope a query to only include lançamentos de uma conta específica.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $contaId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDaConta($query, $contaId)
    {
        return $query->where(function ($q) use ($contaId) {
            $q->where('conta_id', $contaId)
              ->orWhere('conta_destino_id', $contaId);
        });
    }

    /**
     * Scope a query to only include lançamentos de uma categoria específica.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  int  $categoriaId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDaCategoria($query, $categoriaId)
    {
        return $query->where('categoria_id', $categoriaId);
    }

    /**
     * Scope a query to order by data_operacao (mais recente primeiro).
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeMaisRecentes($query)
    {
        return $query->orderBy('data_operacao', 'desc')->orderBy('id', 'desc');
    }

    /**
     * Verifica se o lançamento pode ser editado.
     *
     * @return bool
     */
    public function podeEditar()
    {
        return $this->status !== 'cancelado';
    }

    /**
     * Verifica se o lançamento pode ser excluído.
     *
     * @return bool
     */
    public function podeExcluir()
    {
        return $this->status !== 'cancelado';
    }
}
