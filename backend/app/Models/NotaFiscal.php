<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class NotaFiscal extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'notas_fiscais';

    protected $fillable = [
        'tenant_id',
        'ordem_servico_id',
        'tipo',
        'referencia',
        'numero',
        'serie',
        'status',
        'chave_nfe',
        'protocolo',
        'caminho_xml_nota_fiscal',
        'caminho_danfe',
        'url_nota_fiscal',
        'valor_total',
        'dados_envio',
        'dados_retorno',
        'mensagem_erro',
        'data_emissao',
        'data_cancelamento',
        'justificativa_cancelamento',
        'usuario_cadastro_id',
        'usuario_alteracao_id',
    ];

    protected $casts = [
        'dados_envio' => 'array',
        'dados_retorno' => 'array',
        'data_emissao' => 'datetime',
        'data_cancelamento' => 'datetime',
        'valor_total' => 'decimal:2',
    ];

    /**
     * Relacionamento com a Ordem de Serviço
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }

    /**
     * Usuário que criou a nota
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id');
    }

    /**
     * Usuário que alterou a nota
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id');
    }

    /**
     * Verifica se a nota está autorizada
     */
    public function isAutorizada(): bool
    {
        return $this->status === 'autorizada';
    }

    /**
     * Verifica se a nota está em processamento
     */
    public function isProcessando(): bool
    {
        return $this->status === 'processando_autorizacao';
    }

    /**
     * Verifica se a nota pode ser cancelada
     */
    public function podeCancelar(): bool
    {
        return $this->status === 'autorizada';
    }

    /**
     * Boot do model
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($nota) {
            if (auth()->check() && empty($nota->usuario_cadastro_id)) {
                $nota->usuario_cadastro_id = auth()->id();
            }
        });

        static::updating(function ($nota) {
            if (auth()->check()) {
                $nota->usuario_alteracao_id = auth()->id();
            }
        });
    }
}
