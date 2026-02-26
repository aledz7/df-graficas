<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Venda;
use Illuminate\Http\Request;

class SharedVendaController extends Controller
{
    /**
     * Visualizar Venda compartilhada pelo token
     */
    public function show($token)
    {
        try {
            $venda = Venda::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                ->where('share_token', $token)
                ->where('share_enabled', true)
                ->with(['cliente', 'itens.produto'])
                ->first();

            if (!$venda) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venda não encontrada ou compartilhamento desabilitado'
                ], 404);
            }

            // Verificar se o compartilhamento expirou
            if ($venda->share_expires_at && $venda->share_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'O link de compartilhamento expirou'
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => $venda
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao visualizar venda compartilhada:', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar venda'
            ], 500);
        }
    }
}
