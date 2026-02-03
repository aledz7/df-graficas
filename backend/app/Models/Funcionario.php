<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;
use App\Models\User;

class Funcionario extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'funcionarios';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'nome',
        'data_nascimento',
        'cpf',
        'rg',
        'emissor_rg',
        'cep',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'uf',
        'cargo',
        'telefone',
        'whatsapp',
        'celular',
        'email',
        'comissao_dropshipping',
        'comissao_servicos',
        'permite_receber_comissao',
        'salario_base',
        'vales',
        'faltas',
        'permissions',
        'login',
        'senha',
        'status',
        'foto_url',
        'usuario_cadastro_id',
        'usuario_alteracao_id',
    ];

    protected $casts = [
        'data_nascimento' => 'date',
        'comissao_dropshipping' => 'decimal:2',
        'comissao_servicos' => 'decimal:2',
        'permite_receber_comissao' => 'boolean',
        'salario_base' => 'decimal:2',
        'vales' => 'array',
        'faltas' => 'array',
        'permissions' => 'array',
        'status' => 'boolean',
    ];

    protected $dates = [
        'data_nascimento',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($funcionario) {
            if (auth()->check() && empty($funcionario->usuario_cadastro_id)) {
                $funcionario->usuario_cadastro_id = auth()->id();
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($funcionario) {
            if (auth()->check()) {
                $funcionario->usuario_alteracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the funcionario.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the funcionario.
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who last updated the funcionario.
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user account associated with this funcionario.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope a query to only include funcionarios ativos.
     */
    public function scopeAtivos($query)
    {
        return $query->where('status', true);
    }

    /**
     * Scope a query to only include funcionarios inativos.
     */
    public function scopeInativos($query)
    {
        return $query->where('status', false);
    }

    /**
     * Scope a query to only include funcionarios por cargo.
     */
    public function scopePorCargo($query, $cargo)
    {
        return $query->where('cargo', $cargo);
    }

    /**
     * Scope a query to only include funcionarios que podem receber comissão.
     */
    public function scopeComComissao($query)
    {
        return $query->where('permite_receber_comissao', true);
    }

    /**
     * Get the funcionario's full address.
     */
    public function getEnderecoCompletoAttribute()
    {
        $endereco = [];
        
        if ($this->endereco) {
            $endereco[] = $this->endereco;
        }
        
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
        
        if ($this->uf) {
            $endereco[] = $this->uf;
        }
        
        return implode(', ', $endereco);
    }

    /**
     * Get the funcionario's age.
     */
    public function getIdadeAttribute()
    {
        if (!$this->data_nascimento) {
            return null;
        }
        
        return $this->data_nascimento->age;
    }

    /**
     * Get the funcionario's total vales.
     */
    public function getTotalValesAttribute()
    {
        if (!is_array($this->vales)) {
            return 0;
        }
        
        return collect($this->vales)->sum('valor');
    }

    /**
     * Get the funcionario's total faltas.
     */
    public function getTotalFaltasAttribute()
    {
        if (!is_array($this->faltas)) {
            return 0;
        }
        
        return collect($this->faltas)->sum('valorDesconto');
    }

    /**
     * Get the funcionario's salário líquido.
     */
    public function getSalarioLiquidoAttribute()
    {
        $salarioBase = $this->salario_base ?? 0;
        $totalVales = $this->total_vales;
        $totalFaltas = $this->total_faltas;
        
        return $salarioBase - $totalVales - $totalFaltas;
    }

    /**
     * Check if the funcionario has a specific permission.
     */
    public function hasPermission($permission)
    {
        if (!is_array($this->permissions)) {
            return false;
        }
        
        return in_array($permission, $this->permissions);
    }

    /**
     * Add a permission to the funcionario.
     */
    public function addPermission($permission)
    {
        $permissions = is_array($this->permissions) ? $this->permissions : [];
        
        if (!in_array($permission, $permissions)) {
            $permissions[] = $permission;
            $this->permissions = $permissions;
            $this->save();
        }
        
        return $this;
    }

    /**
     * Remove a permission from the funcionario.
     */
    public function removePermission($permission)
    {
        $permissions = is_array($this->permissions) ? $this->permissions : [];
        
        $permissions = array_filter($permissions, function ($perm) use ($permission) {
            return $perm !== $permission;
        });
        
        $this->permissions = array_values($permissions);
        $this->save();
        
        return $this;
    }

    /**
     * Add a vale to the funcionario.
     */
    public function addVale($data, $valor, $motivo = null)
    {
        $vales = is_array($this->vales) ? $this->vales : [];
        
        $vales[] = [
            'id' => 'v-' . time() . '-' . rand(1000, 9999),
            'data' => $data,
            'valor' => $valor,
            'motivo' => $motivo,
            'created_at' => now()->toISOString(),
        ];
        
        $this->vales = $vales;
        $this->save();
        
        return $this;
    }

    /**
     * Add a falta to the funcionario.
     */
    public function addFalta($data, $valorDesconto, $motivo = null)
    {
        $faltas = is_array($this->faltas) ? $this->faltas : [];
        
        $faltas[] = [
            'id' => 'f-' . time() . '-' . rand(1000, 9999),
            'data' => $data,
            'valorDesconto' => $valorDesconto,
            'motivo' => $motivo,
            'created_at' => now()->toISOString(),
        ];
        
        $this->faltas = $faltas;
        $this->save();
        
        return $this;
    }

    /**
     * Relacionamento com comissões de OS
     */
    public function comissoesOS()
    {
        return $this->hasMany(ComissaoOS::class, 'funcionario_id');
    }

    /**
     * Relacionamento com ordens de serviço como vendedor
     */
    public function ordensServico()
    {
        return $this->hasMany(OrdemServico::class, 'vendedor_id');
    }

    /**
     * Calcular comissões pendentes do funcionário
     */
    public function getComissoesPendentesAttribute()
    {
        return $this->comissoesOS()
            ->pendentes()
            ->sum('valor_comissao');
    }

    /**
     * Calcular comissões pagas do funcionário
     */
    public function getComissoesPagasAttribute()
    {
        return $this->comissoesOS()
            ->pagas()
            ->sum('valor_comissao');
    }
} 