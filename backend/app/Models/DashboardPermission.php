<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class DashboardPermission extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'dashboard_permissions';
    
    protected $fillable = [
        'tenant_id',
        'tipo_permissao',
        'referencia_id',
        'widget_codigo',
        'pode_ver',
        'pode_configurar',
    ];

    protected $casts = [
        'pode_ver' => 'boolean',
        'pode_configurar' => 'boolean',
    ];

    /**
     * Relacionamento com widget
     */
    public function widget()
    {
        return $this->belongsTo(DashboardWidget::class, 'widget_codigo', 'codigo');
    }

    /**
     * Verificar se usuário pode ver widget
     */
    public static function podeVerWidget(int $tenantId, int $userId, string $widgetCodigo, array $userAreas = [])
    {
        // Buscar permissões específicas do usuário
        $permissaoUsuario = self::where('tenant_id', $tenantId)
            ->where('tipo_permissao', 'usuario')
            ->where('referencia_id', $userId)
            ->where('widget_codigo', $widgetCodigo)
            ->first();

        if ($permissaoUsuario) {
            return $permissaoUsuario->pode_ver;
        }

        // Buscar permissões por área/função do usuário
        foreach ($userAreas as $area) {
            $permissaoArea = self::where('tenant_id', $tenantId)
                ->where('tipo_permissao', 'area')
                ->where('referencia_id', $area)
                ->where('widget_codigo', $widgetCodigo)
                ->first();

            if ($permissaoArea) {
                return $permissaoArea->pode_ver;
            }
        }

        // Se não houver restrição, permitir por padrão
        return true;
    }
}
