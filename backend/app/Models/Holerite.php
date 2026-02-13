<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;
use Carbon\Carbon;

class Holerite extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'holerites';

    protected $fillable = [
        'tenant_id',
        'funcionario_id',
        'mes',
        'ano',
        'salario_base',
        'vales',
        'faltas',
        'total_vales',
        'total_faltas',
        'desconto_faltas',
        'salario_bruto',
        'total_descontos',
        'salario_liquido',
        'comissao_dropshipping',
        'comissao_servicos',
        'total_comissoes',
        'total_consumo_interno',
        'consumo_interno_itens',
        'total_fretes',
        'fretes_itens',
        'fechado',
        'data_fechamento',
        'usuario_fechamento_id',
        'observacoes',
    ];

    protected $casts = [
        'vales' => 'array',
        'faltas' => 'array',
        'consumo_interno_itens' => 'array',
        'salario_base' => 'decimal:2',
        'total_vales' => 'decimal:2',
        'desconto_faltas' => 'decimal:2',
        'salario_bruto' => 'decimal:2',
        'total_descontos' => 'decimal:2',
        'salario_liquido' => 'decimal:2',
        'comissao_dropshipping' => 'decimal:2',
        'comissao_servicos' => 'decimal:2',
        'total_comissoes' => 'decimal:2',
        'total_consumo_interno' => 'decimal:2',
        'total_fretes' => 'decimal:2',
        'fretes_itens' => 'array',
        'fechado' => 'boolean',
        'data_fechamento' => 'datetime',
    ];

    protected $dates = [
        'data_fechamento',
        'created_at',
        'updated_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir tenant_id automaticamente
        static::creating(function ($holerite) {
            if (auth()->check() && empty($holerite->tenant_id)) {
                $holerite->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    /**
     * Get the tenant that owns the holerite.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the funcionario that owns the holerite.
     */
    public function funcionario()
    {
        return $this->belongsTo(User::class, 'funcionario_id');
    }

    /**
     * Get the user who closed the holerite.
     */
    public function usuarioFechamento()
    {
        return $this->belongsTo(User::class, 'usuario_fechamento_id');
    }

    /**
     * Scope a query to only include holerites for a specific funcionario.
     */
    public function scopePorFuncionario($query, $funcionarioId)
    {
        return $query->where('funcionario_id', $funcionarioId);
    }

    /**
     * Scope a query to only include holerites for a specific month and year.
     */
    public function scopePorMesAno($query, $mes, $ano)
    {
        return $query->where('mes', $mes)->where('ano', $ano);
    }

    /**
     * Scope a query to only include closed holerites.
     */
    public function scopeFechados($query)
    {
        return $query->where('fechado', true);
    }

    /**
     * Get the month name in Portuguese.
     */
    public function getMesNomeAttribute()
    {
        $meses = [
            1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
            5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
            9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
        ];
        
        return $meses[$this->mes] ?? 'Mês inválido';
    }

    /**
     * Get the period description.
     */
    public function getPeriodoAttribute()
    {
        return "{$this->mes_nome} de {$this->ano}";
    }

    /**
     * Calculate total discounts.
     */
    public function calcularTotalDescontos()
    {
        return $this->total_vales + $this->desconto_faltas;
    }

    /**
     * Calculate net salary.
     */
    public function calcularSalarioLiquido()
    {
        $salarioBruto = $this->salario_base + $this->total_comissoes;
        $totalDescontos = $this->calcularTotalDescontos();
        
        return $salarioBruto - $totalDescontos;
    }
}
