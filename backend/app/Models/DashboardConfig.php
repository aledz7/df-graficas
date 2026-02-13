<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class DashboardConfig extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'dashboard_configs';
    
    protected $fillable = [
        'tenant_id',
        'user_id',
        'nome_configuracao',
        'layout',
        'widgets_visiveis',
        'is_padrao',
    ];

    protected $casts = [
        'layout' => 'array',
        'widgets_visiveis' => 'array',
        'is_padrao' => 'boolean',
    ];

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Obter configuração padrão do tenant
     */
    public static function getPadrao(int $tenantId)
    {
        return self::where('tenant_id', $tenantId)
            ->where('is_padrao', true)
            ->whereNull('user_id')
            ->first();
    }

    /**
     * Obter configuração do usuário
     */
    public static function getUsuario(int $tenantId, int $userId)
    {
        return self::where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->first();
    }
}
