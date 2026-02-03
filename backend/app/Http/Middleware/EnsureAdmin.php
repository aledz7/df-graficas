<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * Handle an incoming request.
     * Only allows users with is_admin = true.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'error' => 'Usuário não autenticado.',
            ], 401);
        }

        if (!$user->is_admin) {
            return response()->json([
                'message' => 'Access Denied.',
                'error' => 'Acesso restrito a administradores.',
            ], 403);
        }

        return $next($request);
    }
}
