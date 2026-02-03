<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpFoundation\Response;

class ApiAuthenticate
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, ...$guards): Response
    {
        // Removido log verboso do middleware para reduzir ruído no laravel.log

        // Use Sanctum authentication
        $guards = empty($guards) ? ['sanctum'] : $guards;
        
        foreach ($guards as $guard) {
            if (auth($guard)->check()) {
                auth()->shouldUse($guard);
                return $next($request);
            }
        }

        // If not authenticated, return JSON error
        return response()->json([
            'message' => 'Unauthenticated.',
            'error' => 'Token de autenticação necessário. Faça login para acessar este recurso.'
        ], 401);
    }
}
