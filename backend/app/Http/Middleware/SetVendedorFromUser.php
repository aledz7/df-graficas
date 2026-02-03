<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetVendedorFromUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Se for uma requisição para criar ou atualizar OS
        if ($request->is('api/ordens-servico') && in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
            // Se não foi especificado vendedor_id, usar o usuário logado
            if (!$request->has('vendedor_id') || !$request->vendedor_id) {
                $user = auth()->user();
                if ($user) {
                    $request->merge([
                        'vendedor_id' => $user->id, // user_id do usuário logado
                        'vendedor_nome' => $user->name
                    ]);
                }
            }
        }

        return $next($request);
    }
}
