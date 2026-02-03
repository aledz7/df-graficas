<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalculoSavado;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class CalculoSavadoController extends Controller
{
    /**
     * Listar todos os cálculos salvos do usuário/tenant
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculos = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->orderBy('data_criacao', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Cálculos salvos recuperados com sucesso',
                'data' => $calculos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao recuperar cálculos salvos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Salvar um novo cálculo
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:255',
                'descricao' => 'nullable|string',
                'cliente' => 'nullable|array',
                'config' => 'nullable|array',
                'resultado' => 'nullable|numeric',
                'dados_calculo' => 'nullable|array',
                'itens' => 'nullable|array',
                'produtos' => 'nullable|array',
                'servicos_adicionais' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculo = CalculoSavado::create([
                'nome' => $request->nome,
                'descricao' => $request->descricao,
                'cliente' => $request->cliente,
                'config' => $request->config,
                'resultado' => $request->resultado,
                'dados_calculo' => $request->dados_calculo,
                'itens' => $request->itens,
                'produtos' => $request->produtos,
                'servicos_adicionais' => $request->servicos_adicionais,
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'status' => 'ativo',
                'data_criacao' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cálculo salvo com sucesso',
                'data' => $calculo
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao salvar cálculo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar um cálculo específico
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculo = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->find($id);

            if (!$calculo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cálculo não encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Cálculo recuperado com sucesso',
                'data' => $calculo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao recuperar cálculo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar um cálculo
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'sometimes|required|string|max:255',
                'descricao' => 'nullable|string',
                'cliente' => 'nullable|array',
                'config' => 'nullable|array',
                'resultado' => 'nullable|numeric',
                'dados_calculo' => 'nullable|array',
                'itens' => 'nullable|array',
                'produtos' => 'nullable|array',
                'servicos_adicionais' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculo = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->find($id);

            if (!$calculo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cálculo não encontrado'
                ], 404);
            }

            $calculo->update([
                'nome' => $request->nome ?? $calculo->nome,
                'descricao' => $request->descricao,
                'cliente' => $request->cliente,
                'config' => $request->config,
                'resultado' => $request->resultado,
                'dados_calculo' => $request->dados_calculo,
                'itens' => $request->itens,
                'produtos' => $request->produtos,
                'servicos_adicionais' => $request->servicos_adicionais,
                'data_atualizacao' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cálculo atualizado com sucesso',
                'data' => $calculo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar cálculo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir um cálculo (soft delete)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculo = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->find($id);

            if (!$calculo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cálculo não encontrado'
                ], 404);
            }

            $calculo->update(['status' => 'excluido']);
            $calculo->delete();

            return response()->json([
                'success' => true,
                'message' => 'Cálculo excluído com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir cálculo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Buscar cálculos por cliente
     */
    public function buscarPorCliente(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'cliente_id' => 'required|integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'ID do cliente é obrigatório',
                    'errors' => $validator->errors()
                ], 422);
            }

            $tenantId = auth()->user()->tenant_id;
            $userId = Auth::id();

            $calculos = CalculoSavado::where('user_id', $userId)
                ->where('tenant_id', $tenantId)
                ->where(function($query) {
                    $query->where('status', 'ativo')
                          ->orWhereNull('status');
                })
                ->whereJsonContains('cliente->id', $request->cliente_id)
                ->orderBy('data_criacao', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'message' => 'Cálculos do cliente recuperados com sucesso',
                'data' => $calculos
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar cálculos do cliente: ' . $e->getMessage()
            ], 500);
        }
    }
}
