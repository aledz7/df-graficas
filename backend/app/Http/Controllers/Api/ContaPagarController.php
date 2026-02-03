<?php

namespace App\Http\Controllers\Api;

use App\Models\ContaPagar;
use App\Models\LancamentoCaixa;
use App\Models\Cliente;
use App\Models\Categoria;
use App\Models\ContaBancaria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use App\Models\CategoriaCaixa;

class ContaPagarController extends BaseController
{
    /**
     * Lista todas as contas a pagar
     */
    public function index(Request $request)
    {
        try {
            $query = ContaPagar::query();

            // Filtros
            if ($request->has('status') && $request->status !== 'todos') {
                $query->where('status', $request->status);
            }

            if ($request->has('fornecedor_id') && $request->fornecedor_id !== 'todos') {
                $query->where('fornecedor_id', $request->fornecedor_id);
            }

            if ($request->has('periodo_inicio')) {
                $query->whereDate('data_vencimento', '>=', $request->periodo_inicio);
            }

            if ($request->has('periodo_fim')) {
                $query->whereDate('data_vencimento', '<=', $request->periodo_fim);
            }

            // Atualizar status das contas automaticamente
            $query->get()->each(function ($conta) {
                $conta->atualizarStatus();
            });

            $contas = $query->with(['fornecedor', 'categoria'])
                           ->where('user_id', auth()->id())
                           ->orderBy('data_vencimento')
                           ->get()
                           ->map(function ($conta) {
                               // Adicionar fornecedor_id virtual se estiver nos metadados
                               if (!$conta->fornecedor_id && $conta->metadados && is_array($conta->metadados) && isset($conta->metadados['fornecedor_id'])) {
                                   $conta->fornecedor_id = $conta->metadados['fornecedor_id'];
                               }
                               return $conta;
                           });

            return $this->success($contas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar contas a pagar: ' . $e->getMessage());
        }
    }

    /**
     * Mostra uma conta específica
     */
    public function show($id)
    {
        try {
            $conta = ContaPagar::with(['fornecedor', 'categoria'])
                               ->where('user_id', auth()->id())
                               ->findOrFail($id);
            
            $conta->atualizarStatus();
            
            // Adicionar fornecedor_id virtual se estiver nos metadados
            if (!$conta->fornecedor_id && $conta->metadados && is_array($conta->metadados) && isset($conta->metadados['fornecedor_id'])) {
                $conta->fornecedor_id = $conta->metadados['fornecedor_id'];
            }
            
            return $this->success($conta);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar conta: ' . $e->getMessage());
        }
    }

    /**
     * Cria uma nova conta a pagar
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'descricao' => 'required|string|max:255',
            'valor' => 'required|numeric|min:0.01',
            'data_vencimento' => 'required|date',
            'fornecedor_id' => 'nullable|string',
            'categoria_id' => 'nullable|exists:categorias,id',
            'recorrencia' => 'nullable|in:nao_recorre,mensal,bimestral,trimestral,semestral,anual',
            'data_inicio_contrato' => 'nullable|date',
            'data_fim_contrato' => 'nullable|date|after_or_equal:data_inicio_contrato',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            // Preparar dados para criação
            $dadosConta = [
                'user_id' => auth()->id(),
                'descricao' => $request->descricao,
                'valor' => $request->valor,
                'data_vencimento' => $request->data_vencimento,
                'categoria_id' => $request->categoria_id,
                'recorrencia' => $request->recorrencia ?? 'nao_recorre',
                'data_inicio_contrato' => $request->data_inicio_contrato,
                'data_fim_contrato' => $request->data_fim_contrato,
                'observacoes' => $request->observacoes,
                'status' => 'pendente',
            ];
            
            // Se fornecedor_id for numérico, salvar no campo fornecedor_id
            if ($request->fornecedor_id && is_numeric($request->fornecedor_id)) {
                $dadosConta['fornecedor_id'] = $request->fornecedor_id;
            }
            
            // Se fornecedor_id for string, salvar nos metadados
            if ($request->fornecedor_id && !is_numeric($request->fornecedor_id)) {
                $dadosConta['metadados'] = [
                    'fornecedor_id' => $request->fornecedor_id
                ];
            }
            
            \Log::info('Dados para criar conta:', $dadosConta);
            
            $conta = ContaPagar::create($dadosConta);

            $conta->load(['fornecedor', 'categoria']);

            return $this->success($conta, 'Conta a pagar criada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao criar conta a pagar: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza uma conta a pagar
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'descricao' => 'sometimes|string|max:255',
            'valor' => 'sometimes|numeric|min:0.01',
            'data_vencimento' => 'sometimes|date',
            'fornecedor_id' => 'nullable|string',
            'categoria_id' => 'nullable|exists:categorias,id',
            'recorrencia' => 'sometimes|in:nao_recorre,mensal,bimestral,trimestral,semestral,anual',
            'data_inicio_contrato' => 'nullable|date',
            'data_fim_contrato' => 'nullable|date|after_or_equal:data_inicio_contrato',
            'observacoes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $conta = ContaPagar::where('user_id', auth()->id())->findOrFail($id);
            
            // Preparar dados para atualização
            $data = $request->except(['fornecedor_id']);
            
            // Se fornecedor_id for numérico, incluir no update
            if ($request->fornecedor_id && is_numeric($request->fornecedor_id)) {
                $data['fornecedor_id'] = $request->fornecedor_id;
            }
            
            // Se fornecedor_id for string, salvar nos metadados
            if ($request->fornecedor_id && !is_numeric($request->fornecedor_id)) {
                $metadados = is_array($conta->metadados) ? $conta->metadados : [];
                $metadados['fornecedor_id'] = $request->fornecedor_id;
                $data['metadados'] = $metadados;
            }
            
            $conta->update($data);
            $conta->load(['fornecedor', 'categoria']);

            return $this->success($conta, 'Conta atualizada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar conta: ' . $e->getMessage());
        }
    }

    /**
     * Remove uma conta a pagar
     */
    public function destroy($id)
    {
        try {
            $conta = ContaPagar::where('user_id', auth()->id())->findOrFail($id);
            $conta->delete();

            return $this->success(null, 'Conta removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover conta: ' . $e->getMessage());
        }
    }

    /**
     * Registra pagamento de uma conta com múltiplas formas de pagamento
     */
    public function pagar(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'pagamentos' => 'required|array|min:1',
            'pagamentos.*.forma_pagamento' => 'required|string|max:50',
            'pagamentos.*.valor' => 'required|numeric|min:0.01',
            'pagamentos.*.conta_bancaria_id' => 'nullable|exists:contas_bancarias,id',
            'pagamentos.*.data_pagamento' => 'required|date',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            \Log::info('Iniciando pagamento de conta', ['conta_id' => $id]);
            
            $conta = ContaPagar::where('user_id', auth()->id())->findOrFail($id);

            if ($conta->status === 'pago') {
                return $this->error('Conta já está paga', 422);
            }

            $pagamentos = $request->pagamentos;
            $totalPagamentos = collect($pagamentos)->sum('valor');

            if (abs($totalPagamentos - $conta->valor) > 0.01) {
                return $this->error('O total dos pagamentos não corresponde ao valor da conta', 422);
            }

            // Marcar conta como paga
            $conta->marcarComoPaga();
            $conta->data_pagamento = now();

            // Verificar se há caixa aberto (opcional - não bloqueia criação de lançamentos)
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            $sessaoId = null;
            if ($caixaAberto) {
                $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', auth()->user()->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();
                    
                    // Se há fechamento, não usar sessao_id mas ainda criar o lançamento
                    if ($fechamento) {
                        \Log::info('💰 [ContaPagarController] Caixa fechado, criando lançamento sem sessao_id', [
                            'conta_id' => $id
                        ]);
                        $sessaoId = null;
                    }
                }
            } else {
                \Log::info('💰 [ContaPagarController] Nenhum caixa aberto encontrado, criando lançamento sem sessao_id', [
                    'conta_id' => $id
                ]);
            }

            // Buscar conta de caixa padrão (para dinheiro)
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('💰 [ContaPagarController] Conta de caixa não encontrada, usando conta padrão como fallback', [
                    'tenant_id' => auth()->user()->tenant_id
                ]);
            }

