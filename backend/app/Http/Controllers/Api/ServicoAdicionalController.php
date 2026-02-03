<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServicoAdicional;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;

class ServicoAdicionalController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $servicos = ServicoAdicional::ativos()
                ->where('tenant_id', $tenantId)
                ->where('tipo', 'envelopamento') // Filtrar apenas serviços de envelopamento
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $servicos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar serviços adicionais',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:255',
                'descricao' => 'nullable|string|max:1000',
                'preco' => 'required|numeric|min:0|max:999999.99',
                'unidade' => 'nullable|string|max:50',
                'categoria' => 'nullable|string|max:100',
                'tipo' => 'required|in:envelopamento,calculadora',
                'ordem' => 'nullable|integer|min:0'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $servicoData = $validator->validated();
            $servicoData['tenant_id'] = auth()->user()->tenant_id;
            $servicoData['user_id'] = auth()->id();

            $servico = ServicoAdicional::create($servicoData);

            return response()->json([
                'success' => true,
                'message' => 'Serviço adicional criado com sucesso',
                'data' => $servico
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar serviço adicional',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(ServicoAdicional $servicoAdicional): JsonResponse
    {
        try {
            // Verificar se o serviço pertence ao tenant do usuário
            if ($servicoAdicional->tenant_id !== auth()->user()->tenant_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Serviço não encontrado'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $servicoAdicional
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar serviço adicional',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ServicoAdicional $servicoAdicional): JsonResponse
    {
        try {
            // Verificar se o serviço pertence ao tenant do usuário
            if ($servicoAdicional->tenant_id !== auth()->user()->tenant_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Serviço não encontrado'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'nome' => [
                    'required',
                    'string',
                    'max:255',
                    Rule::unique('servicos_adicionais', 'nome')->where(function ($query) {
                        return $query->where('tenant_id', auth()->user()->tenant_id);
                    })->ignore($servicoAdicional->id)
                ],
                'descricao' => 'nullable|string|max:1000',
                'preco' => 'required|numeric|min:0|max:999999.99',
                'unidade' => 'nullable|string|max:50',
                'categoria' => 'nullable|string|max:100',
                'tipo' => 'required|in:envelopamento,calculadora',
                'ordem' => 'nullable|integer|min:0',
                'ativo' => 'nullable|boolean'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $servicoAdicional->update($validator->validated());

            return response()->json([
                'success' => true,
                'message' => 'Serviço adicional atualizado com sucesso',
                'data' => $servicoAdicional
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar serviço adicional',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ServicoAdicional $servicoAdicional): JsonResponse
    {
        try {
            // Verificar se o serviço pertence ao tenant do usuário
            if ($servicoAdicional->tenant_id !== auth()->user()->tenant_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Serviço não encontrado'
                ], 404);
            }

            $servicoAdicional->delete();

            return response()->json([
                'success' => true,
                'message' => 'Serviço adicional removido com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao remover serviço adicional',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle active status
     */
    public function toggleStatus(ServicoAdicional $servicoAdicional): JsonResponse
    {
        try {
            // Verificar se o serviço pertence ao tenant do usuário
            if ($servicoAdicional->tenant_id !== auth()->user()->tenant_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Serviço não encontrado'
                ], 404);
            }

            $servicoAdicional->ativo = !$servicoAdicional->ativo;
            $servicoAdicional->save();

            return response()->json([
                'success' => true,
                'message' => 'Status do serviço alterado com sucesso',
                'data' => $servicoAdicional
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao alterar status do serviço',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get services by category
     */
    public function getByCategory(string $categoria): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $servicos = ServicoAdicional::ativos()
                ->where('tenant_id', $tenantId)
                ->where('categoria', $categoria)
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $servicos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar serviços por categoria',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get services by type
     */
    public function getByType(string $tipo): JsonResponse
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            $servicos = ServicoAdicional::ativos()
                ->where('tenant_id', $tenantId)
                ->where('tipo', $tipo)
                ->orderBy('ordem')
                ->orderBy('nome')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $servicos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar serviços por tipo',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
