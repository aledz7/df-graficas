<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use Illuminate\Http\Request;

class SharedOSController extends Controller
{
    /**
     * Visualizar OS compartilhada pelo token
     */
    public function show($token)
    {
        try {
            $os = OrdemServico::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                ->where('share_token', $token)
                ->where('share_enabled', true)
                ->first();

            if (!$os) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ordem de serviço não encontrada ou compartilhamento desabilitado'
                ], 404);
            }

            // Verificar se o compartilhamento expirou
            if ($os->share_expires_at && $os->share_expires_at->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'O link de compartilhamento expirou'
                ], 403);
            }

            // Carregar itens sem TenantScope
            $itens = OrdemServicoItem::withoutGlobalScope(\App\Models\Scopes\TenantScope::class)
                ->where('ordem_servico_id', $os->id)
                ->with(['produto' => function($query) {
                    $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
                }])
                ->get();

            $os->setRelation('itens', $itens);
            $os->load(['cliente']);

            return response()->json([
                'success' => true,
                'data' => $os
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao visualizar OS compartilhada:', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao carregar ordem de serviço'
            ], 500);
        }
    }
}
