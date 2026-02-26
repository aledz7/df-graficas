<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class QuickActionPermission extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'quick_action_permissions';
    
    protected $fillable = [
        'tenant_id',
        'tipo_permissao',
        'referencia_id',
        'action_codigo',
        'pode_ver',
    ];

    protected $casts = [
        'pode_ver' => 'boolean',
    ];

    /**
     * Relacionamento com ação rápida
     */
    public function action()
    {
        return $this->belongsTo(QuickAction::class, 'action_codigo', 'codigo');
    }

    /**
     * Verificar se usuário pode ver ação rápida
     */
    public static function podeVerAction(int $tenantId, int $userId, string $actionCodigo, array $userAreas = [])
    {
        // Buscar permissões específicas do usuário
        $permissaoUsuario = self::where('tenant_id', $tenantId)
            ->where('tipo_permissao', 'usuario')
            ->where('referencia_id', $userId)
            ->where('action_codigo', $actionCodigo)
            ->first();

        if ($permissaoUsuario) {
            return $permissaoUsuario->pode_ver;
        }

        // Buscar permissões por área/função do usuário
        foreach ($userAreas as $area) {
            $permissaoArea = self::where('tenant_id', $tenantId)
                ->where('tipo_permissao', 'area')
                ->where('referencia_id', $area)
                ->where('action_codigo', $actionCodigo)
                ->first();

            if ($permissaoArea) {
                return $permissaoArea->pode_ver;
            }
        }

        // Se não houver restrição, permitir por padrão
        return true;
    }
}
