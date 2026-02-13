<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class OrdemServicoItem extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'ordens_servico_itens';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'ordem_servico_id',
        'produto_id',
        'nome_servico_produto',
        'tipo_item',
        'quantidade',
        'valor_unitario',
        'valor_total',
        'largura',
        'altura',
        'acabamentos',
        'detalhes',
        'tenant_id',
        'id_item_os',
        'consumo_material_utilizado',
        'consumo_largura_peca',
        'consumo_altura_peca',
        'consumo_quantidade_solicitada',
        'consumo_largura_chapa',
        'consumo_altura_chapa',
        'consumo_valor_unitario_chapa',
        'consumo_pecas_por_chapa',
        'consumo_chapas_necessarias',
        'consumo_custo_total',
        'consumo_custo_unitario',
        'consumo_aproveitamento_percentual',
        'data_inicio_producao',
        'data_conclusao_producao',
        'is_refacao',
    ];
    
    protected $casts = [
        'acabamentos' => 'array',
        'detalhes' => 'array',
        'consumo_largura_peca' => 'float',
        'consumo_altura_peca' => 'float',
        'consumo_quantidade_solicitada' => 'integer',
        'consumo_largura_chapa' => 'float',
        'consumo_altura_chapa' => 'float',
        'consumo_valor_unitario_chapa' => 'float',
        'consumo_pecas_por_chapa' => 'integer',
        'consumo_chapas_necessarias' => 'integer',
        'consumo_custo_total' => 'float',
        'consumo_custo_unitario' => 'float',
        'consumo_aproveitamento_percentual' => 'float',
        'data_inicio_producao' => 'datetime',
        'data_conclusao_producao' => 'datetime',
        'is_refacao' => 'boolean',
    ];
    
    /**
     * Atributos que devem ser adicionados ao array/JSON
     */
    protected $appends = [
        'subtotal_item',
        'valor_unitario_m2',
        'nome_produto',
        'acabamentos_selecionados'
    ];
    
    /**
     * Accessor para o campo detalhes
     * Trata tanto strings quanto arrays
     */
    public function getDetalhesAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }
        
        if (is_string($value)) {
            // Se for uma string vazia ou representando objeto/array vazio, retornar array vazio
            if (trim($value) === '' || trim($value) === '{}' || trim($value) === '[]') {
                return [];
            }
            
            // Se for uma string que parece JSON, tentar fazer parse
            if (str_starts_with(trim($value), '{') || str_starts_with(trim($value), '[')) {
                try {
                    $parsed = json_decode($value, true);
                    return is_array($parsed) ? $parsed : [$value];
                } catch (\Exception $e) {
                    return [$value];
                }
            }
            
            // Se for uma string simples, retornar como array com um elemento
            return [$value];
        }
        
        if (is_array($value)) {
            return $value;
        }
        
        return [];
    }
    
    /**
     * Relacionamento com a ordem de serviço
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }
    
    /**
     * Relacionamento com o produto (se existir)
     */
    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }
    
    /**
     * Accessor para nome_produto - compatibilidade com frontend
     * Retorna o nome_servico_produto que já contém o nome correto do produto
     */
    public function getNomeProdutoAttribute()
    {
        return $this->nome_servico_produto;
    }
    
    /**
     * Accessor para subtotal_item - compatibilidade com frontend
     * Retorna o valor_total que é o subtotal do item
     */
    public function getSubtotalItemAttribute()
    {
        return $this->valor_total;
    }
    
    /**
     * Accessor para valor_unitario_m2 - compatibilidade com frontend
     * Para itens tipo m2, retorna o valor_unitario
     */
    public function getValorUnitarioM2Attribute()
    {
        if ($this->tipo_item === 'm2') {
            return $this->valor_unitario;
        }
        return null;
    }
    
    /**
     * Accessor para acabamentos_selecionados - compatibilidade com frontend
     * Retorna o array de acabamentos
     */
    public function getAcabamentosSelecionadosAttribute()
    {
        return $this->acabamentos ?? [];
    }
}
