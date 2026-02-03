<?php

namespace App\Models\Traits;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait para adicionar suporte a multi-tenancy nos modelos
 */
trait Tenantable
{
    /**
     * O "boot" do trait.
     *
     * @return void
     */
    protected static function bootTenantable()
    {
        static::addGlobalScope(new TenantScope);

        // Ao criar um novo modelo, definir automaticamente o tenant_id
        static::creating(function (Model $model) {
            if (auth()->check()) {
                $model->tenant_id = $model->tenant_id ?? auth()->user()->tenant_id;
            }
        });
    }

    /**
     * Obter o tenant dono deste modelo.
     */
    public function tenant()
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }

    /**
     * Obter uma consulta sem o escopo de tenant.
     *
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public static function withoutTenant()
    {
        return (new static)->newQueryWithoutScope(TenantScope::class);
    }
}
