<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConfiguracaoPontos;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class ConfiguracaoPontosController extends Controller
{
    /**
     * Obter configuração de pontos do tenant atual
     */
    public function show(): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            
            $configuracao = ConfiguracaoPontos::byTenant($tenantId)->first();
            
            if (!$configuracao) {
                // Retornar configuração padrão se não existir
                $configuracao = new ConfiguracaoPontos(ConfiguracaoPontos::getConfiguracaoPadrao());
                $configuracao->tenant_id = $tenantId;
            }
            
            return response()->json([
                'success' => true,
                'data' => $configuracao
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter configuração de pontos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar ou atualizar configuração de pontos
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            
            $validator = Validator::make($request->all(), [
                'ativo' => 'boolean',
                'pontos_por_reais' => 'numeric|min:0.01|max:10000',
                'validade_meses' => 'integer|min:1|max:120',
                'resgate_minimo' => 'integer|min:1|max:100000',
                'descricao' => 'nullable|string|max:500',
                'regras_adicionais' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $configuracao = ConfiguracaoPontos::byTenant($tenantId)->first();
            
            if ($configuracao) {
                // Atualizar configuração existente
                $configuracao->update($request->all());
            } else {
                // Criar nova configuração
                $configuracao = ConfiguracaoPontos::create(array_merge(
                    $request->all(),
                    ['tenant_id' => $tenantId]
                ));
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Configuração de pontos salva com sucesso',
                'data' => $configuracao
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar configuração de pontos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ativar/desativar programa de pontos
     */
    public function toggleStatus(Request $request): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            
            $validator = Validator::make($request->all(), [
                'ativo' => 'required|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $configuracao = ConfiguracaoPontos::byTenant($tenantId)->first();
            
            if ($configuracao) {
                $configuracao->update(['ativo' => $request->ativo]);
            } else {
                $configuracao = ConfiguracaoPontos::create([
                    'tenant_id' => $tenantId,
                    'ativo' => $request->ativo,
                    'pontos_por_reais' => 50.00,
                    'validade_meses' => 12,
                    'resgate_minimo' => 50,
                ]);
            }
            
            $status = $request->ativo ? 'ativado' : 'desativado';
            
            return response()->json([
                'success' => true,
                'message' => "Programa de pontos {$status} com sucesso",
                'data' => $configuracao
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao alterar status do programa de pontos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resetar configuração para valores padrão
     */
    public function reset(): JsonResponse
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            
            $configuracao = ConfiguracaoPontos::byTenant($tenantId)->first();
            
            if ($configuracao) {
                $configuracao->update(ConfiguracaoPontos::getConfiguracaoPadrao());
            } else {
                $configuracao = ConfiguracaoPontos::create(array_merge(
                    ConfiguracaoPontos::getConfiguracaoPadrao(),
                    ['tenant_id' => $tenantId]
                ));
            }
            
            return response()->json([
                'success' => true,
                'message' => 'Configuração resetada para valores padrão',
                'data' => $configuracao
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao resetar configuração: ' . $e->getMessage()
            ], 500);
        }
    }
}
