<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class OrdemServico extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'ordens_servico';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'id_os',
        'numero_os',
        'cliente_id',
        'funcionario_id',
        'cliente_info',
        'status_os',
        'valor_total_os',
        'desconto_terceirizado_percentual',
        'desconto_geral_tipo',
        'desconto_geral_valor',
        'frete_valor',
        'data_criacao',
        'data_finalizacao_os',
        'data_validade',
        'data_prevista_entrega',
        'observacoes',
        'observacoes_gerais_os',
        'observacoes_cliente_para_nota',
        'maquina_impressao_id',
        'vendedor_id',
        'vendedor_nome',
        'pagamentos',
        'dados_producao',
        'tipo_origem',
        'dados_consumo_material',
        'tenant_id',
        'tem_arte_pronta',
        'destino_os',
        'prazo_tipo',
        'prazo_datahora',
        'responsavel_criacao'
    ];
    
    protected $casts = [
        'cliente_info' => 'array',
        'pagamentos' => 'array',
        'dados_producao' => 'array',
        'dados_consumo_material' => 'array',
        'data_criacao' => 'datetime',
        'data_finalizacao_os' => 'datetime',
        'data_validade' => 'datetime',
        'data_prevista_entrega' => 'datetime',
        'prazo_datahora' => 'datetime',
        'tem_arte_pronta' => 'boolean',
        'valor_total_os' => 'decimal:2',
        'desconto_terceirizado_percentual' => 'decimal:2',
        'desconto_geral_valor' => 'decimal:2',
        'frete_valor' => 'decimal:2',
    ];
    
    /**
     * Relacionamento com cliente
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
    
    /**
     * Relacionamento com itens da OS
     */
    public function itens()
    {
        return $this->hasMany(OrdemServicoItem::class, 'ordem_servico_id');
    }
    
    /**
     * Relacionamento com anexos da OS
     */
    public function anexos()
    {
        return $this->hasMany(OrdemServicoAnexo::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com comissões da OS
     */
    public function comissoes()
    {
        return $this->hasMany(ComissaoOS::class, 'ordem_servico_id');
    }

    /**
     * Relacionamento com o vendedor (usuário)
     */
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'vendedor_id');
    }

    /**
     * Relacionamento com o funcionário (usuário)
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Relacionamento com o responsável pela criação
     */
    public function responsavelCriacao()
    {
        return $this->belongsTo(User::class, 'responsavel_criacao');
    }

    /**
     * Relacionamento com notas fiscais
     */
    public function notasFiscais()
    {
        return $this->hasMany(NotaFiscal::class, 'ordem_servico_id');
    }
}