            // Buscar categoria de despesa
            $categoriaDespesa = CategoriaCaixa::where('tipo', 'despesa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            // Criar lançamentos para cada pagamento
            foreach ($pagamentos as $pagamento) {
                $formaPagamento = $pagamento['forma_pagamento'];
                $valor = $pagamento['valor'];
                $contaBancariaId = $pagamento['conta_bancaria_id'] ?? null;

                // Validar se métodos não-dinheiro têm conta bancária
                if (strtolower($formaPagamento) !== 'dinheiro' && !$contaBancariaId) {
                    return $this->error("Conta bancária é obrigatória para pagamentos via {$formaPagamento}", 422);
                }

                // Determinar a conta bancária
                $contaBancariaIdFinal = null;
                $contaBancariaNome = null;

                // Priorizar conta bancária selecionada
                if ($contaBancariaId) {
                    $contaBancaria = ContaBancaria::find($contaBancariaId);
                    if ($contaBancaria && $contaBancaria->tenant_id === auth()->user()->tenant_id) {
                        $contaBancariaIdFinal = $contaBancaria->id;
                        $contaBancariaNome = $contaBancaria->nome;
                        \Log::info('💰 [ContaPagarController] Usando conta bancária selecionada', [
                            'conta_bancaria_id' => $contaBancariaIdFinal,
                            'conta_bancaria_nome' => $contaBancariaNome,
                            'forma_pagamento' => $formaPagamento
                        ]);
                    } else {
                        \Log::warning('💰 [ContaPagarController] Conta bancária selecionada não encontrada ou não pertence ao tenant', [
                            'conta_bancaria_id_recebida' => $contaBancariaId,
                            'tenant_id' => auth()->user()->tenant_id
                        ]);
                    }
                }

                // Fallback logic se não encontrou conta específica
                if (!$contaBancariaIdFinal) {
                    $formaPagamentoLower = strtolower($formaPagamento);

                    if ($formaPagamentoLower === 'dinheiro') {
                        // Para dinheiro, usar conta de caixa
                        if ($contaCaixa) {
                            $contaBancariaIdFinal = $contaCaixa->id;
                            $contaBancariaNome = $contaCaixa->nome;
                            \Log::info('💰 [ContaPagarController] Usando conta de caixa para pagamento em dinheiro', [
                                'conta_id' => $contaBancariaIdFinal
                            ]);
                        } else {
                            \Log::error('💰 [ContaPagarController] Conta de caixa não encontrada para pagamento em dinheiro', [
                                'tenant_id' => auth()->user()->tenant_id
                            ]);
                            // Fallback para conta padrão se não houver caixa
                            $contaPadrao = ContaBancaria::where('tenant_id', auth()->user()->tenant_id)
                                ->where('conta_padrao', true)
                                ->where('ativo', true)
                                ->first();
                            if ($contaPadrao) {
                                $contaBancariaIdFinal = $contaPadrao->id;
                                $contaBancariaNome = $contaPadrao->nome;
                                \Log::warning('💰 [ContaPagarController] Conta de caixa não encontrada, usando conta padrão do sistema como fallback', [
                                    'conta_id' => $contaBancariaIdFinal,
                                    'forma_pagamento' => $formaPagamento
                                ]);
                            } else {
                                throw new \Exception('Nenhuma conta de caixa ou conta padrão encontrada para registrar o lançamento.');
                            }
                        }
                    } else {
                        // Para outras formas de pagamento, buscar conta padrão do sistema
                        $contaPadrao = ContaBancaria::where('tenant_id', auth()->user()->tenant_id)
                            ->where('conta_padrao', true)
                            ->where('ativo', true)
                            ->first();

                        if ($contaPadrao) {
                            $contaBancariaIdFinal = $contaPadrao->id;
                            $contaBancariaNome = $contaPadrao->nome;
                            \Log::info('💰 [ContaPagarController] Usando conta padrão do sistema (conta selecionada não encontrada)', [
                                'conta_id' => $contaBancariaIdFinal,
                                'forma_pagamento' => $formaPagamento
                            ]);
                        } else if ($contaCaixa) {
                            // Fallback para conta de caixa se não houver conta padrão
                            $contaBancariaIdFinal = $contaCaixa->id;
                            $contaBancariaNome = $contaCaixa->nome;
                            \Log::warning('💰 [ContaPagarController] Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                                'conta_id' => $contaBancariaIdFinal,
                                'forma_pagamento' => $formaPagamento
                            ]);
                        } else {
                            throw new \Exception('Nenhuma conta bancária padrão ou conta de caixa encontrada para registrar o lançamento.');
                        }
                    }
                }

                if (!$contaBancariaIdFinal || !$contaBancariaNome) {
                    \Log::error('💰 [ContaPagarController] Não foi possível determinar a conta bancária para o lançamento.', [
                        'conta_id' => $id,
                        'pagamento' => $pagamento
                    ]);
                    continue; // Pular este pagamento e continuar com os próximos
                }

                if ($valor <= 0) {
                    \Log::warning('💰 [ContaPagarController] Valor do pagamento é zero ou negativo, pulando lançamento.', [
                        'conta_id' => $id,
                        'valor' => $valor,
                        'pagamento' => $pagamento
                    ]);
                    continue;
                }

                // Criar lançamento para todos os pagamentos (removida dependência de caixa aberto)
                $dadosLancamento = [
                    'tenant_id' => auth()->user()->tenant_id,
                    'descricao' => "Pagamento: {$conta->descricao}",
                    'valor' => $valor,
                    'tipo' => 'saida',
                    'categoria_id' => $categoriaDespesa ? $categoriaDespesa->id : ($conta->categoria_id ?: null),
                    'categoria_nome' => $conta->categoria ? $conta->categoria->nome : 'Contas a Pagar',
                    'conta_id' => $contaBancariaIdFinal,
                    'conta_nome' => $contaBancariaNome,
                    'forma_pagamento' => $formaPagamento,
                    'operacao_tipo' => 'conta_pagar_paga',
                    'operacao_id' => $conta->id,
                    'usuario_id' => auth()->id(),
                    'usuario_nome' => auth()->user()->name,
                    'status' => 'concluido',
                    'data_operacao' => $pagamento['data_pagamento'] ?? now(),
                    'metadados' => [
                        'sessao_id' => $sessaoId, // sessaoId pode ser null se não houver caixa aberto
                        'conta_pagar_id' => $conta->id,
                        'data_vencimento' => $conta->data_vencimento,
                        'conta_bancaria_id' => $contaBancariaIdFinal,
                        'conta_bancaria_nome' => $contaBancariaNome,
                    ]
                ];

                try {
                    LancamentoCaixa::create($dadosLancamento);
                    \Log::info('💰 [ContaPagarController] Lançamento criado com sucesso', [
                        'conta_id' => $id,
                        'forma_pagamento' => $formaPagamento,
                        'valor' => $valor,
                        'conta_bancaria_id' => $contaBancariaIdFinal,
                        'tipo' => 'saida'
                    ]);
                } catch (\Exception $e) {
                    \Log::error('💰 [ContaPagarController] Erro ao criar lançamento', [
                        'conta_id' => $id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                }
            }

            // Gerar próxima conta recorrente se necessário
            if ($conta->recorrencia !== 'nao_recorre') {
                $this->gerarProximaContaRecorrente($conta);
            }

            $conta->load(['fornecedor', 'categoria']);

            return $this->success($conta, 'Pagamento registrado com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao pagar conta', [
                'conta_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao pagar conta: ' . $e->getMessage());
        }
    }

    /**
     * Marca uma conta como paga
     */
    public function marcarComoPaga(Request $request, $id)
    {
        try {
            \Log::info('Iniciando marcação de conta como paga', ['conta_id' => $id]);
            
            $conta = ContaPagar::where('user_id', auth()->id())->findOrFail($id);

            if ($conta->status === 'pago') {
                \Log::info('Conta já está paga', ['conta_id' => $id]);
                return $this->error('Conta já está paga', 422);
            }

            \Log::info('Marcando conta como paga', ['conta_id' => $id, 'status_anterior' => $conta->status]);
            
            // Marcar como paga
            $conta->marcarComoPaga();

            \Log::info('Conta marcada como paga com sucesso', ['conta_id' => $id, 'status_novo' => $conta->status]);

            // Verificar se há caixa aberto (opcional - não bloqueia criação de lançamentos)
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            $sessaoId = null;
            if ($caixaAberto) {
                $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', auth()->user()->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();
                    
                    // Se há fechamento, não usar sessao_id mas ainda criar o lançamento
                    if ($fechamento) {
                        \Log::info('💰 [ContaPagarController::marcarComoPaga] Caixa fechado, criando lançamento sem sessao_id', [
                            'conta_id' => $id
                        ]);
                        $sessaoId = null;
                    }
                }
            } else {
                \Log::info('💰 [ContaPagarController::marcarComoPaga] Nenhum caixa aberto encontrado, criando lançamento sem sessao_id', [
                    'conta_id' => $id
                ]);
            }

            // Buscar conta de caixa padrão
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('💰 [ContaPagarController::marcarComoPaga] Conta de caixa não encontrada, usando conta padrão como fallback', [
                    'tenant_id' => auth()->user()->tenant_id
                ]);
                
                // Fallback para conta padrão
                $contaPadrao = ContaBancaria::where('tenant_id', auth()->user()->tenant_id)
                    ->where('conta_padrao', true)
                    ->where('ativo', true)
                    ->first();
                
                if ($contaPadrao) {
                    $contaCaixa = $contaPadrao;
                    \Log::info('💰 [ContaPagarController::marcarComoPaga] Usando conta padrão como fallback', [
                        'conta_id' => $contaPadrao->id
                    ]);
                } else {
                    \Log::error('💰 [ContaPagarController::marcarComoPaga] Nenhuma conta de caixa ou conta padrão encontrada', [
                        'tenant_id' => auth()->user()->tenant_id
                    ]);
                    return $this->error('Nenhuma conta de caixa ou conta padrão encontrada para registrar o pagamento', 422);
                }
            }

            // Criar lançamento sempre (removida dependência de caixa aberto)
            if ($contaCaixa) {
                \Log::info('💰 [ContaPagarController::marcarComoPaga] Criando lançamento de saída', [
                    'conta_id' => $id,
                    'conta_caixa_id' => $contaCaixa->id,
                    'sessao_id' => $sessaoId
                ]);

                // Preparar dados do lançamento
                $dadosLancamento = [
                    'tenant_id' => auth()->user()->tenant_id,
                    'descricao' => "Pagamento: {$conta->descricao}",
                    'valor' => $conta->valor,
                    'tipo' => 'saida',
                    'categoria_id' => is_numeric($conta->categoria_id) ? $conta->categoria_id : null,
                    'categoria_nome' => $conta->categoria ? $conta->categoria->nome : 'Contas a Pagar',
                    'conta_id' => $contaCaixa->id,
                    'conta_nome' => $contaCaixa->nome,
                    'forma_pagamento' => 'Dinheiro',
                    'operacao_tipo' => 'conta_pagar_paga',
                    'operacao_id' => $conta->id,
                    'usuario_id' => auth()->id(),
                    'usuario_nome' => auth()->user()->name,
                    'status' => 'concluido',
                    'data_operacao' => $conta->data_pagamento ?? now(),
                    'metadados' => [
                        'sessao_id' => $sessaoId, // sessaoId pode ser null se não houver caixa aberto
                        'conta_pagar_id' => $conta->id,
                        'data_vencimento' => $conta->data_vencimento,
                        'conta_bancaria_id' => $contaCaixa->id,
                        'conta_bancaria_nome' => $contaCaixa->nome,
                    ]
                ];

                \Log::info('💰 [ContaPagarController::marcarComoPaga] Dados do lançamento a ser criado:', $dadosLancamento);

                try {
                    LancamentoCaixa::create($dadosLancamento);
                    \Log::info('💰 [ContaPagarController::marcarComoPaga] Lançamento criado com sucesso', [
                        'conta_id' => $id,
                        'conta_caixa_id' => $contaCaixa->id,
                        'tipo' => 'saida'
                    ]);
                } catch (\Exception $e) {
                    \Log::error('💰 [ContaPagarController::marcarComoPaga] Erro ao criar lançamento', [
                        'conta_id' => $id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                }
            }

            // Gerar próxima conta recorrente se necessário
            if ($conta->recorrencia !== 'nao_recorre') {
                \Log::info('Gerando próxima conta recorrente', ['conta_id' => $id, 'recorrencia' => $conta->recorrencia]);
                $this->gerarProximaContaRecorrente($conta);
            }

            $conta->load(['fornecedor', 'categoria']);

            \Log::info('Retornando sucesso', ['conta_id' => $id]);
            return $this->success($conta, 'Conta marcada como paga com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao marcar conta como paga', [
                'conta_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao marcar conta como paga: ' . $e->getMessage());
        }
    }

    /**
     * Gera próxima conta recorrente
     */
    private function gerarProximaContaRecorrente($contaOriginal)
    {
        $proximoVencimento = Carbon::parse($contaOriginal->data_vencimento);
        
        switch ($contaOriginal->recorrencia) {
            case 'mensal':
                $proximoVencimento->addMonth();
                break;
            case 'bimestral':
                $proximoVencimento->addMonths(2);
                break;
            case 'trimestral':
                $proximoVencimento->addMonths(3);
                break;
            case 'semestral':
                $proximoVencimento->addMonths(6);
                break;
            case 'anual':
                $proximoVencimento->addYear();
                break;
            default:
                return; // Não recorre
        }

        // Verificar se não passou da data fim do contrato
        if ($contaOriginal->data_fim_contrato && $proximoVencimento > $contaOriginal->data_fim_contrato) {
            return;
        }

        // Preparar dados para a nova conta
        $dadosNovaConta = [
            'user_id' => auth()->id(),
            'descricao' => $contaOriginal->descricao,
            'valor' => $contaOriginal->valor,
            'data_vencimento' => $proximoVencimento->format('Y-m-d'),
            'categoria_id' => $contaOriginal->categoria_id,
            'recorrencia' => $contaOriginal->recorrencia,
            'data_inicio_contrato' => $contaOriginal->data_inicio_contrato,
            'data_fim_contrato' => $contaOriginal->data_fim_contrato,
            'observacoes' => $contaOriginal->observacoes,
            'status' => 'pendente',
        ];

        // Tratar fornecedor_id corretamente
        if ($contaOriginal->fornecedor_id) {
            // Se for numérico, usar diretamente
            if (is_numeric($contaOriginal->fornecedor_id)) {
                $dadosNovaConta['fornecedor_id'] = $contaOriginal->fornecedor_id;
            } else {
                // Se for string, salvar nos metadados
                $dadosNovaConta['metadados'] = [
                    'fornecedor_id' => $contaOriginal->fornecedor_id
                ];
            }
        }

        try {
            ContaPagar::create($dadosNovaConta);
        } catch (\Exception $e) {
            \Log::error('Erro ao gerar próxima conta recorrente', [
                'conta_original_id' => $contaOriginal->id,
                'error' => $e->getMessage(),
                'dados_nova_conta' => $dadosNovaConta
            ]);
        }
    }

    /**
     * Busca fornecedores para o select
     */
    public function fornecedores()
    {
        try {
            $fornecedores = Cliente::where('user_id', auth()->id())
                                  ->orderBy('nome')
                                  ->get(['id', 'nome']);

            return $this->success($fornecedores);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar fornecedores: ' . $e->getMessage());
        }
    }

    /**
     * Busca categorias de despesa para o select
     */
    public function categorias(Request $request)
    {
        try {
            $query = CategoriaCaixa::where('tenant_id', auth()->user()->tenant_id);
            
            // Filtrar por tipo se fornecido
            if ($request->has('tipo')) {
                $query->where('tipo', 'LIKE', '%' . $request->tipo . '%');
            } else {
                // Se não especificado, buscar apenas categorias de despesa
                $query->where('tipo', 'despesa');
            }
            
            $categorias = $query->where('ativo', true)
                               ->orderBy('nome')
                               ->get(['id', 'nome']);

            return $this->success($categorias);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar categorias: ' . $e->getMessage());
        }
    }

    /**
     * Estatísticas das contas a pagar
     */
    public function estatisticas()
    {
        try {
            $userId = auth()->id();

            $estatisticas = [
                'total_pendente' => ContaPagar::where('user_id', $userId)
                                             ->whereIn('status', ['pendente', 'vencido'])
                                             ->sum('valor'),
                'total_pago' => ContaPagar::where('user_id', $userId)
                                         ->where('status', 'pago')
                                         ->sum('valor'),
                'contas_vencidas' => ContaPagar::where('user_id', $userId)
                                               ->where('status', 'vencido')
                                               ->count(),
                'contas_vencendo_breve' => ContaPagar::where('user_id', $userId)
                                                     ->where('status', 'pendente')
                                                     ->whereBetween('data_vencimento', [
                                                         now(),
                                                         now()->addDays(30)
                                                     ])
                                                     ->count(),
            ];

            return $this->success($estatisticas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar estatísticas: ' . $e->getMessage());
        }
    }
}
