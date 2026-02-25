<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Acabamento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class AcabamentoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $acabamentos = Acabamento::where('tenant_id', $tenantId)->get();
            
            return response()->json($acabamentos);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao buscar acabamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome_acabamento' => 'required|string|max:255',
                'valor' => 'nullable|numeric|min:0',
                'valor_minimo' => 'required|numeric|min:0',
                'prazo_adicional' => 'nullable|integer|min:0',
                'valor_m2' => 'nullable|numeric',
                'valor_un' => 'nullable|numeric',
                'tipo_aplicacao' => 'required|in:fixo,variável,area_total,perimetro,unidade,metro_linear',
                'ativo' => 'boolean',
                'produto_vinculado_id' => 'nullable|numeric',
                'produto_vinculado_nome' => 'nullable|string|max:255',
                'produto_vinculado_custo' => 'nullable|numeric',
                'produto_vinculado_unidade_medida' => 'nullable|string|max:50',
                'produto_vinculado_estoque_no_momento_do_cadastro' => 'nullable|numeric',
                'quantidade_produto_por_unidade_acabamento' => 'nullable|numeric',
                'observacoes' => 'nullable|string'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $data = $request->all();
            $data['tenant_id'] = Auth::user()->tenant_id;
            
            $acabamento = Acabamento::create($data);
            
            return response()->json($acabamento, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao criar acabamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $acabamento = Acabamento::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$acabamento) {
                return response()->json([
                    'message' => 'Acabamento não encontrado'
                ], 404);
            }
            
            return response()->json($acabamento);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao buscar acabamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $acabamento = Acabamento::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$acabamento) {
                return response()->json([
                    'message' => 'Acabamento não encontrado'
                ], 404);
            }
            
            $validator = Validator::make($request->all(), [
                'nome_acabamento' => 'sometimes|required|string|max:255',
                'valor' => 'nullable|numeric|min:0',
                'valor_minimo' => 'sometimes|required|numeric|min:0',
                'prazo_adicional' => 'nullable|integer|min:0',
                'valor_m2' => 'nullable|numeric',
                'valor_un' => 'nullable|numeric',
                'tipo_aplicacao' => 'sometimes|required|in:fixo,variável,area_total,perimetro,unidade,metro_linear',
                'ativo' => 'boolean',
                'produto_vinculado_id' => 'nullable|numeric',
                'produto_vinculado_nome' => 'nullable|string|max:255',
                'produto_vinculado_custo' => 'nullable|numeric',
                'produto_vinculado_unidade_medida' => 'nullable|string|max:50',
                'produto_vinculado_estoque_no_momento_do_cadastro' => 'nullable|numeric',
                'quantidade_produto_por_unidade_acabamento' => 'nullable|numeric',
                'observacoes' => 'nullable|string'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $acabamento->update($request->all());
            
            return response()->json($acabamento);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao atualizar acabamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $acabamento = Acabamento::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$acabamento) {
                return response()->json([
                    'message' => 'Acabamento não encontrado'
                ], 404);
            }
            
            $acabamento->delete();
            
            return response()->json([
                'message' => 'Acabamento excluído com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao excluir acabamento',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
