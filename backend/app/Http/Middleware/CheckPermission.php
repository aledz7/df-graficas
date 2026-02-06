<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = Auth::user();
        
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'error' => 'Usuário não autenticado.'
            ], 401);
        }

        // Verificar se o usuário tem a permissão específica
        // Nota: Funcionários não podem ser admin - a administração de tenants é feita por sistema separado
        $permissions = $user->permissions;
        
        if (!is_array($permissions) || !isset($permissions[$permission]) || !$permissions[$permission]) {
            return response()->json([
                'message' => 'Access Denied.',
                'error' => 'Você não tem permissão para acessar este recurso.',
                'required_permission' => $permission
            ], 403);
        }

        return $next($request);
    }
} 