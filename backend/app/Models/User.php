<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use App\Models\Funcionario;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * Atributos calculados a serem incluídos na serialização JSON.
     *
     * @var list<string>
     */
    protected $appends = ['is_owner'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
        'is_admin',
        'is_active',
        'last_login_at',
        'theme',
        'dashboard_colors',
        'quick_actions_colors',
        // Campos de notificação
        'email_notifications',
        'system_alerts',
        // Campos de 2FA
        'two_factor_enabled',
        'two_factor_code',
        'two_factor_code_expires_at',
        // Campos de funcionário
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
        'comissao_dropshipping',
        'comissao_servicos',
        'permite_receber_comissao',
        'salario_base',
        'vales',
        'faltas',
        'permissions',
        'access_schedule',
        'login',
        'senha',
        'status',
        'foto_url',
        'usuario_cadastro_id',
        'usuario_alteracao_id',
        // Campos de treinamento
        'setor',
        'nivel_treinamento_liberado',
        'progresso_treinamento',
        'ultimo_acesso_treinamento',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'senha',
        'remember_token',
        'pivot',
    ];
    
    protected $dates = [
        'last_login_at',
        'email_verified_at',
        'created_at',
        'updated_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            // Casts de notificação
            'email_notifications' => 'boolean',
            'system_alerts' => 'boolean',
            // Casts de 2FA
            'two_factor_enabled' => 'boolean',
            'two_factor_code_expires_at' => 'datetime',
            // Cast de aparência
            'dashboard_colors' => 'array',
            'quick_actions_colors' => 'array',
            // Casts de funcionário
            'data_nascimento' => 'date',
            'comissao_dropshipping' => 'decimal:2',
            'comissao_servicos' => 'decimal:2',
            'permite_receber_comissao' => 'boolean',
            'salario_base' => 'decimal:2',
            'vales' => 'array',
            'faltas' => 'array',
            'permissions' => 'array',
            'access_schedule' => 'array',
            'status' => 'boolean',
            // Casts de treinamento
            'nivel_treinamento_liberado' => 'string',
            'progresso_treinamento' => 'decimal:2',
            'ultimo_acesso_treinamento' => 'datetime',
        ];
    }
    
    /**
     * Obter o tenant ao qual este usuário pertence.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Obter o funcionário associado a este usuário.
     */
    public function funcionario()
    {
        return $this->hasOne(Funcionario::class, 'user_id');
    }

    // Métodos de funcionário (agora diretamente no User)
    
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
        return $this->hasMany(ComissaoOS::class, 'user_id');
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
            ->where('status_pagamento', 'Pendente')
            ->sum('valor_comissao');
    }

    /**
     * Calcular comissões pagas do funcionário
     */
    public function getComissoesPagasAttribute()
    {
        return $this->comissoesOS()
            ->where('status_pagamento', 'Pago')
            ->sum('valor_comissao');
    }
    
    /**
     * Verificar se o usuário é o dono/proprietário da empresa (tenant).
     * Um owner é o primeiro usuário de um tenant com config_sistema ativo.
     *
     * @return bool
     */
    public function getIsOwnerAttribute(): bool
    {
        $permissions = $this->permissions;
        if (!is_array($permissions)) {
            return false;
        }
        // Owner tem config_sistema AND acessar_dashboard AND gerenciar_clientes
        return !empty($permissions['config_sistema']) 
            && !empty($permissions['acessar_dashboard'])
            && !empty($permissions['gerenciar_clientes']);
    }

    /**
     * Verificar se o usuário é um super administrador.
     *
     * @return bool
     */
    public function isSuperAdmin(): bool
    {
        return (bool) $this->is_admin;
    }
    
    /**
     * Verificar se o usuário está ativo.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        return (bool) $this->is_active;
    }
    
    /**
     * Obter o nome completo do usuário.
     *
     * @return string
     */
    public function getFullNameAttribute(): string
    {
        return $this->name;
    }
}
