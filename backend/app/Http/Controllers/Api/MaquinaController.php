<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Maquina;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class MaquinaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $tenantId = Auth::user()->tenant_id;
            $maquinas = Maquina::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->orderBy('nome')
                ->get();
            
            return response()->json($maquinas);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao buscar máquinas',
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
                'nome' => 'required|string|max:255',
                'funcao' => 'nullable|string',
                'largura' => 'nullable|string|max:100',
                'ativo' => 'boolean'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $data = $request->all();
            $data['tenant_id'] = Auth::user()->tenant_id;
            $data['ativo'] = $data['ativo'] ?? true;
            
            $maquina = Maquina::create($data);
            
            return response()->json($maquina, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao criar máquina',
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
            $maquina = Maquina::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$maquina) {
                return response()->json([
                    'message' => 'Máquina não encontrada'
                ], 404);
            }
            
            return response()->json($maquina);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao buscar máquina',
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
            $maquina = Maquina::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$maquina) {
                return response()->json([
                    'message' => 'Máquina não encontrada'
                ], 404);
            }
            
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:255',
                'funcao' => 'nullable|string',
                'largura' => 'nullable|string|max:100',
                'ativo' => 'boolean'
            ]);
            
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }
            
            $maquina->update($request->all());
            
            return response()->json($maquina);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao atualizar máquina',
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
            $maquina = Maquina::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
            
            if (!$maquina) {
                return response()->json([
                    'message' => 'Máquina não encontrada'
                ], 404);
            }
            
            $maquina->delete();
            
            return response()->json([
                'message' => 'Máquina excluída com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao excluir máquina',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
