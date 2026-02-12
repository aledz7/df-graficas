<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Traits\Tenantable;

class TermometroConfig extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'termometro_config';

    protected $fillable = [
        'tenant_id',
        'usuarios_permitidos',
        'todos_usuarios',
        'apenas_admin',
        'configuracoes_limites',
    ];

    protected $casts = [
        'usuarios_permitidos' => 'array',
        'todos_usuarios' => 'boolean',
        'apenas_admin' => 'boolean',
        'configuracoes_limites' => 'array',
    ];

    /**
     * Verificar se o usuário pode ver o termômetro
     */
    public function usuarioPodeVer(int $userId, bool $isAdmin): bool
    {
        // Se todos podem ver
        if ($this->todos_usuarios) {
            return true;
        }

        // Se apenas admin pode ver
        if ($this->apenas_admin && $isAdmin) {
            return true;
        }

        // Se está na lista de usuários permitidos
        if ($this->usuarios_permitidos && in_array($userId, $this->usuarios_permitidos)) {
            return true;
        }

        return false;
    }

    /**
     * Obter ou criar configuração para o tenant
     */
    public static function obterOuCriar(int $tenantId): self
    {
        $config = self::where('tenant_id', $tenantId)->first();

        if (!$config) {
            $config = self::create([
                'tenant_id' => $tenantId,
                'todos_usuarios' => false,
                'apenas_admin' => true,
                'usuarios_permitidos' => [],
                'configuracoes_limites' => null,
            ]);
        }

        return $config;
    }
}
