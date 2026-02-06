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
        'limite_uso',           // 'ilimitado', 'uma_vez_por_cliente', 'quantidade_fixa'
        'quantidade_limite',    // se limite_uso = 'quantidade_fixa'
        'quantidade_usada',     // contador de uso
        'cliente_id',           // null = todos os clientes, ou ID específico
        'produto_ids',          // JSON com IDs de produtos específicos (null = todos)
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
        
        // Verifica se é para cliente específico
        if ($this->cliente_id && $this->cliente_id != $clienteId) {
            return ['valido' => false, 'mensagem' => 'Cupom não disponível para este cliente.'];
        }
        
        return ['valido' => true, 'mensagem' => 'Cupom válido!'];
    }
    
    /**
     * Calcula o valor do desconto
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
     * Incrementa o uso do cupom
     */
    public function registrarUso()
    {
        $this->increment('quantidade_usada');
    }
}
