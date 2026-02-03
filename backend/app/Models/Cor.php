<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cor extends Model
{
    use HasFactory;
    
    /**
     * Nome da tabela associada ao modelo.
     *
     * @var string
     */
    protected $table = 'cors';
    
    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nome',
        'hex',
        'tenant_id'
    ];
    
    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    /**
     * Escopo para filtrar por tenant
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param int|null $tenantId
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeTenant($query, $tenantId = null)
    {
        if ($tenantId) {
            return $query->where('tenant_id', $tenantId);
        }
        
        return $query->where(function($q) {
            $q->whereNull('tenant_id')
              ->orWhere('tenant_id', auth()->user()->tenant_id ?? null);
        });
    }
}
