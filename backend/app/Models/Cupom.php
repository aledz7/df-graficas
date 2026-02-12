<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cupom extends Model
{
    use HasFactory, SoftDeletes;
    
    protected $table = 'cupons';
    
    protected $fillable = [
        'codigo',
        'descricao',
        'tipo_desconto',        // 'percentual' ou 'valor_fixo'
        'valor_desconto',       // valor ou porcentagem
        'valor_minimo',         // valor mínimo do pedido para aplicar
        'limite_uso',           // 'ilimitado', 'uma_vez_por_cliente', 'primeira_compra', 'quantidade_fixa'
        'quantidade_limite',    // se limite_uso = 'quantidade_fixa'
        'quantidade_usada',     // contador de uso
        'cliente_id',           // null = todos os clientes, ou ID específico
        'produto_ids',          // JSON com IDs de produtos específicos (null = todos)
        'tipo_aplicacao',      // 'todos_itens', 'categoria', 'item_especifico'
        'categoria_id',         // ID da categoria (se tipo_aplicacao = 'categoria')
        'primeira_compra',      // true = só para primeira compra do cliente
        'data_inicio',
        'data_fim',
        'ativo',
        'tenant_id'
    ];
    
    protected $casts = [
        'valor_desconto' => 'decimal:2',
        'valor_minimo' => 'decimal:2',
        'quantidade_limite' => 'integer',
        'quantidade_usada' => 'integer',
        'produto_ids' => 'array',
        'primeira_compra' => 'boolean',
        'ativo' => 'boolean',
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'quantidade_usada' => 0,
        'ativo' => true,
    ];
    
    /**
     * Relacionamento com cliente (opcional)
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
    
    /**
     * Relacionamento com categoria (opcional)
     */
    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }
    
    /**
     * Escopo para filtrar por tenant
     */
    public function scopeTenant($query, $tenantId = null)
    {
        if ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        }
        
        return $query->where(function($q) {
            $q->whereNull('tenant_id')
              ->orWhere('tenant_id', auth()->user()->tenant_id ?? null);
        });
    }
    
    /**
     * Escopo para cupons ativos e válidos
     */
    public function scopeValidos($query)
    {
        $hoje = now()->startOfDay();
        return $query->where('ativo', true)
            ->where(function($q) use ($hoje) {
                $q->whereNull('data_inicio')
                  ->orWhere('data_inicio', '<=', $hoje);
            })
            ->where(function($q) use ($hoje) {
                $q->whereNull('data_fim')
                  ->orWhere('data_fim', '>=', $hoje);
            });
    }
    
    /**
     * Verifica se o cupom ainda pode ser usado
     */
    public function podeSerUsado($clienteId = null, $totalPedido = 0)
    {
        // Verifica se está ativo
        if (!$this->ativo) {
            return ['valido' => false, 'mensagem' => 'Cupom inativo.'];
        }
        
        // Verifica data de início
        if ($this->data_inicio && now()->lt($this->data_inicio)) {
            return ['valido' => false, 'mensagem' => 'Cupom ainda não está válido.'];
        }
        
        // Verifica data de fim
        if ($this->data_fim && now()->gt($this->data_fim->endOfDay())) {
            return ['valido' => false, 'mensagem' => 'Cupom expirado.'];
        }
        
        // Verifica valor mínimo
        if ($this->valor_minimo && $totalPedido < $this->valor_minimo) {
            return [
                'valido' => false, 
                'mensagem' => "Valor mínimo do pedido: R$ " . number_format($this->valor_minimo, 2, ',', '.')
            ];
        }
        
        // Verifica limite de quantidade
        if ($this->limite_uso === 'quantidade_fixa' && $this->quantidade_usada >= $this->quantidade_limite) {
            return ['valido' => false, 'mensagem' => 'Cupom esgotado.'];
        }
        
        // Verifica se é para primeira compra
        if ($this->limite_uso === 'primeira_compra') {
            if (!$clienteId) {
                return ['valido' => false, 'mensagem' => 'É necessário informar o cliente para usar este cupom.'];
            }
            
            // Verificar se o cliente já fez alguma compra (vendas ou ordens de serviço)
            // Verificar em vendas (excluindo canceladas)
            $temComprasAnteriores = \DB::table('vendas')
                ->where('cliente_id', $clienteId)
                ->where('tenant_id', $this->tenant_id)
                ->where('status', '!=', 'cancelada')
                ->exists();
            
            // Se não encontrou em vendas, verificar em ordens de serviço
            if (!$temComprasAnteriores) {
                $temComprasAnteriores = \DB::table('ordens_servico')
                    ->where('cliente_id', $clienteId)
                    ->where('tenant_id', $this->tenant_id)
                    ->where('status_os', '!=', 'cancelada')
                    ->exists();
            }
            
            if ($temComprasAnteriores) {
                return ['valido' => false, 'mensagem' => 'Este cupom é válido apenas para primeira compra de novos clientes.'];
            }
        }
        
        // Verifica se é para cliente específico
        if ($this->cliente_id && $this->cliente_id != $clienteId) {
            return ['valido' => false, 'mensagem' => 'Cupom não disponível para este cliente.'];
        }
        
        return ['valido' => true, 'mensagem' => 'Cupom válido!'];
    }
    
    /**
     * Calcula o valor do desconto
     * @param float $totalPedido - Total do pedido ou total dos itens aplicáveis
     */
    public function calcularDesconto($totalPedido)
    {
        if ($this->tipo_desconto === 'percentual') {
            return ($totalPedido * $this->valor_desconto) / 100;
        }
        
        // Valor fixo não pode ser maior que o total
        return min($this->valor_desconto, $totalPedido);
    }
    
    /**
     * Verifica se o cupom se aplica a um item específico
     * @param int $produtoId - ID do produto
     * @param int|null $categoriaId - ID da categoria do produto
     */
    public function seAplicaAoItem($produtoId, $categoriaId = null)
    {
        // Se aplica a todos os itens
        if ($this->tipo_aplicacao === 'todos_itens') {
            return true;
        }
        
        // Se aplica a uma categoria específica
        if ($this->tipo_aplicacao === 'categoria') {
            return $this->categoria_id && $categoriaId == $this->categoria_id;
        }
        
        // Se aplica a um item específico
        if ($this->tipo_aplicacao === 'item_especifico') {
            $produtoIds = $this->produto_ids ?? [];
            return in_array($produtoId, $produtoIds);
        }
        
        return false;
    }
    
    /**
     * Incrementa o uso do cupom
     */
    public function registrarUso()
    {
        $this->increment('quantidade_usada');
    }
}
