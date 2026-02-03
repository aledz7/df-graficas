<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\AdminConfiguracao;
use Symfony\Component\HttpFoundation\Response;

class VerificarSenhaMaster
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Verificar se existe senha master configurada
        if (!AdminConfiguracao::temSenhaMaster()) {
            // Se não há senha master configurada, permitir acesso
            return $next($request);
        }

        // Verificar se a senha master foi fornecida na requisição
        $senhaMaster = $request->header('X-Senha-Master') ?? $request->input('senha_master');
        
        if (!$senhaMaster) {
            return response()->json([
                'success' => false,
                'message' => 'Senha master é obrigatória para esta operação',
                'requires_master_password' => true
            ], 403);
        }

        // Validar a senha master
        if (!AdminConfiguracao::validarSenhaMaster($senhaMaster)) {
            return response()->json([
                'success' => false,
                'message' => 'Senha master inválida',
                'requires_master_password' => true
            ], 403);
        }

        return $next($request);
    }
}
