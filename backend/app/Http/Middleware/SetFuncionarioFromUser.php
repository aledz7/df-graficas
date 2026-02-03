<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Funcionario;

class SetFuncionarioFromUser
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();
        
        if ($user) {
            // Buscar o funcionário associado ao usuário logado
            $funcionario = Funcionario::where('user_id', $user->id)
                ->where('tenant_id', $user->tenant_id)
                ->where('status', true)
                ->first();
            
            if ($funcionario) {
                    // Lista de rotas que precisam de funcionario_id
                $rotasComFuncionarioId = [
                    'api/vendas',
                    'api/ordens-servico',
                    'api/envelopamentos',
                    'api/compromissos',
                    'api/comissoes-os'
                ];
                
                // Verificar se a requisição é para uma das rotas que precisam de funcionario_id
                $precisaFuncionarioId = false;
                foreach ($rotasComFuncionarioId as $rota) {
                    if ($request->is($rota) && in_array($request->method(), ['POST', 'PUT', 'PATCH'])) {
                        $precisaFuncionarioId = true;
                        break;
                    }
                }
                
                // Se precisa de funcionario_id e não foi especificado, usar o funcionário do usuário logado
                if ($precisaFuncionarioId && (!$request->has('funcionario_id') || !$request->funcionario_id)) {
                    $request->merge([
                        'funcionario_id' => $funcionario->id
                    ]);
                }
                
                // Para vendas e OS, também preencher vendedor_id se não foi especificado
                if (($request->is('api/vendas') || $request->is('api/ordens-servico')) && 
                    in_array($request->method(), ['POST', 'PUT', 'PATCH']) &&
                    (!$request->has('vendedor_id') || !$request->vendedor_id)) {
                    $request->merge([
                        'vendedor_id' => $user->id,
                        'vendedor_nome' => $user->name
                    ]);
                }
            }
        }

        return $next($request);
    }
}
