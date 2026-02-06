<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $builder
     * @param  \Illuminate\Database\Eloquent\Model  $model
     * @return void
     */
    public function apply(Builder $builder, Model $model)
    {
        // Skip for console commands (like migrations)
        if (app()->runningInConsole() && !app()->runningUnitTests()) {
            return;
        }

        // Get the authenticated user
        $user = Auth::user();
        
        // SEGURANÇA: Todos os usuários (funcionários) devem respeitar o filtro de tenant
        // A administração de tenants é feita por um sistema separado, não pelo sistema de funcionários

        // Apply tenant filter
        if ($user && $user->tenant_id) {
            $table = $model->getTable();
            $builder->where("{$table}.tenant_id", $user->tenant_id);
        } else if (app()->runningUnitTests()) {
            // In tests, if no user is authenticated, don't filter (to allow test setup)
            return;
        } else {
            // In production/other environments, prevent access if no tenant is set
            $builder->whereRaw('1=0');
        }
    }
}
