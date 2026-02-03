<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class ContaBancaria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'contas_bancarias';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo',
        'codigo_banco',
        'nome_banco',
        'agencia',
        'conta',
        'digito_conta',
        'operacao',
        'saldo_atual',
        'saldo_inicial',
        'data_saldo_inicial',
        'titular_nome',
        'titular_documento',
        'telefone_contato',
        'email_contato',
        'ativo',
        'incluir_fluxo_caixa',
        'conta_padrao',
        'cor',
        'icone',
        'tipo_conta_banco_central',
        'codigo_empresa',
        'codigo_empresa_dv',
        'codigo_empresa_cedente',
        'codigo_empresa_cedente_dv',
        'codigo_cedente',
        'codigo_cedente_dv',
        'carteira',
        'variacao',
        'convenio',
        'especie_documento',
        'especie',
        'local_pagamento',
        'instrucao1',
        'instrucao2',
        'instrucao3',
        'instrucao4',
        'instrucao5',
        'observacoes',
        'metadados',
        'tenant_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'saldo_atual' => 'decimal:2',
        'saldo_inicial' => 'decimal:2',
        'data_saldo_inicial' => 'date',
        'ativo' => 'boolean',
        'incluir_fluxo_caixa' => 'boolean',
        'conta_padrao' => 'boolean',
        'metadados' => 'array',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($conta) {
            if (auth()->check() && empty($conta->usuario_cadastro_id)) {
                $conta->usuario_cadastro_id = auth()->id();
            }
            
            // Se for a primeira conta, definir como padrão
            if (static::where('tenant_id', $conta->tenant_id)->count() === 0) {
                $conta->conta_padrao = true;
            }
            
            // Se for definida como padrão, remover padrão das outras
            if ($conta->conta_padrao) {
                static::where('tenant_id', $conta->tenant_id)
                    ->where('id', '!=', $conta->id ?? 0)
                    ->update(['conta_padrao' => false]);
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($conta) {
            if (auth()->check()) {
                $conta->usuario_alteracao_id = auth()->id();
            }
            
            // Se for definida como padrão, remover padrão das outras
            if ($conta->isDirty('conta_padrao') && $conta->conta_padrao) {
                static::where('tenant_id', $conta->tenant_id)
                    ->where('id', '!=', $conta->id)
                    ->update(['conta_padrao' => false]);
            }
        });
    }

    /**
     * Get the tenant that owns the conta bancária.
     */
    /**
     * Obtém o tenant ao qual esta conta bancária pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the conta bancária.
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id');
    }

    /**
     * Get the user who last updated the conta bancária.
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id');
    }

    /**
     * Get the lancamentos for the conta bancária.
     */
    public function lancamentos()
    {
        return $this->hasMany(LancamentoCaixa::class, 'conta_id');
    }

    /**
     * Get the lancamentos de destino (transferências) for the conta bancária.
     */
    public function lancamentosDestino()
    {
        return $this->hasMany(LancamentoCaixa::class, 'conta_destino_id');
    }

    /**
     * Get the conta bancária's saldo formatado.
     *
     * @return string
     */
    public function getSaldoAtualFormatadoAttribute()
    {
        return number_format($this->saldo_atual, 2, ',', '.');
    }

    /**
     * Get the conta bancária's saldo inicial formatado.
     *
     * @return string
     */
    public function getSaldoInicialFormatadoAttribute()
    {
        return number_format($this->saldo_inicial, 2, ',', '.');
    }

    /**
     * Get the conta bancária's tipo formatado.
     *
     * @return string
     */
    public function getTipoFormatadoAttribute()
    {
        $tipos = [
            'conta_corrente' => 'Conta Corrente',
            'poupanca' => 'Poupança',
            'caixa' => 'Caixa',
            'carteira' => 'Carteira',
            'investimento' => 'Investimento',
        ];

        return $tipos[$this->tipo] ?? Str::title(str_replace('_', ' ', $this->tipo));
    }

    /**
     * Scope a query to only include contas ativas.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope a query to only include contas que devem aparecer no fluxo de caixa.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeNoFluxoCaixa($query)
    {
        return $query->where('incluir_fluxo_caixa', true);
    }

    /**
     * Atualiza o saldo da conta com base nos lançamentos.
     *
     * @return void
     */
    public function atualizarSaldo()
    {
        $entradas = $this->lancamentos()
            ->where('status', 'conciliado')
            ->whereIn('tipo', ['entrada', 'transferencia'])
            ->sum('valor');

        $saidas = $this->lancamentos()
            ->where('status', 'conciliado')
            ->whereIn('tipo', ['saida', 'transferencia'])
            ->sum('valor');

        $this->saldo_atual = $this->saldo_inicial + $entradas - $saidas;
        $this->save();
    }

    /**
     * Get the conta bancária's status badge.
     *
     * @return string
     */
    public function getStatusBadgeAttribute()
    {
        return $this->ativo 
            ? '<span class="px-2 py-1 text-xs font-semibold leading-tight text-green-700 bg-green-100 rounded-full">Ativa</span>'
            : '<span class="px-2 py-1 text-xs font-semibold leading-tight text-red-700 bg-red-100 rounded-full">Inativa</span>';
    }

    /**
     * Get the conta bancária's conta formatada com agência.
     *
     * @return string
     */
    public function getContaFormatadaAttribute()
    {
        $conta = $this->agencia ? "Ag. {$this->agencia} " : '';
        $conta .= $this->conta ? "CC {$this->conta}" : '';
        $conta .= $this->digito_conta ? "-{$this->digito_conta}" : '';
        $conta .= $this->operacao ? " (Op. {$this->operacao})" : '';
        
        return trim($conta);
    }

    /**
     * Get the conta bancária's dados bancários formatados.
     *
     * @return string
     */
    public function getDadosBancariosFormatadosAttribute()
    {
        $dados = [];
        
        if ($this->nome_banco) {
            $dados[] = $this->nome_banco . ($this->codigo_banco ? " ({$this->codigo_banco})" : '');
        }
        
        if ($this->agencia) {
            $dados[] = "Ag: {$this->agencia}";
        }
        
        if ($this->conta) {
            $conta = "CC: {$this->conta}";
            if ($this->digito_conta) {
                $conta .= "-{$this->digito_conta}";
            }
            if ($this->operacao) {
                $conta .= " (Op. {$this->operacao})";
            }
            $dados[] = $conta;
        }
        
        if ($this->titular_nome) {
            $titular = $this->titular_nome;
            if ($this->titular_documento) {
                $titular .= " - " . $this->titular_documento;
            }
            $dados[] = $titular;
        }
        
        return implode("\n", $dados);
    }

    /**
     * Verifica se a conta pode ser excluída.
     *
     * @return array
     */
    public function podeExcluir()
    {
        $erros = [];
        
        // Verificar se existem lançamentos associados
        if ($this->lancamentos()->exists()) {
            $erros[] = 'Não é possível excluir uma conta que possui lançamentos associados.';
        }
        
        if ($this->lancamentosDestino()->exists()) {
            $erros[] = 'Não é possível excluir uma conta que possui transferências de destino associadas.';
        }
        
        return [
            'pode' => empty($erros),
            'erros' => $erros,
        ];
    }

    /**
     * Define a conta como padrão.
     *
     * @return bool
     */
    public function definirComoPadrao()
    {
        if ($this->ativo) {
            static::where('tenant_id', $this->tenant_id)
                ->where('id', '!=', $this->id)
                ->update(['conta_padrao' => false]);
            
            $this->conta_padrao = true;
            return $this->save();
        }
        
        return false;
    }
}
