<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PDVController extends Controller
{
    /**
     * Salvar histórico de vendas PDV
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function salvarHistoricoVendas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dados' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        try {
            // Salvar os dados na tabela dados_usuario
            $user = Auth::user();
            
            DB::table('dados_usuario')
                ->updateOrInsert(
                    [
                        'user_id' => $user->id,
                        'chave' => 'historico_vendas_pdv'
                    ],
                    [
                        'valor' => json_encode($request->dados),
                        'updated_at' => now(),
                        'created_at' => now()
                    ]
                );

            return response()->json(['message' => 'Histórico de vendas PDV salvo com sucesso'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao salvar histórico de vendas PDV: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Salvar histórico de orçamentos PDV
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function salvarHistoricoOrcamentos(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dados' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        try {
            // Salvar os dados na tabela dados_usuario
            $user = Auth::user();
            
            DB::table('dados_usuario')
                ->updateOrInsert(
                    [
                        'user_id' => $user->id,
                        'chave' => 'orcamentosPDV'
                    ],
                    [
                        'valor' => json_encode($request->dados),
                        'updated_at' => now(),
                        'created_at' => now()
                    ]
                );

            return response()->json(['message' => 'Histórico de orçamentos PDV salvo com sucesso'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao salvar histórico de orçamentos PDV: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obter histórico de vendas PDV
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obterHistoricoVendas()
    {
        try {
            $user = Auth::user();
            
            $dados = DB::table('dados_usuario')
                ->where('user_id', $user->id)
                ->where('chave', 'historico_vendas_pdv')
                ->first();

            if ($dados && $dados->valor) {
                return response()->json(json_decode($dados->valor), 200);
            }

            return response()->json([], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao obter histórico de vendas PDV: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obter histórico de orçamentos PDV
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function obterHistoricoOrcamentos()
    {
        try {
            $user = Auth::user();
            
            $dados = DB::table('dados_usuario')
                ->where('user_id', $user->id)
                ->where('chave', 'orcamentosPDV')
                ->first();

            if ($dados && $dados->valor) {
                return response()->json(json_decode($dados->valor), 200);
            }

            return response()->json([], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao obter histórico de orçamentos PDV: ' . $e->getMessage()], 500);
        }
    }
}
