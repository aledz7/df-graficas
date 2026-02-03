<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Hash;
use App\Models\Traits\Tenantable;

class AdminConfiguracao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'admin_configuracoes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'nome_sistema',
        'senha_master',
        'backup_automatico',
        'intervalo_backup_dias',
        'log_alteracoes',
        'notificacoes_email',
        'tempo_sessao_minutos',
        'sessao_unica',
        'forcar_logout_inativo',
        'tema_padrao',
        'idioma_padrao',
        'modo_escuro_padrao',
        'exigir_senha_forte',
        'tentativas_login_max',
        'bloqueio_temporario_minutos',
        'autenticacao_2fatores',
        'notificacoes_config',
        'preco_aplicacao_envelopamento',
        'preco_remocao_envelopamento',
        'preco_lixamento_envelopamento',
        'preco_pelicula_envelopamento',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'backup_automatico' => 'boolean',
        'log_alteracoes' => 'boolean',
        'notificacoes_email' => 'boolean',
        'sessao_unica' => 'boolean',
        'forcar_logout_inativo' => 'boolean',
        'modo_escuro_padrao' => 'boolean',
        'exigir_senha_forte' => 'boolean',
        'autenticacao_2fatores' => 'boolean',
        'notificacoes_config' => 'array',
        'intervalo_backup_dias' => 'integer',
        'tempo_sessao_minutos' => 'integer',
        'tentativas_login_max' => 'integer',
        'bloqueio_temporario_minutos' => 'integer',
        'preco_aplicacao_envelopamento' => 'decimal:2',
        'preco_remocao_envelopamento' => 'decimal:2',
        'preco_lixamento_envelopamento' => 'decimal:2',
        'preco_pelicula_envelopamento' => 'decimal:2',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'senha_master',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($config) {
            if (auth()->check() && empty($config->usuario_cadastro_id)) {
                $config->usuario_cadastro_id = auth()->id();
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($config) {
            if (auth()->check()) {
                $config->usuario_alteracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the admin configuração.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the admin configuração.
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who last updated the admin configuração.
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Set the senha master with encryption.
     *
     * @param  string  $value
     * @return void
     */
    public function setSenhaMasterAttribute($value)
    {
        if (!empty($value)) {
            $this->attributes['senha_master'] = Hash::make($value);
        } else {
            $this->attributes['senha_master'] = null;
        }
    }

    /**
     * Check if the provided senha master is correct.
     *
     * @param  string  $senha
     * @return bool
     */
    public function verificarSenhaMaster($senha)
    {
        if (empty($this->senha_master)) {
            return false;
        }
        
        return Hash::check($senha, $this->senha_master);
    }

    /**
     * Get admin configuration for current tenant.
     *
     * @return static|null
     */
    public static function getConfiguracaoAtual()
    {
        $tenantId = auth()->user()->tenant_id ?? null;
        
        if (!$tenantId) {
            return null;
        }

        return static::where('tenant_id', $tenantId)->first();
    }

    /**
     * Get or create admin configuration for current tenant.
     *
     * @return static
     */
    public static function getOuCriarConfiguracao()
    {
        $tenantId = auth()->user()->tenant_id ?? null;
        
        if (!$tenantId) {
            throw new \Exception('Tenant ID não encontrado');
        }

        return static::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'nome_sistema' => 'GráficaPro',
                'backup_automatico' => false,
                'intervalo_backup_dias' => 7,
                'log_alteracoes' => true,
                'notificacoes_email' => false,
                'tempo_sessao_minutos' => 480,
                'sessao_unica' => false,
                'forcar_logout_inativo' => true,
                'tema_padrao' => 'light',
                'idioma_padrao' => 'pt-BR',
                'modo_escuro_padrao' => false,
                'exigir_senha_forte' => true,
                'tentativas_login_max' => 5,
                'bloqueio_temporario_minutos' => 30,
                'autenticacao_2fatores' => false,
                'preco_aplicacao_envelopamento' => 10.00,
                'preco_remocao_envelopamento' => 5.00,
                'preco_lixamento_envelopamento' => 8.00,
                'preco_pelicula_envelopamento' => 40.00,
            ]
        );
    }

    /**
     * Update admin configuration.
     *
     * @param  array  $dados
     * @return bool
     */
    public static function atualizarConfiguracao($dados)
    {
        $config = static::getOuCriarConfiguracao();
        
        // Se há senha master, verificar se está sendo alterada
        if (isset($dados['senha_master']) && !empty($dados['senha_master'])) {
            $config->senha_master = $dados['senha_master'];
        } elseif (isset($dados['senha_master']) && empty($dados['senha_master'])) {
            // Se senha master está vazia, remover
            $config->senha_master = null;
        }
        
        // Remover senha_master dos dados para não sobrescrever
        unset($dados['senha_master']);
        
        return $config->update($dados);
    }

    /**
     * Get configuration value by key.
     *
     * @param  string  $key
     * @param  mixed  $default
     * @return mixed
     */
    public static function getValor($key, $default = null)
    {
        $config = static::getConfiguracaoAtual();
        
        if (!$config) {
            return $default;
        }
        
        return $config->$key ?? $default;
    }

    /**
     * Set configuration value by key.
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return bool
     */
    public static function setValor($key, $value)
    {
        $config = static::getOuCriarConfiguracao();
        
        if ($key === 'senha_master') {
            $config->senha_master = $value;
        } else {
            $config->$key = $value;
        }
        
        return $config->save();
    }

    /**
     * Check if senha master is configured.
     *
     * @return bool
     */
    public static function temSenhaMaster()
    {
        $config = static::getConfiguracaoAtual();
        
        return $config && !empty($config->senha_master);
    }

    /**
     * Validate senha master.
     *
     * @param  string  $senha
     * @return bool
     */
    public static function validarSenhaMaster($senha)
    {
        $config = static::getConfiguracaoAtual();
        
        if (!$config) {
            return false;
        }
        
        return $config->verificarSenhaMaster($senha);
    }
}
