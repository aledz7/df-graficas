<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;

class ConfiguracaoFechamentoMes extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'configuracao_fechamento_mes';

    protected $fillable = [
        'tenant_id',
        'dia_fechamento',
        'ativo',
        'usuario_configuracao_id',
    ];

    protected $casts = [
        'dia_fechamento' => 'integer',
        'ativo' => 'boolean',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir tenant_id automaticamente
        static::creating(function ($configuracao) {
            if (auth()->check() && empty($configuracao->tenant_id)) {
                $configuracao->tenant_id = auth()->user()->tenant_id;
            }
            if (auth()->check() && empty($configuracao->usuario_configuracao_id)) {
                $configuracao->usuario_configuracao_id = auth()->id();
            }
        });

        // Atualizar usuário de configuração
        static::updating(function ($configuracao) {
            if (auth()->check()) {
                $configuracao->usuario_configuracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the configuration.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who made the configuration.
     */
    public function usuarioConfiguracao()
    {
        return $this->belongsTo(User::class, 'usuario_configuracao_id');
    }

    /**
     * Obter ou criar configuração para o tenant atual
     */
    public static function obterOuCriar($tenantId)
    {
        return static::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'dia_fechamento' => 25,
                'ativo' => false,
            ]
        );
    }
}

