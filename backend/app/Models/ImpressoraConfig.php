<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class ImpressoraConfig extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'impressoras_config';

    protected $fillable = [
        'tenant_id',
        'nome',
        'margem_superior_mm',
        'margem_inferior_mm',
        'margem_esquerda_mm',
        'margem_direita_mm',
        'padrao',
        'ativo'
    ];

    protected $casts = [
        'margem_superior_mm' => 'decimal:2',
        'margem_inferior_mm' => 'decimal:2',
        'margem_esquerda_mm' => 'decimal:2',
        'margem_direita_mm' => 'decimal:2',
        'padrao' => 'boolean',
        'ativo' => 'boolean',
    ];

    /**
     * Obter configuração padrão do tenant
     */
    public static function getPadrao($tenantId)
    {
        return self::where('tenant_id', $tenantId)
            ->where('padrao', true)
            ->where('ativo', true)
            ->first();
    }

    /**
     * Definir como padrão (remove padrão de outras)
     */
    public function definirComoPadrao()
    {
        // Remover padrão de outras configurações
        self::where('tenant_id', $this->tenant_id)
            ->where('id', '!=', $this->id)
            ->update(['padrao' => false]);

        $this->update(['padrao' => true]);
    }
}
