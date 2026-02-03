<?php

namespace App\Http\Controllers\Api;

use App\Models\LancamentoCaixa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CaixaController extends ResourceController
{
    protected $model = LancamentoCaixa::class;

    /**
     * Verificar se há caixa aberto
     */
    public function getCaixaAtual()
    {
        try {
            // Buscar abertura mais recente (ordenar por ID para garantir o mais recente)
            $abertura = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('id', 'desc') // Ordenar por ID para garantir o mais recente
                ->first();

            if (!$abertura) {
                return response()->json(['message' => 'Nenhum caixa aberto encontrado'], 404);
            }

            // Verificar se já foi fechado
            $sessaoId = $abertura->metadados['sessao_id'] ?? null;
            
            if ($sessaoId) {
                $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                    ->where('tenant_id', auth()->user()->tenant_id)
                    ->whereJsonContains('metadados->sessao_id', $sessaoId)
                    ->first();

                if ($fechamento) {
                    return response()->json(['message' => 'Nenhum caixa aberto encontrado'], 404);
                }
            }

            // Buscar todos os lançamentos da sessão
            $lancamentos = LancamentoCaixa::where('tenant_id', auth()->user()->tenant_id)
                ->where(function($query) use ($sessaoId, $abertura) {
                    if ($sessaoId) {
                        $query->whereJsonContains('metadados->sessao_id', $sessaoId);
                    } else {
                        // Se não há sessao_id, buscar lançamentos a partir da data de abertura
                        $query->where('data_operacao', '>=', $abertura->data_operacao);
                    }
                })
                ->orderBy('data_operacao', 'asc')
                ->get();

            // Calcular totais
            $totalEntradas = $lancamentos->where('tipo', 'entrada')->sum('valor');
            $totalSaidas = $lancamentos->where('tipo', 'saida')->sum('valor');
            $saldoEsperado = $abertura->valor + $totalEntradas - $totalSaidas;

            $caixaAtual = [
                'id' => $sessaoId ?? $abertura->id,
                'data_abertura' => $abertura->data_operacao,
                'valor_abertura' => $abertura->valor,
                'usuario_id' => $abertura->usuario_id,
                'usuario_nome' => $abertura->usuario_nome,
                'total_entradas' => $totalEntradas,
                'total_saidas' => $totalSaidas,
                'saldo_esperado' => $saldoEsperado,
                'lancamentos' => $lancamentos
            ];

            return response()->json($caixaAtual);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao buscar caixa atual: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Abrir caixa
     */
    public function abrirCaixa(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'valor_abertura' => 'required|numeric|min:0.01',
            'usuario_id' => 'required|exists:users,id',
            'usuario_nome' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Verificar se já há caixa aberto
            $abertura = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('id', 'desc') // Ordenar por ID para garantir o mais recente
                ->first();

            if ($abertura) {
                // Verificar se já foi fechado
                $sessaoId = $abertura->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', auth()->user()->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();

                    if (!$fechamento) {
                        return response()->json(['message' => 'Já existe um caixa aberto'], 422);
                    }
                } else {
                    return response()->json(['message' => 'Já existe um caixa aberto'], 422);
                }
            }

            // Buscar conta de caixa
            $contaCaixa = DB::table('contas_bancarias')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where(function($query) {
                    $query->where('nome', 'Caixa')
                          ->orWhere('tipo', 'caixa');
                })
                ->first();

            // Se não encontrar conta de caixa, criar uma padrão
            if (!$contaCaixa) {
                $contaId = DB::table('contas_bancarias')->insertGetId([
                    'tenant_id' => auth()->user()->tenant_id,
                    'nome' => 'Caixa',
                    'tipo' => 'caixa',
                    'saldo_inicial' => 0,
                    'saldo_atual' => 0,
                    'data_saldo_inicial' => now(),
                    'ativo' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $contaCaixa = DB::table('contas_bancarias')->where('id', $contaId)->first();
            }

            // Buscar categoria de Suprimento de Caixa
            $categoriaSuprimento = DB::table('categorias_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('nome', 'Suprimento de Caixa')
                ->first();

            // Se não encontrar, criar a categoria
            if (!$categoriaSuprimento) {
                $categoriaId = DB::table('categorias_caixa')->insertGetId([
                    'tenant_id' => auth()->user()->tenant_id,
                    'nome' => 'Suprimento de Caixa',
                    'descricao' => 'Adições de dinheiro ao caixa',
                    'tipo' => 'entrada',
                    'cor' => '#22c55e',
                    'icone' => 'arrow-up-circle',
                    'sistema' => true,
                    'ativo' => true,
                    'ordem' => 2,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $categoriaSuprimento = DB::table('categorias_caixa')->where('id', $categoriaId)->first();
            }

            // Criar lançamento de abertura
            $sessaoId = 'caixa-' . time();
            
            $abertura = LancamentoCaixa::create([
                'tenant_id' => auth()->user()->tenant_id,
                'tipo' => 'entrada',
                'valor' => $request->valor_abertura,
                'descricao' => 'Suprimento - Abertura de Caixa',
                'observacoes' => "Suprimento inicial para abertura de caixa no valor de R$ {$request->valor_abertura}",
                'data_operacao' => now(),
                'forma_pagamento' => 'dinheiro',
                'status' => 'concluido',
                'categoria_id' => $categoriaSuprimento->id,
                'categoria_nome' => 'Suprimento de Caixa',
                'conta_id' => $contaCaixa->id,
                'conta_nome' => $contaCaixa->nome,
                'usuario_id' => $request->usuario_id,
                'usuario_nome' => $request->usuario_nome,
                'operacao_tipo' => 'abertura_caixa',
                'metadados' => [
                    'sessao_id' => $sessaoId,
                    'valor_abertura' => $request->valor_abertura
                ]
            ]);

            return response()->json([
                'message' => 'Caixa aberto com sucesso',
                'data' => [
                    'id' => $sessaoId,
                    'data_abertura' => $abertura->data_operacao,
                    'valor_abertura' => $abertura->valor,
                    'usuario_id' => $abertura->usuario_id,
                    'usuario_nome' => $abertura->usuario_nome
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao abrir caixa: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Fechar caixa
     */
    public function fecharCaixa(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'valor_fechamento' => 'required|numeric|min:0',
            'usuario_id' => 'required|exists:users,id',
            'usuario_nome' => 'required|string|max:255',
            'sessao_id' => 'required|string',
            'valor_apurado' => 'required|numeric',
            'diferenca' => 'required|numeric',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            // Verificar se há caixa aberto
            $abertura = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->whereJsonContains('metadados->sessao_id', $request->sessao_id)
                ->first();

            if (!$abertura) {
                return response()->json(['message' => 'Caixa não encontrado ou já fechado'], 404);
            }

            // Verificar se já foi fechado
            $fechamentoExistente = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->whereJsonContains('metadados->sessao_id', $request->sessao_id)
                ->first();

            if ($fechamentoExistente) {
                return response()->json(['message' => 'Caixa já foi fechado'], 422);
            }

            // Buscar conta de caixa
            $contaCaixa = DB::table('contas_bancarias')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where(function($query) {
                    $query->where('nome', 'Caixa')
                          ->orWhere('tipo', 'caixa');
                })
                ->first();

            // Se não encontrar conta de caixa, criar uma padrão
            if (!$contaCaixa) {
                $contaId = DB::table('contas_bancarias')->insertGetId([
                    'tenant_id' => auth()->user()->tenant_id,
                    'nome' => 'Caixa',
                    'tipo' => 'caixa',
                    'saldo_inicial' => 0,
                    'saldo_atual' => 0,
                    'data_saldo_inicial' => now(),
                    'ativo' => true,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                $contaCaixa = DB::table('contas_bancarias')->where('id', $contaId)->first();
            }

            // Criar lançamento de fechamento
            $fechamento = LancamentoCaixa::create([
                'tenant_id' => auth()->user()->tenant_id,
                'tipo' => 'saida',
                'valor' => $request->valor_fechamento,
                'descricao' => 'Fechamento de Caixa',
                'observacoes' => $request->observacoes ?? "Fechamento de caixa com valor informado de R$ {$request->valor_fechamento}",
                'data_operacao' => now(),
                'forma_pagamento' => 'dinheiro',
                'status' => 'concluido',
                'categoria_nome' => 'Fechamento de Caixa',
                'conta_id' => $contaCaixa->id,
                'conta_nome' => $contaCaixa->nome,
                'usuario_id' => $request->usuario_id,
                'usuario_nome' => $request->usuario_nome,
                'operacao_tipo' => 'fechamento_caixa',
                'metadados' => [
                    'sessao_id' => $request->sessao_id,
                    'valor_fechamento_informado' => $request->valor_fechamento,
                    'valor_fechamento_apurado' => $request->valor_apurado,
                    'diferenca' => $request->diferenca,
                    'observacoes' => $request->observacoes
                ]
            ]);

            return response()->json([
                'message' => 'Caixa fechado com sucesso',
                'data' => [
                    'id' => $request->sessao_id,
                    'data_fechamento' => $fechamento->data_operacao,
                    'valor_fechamento_informado' => $fechamento->valor,
                    'valor_fechamento_apurado' => $request->valor_apurado,
                    'diferenca' => $request->diferenca,
                    'usuario_id' => $fechamento->usuario_id,
                    'usuario_nome' => $fechamento->usuario_nome
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao fechar caixa: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Buscar histórico de sessões de caixa
     */
    public function getHistoricoCaixas()
    {
        try {
            // Buscar todas as aberturas
            $aberturas = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->get();

            $historico = [];

            foreach ($aberturas as $abertura) {
                $sessaoId = $abertura->metadados['sessao_id'] ?? $abertura->id;
                
                // Buscar fechamento correspondente
                $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                    ->where('tenant_id', auth()->user()->tenant_id)
                    ->whereJsonContains('metadados->sessao_id', $sessaoId)
                    ->first();

                // Buscar lançamentos da sessão
                $lancamentos = LancamentoCaixa::where('tenant_id', auth()->user()->tenant_id)
                    ->where(function($query) use ($sessaoId, $abertura) {
                        if ($sessaoId) {
                            $query->whereJsonContains('metadados->sessao_id', $sessaoId);
                        } else {
                            $query->where('data_operacao', '>=', $abertura->data_operacao);
                        }
                    })
                    ->where('operacao_tipo', '!=', 'abertura_caixa')
                    ->where('operacao_tipo', '!=', 'fechamento_caixa')
                    ->get();

                $totalEntradas = $lancamentos->where('tipo', 'entrada')->sum('valor');
                $totalSaidas = $lancamentos->where('tipo', 'saida')->sum('valor');
                $saldoEsperado = $abertura->valor + $totalEntradas - $totalSaidas;

                $sessao = [
                    'id' => $sessaoId,
                    'data_abertura' => $abertura->data_operacao,
                    'valor_abertura' => $abertura->valor,
                    'usuario_id' => $abertura->usuario_id,
                    'usuario_nome' => $abertura->usuario_nome,
                    'data_fechamento' => $fechamento ? $fechamento->data_operacao : null,
                    'valor_fechamento_informado' => $fechamento ? $fechamento->valor : null,
                    'valor_fechamento_apurado' => $fechamento ? $fechamento->metadados['valor_fechamento_apurado'] ?? null : null,
                    'diferenca' => $fechamento ? $fechamento->metadados['diferenca'] ?? null : null,
                    'usuario_fechamento_id' => $fechamento ? $fechamento->usuario_id : null,
                    'usuario_fechamento_nome' => $fechamento ? $fechamento->usuario_nome : null,
                    'observacoes' => $fechamento ? $fechamento->observacoes : null,
                    'total_entradas' => $totalEntradas,
                    'total_saidas' => $totalSaidas,
                    'saldo_esperado' => $saldoEsperado,
                    'status' => $fechamento ? 'fechado' : 'aberto'
                ];

                $historico[] = $sessao;
            }

            return response()->json($historico);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao buscar histórico: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Buscar detalhes de uma sessão específica
     */
    public function getSessaoCaixa($sessaoId)
    {
        try {
            // Buscar abertura da sessão
            $abertura = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->whereJsonContains('metadados->sessao_id', $sessaoId)
                ->first();

            if (!$abertura) {
                return response()->json(['message' => 'Sessão não encontrada'], 404);
            }

            // Buscar fechamento
            $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->whereJsonContains('metadados->sessao_id', $sessaoId)
                ->first();

            // Buscar todos os lançamentos da sessão
            $lancamentos = LancamentoCaixa::where('tenant_id', auth()->user()->tenant_id)
                ->whereJsonContains('metadados->sessao_id', $sessaoId)
                ->orderBy('data_operacao', 'asc')
                ->get();

            $totalEntradas = $lancamentos->where('tipo', 'entrada')->sum('valor');
            $totalSaidas = $lancamentos->where('tipo', 'saida')->sum('valor');
            $saldoEsperado = $abertura->valor + $totalEntradas - $totalSaidas;

            $sessao = [
                'id' => $sessaoId,
                'data_abertura' => $abertura->data_operacao,
                'valor_abertura' => $abertura->valor,
                'usuario_id' => $abertura->usuario_id,
                'usuario_nome' => $abertura->usuario_nome,
                'data_fechamento' => $fechamento ? $fechamento->data_operacao : null,
                'valor_fechamento_informado' => $fechamento ? $fechamento->valor : null,
                'valor_fechamento_apurado' => $fechamento ? $fechamento->metadados['valor_fechamento_apurado'] ?? null : null,
                'diferenca' => $fechamento ? $fechamento->metadados['diferenca'] ?? null : null,
                'usuario_fechamento_id' => $fechamento ? $fechamento->usuario_id : null,
                'usuario_fechamento_nome' => $fechamento ? $fechamento->usuario_nome : null,
                'observacoes' => $fechamento ? $fechamento->observacoes : null,
                'total_entradas' => $totalEntradas,
                'total_saidas' => $totalSaidas,
                'saldo_esperado' => $saldoEsperado,
                'status' => $fechamento ? 'fechado' : 'aberto',
                'lancamentos' => $lancamentos
            ];

            return response()->json($sessao);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao buscar sessão: ' . $e->getMessage()], 500);
        }
    }
} 