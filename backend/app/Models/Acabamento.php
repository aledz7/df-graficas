<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Acabamento extends Model
{
    use HasFactory;
    
    protected $table = 'acabamentos';
    
    protected $fillable = [
        'tenant_id',
        'nome_acabamento',
        'valor',
        'valor_minimo',
        'prazo_adicional',
        'valor_m2',
        'valor_un',
        'tipo_aplicacao',
        'ativo',
        'produto_vinculado_id',
        'produto_vinculado_nome',
        'produto_vinculado_custo',
        'produto_vinculado_unidade_medida',
        'produto_vinculado_estoque_no_momento_do_cadastro',
        'quantidade_produto_por_unidade_acabamento',
        'observacoes',
        'cor_fundo'
    ];
    
    protected $casts = [
        'valor' => 'decimal:2',
        'valor_minimo' => 'decimal:2',
        'prazo_adicional' => 'integer',
        'valor_m2' => 'decimal:2',
        'valor_un' => 'decimal:2',
        'produto_vinculado_custo' => 'decimal:2',
        'produto_vinculado_estoque_no_momento_do_cadastro' => 'decimal:2',
        'quantidade_produto_por_unidade_acabamento' => 'decimal:2',
        'ativo' => 'boolean'
    ];
    
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
