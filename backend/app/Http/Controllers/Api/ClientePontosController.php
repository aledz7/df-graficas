<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\ConfiguracaoPontos;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ClientePontosController extends Controller
{
    /**
     * Atualizar pontos do cliente
     */
    public function atualizarPontos(Request $request, $clienteId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'valor_venda' => 'required|numeric|min:0.01',
                'tipo_operacao' => 'required|in:acumular,utilizar',
                'data_operacao' => 'required|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $cliente = Cliente::find($clienteId);
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente não encontrado'
                ], 404);
            }

            // Verificar se o sistema de pontos está ativo
            $configuracao = ConfiguracaoPontos::byTenant(Auth::user()->tenant_id)->first();
            if (!$configuracao || !$configuracao->ativo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sistema de pontos está desativado'
                ], 400);
            }

            $valorVenda = $request->valor_venda;
            $tipoOperacao = $request->tipo_operacao;

            DB::beginTransaction();

            try {
                if ($tipoOperacao === 'acumular') {
                    // Calcular pontos a ganhar
                    $pontosGanhos = floor($valorVenda / $configuracao->pontos_por_reais);
                    
                    if ($pontosGanhos > 0) {
                        $cliente->total_pontos_ganhos += $pontosGanhos;
                        $cliente->saldo_pontos_atual += $pontosGanhos;
                        $cliente->save();

                        DB::commit();

                        return response()->json([
                            'success' => true,
                            'message' => "Cliente ganhou {$pontosGanhos} pontos",
                            'data' => [
                                'pontos_ganhos' => $pontosGanhos,
                                'total_pontos_ganhos' => $cliente->total_pontos_ganhos,
                                'saldo_pontos_atual' => $cliente->saldo_pontos_atual
                            ]
                        ]);
                    } else {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Valor da venda insuficiente para gerar pontos'
                        ], 400);
                    }
                } else {
                    // Utilizar pontos
                    $pontosParaUsar = floor($valorVenda); // 1 ponto = R$ 1,00
                    
                    if ($pontosParaUsar > $cliente->saldo_pontos_atual) {
                        DB::rollBack();
                        return response()->json([
                            'success' => false,
                            'message' => 'Saldo de pontos insuficiente'
                        ], 400);
                    }

                    $cliente->pontos_utilizados += $pontosParaUsar;
                    $cliente->saldo_pontos_atual -= $pontosParaUsar;
                    $cliente->save();

                    DB::commit();

                    return response()->json([
                        'success' => true,
                        'message' => "Cliente utilizou {$pontosParaUsar} pontos",
                        'data' => [
                            'pontos_utilizados' => $pontosParaUsar,
                            'pontos_utilizados_total' => $cliente->pontos_utilizados,
                            'saldo_pontos_atual' => $cliente->saldo_pontos_atual
                        ]
                    ]);
                }
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar pontos do cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter pontos do cliente
     */
    public function getPontos($clienteId): JsonResponse
    {
        try {
            $cliente = Cliente::find($clienteId);
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente não encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'total_pontos_ganhos' => $cliente->total_pontos_ganhos,
                    'pontos_utilizados' => $cliente->pontos_utilizados,
                    'pontos_expirados' => $cliente->pontos_expirados,
                    'saldo_pontos_atual' => $cliente->saldo_pontos_atual
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter pontos do cliente: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Resgatar pontos do cliente
     */
    public function resgatarPontos(Request $request, $clienteId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'pontos_para_resgatar' => 'required|integer|min:1',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $cliente = Cliente::find($clienteId);
            if (!$cliente) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cliente não encontrado'
                ], 404);
            }

            // Verificar se o sistema de pontos está ativo
            $configuracao = ConfiguracaoPontos::byTenant(Auth::user()->tenant_id)->first();
            if (!$configuracao || !$configuracao->ativo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sistema de pontos está desativado'
                ], 400);
            }

            $pontosParaResgatar = $request->pontos_para_resgatar;

            // Verificar se tem pontos suficientes
            if ($pontosParaResgatar > $cliente->saldo_pontos_atual) {
                return response()->json([
                    'success' => false,
                    'message' => 'Saldo de pontos insuficiente'
                ], 400);
            }

            // Verificar valor mínimo para resgate
            if ($pontosParaResgatar < $configuracao->resgate_minimo) {
                return response()->json([
                    'success' => false,
                    'message' => "Valor mínimo para resgate é {$configuracao->resgate_minimo} pontos"
                ], 400);
            }

            DB::beginTransaction();

            try {
                $cliente->pontos_utilizados += $pontosParaResgatar;
                $cliente->saldo_pontos_atual -= $pontosParaResgatar;
                $cliente->save();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => "Resgate de {$pontosParaResgatar} pontos realizado com sucesso",
                    'data' => [
                        'pontos_resgatados' => $pontosParaResgatar,
                        'pontos_utilizados_total' => $cliente->pontos_utilizados,
                        'saldo_pontos_atual' => $cliente->saldo_pontos_atual
                    ]
                ]);
            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao resgatar pontos: ' . $e->getMessage()
            ], 500);
        }
    }
} 