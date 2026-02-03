<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetTenantFromUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check() && $user = Auth::user()) {
            // Set the tenant_id on the request for use in controllers
            $request->merge(['tenant_id' => $user->tenant_id]);
            
            // Set the tenant_id in the config for use in models/scopes
            config(['tenant_id' => $user->tenant_id]);
        }

        return $next($request);
    }
}
