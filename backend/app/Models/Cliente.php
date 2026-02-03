<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class Cliente extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'codigo_cliente',
        'nome_completo',
        'apelido_fantasia',
        'nome',
        'tipo_pessoa',
        'cpf_cnpj',
        'rg_ie',
        'data_nascimento_abertura',
        'sexo',
        'email',
        'telefone_principal',
        'whatsapp',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'observacoes',
        'autorizado_prazo',
        'status',
        'foto_url',
        'classificacao_cliente',
        'desconto_fixo_os_terceirizado',
        'is_terceirizado',
        'total_pontos_ganhos',
        'pontos_utilizados',
        'pontos_expirados',
        'saldo_pontos_atual',
        'metadados'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'data_nascimento_abertura' => 'date',
        'autorizado_prazo' => 'boolean',
        'status' => 'boolean',
        'is_terceirizado' => 'boolean',
        'desconto_fixo_os_terceirizado' => 'decimal:2',
        'total_pontos_ganhos' => 'integer',
        'pontos_utilizados' => 'integer',
        'pontos_expirados' => 'integer',
        'saldo_pontos_atual' => 'integer',
        'metadados' => 'array',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'data_nascimento_abertura',
        'deleted_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($cliente) {
            if (empty($cliente->codigo_cliente)) {
                // Usar timestamp mais curto para caber em 20 caracteres
                $timestamp = now()->format('ymdHis'); // 12 caracteres
                $random = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT); // 3 caracteres
                $cliente->codigo_cliente = 'CLI' . $timestamp . $random; // CLI + 12 + 3 = 18 caracteres
            }
        });
    }

    /**
     * Obtém o endereço completo formatado.
     */
    public function getEnderecoCompletoAttribute()
    {
        $endereco = [];
        if ($this->logradouro) {
            $endereco[] = $this->logradouro;
            if ($this->numero) {
                $endereco[] = $this->numero;
            }
            if ($this->complemento) {
                $endereco[] = $this->complemento;
            }
            if ($this->bairro) {
                $endereco[] = $this->bairro;
            }
            if ($this->cidade) {
                $endereco[] = $this->cidade;
            }
            if ($this->estado) {
                $endereco[] = $this->estado;
            }
            if ($this->cep) {
                $endereco[] = 'CEP: ' . $this->cep;
            }
        }
        return implode(', ', $endereco);
    }

    /**
     * Obtém o nome para exibição (apelido/fantasia ou nome completo).
     */
    public function getNomeExibicaoAttribute()
    {
        return $this->apelido_fantasia ?: $this->nome_completo;
    }

    /**
     * Accessor para o campo nome (compatibilidade).
     */
    public function getNomeAttribute()
    {
        return $this->nome_completo;
    }

    /**
     * Mutator para o campo nome (sincronizar com nome_completo).
     */
    public function setNomeAttribute($value)
    {
        $this->attributes['nome'] = $value;
        $this->attributes['nome_completo'] = $value;
    }

    /**
     * Escopo para clientes ativos.
     */
    public function scopeAtivos($query)
    {
        return $query->where('status', true);
    }

    /**
     * Escopo para clientes inativos.
     */
    public function scopeInativos($query)
    {
        return $query->where('status', false);
    }

    /**
     * Escopo para clientes autorizados a comprar a prazo.
     */
    public function scopeAutorizadosPrazo($query)
    {
        return $query->where('autorizado_prazo', true);
    }

    /**
     * Obtém os orçamentos do cliente.
     */
    public function orcamentos()
    {
        return $this->hasMany(Orcamento::class);
    }

    /**
     * Obtém as vendas do cliente.
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class);
    }

    /**
     * Obtém os atendimentos do cliente.
     */
    public function atendimentos()
    {
        return $this->hasMany(Atendimento::class);
    }

    /**
     * Obtém o tenant ao qual este cliente pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
