<?php

namespace App\Http\Controllers\Api;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class VendaController extends ResourceController
{
    protected $model = Venda::class;
    
    protected $storeRules = [
        'cliente_id' => 'required|exists:clientes,id',
        'funcionario_id' => 'nullable|exists:users,id',
        'usuario_id' => 'nullable|exists:users,id',
        'vendedor_id' => 'nullable|exists:users,id',
        'data_emissao' => 'required|date',
        'tipo_pagamento' => 'required|in:dinheiro,cartao_credito,cartao_debito,pix,boleto,transferencia,outro',
        'status' => 'required|in:pendente,concluida,cancelada,estornada,orcamento',
        'valor_subtotal' => 'required|numeric|min:0',
        'valor_desconto' => 'required|numeric|min:0',
        'tipo_desconto' => 'nullable|in:percentual,valor',
        'valor_desconto_original' => 'nullable|numeric|min:0',
        'valor_acrescimo' => 'required|numeric|min:0',
        'valor_total' => 'required|numeric|min:0',
        'observacoes' => 'nullable|string',
        'forma_pagamento' => 'nullable|string',
        'dados_pagamento' => 'nullable|array',
        'vendedor_nome' => 'nullable|string',
        'metadados' => 'nullable|array',
        'opcao_frete_id' => 'nullable|exists:opcoes_frete,id',
        'valor_frete' => 'nullable|numeric|min:0',
        'prazo_frete' => 'nullable|integer|min:1',
        'entregador_id' => 'nullable|exists:entregadores,id',
        'bairro_entrega' => 'nullable|string|max:255',
        'cidade_entrega' => 'nullable|string|max:255',
        'estado_entrega' => 'nullable|string|max:2',
        'cep_entrega' => 'nullable|string|max:10',
        'itens' => 'required|array|min:1',
        'itens.*.produto_id' => 'required|exists:produtos,id',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.valor_unitario' => 'required|numeric|min:0',
        'itens.*.desconto' => 'nullable|numeric|min:0',
        'itens.*.tipo_desconto' => 'nullable|in:percentual,valor',
        'itens.*.subtotal' => 'required|numeric|min:0',
    ];

    protected $updateRules = [
        'cliente_id' => 'sometimes|exists:clientes,id',
        'funcionario_id' => 'sometimes|exists:users,id',
        'usuario_id' => 'sometimes|exists:users,id',
        'vendedor_id' => 'sometimes|exists:users,id',
        'data_emissao' => 'sometimes|date',
        'tipo_pagamento' => 'sometimes|in:dinheiro,cartao_credito,cartao_debito,pix,boleto,transferencia,outro',
        'status' => 'sometimes|in:pendente,concluida,cancelada,estornada,orcamento',
        'valor_subtotal' => 'sometimes|numeric|min:0',
        'valor_desconto' => 'sometimes|numeric|min:0',
        'tipo_desconto' => 'nullable|in:percentual,valor',
        'valor_desconto_original' => 'nullable|numeric|min:0',
        'valor_acrescimo' => 'sometimes|numeric|min:0',
        'valor_total' => 'sometimes|numeric|min:0',
        'observacoes' => 'nullable|string',
        'forma_pagamento' => 'nullable|string',
        'dados_pagamento' => 'nullable|array',
        'vendedor_nome' => 'nullable|string',
        'metadados' => 'nullable|array',
        'opcao_frete_id' => 'nullable|exists:opcoes_frete,id',
        'valor_frete' => 'nullable|numeric|min:0',
        'prazo_frete' => 'nullable|integer|min:1',
        'entregador_id' => 'nullable|exists:entregadores,id',
        'bairro_entrega' => 'nullable|string|max:255',
        'cidade_entrega' => 'nullable|string|max:255',
        'estado_entrega' => 'nullable|string|max:2',
        'cep_entrega' => 'nullable|string|max:10',
        'itens' => 'sometimes|array|min:1',
        'itens.*.produto_id' => 'required|exists:produtos,id',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.valor_unitario' => 'required|numeric|min:0',
        'itens.*.desconto' => 'nullable|numeric|min:0',
        'itens.*.tipo_desconto' => 'nullable|in:percentual,valor',
        'itens.*.subtotal' => 'required|numeric|min:0',
    ];

    protected $with = ['cliente', 'funcionario', 'usuario', 'vendedor', 'itens.produto'];

    /**
     * Sobrescreve o método store para lidar com itens da venda e atualizar estoque
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validação customizada para permitir cliente_id null quando funcionario_id estiver presente
        $rules = $this->storeRules;
        
        // Se funcionario_id estiver presente, cliente_id se torna opcional
        if ($request->has('funcionario_id') && !empty($request->funcionario_id)) {
            $rules['cliente_id'] = 'nullable|exists:clientes,id';
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        return DB::transaction(function () use ($request) {
            // Determinar se a venda se origina do PDV
            $metadados = $request->input('metadados', []);
            $origemPDV = is_array($metadados) && ($metadados['origem'] ?? null) === 'PDV';

            // Verifica estoque antes de criar a venda (exceto para vendas vindas do PDV)
            if (!$origemPDV && !$this->verificarEstoque($request->input('itens'))) {
                return $this->error('Estoque insuficiente para um ou mais produtos', 422);
            }

            // Cria a venda
            $data = $request->except('itens');
            $data['tenant_id'] = $request->user()->tenant_id;
            
            // Mapear campos de desconto
            $data['desconto'] = $data['valor_desconto'] ?? 0;
            $data['tipo_desconto'] = $data['tipo_desconto'] ?? 'valor';
            $data['valor_desconto_original'] = $data['valor_desconto_original'] ?? 0;
            
            // Se não foi fornecido usuario_id, usar o usuário autenticado
            if (empty($data['usuario_id'])) {
                $data['usuario_id'] = $request->user()->id;
            }
            
            // Preencher vendedor_nome se não foi fornecido
            if (empty($data['vendedor_nome'])) {
                $vendedorId = $data['vendedor_id'] ?? $data['usuario_id'];
                if ($vendedorId) {
                    $vendedor = \App\Models\User::find($vendedorId);
                    if ($vendedor) {
                        $data['vendedor_nome'] = $vendedor->name;
                    }
                }
            }
            
            // Log para debug do vendedor_id
            \Log::info('Criando venda com dados:', [
                'vendedor_id' => $data['vendedor_id'] ?? 'não fornecido',
                'usuario_id' => $data['usuario_id'],
                'cliente_id' => $data['cliente_id'],
                'tenant_id' => $data['tenant_id'],
                'vendedor_nome' => $data['vendedor_nome'] ?? 'não fornecido'
            ]);
            
            // Verificar se o cliente é de permuta
            $cliente = null;
            $isClientePermuta = false;
            if (!empty($data['cliente_id'])) {
                $cliente = \App\Models\Cliente::find($data['cliente_id']);
                if ($cliente && $cliente->is_cliente_permuta) {
                    $isClientePermuta = true;
                    // Configurar venda como permuta
                    $data['tipo_pedido'] = 'PERMUTA';
                    $data['forma_pagamento'] = 'Permuta';
                    // Garantir que não há dados de pagamento que gerem contas
                    if (empty($data['dados_pagamento'])) {
                        $data['dados_pagamento'] = [
                            [
                                'metodo' => 'Permuta',
                                'valor' => $data['valor_total'] ?? 0,
                                'valorOriginal' => $data['valor_total'] ?? 0,
                                'valorFinal' => $data['valor_total'] ?? 0,
                                'parcelas' => 1
                            ]
                        ];
                    }
                    // Adicionar observação sobre permuta
                    $observacaoPermuta = 'Pedido sem impacto financeiro';
                    if (!empty($data['observacoes'])) {
                        $data['observacoes'] = $data['observacoes'] . ' | ' . $observacaoPermuta;
                    } else {
                        $data['observacoes'] = $observacaoPermuta;
                    }
                }
            }
            
            $venda = $this->model::create($data);
            
            // Log para confirmar que a venda foi criada
            \Log::info('Venda criada com sucesso:', [
                'venda_id' => $venda->id,
                'vendedor_id' => $venda->vendedor_id,
                'usuario_id' => $venda->usuario_id,
                'cliente_id' => $venda->cliente_id,
                'vendedor_nome' => $venda->vendedor_nome,
                'forma_pagamento' => $venda->forma_pagamento,
                'tipo_pedido' => $venda->tipo_pedido,
                'is_cliente_permuta' => $isClientePermuta,
                'dados_pagamento' => $venda->dados_pagamento
            ]);
            
            // Adiciona os itens e atualiza o estoque
            $this->processarItensVenda($venda, $request->input('itens'), 'decrement');
            
            // Criar entrega de frete se houver frete na venda
            if ($venda->opcao_frete_id && $venda->entregador_id && $venda->status === 'concluida') {
                $this->criarFreteEntrega($venda);
            }
            
            // Criar conta a receber apenas para vendas concluídas (não para orçamentos) e que NÃO sejam permutas
            if ($venda->status === 'concluida' && !$isClientePermuta) {
                $this->criarContaReceber($venda, $request);
                
                // Criar lançamentos no fluxo de caixa
                $this->criarLancamentosCaixa($venda, $request);
            } else {
                if ($isClientePermuta) {
                    \Log::info('Venda de permuta - não criando contas a receber nem lançamentos no caixa', [
                        'venda_id' => $venda->id,
                        'cliente_id' => $venda->cliente_id
                    ]);
                } else {
                    \Log::info('Venda não está com status concluida, não criando lançamentos', [
                        'venda_id' => $venda->id,
                        'status' => $venda->status
                    ]);
                }
            }
            
            // Recarrega a venda com os relacionamentos
            $venda->load($this->with);
            
            return $this->success($venda, 'Venda registrada com sucesso', 201);
        });
    }

    /**
     * Sobrescreve o método update para lidar com itens da venda e atualizar estoque
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id): \Illuminate\Http\JsonResponse
    {
        // Validação customizada para permitir cliente_id null quando funcionario_id estiver presente
        $rules = $this->updateRules;
        
        // Se funcionario_id estiver presente, cliente_id se torna opcional
        if ($request->has('funcionario_id') && !empty($request->funcionario_id)) {
            $rules['cliente_id'] = 'nullable|exists:clientes,id';
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $venda = $this->model::find($id);

        if (!$venda) {
            return $this->notFound();
        }

        // Não permite editar vendas canceladas ou estornadas
        if (in_array($venda->status, ['cancelada', 'estornada'])) {
            return $this->error('Não é possível editar uma venda ' . $venda->status, 403);
        }

        return DB::transaction(function () use ($request, $venda) {
            // Se houver itens na requisição, processa a atualização
            if ($request->has('itens')) {
                // Estorna o estoque dos itens antigos
                $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
                
                // Remove os itens antigos
                $venda->itens()->delete();
                
                // Determinar se a venda se origina do PDV
                $metadados = $request->input('metadados', []);
                $origemPDV = is_array($metadados) && ($metadados['origem'] ?? null) === 'PDV';

                // Verifica estoque para os novos itens (exceto para vendas vindas do PDV)
                if (!$origemPDV && !$this->verificarEstoque($request->input('itens'))) {
                    return $this->error('Estoque insuficiente para um ou mais produtos', 422);
                }
                
                // Adiciona os novos itens e atualiza o estoque
                $this->processarItensVenda($venda, $request->input('itens'), 'decrement');
            }
            
            // Preparar dados para atualização
            $updateData = $request->except('itens');
            
            // Preencher vendedor_nome se não foi fornecido
            if (empty($updateData['vendedor_nome'])) {
                $vendedorId = $updateData['vendedor_id'] ?? $updateData['usuario_id'] ?? $venda->vendedor_id ?? $venda->usuario_id;
                if ($vendedorId) {
                    $vendedor = \App\Models\User::find($vendedorId);
                    if ($vendedor) {
                        $updateData['vendedor_nome'] = $vendedor->name;
                    }
                }
            }
            
            // Atualiza os dados da venda
            $venda->update($updateData);
            
            // Recarrega a venda com os relacionamentos
            $venda->load($this->with);
            
            return $this->success($venda, 'Venda atualizada com sucesso');
        });
    }

    /**
     * Cancela uma venda
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function cancelar($id)
    {
        $venda = $this->model::find($id);
        
        if (!$venda) {
            return $this->notFound();
        }
        
        if ($venda->status === 'cancelada') {
            return $this->error('Esta venda já está cancelada', 400);
        }
        
        if ($venda->status === 'estornada') {
            return $this->error('Não é possível cancelar uma venda estornada', 400);
        }
        
        return DB::transaction(function () use ($venda) {
            // Estorna o estoque
            $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
            
            // Atualiza o status da venda
            $venda->update(['status' => 'cancelada']);
            
            return $this->success($venda, 'Venda cancelada com sucesso');
        });
    }
    
    /**
     * Estorna uma venda
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function estornar($id)
    {
        $venda = $this->model::find($id);
        
        if (!$venda) {
            return $this->notFound();
        }
        
        if ($venda->status === 'estornada') {
            return $this->error('Esta venda já foi estornada', 400);
        }
        
        if ($venda->status !== 'concluida') {
            return $this->error('Apenas vendas concluídas podem ser estornadas', 400);
        }
        
        return DB::transaction(function () use ($venda) {
            // Estorna o estoque
            $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
            
            // Atualiza o status da venda
            $venda->update(['status' => 'estornada']);
            
            // Aqui você pode registrar um lançamento de caixa de estorno, se necessário
            
            return $this->success($venda, 'Venda estornada com sucesso');
        });
    }

    /**
     * Remover uma venda específica
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $venda = $this->model::with('itens')->find($id);

        if (!$venda) {
            return $this->notFound('Venda não encontrada');
        }
        
        \Log::info('[Estoque] Iniciando exclusão de venda', [
            'venda_id' => $venda->id,
            'venda_codigo' => $venda->codigo,
            'venda_status' => $venda->status,
            'total_itens' => $venda->itens->count(),
        ]);

        try {
            return DB::transaction(function () use ($venda) {
                // Definir justificativa de exclusão se fornecida
                $justificativa = request('justificativa_exclusao', 'Exclusão realizada pelo sistema');
                $venda->justificativa_exclusao = $justificativa;
                
                // Restaurar o estoque para vendas pendentes ou concluídas
                if (in_array($venda->status, ['pendente', 'concluida'])) {
                    \Log::info('[Estoque] Venda elegível para estorno de estoque', [
                        'venda_id' => $venda->id,
                        'status' => $venda->status,
                    ]);
                    $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
                } else {
                    \Log::warning('[Estoque] Venda NÃO elegível para estorno de estoque', [
                        'venda_id' => $venda->id,
                        'status' => $venda->status,
                        'status_esperado' => ['pendente', 'concluida'],
                    ]);
                }
                
                
                // Remover itens da venda
                $venda->itens()->delete();
                
                // Remover a venda (o trait SoftDeleteWithAudit preencherá automaticamente os campos de auditoria)
                $venda->delete();
                
                return $this->success(null, 'Venda removida com sucesso');
            });
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover a venda: ' . $e->getMessage());
        }
    }

    /**
     * Remover uma venda por código (usado pelo PDV)
     *
     * @param string $codigo
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroyByCodigo($codigo): \Illuminate\Http\JsonResponse
    {
        $venda = $this->model::with('itens')->where('codigo', $codigo)->first();

        if (!$venda) {
            return $this->notFound('Venda não encontrada');
        }
        
        \Log::info('[Estoque] Iniciando exclusão de venda por código', [
            'venda_id' => $venda->id,
            'venda_codigo' => $codigo,
            'venda_status' => $venda->status,
            'total_itens' => $venda->itens->count(),
        ]);

        try {
            return DB::transaction(function () use ($venda, $codigo) {
                // Definir justificativa de exclusão se fornecida
                $justificativa = request('justificativa_exclusao', 'Exclusão realizada pelo sistema');
                $venda->justificativa_exclusao = $justificativa;
                
                // Restaurar o estoque para vendas pendentes ou concluídas
                if (in_array($venda->status, ['pendente', 'concluida'])) {
                    \Log::info('[Estoque] Venda por código elegível para estorno de estoque', [
                        'venda_id' => $venda->id,
                        'codigo' => $codigo,
                        'status' => $venda->status,
                        'itens_count' => $venda->itens->count()
                    ]);
                    $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
                } else {
                    \Log::warning('[Estoque] Venda por código NÃO elegível para estorno de estoque', [
                        'venda_id' => $venda->id,
                        'codigo' => $codigo,
                        'status' => $venda->status,
                        'status_esperado' => ['pendente', 'concluida'],
                    ]);
                }
                
                
                // Remover itens da venda
                $venda->itens()->delete();
                
                // Remover a venda (o trait SoftDeleteWithAudit preencherá automaticamente os campos de auditoria)
                $venda->delete();
                
                return $this->success(null, 'Venda removida com sucesso');
            });
        } catch (\Exception $e) {
            \Log::error('Erro ao excluir venda por código', [
                'codigo' => $codigo,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Não foi possível remover a venda: ' . $e->getMessage());
        }
    }

    /**
     * Processa os itens de uma venda
     * 
     * @param Venda $venda
     * @param array $itens
     * @param string $operacao 'increment' ou 'decrement'
     * @return void
     */
    protected function processarItensVenda(Venda $venda, array $itens, string $operacao)
    {
        \Log::info('[Estoque] ========== PROCESSANDO ITENS DA VENDA ==========', [
            'venda_id' => $venda->id,
            'venda_codigo' => $venda->codigo ?? 'N/A',
            'venda_status' => $venda->status,
            'operacao' => $operacao,
            'total_itens' => count($itens),
        ]);
        
        foreach ($itens as $item) {
            \Log::info('[Estoque] Processando item', [
                'produto_id' => $item['produto_id'] ?? 'N/A',
                'produto_nome' => $item['produto_nome'] ?? 'N/A',
                'quantidade' => $item['quantidade'] ?? 'N/A',
                'tem_dados_adicionais' => isset($item['dados_adicionais']),
                'tem_variacao_em_dados_adicionais' => isset($item['dados_adicionais']['variacao']),
            ]);
            // Apenas cria o item se for uma operação de decrement (nova venda)
            if ($operacao === 'decrement') {
                $item['tenant_id'] = $venda->tenant_id;
                // Garantir que tipo_venda seja 'pdv' para vendas PDV
                if (!isset($item['tipo_venda']) || empty($item['tipo_venda'])) {
                    $item['tipo_venda'] = 'pdv';
                }
                $venda->itens()->create($item);
            }
            
            // Atualiza o estoque
            // - Sempre ajusta o estoque do produto principal
            // - Se for composto: ajusta também o estoque dos componentes (composicao)
            if ($venda->status === 'concluida' || $operacao === 'increment') {
                $produto = Produto::find($item['produto_id']);
                if ($produto) {
                    if ((bool) ($produto->is_digital ?? false)) {
                        \Log::info('[Estoque] Produto digital sem controle de estoque, pulando ajuste', [
                            'produto_id' => $produto->id,
                            'produto_nome' => $produto->nome,
                            'operacao' => $operacao,
                        ]);
                        continue;
                    }

                    $isComposto = (bool) ($produto->is_composto ?? false);
                    $composicao = $produto->composicao ?? [];
                    
                    // Verificar se é venda com variação (estoque fica na variação, não no produto principal)
                    $temVariacaoNoItem = false;
                    $variacaoDataCheck = $item['dados_adicionais']['variacao'] ?? $item['variacao'] ?? null;
                    if ($variacaoDataCheck) {
                        $vd = is_array($variacaoDataCheck) ? $variacaoDataCheck : json_decode($variacaoDataCheck, true);
                        $temVariacaoNoItem = !empty($vd['id_variacao'] ?? $vd['id'] ?? null);
                    }
                    $temVariacoesAtivas = (bool) ($produto->variacoes_ativa ?? false) && is_array($produto->variacoes ?? null) && count($produto->variacoes ?? []) > 0;

                    // Só ajustar estoque do produto principal se NÃO for item com variação (quando produto tem variações, o estoque fica nas variações)
                    if (!($temVariacaoNoItem && $temVariacoesAtivas)) {
                        $estoqueAntes = (float) $produto->estoque;
                        $ajustePrincipal = $operacao === 'increment' ? (float) $item['quantidade'] : -(float) $item['quantidade'];
                        \Log::info('[Estoque][Principal] ⚠️ ANTES DO AJUSTE', [
                            'produto_id' => $produto->id,
                            'produto_nome' => $produto->nome,
                            'estoque_antes' => $estoqueAntes,
                            'operacao' => $operacao,
                            'quantidade_item' => $item['quantidade'],
                            'ajuste_calculado' => $ajustePrincipal,
                        ]);
                        $produto->increment('estoque', $ajustePrincipal);
                        $produto->refresh();
                        \Log::info('[Estoque][Principal] ✅ DEPOIS DO AJUSTE', [
                            'produto_id' => $produto->id,
                            'estoque_depois' => (float) $produto->estoque,
                        ]);
                    } else {
                        \Log::info('[Estoque][Principal] ⏭️ Pulando ajuste do produto principal (item com variação - estoque está na variação)', [
                            'produto_id' => $produto->id,
                        ]);
                    }
                    if ($isComposto && is_array($composicao) && count($composicao) > 0) {
                        foreach ($composicao as $comp) {
                            // Estruturas aceitas: id (produtoId/produto_id/id) OU código (codigo_produto/codigo)
                            $compIdRaw = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                            $compQtd = (float) ($comp['quantidade'] ?? 0);
                            if (!$compIdRaw || $compQtd <= 0) {
                                continue;
                            }
                            // Resolver produto por ID (numérico) ou por código
                            $compProduto = null;
                            if (is_numeric($compIdRaw)) {
                                $compProduto = Produto::find($compIdRaw);
                            }
                            if (!$compProduto) {
                                $compProduto = Produto::where('codigo_produto', $compIdRaw)
                                    ->orWhere('codigo', $compIdRaw)
                                    ->first();
                            }
                            if ($compProduto) {
                                $delta = $compQtd * (float) $item['quantidade'];
                                // increment para estorno (devolve estoque) / decrement para baixa
                                $ajuste = $operacao === 'increment' ? $delta : -$delta;
                                \Log::info('[Estoque][Composto] Ajustando componente', [
                                    'produto_principal_id' => $produto->id,
                                    'componente_id' => $compProduto->id,
                                    'operacao' => $operacao,
                                    'ajuste' => $ajuste,
                                ]);
                                $compProduto->increment('estoque', $ajuste);
                            } else {
                                \Log::warning('[Estoque][Composto] Componente não localizado', [
                                    'produto_principal_id' => $produto->id,
                                    'componente_ref' => $compIdRaw,
                                ]);
                            }
                        }
                    }
                    
                    // Se o produto tem variações, ajusta o estoque da variação
                    $variacaoData = null;
                    
                    \Log::info('[Estoque][Variação] 🔍 DEBUG - Verificando variação no item', [
                        'produto_id' => $produto->id,
                        'tem_dados_adicionais' => isset($item['dados_adicionais']),
                        'dados_adicionais_conteudo' => $item['dados_adicionais'] ?? 'N/A',
                        'tem_variacao_direta' => isset($item['variacao']),
                        'variacao_direta' => $item['variacao'] ?? 'N/A',
                    ]);
                    
                    // Buscar variação em diferentes possíveis localizações
                    if (isset($item['dados_adicionais']['variacao'])) {
                        $variacaoData = is_array($item['dados_adicionais']['variacao']) 
                            ? $item['dados_adicionais']['variacao'] 
                            : json_decode($item['dados_adicionais']['variacao'], true);
                        \Log::info('[Estoque][Variação] ✅ Variação encontrada em dados_adicionais', [
                            'variacao_data' => $variacaoData,
                        ]);
                    } elseif (isset($item['variacao'])) {
                        $variacaoData = is_array($item['variacao']) 
                            ? $item['variacao'] 
                            : json_decode($item['variacao'], true);
                        \Log::info('[Estoque][Variação] ✅ Variação encontrada diretamente', [
                            'variacao_data' => $variacaoData,
                        ]);
                    } else {
                        \Log::info('[Estoque][Variação] ❌ Nenhuma variação encontrada no item');
                    }
                    
                    $variacaoId = ($variacaoData && is_array($variacaoData)) ? ($variacaoData['id_variacao'] ?? $variacaoData['id'] ?? null) : null;
                    if ($variacaoData && $variacaoId !== null && $variacaoId !== '') {
                        $variacoes = $produto->variacoes ?? [];
                        
                        \Log::info('[Estoque][Variação] Tentando ajustar variação', [
                            'produto_id' => $produto->id,
                            'produto_nome' => $produto->nome,
                            'variacao_id' => $variacaoId,
                            'operacao' => $operacao,
                            'quantidade' => $item['quantidade'],
                            'total_variacoes' => count($variacoes),
                        ]);
                        
                        foreach ($variacoes as $index => $variacao) {
                            $idVariacaoAtual = (string) ($variacao['id'] ?? $variacao['id_variacao'] ?? '');
                            if ($idVariacaoAtual !== '' && $idVariacaoAtual === (string) $variacaoId) {
                                $estoqueAtual = (float) ($variacao['estoque_var'] ?? 0);
                                $ajusteVariacao = $operacao === 'increment' ? (float) $item['quantidade'] : -(float) $item['quantidade'];
                                $variacoes[$index]['estoque_var'] = $estoqueAtual + $ajusteVariacao;
                                
                                    \Log::info('[Estoque][Variação] ✅ Variação ajustada com sucesso', [
                                        'produto_id' => $produto->id,
                                        'produto_nome' => $produto->nome,
                                        'variacao_id' => $variacaoId,
                                        'variacao_nome' => $variacao['nome'] ?? 'Sem nome',
                                        'operacao' => $operacao,
                                        'ajuste' => $ajusteVariacao,
                                        'estoque_anterior' => $estoqueAtual,
                                        'estoque_novo' => $variacoes[$index]['estoque_var'],
                                    ]);
                                    
                                    $produto->variacoes = $variacoes;
                                    $salvou = $produto->save();
                                    
                                    // Verificar se salvou e confirmar
                                    $produto->refresh();
                                    $estoqueDepoisDeSalvar = $produto->variacoes[$index]['estoque_var'] ?? null;
                                    
                                    \Log::info('[Estoque][Variação] 💾 Após salvar no banco', [
                                        'produto_id' => $produto->id,
                                        'variacao_id' => $variacaoId,
                                        'save_retornou' => $salvou ? 'TRUE' : 'FALSE',
                                        'estoque_esperado' => $variacoes[$index]['estoque_var'],
                                        'estoque_no_banco' => $estoqueDepoisDeSalvar,
                                        'valores_batem' => ($estoqueDepoisDeSalvar == $variacoes[$index]['estoque_var']) ? 'SIM' : 'NÃO',
                                    ]);
                                    
                                    break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Verifica se há estoque suficiente para os itens da venda
     * 
     * @param array $itens
     * @return bool
     */
    protected function verificarEstoque(array $itens): bool
    {
        foreach ($itens as $item) {
            $produto = Produto::find($item['produto_id']);
            
            \Log::info('Verificando estoque para produto ID: ' . $item['produto_id']);
            \Log::info('Produto encontrado: ' . ($produto ? 'sim' : 'não'));
            if ($produto) {
                \Log::info('Estoque atual: ' . $produto->estoque . ', Quantidade solicitada: ' . $item['quantidade']);
            }
            
            if (!$produto) {
                \Log::error('Produto não encontrado para ID: ' . $item['produto_id']);
                return false;
            }

            if ((bool) ($produto->is_digital ?? false)) {
                \Log::info('Produto digital sem validação de estoque', [
                    'produto_id' => $produto->id,
                    'nome' => $produto->nome,
                ]);
                continue;
            }

            $isComposto = (bool) ($produto->is_composto ?? false);
            $composicao = $produto->composicao ?? [];
            if ($isComposto && is_array($composicao) && count($composicao) > 0) {
                // Verificar estoque dos componentes
                foreach ($composicao as $comp) {
                    $compIdRaw = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                    $compQtd = (float) ($comp['quantidade'] ?? 0);
                    if (!$compIdRaw || $compQtd <= 0) { continue; }
                    // Resolver por ID ou código
                    $compProduto = null;
                    if (is_numeric($compIdRaw)) {
                        $compProduto = Produto::find($compIdRaw);
                    }
                    if (!$compProduto) {
                        $compProduto = Produto::where('codigo_produto', $compIdRaw)
                            ->orWhere('codigo', $compIdRaw)
                            ->first();
                    }
                    $necessario = $compQtd * (float) $item['quantidade'];
                    if (!$compProduto || (float) $compProduto->estoque < $necessario) {
                        \Log::error('Estoque insuficiente para componente', [
                            'componente_ref' => $compIdRaw,
                            'estoque' => $compProduto->estoque ?? null,
                            'necessario' => $necessario,
                        ]);
                        return false;
                    }
                }
            } else {
                // Produto simples: verificar estoque próprio
                if ((float) $produto->estoque < (float) $item['quantidade']) {
                    \Log::error('Estoque insuficiente para produto ID: ' . $item['produto_id']);
                    return false;
                }
            }
        }
        
        return true;
    }

    /**
     * Aplica filtros à consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por cliente
        if ($request->has('cliente_id')) {
            $query->where('cliente_id', $request->input('cliente_id'));
        }
        
        // Filtrar por funcionário
        if ($request->has('funcionario_id')) {
            $query->where('funcionario_id', $request->input('funcionario_id'));
        }
        
        // Filtrar por status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        
        // Filtrar por tipo de pagamento
        if ($request->has('tipo_pagamento')) {
            $query->where('tipo_pagamento', $request->input('tipo_pagamento'));
        }
        
        // Filtrar por data de emissão
        if ($request->has('data_inicio')) {
            $query->where('data_emissao', '>=', $request->input('data_inicio'));
        }
        
        if ($request->has('data_fim')) {
            $query->where('data_emissao', '<=', $request->input('data_fim') . ' 23:59:59');
        }
        
        // Filtrar por valor
        if ($request->has('valor_min')) {
            $query->where('valor_total', '>=', $request->input('valor_min'));
        }
        
        if ($request->has('valor_max')) {
            $query->where('valor_total', '<=', $request->input('valor_max'));
        }
        
        // Busca por termo (pesquisa em múltiplos campos)
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhere('codigo', 'like', "%{$search}%")
                  ->orWhere('cliente_nome', 'like', "%{$search}%")
                  ->orWhere('vendedor_nome', 'like', "%{$search}%")
                  ->orWhere('observacoes', 'like', "%{$search}%")
                  ->orWhereHas('cliente', function($q) use ($search) {
                      $q->where('nome', 'like', "%{$search}%");
                  });
            });
        }
        
        // Filtrar por tipo de documento
        if ($request->has('tipo_documento')) {
            $query->where('tipo_documento', $request->input('tipo_documento'));
        }
        
        // Filtrar por origem (PDV, etc.)
        if ($request->has('origem')) {
            $query->whereJsonContains('metadados->origem', $request->input('origem'));
        }
        
        return $query;
    }
    
    /**
     * Gera um PDF da venda
     * 
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function pdf($id)
    {
        $venda = $this->model::with(['cliente', 'itens.produto'])->find($id);
        
        if (!$venda) {
            return $this->notFound();
        }
        
        // Aqui você pode implementar a geração do PDF
        // Exemplo com DomPDF:
        // $pdf = \PDF::loadView('vendas.pdf', compact('venda'));
        // return $pdf->download("venda-{$venda->id}.pdf");
        
        // Por enquanto, retornamos apenas os dados
        return $this->success($venda);
    }
    
    /**
     * Retorna as estatísticas de vendas
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function estatisticas(Request $request)
    {
        $query = $this->model::where('status', 'concluida');
        
        // Aplica filtros comuns
        $this->applyFilters($query, $request);
        
        // Total de vendas
        $totalVendas = $query->count();
        
        // Valor total vendido
        $valorTotal = $query->sum('valor_total');
        
        // Média de valor por venda
        $mediaValor = $totalVendas > 0 ? $valorTotal / $totalVendas : 0;
        
        // Vendas por período (últimos 12 meses)
        $periodos = [];
        for ($i = 11; $i >= 0; $i--) {
            $data = now()->subMonths($i);
            $mesAno = $data->format('Y-m');
            
            $totalPeriodo = $this->model::where('status', 'concluida')
                ->whereYear('created_at', $data->year)
                ->whereMonth('created_at', $data->month)
                ->sum('valor_total');
                
            $periodos[$mesAno] = $totalPeriodo;
        }
        
        // Vendas por forma de pagamento
        $porFormaPagamento = $this->model::select('tipo_pagamento', DB::raw('count(*) as total, sum(valor_total) as valor_total'))
            ->where('status', 'concluida')
            ->groupBy('tipo_pagamento')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->tipo_pagamento => [
                    'total' => $item->total,
                    'valor_total' => (float) $item->valor_total
                ]];
            });
        
        return $this->success([
            'total_vendas' => $totalVendas,
            'valor_total' => $valorTotal,
            'media_por_venda' => $mediaValor,
            'por_periodo' => $periodos,
            'por_forma_pagamento' => $porFormaPagamento,
        ]);
    }



    /**
     * Retorna dados para o relatório de faturamento
     * Inclui todos os tipos de vendas: PDV, Ordens de Serviço, Envelopamentos, Marketplace e Orçamentos
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function relatorioFaturamento(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $dataInicio = $request->input('data_inicio');
        $dataFim = $request->input('data_fim');
        
        // Array para armazenar todas as vendas
        $todasVendas = collect();
        
        // 1. VENDAS PDV (tabela vendas)
        $queryVendas = $this->model::with(['cliente', 'usuario'])
            ->where('status', 'concluida')
            ->where('tenant_id', $tenantId);
        
        if ($dataInicio) {
            $queryVendas->where('data_emissao', '>=', $dataInicio);
        }
        if ($dataFim) {
            $queryVendas->where('data_emissao', '<=', $dataFim . ' 23:59:59');
        }
        
        $vendasPDV = $queryVendas->get();
        $vendasPDV->each(function ($venda) use ($todasVendas) {
            // Processar dados de pagamento da venda
            $dadosPagamento = $venda->dados_pagamento ?? [];
            if (empty($dadosPagamento)) {
                $dadosPagamento = [[
                    'metodo' => $venda->forma_pagamento ?? 'Dinheiro',
                    'valor' => $venda->valor_total
                ]];
            }
            
            // Verificar se algum pagamento é crediário
            $temCrediario = false;
            foreach ($dadosPagamento as $pagamento) {
                $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                    $temCrediario = true;
                    break;
                }
            }
            
            // Se for crediário, pular (será incluído quando pago via conta_receber)
            if ($temCrediario) {
                return;
            }
            
            // Extrair valor do desconto do array
            $descontoValor = 0;
            if (is_array($venda->desconto) && isset($venda->desconto['valor_aplicado'])) {
                $descontoValor = (float) $venda->desconto['valor_aplicado'];
            } elseif (is_numeric($venda->desconto)) {
                $descontoValor = (float) $venda->desconto;
            }
            
            // Calcular valor bruto (valor_total + desconto)
            $valorBruto = (float) $venda->valor_total + $descontoValor;
            
            $todasVendas->push([
                'id' => $venda->id,
                'data' => $venda->data_emissao ? $venda->data_emissao->format('Y-m-d') : null,
                'tipo' => 'Venda PDV',
                'clienteId' => $venda->cliente_id,
                'clienteNome' => $venda->cliente_nome ?? ($venda->cliente->nome ?? 'Cliente não identificado'),
                'total' => $valorBruto, // Valor bruto (valor_total + desconto)
                'desconto' => $descontoValor,
                'pagamentos' => $dadosPagamento,
                'origem' => 'vendas'
            ]);
        });
        
        // 2. ORDENS DE SERVIÇO (tabela ordens_servico)
        $queryOS = \App\Models\OrdemServico::where('tenant_id', $tenantId)
            ->whereIn('status_os', ['Finalizada']);
        
        if ($dataInicio) {
            $queryOS->where(function($q) use ($dataInicio) {
                $q->where('data_finalizacao_os', '>=', $dataInicio)
                  ->orWhere('data_criacao', '>=', $dataInicio);
            });
        }
        if ($dataFim) {
            $queryOS->where(function($q) use ($dataFim) {
                $q->where('data_finalizacao_os', '<=', $dataFim . ' 23:59:59')
                  ->orWhere('data_criacao', '<=', $dataFim . ' 23:59:59');
            });
        }
        
        $ordensServico = $queryOS->get();
        
        // Log para debug das OS
        \Log::info('Ordens de Serviço encontradas', [
            'total_os' => $ordensServico->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'primeira_os' => $ordensServico->first() ? [
                'id' => $ordensServico->first()->id,
                'data_finalizacao_os' => $ordensServico->first()->data_finalizacao_os,
                'status_os' => $ordensServico->first()->status_os,
                'valor_total_os' => $ordensServico->first()->valor_total_os
            ] : null
        ]);
        $ordensServico->each(function ($os) use ($todasVendas) {
            // Verificar se algum pagamento é crediário
            $pagamentos = $os->pagamentos ?? [];
            if (!empty($pagamentos)) {
                $temCrediario = false;
                foreach ($pagamentos as $pagamento) {
                    $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                    if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                        $temCrediario = true;
                        break;
                    }
                }
                
                // Se for crediário, pular (será incluído quando pago via conta_receber)
                if ($temCrediario) {
                    return;
                }
            }
            
            $todasVendas->push([
                'id' => $os->id,
                'data' => $os->data_finalizacao_os ? $os->data_finalizacao_os->format('Y-m-d') : null,
                'tipo' => 'Ordem de Serviço',
                'clienteId' => $os->cliente_id,
                'clienteNome' => $os->cliente_info['nome'] ?? 'Cliente não identificado',
                'total' => (float) $os->valor_total_os,
                'desconto' => (float) $os->desconto_geral_valor,
                'pagamentos' => $pagamentos ?: [
                    ['metodo' => 'Não informado']
                ],
                'origem' => 'ordens_servico'
            ]);
        });
        
        // 3. ENVELOPAMENTOS (tabela envelopamentos)
        $queryEnvelopamentos = \App\Models\Envelopamento::where('tenant_id', $tenantId)
            ->whereIn('status', ['Finalizado']);
        
        if ($dataInicio) {
            $queryEnvelopamentos->where('data_criacao', '>=', $dataInicio);
        }
        if ($dataFim) {
            $queryEnvelopamentos->where('data_criacao', '<=', $dataFim . ' 23:59:59');
        }
        
        // Log para debug dos Envelopamentos
        \Log::info('Envelopamentos encontrados', [
            'total_envelopamentos' => $queryEnvelopamentos->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);
        
        $envelopamentos = $queryEnvelopamentos->get();
        $envelopamentos->each(function ($env) use ($todasVendas) {
            // Verificar se algum pagamento é crediário
            $pagamentos = $env->pagamentos ?? [];
            if (!empty($pagamentos)) {
                $temCrediario = false;
                foreach ($pagamentos as $pagamento) {
                    $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                    if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                        $temCrediario = true;
                        break;
                    }
                }
                
                // Se for crediário, pular (será incluído quando pago via conta_receber)
                if ($temCrediario) {
                    return;
                }
            }
            
            $todasVendas->push([
                'id' => $env->id,
                'data' => $env->data_criacao ? $env->data_criacao->format('Y-m-d') : null,
                'tipo' => 'Envelopamento',
                'clienteId' => $env->cliente['id'] ?? null,
                'clienteNome' => $env->cliente['nome'] ?? 'Cliente não identificado',
                'total' => (float) $env->orcamento_total,
                'desconto' => (float) $env->desconto_calculado,
                'pagamentos' => $pagamentos ?: [
                    ['metodo' => 'Não informado']
                ],
                'origem' => 'envelopamentos'
            ]);
        });
        
        // 4. VENDAS MARKETPLACE (tabela marketplace_vendas)
        $queryMarketplace = \App\Models\MarketplaceVenda::where('tenant_id', $tenantId);
        
        if ($dataInicio) {
            $queryMarketplace->where('data_venda', '>=', $dataInicio);
        }
        if ($dataFim) {
            $queryMarketplace->where('data_venda', '<=', $dataFim . ' 23:59:59');
        }
        
        $vendasMarketplace = $queryMarketplace->get();
        
        // Log para debug do Marketplace
        \Log::info('Vendas Marketplace encontradas', [
            'total_marketplace' => $vendasMarketplace->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'primeira_venda' => $vendasMarketplace->first() ? [
                'id' => $vendasMarketplace->first()->id,
                'data_venda' => $vendasMarketplace->first()->data_venda,
                'valor_total' => $vendasMarketplace->first()->valor_total
            ] : null
        ]);
        $vendasMarketplace->each(function ($venda) use ($todasVendas) {
            $todasVendas->push([
                'id' => $venda->id,
                'data' => $venda->data_venda ? $venda->data_venda->format('Y-m-d') : null,
                'tipo' => 'Marketplace',
                'clienteId' => null,
                'clienteNome' => $venda->cliente_nome ?? 'Cliente não identificado',
                'total' => (float) $venda->valor_total,
                'desconto' => 0, // Marketplace não tem desconto separado
                'pagamentos' => [
                    ['metodo' => 'Marketplace']
                ],
                'origem' => 'marketplace'
            ]);
        });
        
        // 5. ORÇAMENTOS APROVADOS (tabela orcamentos)
        $queryOrcamentos = \App\Models\Orcamento::where('tenant_id', $tenantId)
            ->whereIn('status', ['Aprovado', 'Finalizado']);
        
        if ($dataInicio) {
            $queryOrcamentos->where('updated_at', '>=', $dataInicio);
        }
        if ($dataFim) {
            $queryOrcamentos->where('updated_at', '<=', $dataFim . ' 23:59:59');
        }
        
        $orcamentos = $queryOrcamentos->get();
        
        // Log para debug dos Orçamentos
        \Log::info('Orçamentos encontrados', [
            'total_orcamentos' => $orcamentos->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'primeiro_orcamento' => $orcamentos->first() ? [
                'id' => $orcamentos->first()->id,
                'updated_at' => $orcamentos->first()->updated_at,
                'status' => $orcamentos->first()->status,
                'valor_total' => $orcamentos->first()->valor_total
            ] : null
        ]);
        $orcamentos->each(function ($orc) use ($todasVendas) {
            // Verificar se algum pagamento é crediário
            $pagamentos = $orc->dados_pagamento ?? [];
            if (!empty($pagamentos)) {
                $temCrediario = false;
                foreach ($pagamentos as $pagamento) {
                    $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                    if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                        $temCrediario = true;
                        break;
                    }
                }
                
                // Se for crediário, pular (será incluído quando pago via conta_receber)
                if ($temCrediario) {
                    return;
                }
            }
            
            $todasVendas->push([
                'id' => $orc->id,
                'data' => $orc->updated_at ? $orc->updated_at->format('Y-m-d') : null,
                'tipo' => 'Orçamento Aprovado',
                'clienteId' => $orc->cliente_id,
                'clienteNome' => $orc->cliente ? $orc->cliente->nome : 'Cliente não identificado',
                'total' => (float) $orc->valor_total,
                'desconto' => (float) $orc->desconto_valor,
                'pagamentos' => !empty($pagamentos) ? $pagamentos : [
                    ['metodo' => 'Orçamento']
                ],
                'origem' => 'orcamentos'
            ]);
        });
        
        // 6. PAGAMENTOS RECEBIDOS DAS CONTAS A RECEBER (tabela lancamentos_caixa)
        $queryContasReceber = \App\Models\LancamentoCaixa::where('tenant_id', $tenantId)
            ->where('tipo', 'entrada')
            ->where('operacao_tipo', 'conta_receber_recebida');
        
        if ($dataInicio) {
            $queryContasReceber->whereDate('data_operacao', '>=', $dataInicio);
        }
        if ($dataFim) {
            $queryContasReceber->whereDate('data_operacao', '<=', $dataFim);
        }
        
        $pagamentosContasReceber = $queryContasReceber->get();
        
        // Log para debug dos Pagamentos de Contas a Receber
        \Log::info('Pagamentos de Contas a Receber encontrados', [
            'total_pagamentos' => $pagamentosContasReceber->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim,
            'primeiro_pagamento' => $pagamentosContasReceber->first() ? [
                'id' => $pagamentosContasReceber->first()->id,
                'data_operacao' => $pagamentosContasReceber->first()->data_operacao,
                'valor' => $pagamentosContasReceber->first()->valor,
                'forma_pagamento' => $pagamentosContasReceber->first()->forma_pagamento
            ] : null
        ]);
        
        $pagamentosContasReceber->each(function ($pagamento) use ($todasVendas) {
            // Buscar informações da conta a receber
            $contaReceber = \App\Models\ContaReceber::find($pagamento->operacao_id);
            $clienteNome = 'Cliente não identificado';
            $clienteId = null;
            
            if ($contaReceber) {
                $cliente = $contaReceber->cliente;
                $clienteNome = $cliente ? $cliente->nome : 'Cliente não identificado';
                $clienteId = $contaReceber->cliente_id;
            }
            
            $todasVendas->push([
                'id' => $pagamento->id,
                'data' => $pagamento->data_operacao ? $pagamento->data_operacao->format('Y-m-d') : null,
                'tipo' => 'Conta Recebida',
                'clienteId' => $clienteId,
                'clienteNome' => $clienteNome,
                'total' => (float) $pagamento->valor,
                'desconto' => 0, // Pagamentos de contas a receber não têm desconto
                'pagamentos' => [
                    ['metodo' => $pagamento->forma_pagamento ?? 'Não informado']
                ],
                'origem' => 'contas_receber'
            ]);
        });
        
        // Ordenar todas as vendas por data (mais recente primeiro)
        $todasVendas = $todasVendas->sortByDesc('data');
        
        // Log para debug
        \Log::info('Relatório de faturamento - dados consolidados', [
            'total_vendas_pdv' => $vendasPDV->count(),
            'total_ordens_servico' => $ordensServico->count(),
            'total_envelopamentos' => $envelopamentos->count(),
            'total_marketplace' => $vendasMarketplace->count(),
            'total_orcamentos' => $orcamentos->count(),
            'total_contas_receber' => $pagamentosContasReceber->count(),
            'total_geral' => $todasVendas->count()
        ]);
        
        // Calcular totais consolidados
        $faturamentoBruto = $todasVendas->sum('total') + $todasVendas->sum('desconto');
        $totalDescontos = $todasVendas->sum('desconto');
        $faturamentoLiquido = $todasVendas->sum('total');
        
        // Dados para gráfico por dia
        $faturamentoPorDia = $todasVendas->groupBy('data')->map(function ($grupo) {
            return $grupo->sum('total');
        });
        
        return $this->success([
            'vendas' => $todasVendas->values()->toArray(),
            'totais' => [
                'faturamentoBruto' => $faturamentoBruto,
                'totalDescontos' => $totalDescontos,
                'faturamentoLiquido' => $faturamentoLiquido
            ],
            'faturamentoPorDia' => $faturamentoPorDia,
            'periodo' => [
                'dataInicio' => $dataInicio,
                'dataFim' => $dataFim
            ],
            'resumo_por_tipo' => [
                'vendas_pdv' => $vendasPDV->count(),
                'ordens_servico' => $ordensServico->count(),
                'envelopamentos' => $envelopamentos->count(),
                'marketplace' => $vendasMarketplace->count(),
                'orcamentos' => $orcamentos->count(),
                'contas_receber' => $pagamentosContasReceber->count()
            ]
        ]);
    }

    /**
     * Retorna dados para o relatório geral de recebimentos
     * Inclui todas as entradas de valor: vendas, OS, envelopamentos, marketplace, orçamentos e contas a receber
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function relatorioGeralRecebimentos(Request $request)
    {
        $tenantId = $request->user()->tenant_id;
        $dataInicio = $request->input('data_inicio');
        $dataFim = $request->input('data_fim');
        $filtrarPorDataRecebimento = $request->input('filtrar_por_data_recebimento', false);
        
        // Array para armazenar todos os recebimentos
        $todosRecebimentos = collect();
        
        // 1. VENDAS PDV (tabela vendas)
        $queryVendas = $this->model::with(['cliente', 'usuario'])
            ->where('status', 'concluida')
            ->where('tenant_id', $tenantId);
        
        if ($filtrarPorDataRecebimento) {
            // Filtrar por data de recebimento (data_emissao é quando foi recebido)
            if ($dataInicio) {
                $queryVendas->where('data_emissao', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryVendas->where('data_emissao', '<=', $dataFim . ' 23:59:59');
            }
        } else {
            // Filtro padrão por data de emissão
            if ($dataInicio) {
                $queryVendas->where('data_emissao', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryVendas->where('data_emissao', '<=', $dataFim . ' 23:59:59');
            }
        }
        
        $vendasPDV = $queryVendas->get();
        $vendasPDV->each(function ($venda) use ($todosRecebimentos, $filtrarPorDataRecebimento) {
            // Processar dados de pagamento da venda
            $dadosPagamento = $venda->dados_pagamento ?? [];
            if (empty($dadosPagamento)) {
                $dadosPagamento = [[
                    'metodo' => $venda->forma_pagamento ?? 'Dinheiro',
                    'valor' => $venda->valor_total,
                    'valorFinal' => $venda->valor_total
                ]];
            }
            
            foreach ($dadosPagamento as $index => $pagamento) {
                // Excluir transações de crediário do relatório de recebimentos
                $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                    continue; // Pular transações de crediário
                }
                
                $todosRecebimentos->push([
                    'id' => "venda-{$venda->id}-{$index}",
                    'data' => $venda->data_emissao ? $venda->data_emissao->format('Y-m-d H:i:s') : null,
                    'origem' => "Venda PDV #{$venda->id}",
                    'cliente' => $venda->cliente_nome ?? ($venda->cliente->nome ?? 'Cliente não identificado'),
                    'valor' => (float) ($pagamento['valorFinal'] ?? $pagamento['valor'] ?? $venda->valor_total),
                    'formaPagamento' => $formaPagamento,
                    'tipo' => 'venda_pdv'
                ]);
            }
        });
        
        // 2. ORDENS DE SERVIÇO (tabela ordens_servico)
        $queryOS = \App\Models\OrdemServico::where('tenant_id', $tenantId)
            ->whereIn('status_os', ['Finalizada']);
        
        if ($filtrarPorDataRecebimento) {
            // Filtrar por data de recebimento (data_finalizacao_os é quando foi recebido)
            if ($dataInicio) {
                $queryOS->where('data_finalizacao_os', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryOS->where('data_finalizacao_os', '<=', $dataFim . ' 23:59:59');
            }
        } else {
            // Filtro padrão por data de finalização ou criação
            if ($dataInicio) {
                $queryOS->where(function($q) use ($dataInicio) {
                    $q->where('data_finalizacao_os', '>=', $dataInicio)
                      ->orWhere('data_criacao', '>=', $dataInicio);
                });
            }
            if ($dataFim) {
                $queryOS->where(function($q) use ($dataFim) {
                    $q->where('data_finalizacao_os', '<=', $dataFim . ' 23:59:59')
                      ->orWhere('data_criacao', '<=', $dataFim . ' 23:59:59');
                });
            }
        }
        
        $ordensServico = $queryOS->get();
        $ordensServico->each(function ($os) use ($todosRecebimentos, $filtrarPorDataRecebimento) {
            $pagamentos = $os->pagamentos ?? [];
            if (empty($pagamentos)) {
                $pagamentos = [[
                    'metodo' => 'Não informado',
                    'valor' => $os->valor_total_os
                ]];
            }
            
            foreach ($pagamentos as $index => $pagamento) {
                // Excluir transações de crediário do relatório de recebimentos
                $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                    continue; // Pular transações de crediário
                }
                
                $todosRecebimentos->push([
                    'id' => "os-{$os->id}-{$index}",
                    'data' => $os->data_finalizacao_os ? $os->data_finalizacao_os->format('Y-m-d H:i:s') : 
                             ($os->data_criacao ? $os->data_criacao->format('Y-m-d H:i:s') : null),
                    'origem' => "Ordem de Serviço #{$os->id}",
                    'cliente' => $os->cliente_info['nome'] ?? 'Cliente não identificado',
                    'valor' => (float) ($pagamento['valor'] ?? $os->valor_total_os),
                    'formaPagamento' => $formaPagamento,
                    'tipo' => 'ordem_servico'
                ]);
            }
        });
        
        // 3. ENVELOPAMENTOS (tabela envelopamentos)
        $queryEnvelopamentos = \App\Models\Envelopamento::where('tenant_id', $tenantId)
            ->whereIn('status', ['Finalizado']);
        
        if ($filtrarPorDataRecebimento) {
            // Filtrar por data de recebimento (data_criacao é quando foi recebido)
            if ($dataInicio) {
                $queryEnvelopamentos->where('data_criacao', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryEnvelopamentos->where('data_criacao', '<=', $dataFim . ' 23:59:59');
            }
        } else {
            // Filtro padrão por data de criação
            if ($dataInicio) {
                $queryEnvelopamentos->where('data_criacao', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryEnvelopamentos->where('data_criacao', '<=', $dataFim . ' 23:59:59');
            }
        }
        
        $envelopamentos = $queryEnvelopamentos->get();
        $envelopamentos->each(function ($env) use ($todosRecebimentos, $filtrarPorDataRecebimento) {
            $pagamentos = $env->pagamentos ?? [];
            if (empty($pagamentos)) {
                $pagamentos = [[
                    'metodo' => 'Não informado',
                    'valor' => $env->orcamento_total
                ]];
            }
            
            foreach ($pagamentos as $index => $pagamento) {
                // Excluir transações de crediário do relatório de recebimentos
                $formaPagamento = $pagamento['metodo'] ?? 'Não informado';
                if (stripos($formaPagamento, 'crediário') !== false || stripos($formaPagamento, 'crediario') !== false) {
                    continue; // Pular transações de crediário
                }
                
                $todosRecebimentos->push([
                    'id' => "env-{$env->id}-{$index}",
                    'data' => $env->data_criacao ? $env->data_criacao->format('Y-m-d H:i:s') : null,
                    'origem' => "Envelopamento #{$env->id}",
                    'cliente' => $env->cliente['nome'] ?? 'Cliente não identificado',
                    'valor' => (float) ($pagamento['valor'] ?? $env->orcamento_total),
                    'formaPagamento' => $formaPagamento,
                    'tipo' => 'envelopamento'
                ]);
            }
        });
        
        // 4. VENDAS MARKETPLACE (tabela marketplace_vendas)
        $queryMarketplace = \App\Models\MarketplaceVenda::where('tenant_id', $tenantId);
        
        if ($filtrarPorDataRecebimento) {
            // Filtrar por data de recebimento (data_venda é quando foi recebido)
            if ($dataInicio) {
                $queryMarketplace->where('data_venda', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryMarketplace->where('data_venda', '<=', $dataFim . ' 23:59:59');
            }
        } else {
            // Filtro padrão por data de venda
            if ($dataInicio) {
                $queryMarketplace->where('data_venda', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryMarketplace->where('data_venda', '<=', $dataFim . ' 23:59:59');
            }
        }
        
        $vendasMarketplace = $queryMarketplace->get();
        $vendasMarketplace->each(function ($venda) use ($todosRecebimentos, $filtrarPorDataRecebimento) {
            $todosRecebimentos->push([
                'id' => "mkt-{$venda->id}",
                'data' => $venda->data_venda ? $venda->data_venda->format('Y-m-d H:i:s') : null,
                'origem' => "Marketplace #{$venda->id}",
                'cliente' => $venda->cliente_nome ?? 'Cliente não identificado',
                'valor' => (float) $venda->valor_total,
                'formaPagamento' => 'Marketplace',
                'tipo' => 'marketplace'
            ]);
        });
        
        // 5. ORÇAMENTOS APROVADOS (tabela orcamentos)
        $queryOrcamentos = \App\Models\Orcamento::where('tenant_id', $tenantId)
            ->whereIn('status', ['Aprovado', 'Finalizado']);
        
        if ($filtrarPorDataRecebimento) {
            // Filtrar por data de recebimento (updated_at é quando foi aprovado/recebido)
            if ($dataInicio) {
                $queryOrcamentos->where('updated_at', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryOrcamentos->where('updated_at', '<=', $dataFim . ' 23:59:59');
            }
        } else {
            // Filtro padrão por data de atualização
            if ($dataInicio) {
                $queryOrcamentos->where('updated_at', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryOrcamentos->where('updated_at', '<=', $dataFim . ' 23:59:59');
            }
        }
        
        $orcamentos = $queryOrcamentos->get();
        $orcamentos->each(function ($orc) use ($todosRecebimentos, $filtrarPorDataRecebimento) {
            $todosRecebimentos->push([
                'id' => "orc-{$orc->id}",
                'data' => $orc->updated_at ? $orc->updated_at->format('Y-m-d H:i:s') : null,
                'origem' => "Orçamento #{$orc->id}",
                'cliente' => $orc->cliente_nome ?? 'Cliente não identificado',
                'valor' => (float) $orc->valor_total,
                'formaPagamento' => 'Orçamento',
                'tipo' => 'orcamento'
            ]);
        });
        
        // 6. CONTAS A RECEBER PAGAS (CREDIÁRIOS PAGOS NO DIA)
        $queryContasReceber = \App\Models\ContaReceber::where('tenant_id', $tenantId)
            ->whereRaw('JSON_LENGTH(historico_pagamentos) > 0')
            ->with('ordemServico'); // Carregar relacionamento OS
        
        $contasReceber = $queryContasReceber->get();
        
        \Log::info('🔍 Contas a receber encontradas:', [
            'total_contas' => $contasReceber->count(),
            'data_inicio' => $dataInicio,
            'data_fim' => $dataFim
        ]);
        $contasReceber->each(function ($conta) use ($todosRecebimentos, $dataInicio, $dataFim) {
            $historicoPagamentos = $conta->historico_pagamentos ?? [];
            
            \Log::info('🔍 Processando conta a receber:', [
                'conta_id' => $conta->id,
                'total_pagamentos' => count($historicoPagamentos)
            ]);
            
            foreach($historicoPagamentos as $index => $pagamento) {
                $dataPagamento = $pagamento['data'] ?? null;
                
                if($dataPagamento) {
                    $dataPagamentoObj = new \DateTime($dataPagamento);
                    $dataPagamentoFormatada = $dataPagamentoObj->format('Y-m-d');
                    
                    // Verificar se o pagamento foi feito no período filtrado
                    $incluirPagamento = true;
                    
                    if($dataInicio && $dataPagamentoFormatada < $dataInicio) {
                        $incluirPagamento = false;
                    }
                    if($dataFim && $dataPagamentoFormatada > $dataFim) {
                        $incluirPagamento = false;
                    }
                    
                    if($incluirPagamento) {
                        \Log::info('🔍 Incluindo pagamento:', [
                            'conta_id' => $conta->id,
                            'data_pagamento' => $dataPagamentoFormatada,
                            'valor' => $pagamento['valor'] ?? 0,
                            'index' => $index
                        ]);
                        
                        $valor = floatval($pagamento['valor'] ?? 0);
                        $formaPagamento = $pagamento['forma_pagamento'] ?? 'Não informado';
                        
                        // Determinar origem baseada nos relacionamentos
                        $origem = "Conta Receber #{$conta->id}";
                        if($conta->envelopamento_id) {
                            $origem = "Envelopamento #{$conta->envelopamento_id} (Crediário Pago)";
                        } elseif($conta->os_id) {
                            // Usar os_id (ID numérico) que é o mesmo da OS original
                            $origem = "Ordem de Serviço #{$conta->os_id} (Crediário Pago)";
                        } elseif($conta->venda_id) {
                            $origem = "Venda PDV #{$conta->venda_id} (Crediário Pago)";
                        }
                        
                        // Criar ID único incluindo conta_id, índice do pagamento, data e valor para evitar duplicatas
                        $idUnico = "cr-{$conta->id}-{$index}-" . md5($dataPagamento . $valor . $formaPagamento);
                        
                        $todosRecebimentos->push([
                            'id' => $idUnico,
                            'data' => $dataPagamento,
                            'origem' => $origem,
                            'cliente' => $conta->cliente->nome ?? 'Cliente não identificado',
                            'valor' => $valor,
                            'formaPagamento' => $formaPagamento,
                            'tipo' => 'conta_receber_paga'
                        ]);
                    }
                }
            }
        });
        
        // Ordenar todos os recebimentos por data (mais recente primeiro)
        $todosRecebimentos = $todosRecebimentos->sortByDesc('data');
        
        \Log::info('🔍 Total de recebimentos encontrados:', [
            'total_recebimentos' => $todosRecebimentos->count(),
            'total_valor' => $todosRecebimentos->sum('valor')
        ]);
        
        // Calcular totais
        $totalRecebido = $todosRecebimentos->sum('valor');
        
        // Agrupar por forma de pagamento
        $porFormaPagamento = $todosRecebimentos->groupBy('formaPagamento')->map(function ($grupo) {
            return [
                'total' => $grupo->sum('valor'),
                'quantidade' => $grupo->count()
            ];
        });
        
        return $this->success([
            'recebimentos' => $todosRecebimentos->values()->toArray(),
            'totais' => [
                'totalRecebido' => $totalRecebido,
                'quantidadeRecebimentos' => $todosRecebimentos->count()
            ],
            'porFormaPagamento' => $porFormaPagamento,
            'resumo_por_tipo' => [
                'vendas_pdv' => $vendasPDV->count(),
                'ordens_servico' => $ordensServico->count(),
                'envelopamentos' => $envelopamentos->count(),
                'marketplace' => $vendasMarketplace->count(),
                'orcamentos' => $orcamentos->count(),
                'contas_receber' => $contasReceber->count()
            ],
            'periodo' => [
                'dataInicio' => $dataInicio,
                'dataFim' => $dataFim
            ]
        ]);
    }

    /**
     * Cria uma conta a receber para todas as vendas
     * 
     * @param Venda $venda
     * @param Request $request
     * @return void
     */
    protected function criarContaReceber(Venda $venda, Request $request)
    {
        try {
            // Não criar contas a receber para pedidos de permuta
            if ($venda->tipo_pedido === 'PERMUTA') {
                \Log::info('Venda de permuta - não criando conta a receber', [
                    'venda_id' => $venda->id,
                    'tipo_pedido' => $venda->tipo_pedido
                ]);
                return;
            }
            
            // Verificar se o cliente é de permuta
            if ($venda->cliente_id) {
                $cliente = \App\Models\Cliente::find($venda->cliente_id);
                if ($cliente && $cliente->is_cliente_permuta) {
                    \Log::info('Cliente de permuta - não criando conta a receber', [
                        'venda_id' => $venda->id,
                        'cliente_id' => $venda->cliente_id
                    ]);
                    return;
                }
            }
            
            // Verificar se já existem contas a receber para esta venda
            $contasExistentes = \App\Models\ContaReceber::where('venda_id', $venda->id)->count();
            
            if ($contasExistentes > 0) {
                \Log::info("Contas a receber já existem para esta venda, pulando criação", [
                    'venda_id' => $venda->id,
                    'contas_existentes' => $contasExistentes
                ]);
                return;
            }

            // Obter dados de pagamento da venda
            $dadosPagamento = $venda->dados_pagamento ?? [];
            
            \Log::info("Dados de pagamento recebidos na venda", [
                'venda_id' => $venda->id,
                'dados_pagamento' => $dadosPagamento,
                'forma_pagamento' => $venda->forma_pagamento
            ]);
            
            // Se não há dados de pagamento, usar dados padrão
            if (empty($dadosPagamento)) {
                $dadosPagamento = [
                    [
                        'metodo' => $venda->forma_pagamento ?? 'Dinheiro',
                        'valor' => $venda->valor_total,
                        'valorOriginal' => $venda->valor_total,
                        'valorFinal' => $venda->valor_total,
                        'parcelas' => 1,
                        'dataVencimento' => now()->addDays(30)->format('Y-m-d')
                    ]
                ];
                
                \Log::info("Dados de pagamento padrão criados", [
                    'venda_id' => $venda->id,
                    'dados_pagamento' => $dadosPagamento
                ]);
            }

            // Verificar se todos os pagamentos são à vista (já quitados)
            $todosAVista = true;
            $valorTotalPagamentos = 0;
            $formasPagamento = [];
            
            foreach ($dadosPagamento as $pagamento) {
                $metodoPagamento = $pagamento['metodo'] ?? '';
                $valor = $pagamento['valorFinal'] ?? $pagamento['valor'];
                
                $valorTotalPagamentos += $valor;
                $formasPagamento[] = $metodoPagamento;
                
                // Se algum pagamento não for à vista, marcar como false
                if (!in_array($metodoPagamento, ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito'])) {
                    $todosAVista = false;
                }
            }
            
            \Log::info("Análise dos pagamentos da venda", [
                'venda_id' => $venda->id,
                'todos_a_vista' => $todosAVista,
                'valor_total_pagamentos' => $valorTotalPagamentos,
                'formas_pagamento' => $formasPagamento,
                'total_pagamentos' => count($dadosPagamento)
            ]);
            
            if ($todosAVista && count($dadosPagamento) > 0) {
                // Todos os pagamentos são à vista - criar apenas UMA conta já quitada
                $formasPagamentoTexto = implode(' + ', array_unique($formasPagamento));
                
                // Preparar descrição com ID da venda e observações
                $descricao = "Venda #{$venda->id}";
                if (!empty($venda->observacoes)) {
                    $descricao .= " - " . $venda->observacoes;
                }
                
                $dadosContaReceber = [
                    'tenant_id' => $venda->tenant_id,
                    'cliente_id' => $venda->cliente_id,
                    'user_id' => $venda->usuario_id,
                    'descricao' => $descricao,
                    'valor_original' => $valorTotalPagamentos,
                    'valor_pendente' => 0, // Já quitado
                    'data_emissao' => $venda->data_emissao,
                    'data_vencimento' => $venda->data_emissao, // Mesmo dia para pagamento à vista
                    'data_quitacao' => $venda->data_emissao, // Quitado no mesmo dia
                    'status' => 'quitada',
                    'observacoes' => "Venda PDV - {$venda->codigo} - {$formasPagamentoTexto}",
                    'venda_id' => $venda->id,
                ];

                \Log::info("Criando conta única quitada para pagamento à vista", [
                    'venda_id' => $venda->id,
                    'valor_total' => $valorTotalPagamentos,
                    'formas_pagamento' => $formasPagamentoTexto,
                    'dados_conta' => $dadosContaReceber
                ]);

                $contaReceber = \App\Models\ContaReceber::create($dadosContaReceber);

                \Log::info("Conta única quitada criada com sucesso", [
                    'venda_id' => $venda->id,
                    'conta_id' => $contaReceber->id,
                    'valor_original' => $contaReceber->valor_original,
                    'status' => $contaReceber->status
                ]);
                
            } else {
                // Há pagamentos a prazo - criar conta para cada pagamento (lógica original)
                foreach ($dadosPagamento as $pagamento) {
                    $dataVencimento = isset($pagamento['dataVencimento']) 
                        ? \Carbon\Carbon::parse($pagamento['dataVencimento'])
                        : now()->addDays(30);

                    $valor = $pagamento['valorFinal'] ?? $pagamento['valor'];
                    
                    // Determinar status baseado na forma de pagamento
                    $status = 'pendente';
                    $metodoPagamento = $pagamento['metodo'] ?? '';
                    
                    \Log::info("Verificando método de pagamento para conta a receber", [
                        'venda_id' => $venda->id,
                        'metodo' => $metodoPagamento,
                        'dados_pagamento' => $dadosPagamento
                    ]);
                    
                    if (in_array($metodoPagamento, ['Dinheiro', 'Pix', 'Cartão Débito', 'Cartão Crédito'])) {
                        $status = 'quitada';
                        $dataVencimento = $venda->data_emissao; // Mesmo dia para pagamento à vista
                        \Log::info("Conta a receber será criada como quitada", [
                            'venda_id' => $venda->id,
                            'metodo' => $metodoPagamento,
                            'status' => $status
                        ]);
                    } else {
                        \Log::info("Conta a receber será criada como pendente", [
                            'venda_id' => $venda->id,
                            'metodo' => $metodoPagamento,
                            'status' => $status
                        ]);
                    }
                    
                    // Preparar descrição com ID da venda e observações
                    $descricao = "Venda #{$venda->id}";
                    if (!empty($venda->observacoes)) {
                        $descricao .= " - " . $venda->observacoes;
                    }
                    
                    $dadosContaReceber = [
                        'tenant_id' => $venda->tenant_id,
                        'cliente_id' => $venda->cliente_id,
                        'user_id' => $venda->usuario_id,
                        'descricao' => $descricao,
                        'valor_original' => $valor,
                        'valor_pendente' => $status === 'quitada' ? 0 : $valor,
                        'data_emissao' => $venda->data_emissao,
                        'data_vencimento' => $dataVencimento,
                        'data_quitacao' => $status === 'quitada' ? $venda->data_emissao : null,
                        'status' => $status,
                        'observacoes' => "Venda PDV - {$venda->codigo} - {$pagamento['metodo']}",
                        'venda_id' => $venda->id,
                    ];

                    \Log::info("Criando conta a receber com dados", [
                        'venda_id' => $venda->id,
                        'dados_conta' => $dadosContaReceber
                    ]);

                    $contaReceber = \App\Models\ContaReceber::create($dadosContaReceber);

                    \Log::info("Conta a receber criada com sucesso", [
                        'venda_id' => $venda->id,
                        'conta_id' => $contaReceber->id,
                        'status' => $status,
                        'valor_original' => $contaReceber->valor_original,
                        'valor_pendente' => $contaReceber->valor_pendente
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Log::error("Erro ao criar conta a receber para venda {$venda->id}: " . $e->getMessage());
            // Não interrompe o fluxo da venda se houver erro na criação da conta
        }
    }

    /**
     * Cria lançamentos no fluxo de caixa para as vendas
     * 
     * @param Venda $venda
     * @param Request $request
     * @return void
     */
    protected function criarLancamentosCaixa(Venda $venda, Request $request)
    {
        try {
            // Não criar lançamentos no caixa para pedidos de permuta
            if ($venda->tipo_pedido === 'PERMUTA') {
                \Log::info('Venda de permuta - não criando lançamento no caixa', [
                    'venda_id' => $venda->id,
                    'tipo_pedido' => $venda->tipo_pedido
                ]);
                return;
            }
            
            // Verificar se o cliente é de permuta
            if ($venda->cliente_id) {
                $cliente = \App\Models\Cliente::find($venda->cliente_id);
                if ($cliente && $cliente->is_cliente_permuta) {
                    \Log::info('Cliente de permuta - não criando lançamento no caixa', [
                        'venda_id' => $venda->id,
                        'cliente_id' => $venda->cliente_id
                    ]);
                    return;
                }
            }
            
            \Log::info('Iniciando criação de lançamentos no caixa para venda', [
                'venda_id' => $venda->id,
                'venda_codigo' => $venda->codigo,
                'status' => $venda->status,
                'valor_total' => $venda->valor_total,
                'dados_pagamento' => $venda->dados_pagamento
            ]);
            
            // Obter dados de pagamento da venda
            $dadosPagamento = $venda->dados_pagamento ?? [];
            
            // Se não há dados de pagamento, usar dados padrão
            if (empty($dadosPagamento)) {
                \Log::info('Nenhum dado de pagamento encontrado, usando dados padrão', [
                    'venda_id' => $venda->id,
                    'forma_pagamento' => $venda->forma_pagamento
                ]);
                $dadosPagamento = [
                    [
                        'metodo' => $venda->forma_pagamento ?? 'Dinheiro',
                        'valor' => $venda->valor_total,
                        'valorOriginal' => $venda->valor_total,
                        'valorFinal' => $venda->valor_total,
                        'parcelas' => 1
                    ]
                ];
            }
            
            \Log::info('Dados de pagamento processados', [
                'venda_id' => $venda->id,
                'total_pagamentos' => count($dadosPagamento),
                'dados_pagamento' => $dadosPagamento
            ]);

            // Verificar se há caixa aberto (opcional - não bloqueia criação de lançamentos)
            $caixaAberto = \App\Models\LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', $venda->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            $sessaoId = null;
            if ($caixaAberto) {
                // Verificar se o caixa não foi fechado
                $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = \App\Models\LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', $venda->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();
                    
                    // Se há fechamento, não usar sessao_id mas ainda criar o lançamento
                    if ($fechamento) {
                        \Log::info('Caixa fechado, criando lançamento sem sessao_id', [
                            'venda_id' => $venda->id
                        ]);
                        $sessaoId = null;
                    }
                }
            } else {
                \Log::info('Nenhum caixa aberto encontrado, criando lançamento sem sessao_id', [
                    'venda_id' => $venda->id
                ]);
            }

            // Buscar conta de caixa
            $contaCaixa = \App\Models\ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', $venda->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('Conta de caixa não encontrada', [
                    'venda_id' => $venda->id
                ]);
                return;
            }

            // Buscar categoria de receita
            $categoriaReceita = \App\Models\CategoriaCaixa::where('tipo', 'receita')
                ->where('tenant_id', $venda->tenant_id)
                ->where('ativo', true)
                ->first();

            // Criar lançamento para cada pagamento
            foreach ($dadosPagamento as $pagamento) {
                $valor = $pagamento['valorFinal'] ?? $pagamento['valor'];
                $metodoPagamento = $pagamento['metodo'] ?? $pagamento['forma_pagamento'] ?? 'Dinheiro';
                
                // Determinar a conta bancária baseada no tipo de pagamento
                $contaBancariaIdFinal = null;
                $contaBancariaNome = null;
                
                // Verificar se o pagamento tem conta bancária informada
                $contaBancariaIdPagamento = $pagamento['conta_bancaria_id'] ?? 
                                           $pagamento['contaDestinoId'] ?? 
                                           $pagamento['conta_destino_id'] ?? 
                                           null;
                
                // Se tem conta bancária informada, usar essa conta (para qualquer forma de pagamento)
                if ($contaBancariaIdPagamento) {
                    $contaBancaria = \App\Models\ContaBancaria::find($contaBancariaIdPagamento);
                    if ($contaBancaria && $contaBancaria->tenant_id === $venda->tenant_id) {
                        $contaBancariaIdFinal = $contaBancaria->id;
                        $contaBancariaNome = $contaBancaria->nome;
                        \Log::info('Usando conta bancária informada no pagamento da venda', [
                            'venda_id' => $venda->id,
                            'conta_bancaria_id' => $contaBancariaIdFinal,
                            'conta_bancaria_nome' => $contaBancariaNome,
                            'forma_pagamento' => $metodoPagamento
                        ]);
                    }
                }
                
                // Se não encontrou conta bancária específica, usar estratégia baseada no tipo de pagamento
                if (!$contaBancariaIdFinal) {
                    $metodoPagamentoLower = strtolower($metodoPagamento);
                    
                    if ($metodoPagamentoLower === 'dinheiro') {
                        // Para dinheiro, usar conta de caixa
                        $contaBancariaIdFinal = $contaCaixa->id;
                        $contaBancariaNome = $contaCaixa->nome;
                        \Log::info('Usando conta de caixa para pagamento em dinheiro', [
                            'venda_id' => $venda->id,
                            'conta_id' => $contaBancariaIdFinal
                        ]);
                    } else {
                        // Para outras formas de pagamento, buscar conta padrão do sistema
                        $contaPadrao = \App\Models\ContaBancaria::where('tenant_id', $venda->tenant_id)
                            ->where('conta_padrao', true)
                            ->where('ativo', true)
                            ->first();
                        
                        if ($contaPadrao) {
                            $contaBancariaIdFinal = $contaPadrao->id;
                            $contaBancariaNome = $contaPadrao->nome;
                            \Log::info('Usando conta padrão do sistema (conta selecionada não encontrada)', [
                                'venda_id' => $venda->id,
                                'conta_bancaria_id' => $contaBancariaIdFinal,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        } else {
                            // Fallback: usar conta de caixa se não houver conta padrão
                            $contaBancariaIdFinal = $contaCaixa->id;
                            $contaBancariaNome = $contaCaixa->nome;
                            \Log::warning('Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                                'venda_id' => $venda->id,
                                'conta_id' => $contaBancariaIdFinal,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        }
                    }
                }
                
                // Criar lançamento apenas se não for dinheiro (dinheiro não aparece no relatório bancário)
                // Mas criar para todos para manter o histórico completo
                $dadosLancamento = [
                    'tenant_id' => $venda->tenant_id,
                    'descricao' => "Venda #{$venda->codigo} - {$venda->cliente_nome}",
                    'valor' => $valor,
                    'tipo' => 'entrada',
                    'categoria_id' => $categoriaReceita ? $categoriaReceita->id : null,
                    'categoria_nome' => $categoriaReceita ? $categoriaReceita->nome : 'Vendas',
                    'conta_id' => $contaBancariaIdFinal,
                    'conta_nome' => $contaBancariaNome,
                    'forma_pagamento' => $metodoPagamento,
                    'operacao_tipo' => 'venda',
                    'operacao_id' => $venda->id,
                    'usuario_id' => $venda->usuario_id,
                    'usuario_nome' => $venda->vendedor_nome ?? 'Sistema',
                    'status' => 'concluido',
                    'data_operacao' => $venda->data_emissao,
                    'metadados' => [
                        'sessao_id' => $sessaoId,
                        'venda_id' => $venda->id,
                        'cliente_id' => $venda->cliente_id,
                        'cliente_nome' => $venda->cliente_nome,
                        'parcelas' => $pagamento['parcelas'] ?? 1,
                        'valor_original' => $pagamento['valorOriginal'] ?? $valor,
                        'conta_bancaria_id' => $contaBancariaIdFinal,
                        'conta_bancaria_nome' => $contaBancariaNome,
                        'observacoes' => "Venda PDV - {$venda->codigo}"
                    ]
                ];

                \Log::info('Criando lançamento no caixa para venda', [
                    'venda_id' => $venda->id,
                    'dados_lancamento' => $dadosLancamento
                ]);

                try {
                    // Validar dados obrigatórios antes de criar
                    if (empty($dadosLancamento['conta_id'])) {
                        \Log::error('Erro: conta_id não definido para lançamento', [
                            'venda_id' => $venda->id,
                            'dados_lancamento' => $dadosLancamento
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    if (empty($dadosLancamento['valor']) || $dadosLancamento['valor'] <= 0) {
                        \Log::error('Erro: valor inválido para lançamento', [
                            'venda_id' => $venda->id,
                            'valor' => $dadosLancamento['valor']
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    $lancamento = \App\Models\LancamentoCaixa::create($dadosLancamento);

                    \Log::info('Lançamento no caixa criado com sucesso para venda', [
                        'lancamento_id' => $lancamento->id,
                        'codigo' => $lancamento->codigo,
                        'venda_id' => $venda->id,
                        'conta_id' => $lancamento->conta_id,
                        'valor' => $lancamento->valor
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Erro ao criar lançamento no caixa para venda', [
                        'venda_id' => $venda->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                    // Não interromper o processo, apenas logar o erro
                }
            }
        } catch (\Exception $e) {
            \Log::error("Erro ao criar lançamentos no caixa para venda", [
                'venda_id' => $venda->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não interrompe o fluxo da venda se houver erro na criação dos lançamentos
        }
    }

    /**
     * Retorna dados analíticos completos para relatórios
     * Inclui: faturamento, ticket médio, vendas por período/cliente/produto, clientes ativos/inativos, curva ABC, etc.
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function relatorioAnalitico(Request $request)
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');
            
            // Construir query base para vendas confirmadas
            $queryVendas = Venda::where('status', 'concluida')
                ->where('tenant_id', $tenantId);
            
            if ($dataInicio) {
                $queryVendas->where('data_emissao', '>=', $dataInicio);
            }
            if ($dataFim) {
                $queryVendas->where('data_emissao', '<=', $dataFim . ' 23:59:59');
            }
            
            $vendas = $queryVendas->with(['cliente', 'itens.produto'])->get();
            
            // 1. FATURAMENTO
            $faturamento = $vendas->sum('valor_total');
            
            // 2. TICKET MÉDIO
            $quantidadePedidos = $vendas->count();
            $ticketMedio = $quantidadePedidos > 0 ? $faturamento / $quantidadePedidos : 0;
            
            // 3. VENDAS POR PERÍODO
            $vendasPorPeriodo = $vendas->groupBy(function($venda) {
                return \Illuminate\Support\Carbon::parse($venda->data_emissao)->format('Y-m-d');
            })->map(function($grupo) {
                return [
                    'quantidade' => $grupo->count(),
                    'faturamento' => $grupo->sum('valor_total')
                ];
            });
            
            // 4. VENDAS POR CLIENTE
            $vendasPorCliente = $vendas->groupBy('cliente_id')->map(function($grupo) {
                $cliente = $grupo->first()->cliente;
                return [
                    'cliente_id' => $cliente->id ?? null,
                    'cliente_nome' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? $cliente->nome ?? 'Cliente não identificado',
                    'quantidade_vendas' => $grupo->count(),
                    'faturamento' => $grupo->sum('valor_total')
                ];
            })->sortByDesc('faturamento')->values();
            
            // 5. VENDAS POR PRODUTO
            $vendasPorProduto = collect();
            foreach ($vendas as $venda) {
                foreach ($venda->itens as $item) {
                    $produtoId = $item->produto_id;
                    $produto = $item->produto;
                    
                    if (!$vendasPorProduto->has($produtoId)) {
                        $vendasPorProduto->put($produtoId, [
                            'produto_id' => $produtoId,
                            'produto_nome' => $produto->nome ?? 'Produto não identificado',
                            'quantidade' => 0,
                            'faturamento' => 0,
                            'custo_total' => 0,
                            'lucro' => 0
                        ]);
                    }
                    
                    $quantidade = floatval($item->quantidade);
                    $valorUnitario = floatval($item->valor_unitario);
                    $subtotal = floatval($item->subtotal);
                    $precoCusto = floatval($produto->preco_custo ?? 0);
                    
                    $vendasPorProduto[$produtoId]['quantidade'] += $quantidade;
                    $vendasPorProduto[$produtoId]['faturamento'] += $subtotal;
                    $vendasPorProduto[$produtoId]['custo_total'] += ($precoCusto * $quantidade);
                    $vendasPorProduto[$produtoId]['lucro'] = $vendasPorProduto[$produtoId]['faturamento'] - $vendasPorProduto[$produtoId]['custo_total'];
                }
            }
            $vendasPorProduto = $vendasPorProduto->sortByDesc('faturamento')->values();
            
            // 6. CLIENTES ATIVOS (compraram nos últimos 90 dias)
            $dataLimiteAtivo = now()->subDays(90);
            $clientesAtivos = DB::table('vendas')
                ->join('clientes', 'vendas.cliente_id', '=', 'clientes.id')
                ->where('vendas.tenant_id', $tenantId)
                ->where('vendas.status', 'concluida')
                ->where('vendas.data_emissao', '>=', $dataLimiteAtivo)
                ->select('clientes.id', 'clientes.nome_completo', 'clientes.apelido_fantasia', 'clientes.nome')
                ->distinct()
                ->get()
                ->map(function($cliente) {
                    return [
                        'id' => $cliente->id,
                        'nome' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? $cliente->nome ?? 'Cliente não identificado'
                    ];
                });
            
            // 7. CLIENTES INATIVOS (não compram há 90 dias ou mais)
            $clientesInativos = DB::table('clientes')
                ->leftJoin('vendas', function($join) use ($tenantId, $dataLimiteAtivo) {
                    $join->on('clientes.id', '=', 'vendas.cliente_id')
                         ->where('vendas.tenant_id', $tenantId)
                         ->where('vendas.status', 'concluida')
                         ->where('vendas.data_emissao', '>=', $dataLimiteAtivo);
                })
                ->where('clientes.tenant_id', $tenantId)
                ->whereNull('vendas.id')
                ->select('clientes.id', 'clientes.nome_completo', 'clientes.apelido_fantasia', 'clientes.nome',
                    DB::raw('(SELECT MAX(data_emissao) FROM vendas WHERE cliente_id = clientes.id AND status = "concluida" AND tenant_id = ' . $tenantId . ') as ultima_compra'))
                ->get()
                ->map(function($cliente) {
                    $ultimaCompra = $cliente->ultima_compra ? Carbon::parse($cliente->ultima_compra) : null;
                    $diasSemCompra = $ultimaCompra ? now()->diffInDays($ultimaCompra) : null;
                    
                    return [
                        'id' => $cliente->id,
                        'nome' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? $cliente->nome ?? 'Cliente não identificado',
                        'ultima_compra' => $ultimaCompra ? $ultimaCompra->format('Y-m-d') : null,
                        'dias_sem_compra' => $diasSemCompra
                    ];
                })
                ->sortByDesc('dias_sem_compra');
            
            // 8. CURVA ABC DE CLIENTES
            $totalFaturamentoClientes = $vendasPorCliente->sum('faturamento');
            $curvaABCClientes = $vendasPorCliente->map(function($cliente, $index) use ($totalFaturamentoClientes, $vendasPorCliente) {
                $percentual = $totalFaturamentoClientes > 0 ? ($cliente['faturamento'] / $totalFaturamentoClientes) * 100 : 0;
                $percentualAcumulado = $vendasPorCliente->take($index + 1)->sum('faturamento') / $totalFaturamentoClientes * 100;
                
                $classificacao = 'C';
                if ($percentualAcumulado <= 80) {
                    $classificacao = 'A';
                } elseif ($percentualAcumulado <= 95) {
                    $classificacao = 'B';
                }
                
                return array_merge($cliente, [
                    'percentual' => round($percentual, 2),
                    'percentual_acumulado' => round($percentualAcumulado, 2),
                    'classificacao' => $classificacao
                ]);
            });
            
            // 9. CURVA ABC DE PRODUTOS
            $totalFaturamentoProdutos = $vendasPorProduto->sum('faturamento');
            $curvaABCProdutos = $vendasPorProduto->map(function($produto, $index) use ($totalFaturamentoProdutos, $vendasPorProduto) {
                $percentual = $totalFaturamentoProdutos > 0 ? ($produto['faturamento'] / $totalFaturamentoProdutos) * 100 : 0;
                $percentualAcumulado = $vendasPorProduto->take($index + 1)->sum('faturamento') / $totalFaturamentoProdutos * 100;
                
                $classificacao = 'C';
                if ($percentualAcumulado <= 80) {
                    $classificacao = 'A';
                } elseif ($percentualAcumulado <= 95) {
                    $classificacao = 'B';
                }
                
                return array_merge($produto, [
                    'percentual' => round($percentual, 2),
                    'percentual_acumulado' => round($percentualAcumulado, 2),
                    'classificacao' => $classificacao
                ]);
            });
            
            // 10. PRODUTOS MAIS VENDIDOS (por quantidade)
            $produtosMaisVendidos = $vendasPorProduto->sortByDesc('quantidade')->values();
            
            // 11. PRODUTOS MAIS LUCRATIVOS (por lucro)
            $produtosMaisLucrativos = $vendasPorProduto->sortByDesc('lucro')->values();
            
            // 12. MIX DE PRODUTOS (participação percentual no faturamento)
            $mixProdutos = $vendasPorProduto->map(function($produto) use ($totalFaturamentoProdutos) {
                $participacao = $totalFaturamentoProdutos > 0 ? ($produto['faturamento'] / $totalFaturamentoProdutos) * 100 : 0;
                return array_merge($produto, [
                    'participacao_percentual' => round($participacao, 2)
                ]);
            })->sortByDesc('participacao_percentual')->values();
            
            return $this->success([
                'faturamento' => $faturamento,
                'ticket_medio' => round($ticketMedio, 2),
                'quantidade_pedidos' => $quantidadePedidos,
                'vendas_por_periodo' => $vendasPorPeriodo,
                'vendas_por_cliente' => $vendasPorCliente,
                'vendas_por_produto' => $vendasPorProduto,
                'clientes_ativos' => $clientesAtivos,
                'clientes_inativos' => $clientesInativos,
                'curva_abc_clientes' => $curvaABCClientes,
                'curva_abc_produtos' => $curvaABCProdutos,
                'produtos_mais_vendidos' => $produtosMaisVendidos,
                'produtos_mais_lucrativos' => $produtosMaisLucrativos,
                'mix_produtos' => $mixProdutos,
                'periodo' => [
                    'data_inicio' => $dataInicio,
                    'data_fim' => $dataFim
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao gerar relatório analítico', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao gerar relatório analítico: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retorna relatório de vendas com metas (empresa e vendedores)
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function relatorioComMetas(Request $request)
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');
            $tipoPeriodo = $request->input('tipo_periodo', 'mensal'); // 'diario', 'mensal', 'personalizado'
            
            // Se não informado, usar período padrão
            if (!$dataInicio || !$dataFim) {
                if ($tipoPeriodo === 'diario') {
                    $dataInicio = Carbon::today()->format('Y-m-d');
                    $dataFim = Carbon::today()->format('Y-m-d');
                } elseif ($tipoPeriodo === 'mensal') {
                    $dataInicio = Carbon::now()->startOfMonth()->format('Y-m-d');
                    $dataFim = Carbon::now()->endOfMonth()->format('Y-m-d');
                } else {
                    // Personalizado - usar mês atual como padrão
                    $dataInicio = Carbon::now()->startOfMonth()->format('Y-m-d');
                    $dataFim = Carbon::now()->endOfMonth()->format('Y-m-d');
                }
            }
            
            // Buscar meta da empresa para o período
            $metaEmpresa = \App\Models\MetaVenda::where('tenant_id', $tenantId)
                ->where('tipo', 'empresa')
                ->where('ativo', true)
                ->noPeriodo($dataInicio, $dataFim)
                ->first();
            
            // Buscar todas as vendas do período
            $vendas = Venda::where('tenant_id', $tenantId)
                ->where('status', 'concluida')
                ->whereBetween('data_emissao', [$dataInicio, $dataFim . ' 23:59:59'])
                ->with(['vendedor:id,name,email', 'cliente:id,nome_completo,apelido_fantasia,nome'])
                ->get();
            
            // Cálculos da Empresa
            $totalVendidoEmpresa = $vendas->sum('valor_total');
            $metaEmpresaValor = $metaEmpresa ? floatval($metaEmpresa->valor_meta) : 0;
            $percentualMetaEmpresa = $metaEmpresaValor > 0 ? ($totalVendidoEmpresa / $metaEmpresaValor) * 100 : 0;
            $valorFaltaEmpresa = max(0, $metaEmpresaValor - $totalVendidoEmpresa);
            
            // Buscar todos os vendedores que têm vendas no período
            // Filtrar vendas que têm vendedor_id (não nulo)
            $vendedoresComVendas = $vendas
                ->filter(function($venda) {
                    return $venda->vendedor_id !== null;
                })
                ->groupBy('vendedor_id')
                ->map(function($grupoVendas, $vendedorId) use ($tenantId, $dataInicio, $dataFim, $totalVendidoEmpresa) {
                    $vendedor = $grupoVendas->first()->vendedor;
                    $totalVendidoVendedor = $grupoVendas->sum('valor_total');
                    
                    // Buscar meta do vendedor
                    $metaVendedor = \App\Models\MetaVenda::where('tenant_id', $tenantId)
                        ->where('tipo', 'vendedor')
                        ->where('vendedor_id', $vendedorId)
                        ->where('ativo', true)
                        ->noPeriodo($dataInicio, $dataFim)
                        ->first();
                    
                    $metaVendedorValor = $metaVendedor ? floatval($metaVendedor->valor_meta) : 0;
                    $percentualMetaVendedor = $metaVendedorValor > 0 ? ($totalVendidoVendedor / $metaVendedorValor) * 100 : 0;
                    $valorFaltaVendedor = max(0, $metaVendedorValor - $totalVendidoVendedor);
                    $percentualContribuicao = $totalVendidoEmpresa > 0 ? ($totalVendidoVendedor / $totalVendidoEmpresa) * 100 : 0;
                    
                    return [
                        'vendedor_id' => $vendedorId,
                        'vendedor_nome' => $vendedor ? $vendedor->name : 'Vendedor não identificado',
                        'vendedor_email' => $vendedor ? $vendedor->email : null,
                        'meta_individual' => $metaVendedorValor,
                        'total_vendido' => $totalVendidoVendedor,
                        'percentual_meta_alcançado' => round($percentualMetaVendedor, 2),
                        'valor_falta_meta' => round($valorFaltaVendedor, 2),
                        'percentual_contribuicao' => round($percentualContribuicao, 2),
                        'quantidade_vendas' => $grupoVendas->count(),
                        'meta_configurada' => $metaVendedor ? true : false
                    ];
                })
                ->sortByDesc('total_vendido')
                ->values();
            
            // Buscar vendedores que têm meta mas não têm vendas
            $vendedoresComMeta = \App\Models\MetaVenda::where('tenant_id', $tenantId)
                ->where('tipo', 'vendedor')
                ->where('ativo', true)
                ->noPeriodo($dataInicio, $dataFim)
                ->with('vendedor:id,name,email')
                ->get()
                ->filter(function($meta) use ($vendedoresComVendas) {
                    return !$vendedoresComVendas->contains('vendedor_id', $meta->vendedor_id);
                })
                ->map(function($meta) {
                    return [
                        'vendedor_id' => $meta->vendedor_id,
                        'vendedor_nome' => $meta->vendedor ? $meta->vendedor->name : 'Vendedor não identificado',
                        'vendedor_email' => $meta->vendedor ? $meta->vendedor->email : null,
                        'meta_individual' => floatval($meta->valor_meta),
                        'total_vendido' => 0,
                        'percentual_meta_alcançado' => 0,
                        'valor_falta_meta' => floatval($meta->valor_meta),
                        'percentual_contribuicao' => 0,
                        'quantidade_vendas' => 0,
                        'meta_configurada' => true
                    ];
                });
            
            // Combinar vendedores com vendas e vendedores apenas com meta
            $todosVendedores = $vendedoresComVendas->concat($vendedoresComMeta)->sortByDesc('total_vendido')->values();
            
            return $this->success([
                'empresa' => [
                    'meta_total' => $metaEmpresaValor,
                    'total_vendido' => $totalVendidoEmpresa,
                    'percentual_meta_alcançado' => round($percentualMetaEmpresa, 2),
                    'valor_falta_meta' => round($valorFaltaEmpresa, 2),
                    'quantidade_pedidos' => $vendas->count(),
                    'meta_configurada' => $metaEmpresa ? true : false
                ],
                'vendedores' => $todosVendedores,
                'periodo' => [
                    'data_inicio' => $dataInicio,
                    'data_fim' => $dataFim,
                    'tipo_periodo' => $tipoPeriodo
                ],
                'resumo' => [
                    'total_vendedores' => $todosVendedores->count(),
                    'vendedores_com_meta' => $todosVendedores->where('meta_configurada', true)->count(),
                    'vendedores_sem_meta' => $todosVendedores->where('meta_configurada', false)->count()
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao gerar relatório com metas', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao gerar relatório com metas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cria uma entrega de frete para a venda
     * 
     * @param Venda $venda
     * @return void
     */
    protected function criarFreteEntrega(Venda $venda)
    {
        try {
            // Verificar se já existe entrega para esta venda
            $entregaExistente = \App\Models\FreteEntrega::where('venda_id', $venda->id)->first();
            if ($entregaExistente) {
                \Log::info('Entrega de frete já existe para esta venda', [
                    'venda_id' => $venda->id,
                    'entrega_id' => $entregaExistente->id
                ]);
                return;
            }

            if (!$venda->opcao_frete_id || !$venda->entregador_id) {
                \Log::info('Venda não tem frete configurado, não criando entrega', [
                    'venda_id' => $venda->id
                ]);
                return;
            }

            $entrega = \App\Models\FreteEntrega::create([
                'tenant_id' => $venda->tenant_id,
                'venda_id' => $venda->id,
                'opcao_frete_id' => $venda->opcao_frete_id,
                'entregador_id' => $venda->entregador_id,
                'cliente_id' => $venda->cliente_id,
                'valor_frete' => $venda->valor_frete ?? 0,
                'prazo_frete' => $venda->prazo_frete,
                'data_entrega' => $venda->data_emissao,
                'bairro' => $venda->bairro_entrega,
                'cidade' => $venda->cidade_entrega,
                'estado' => $venda->estado_entrega,
                'cep' => $venda->cep_entrega,
                'status' => 'pendente',
                'status_pagamento' => 'pendente',
            ]);

            \Log::info('Entrega de frete criada com sucesso', [
                'venda_id' => $venda->id,
                'entrega_id' => $entrega->id,
                'entregador_id' => $venda->entregador_id,
                'valor_frete' => $entrega->valor_frete
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao criar entrega de frete para venda', [
                'venda_id' => $venda->id,
                'erro' => $e->getMessage()
            ]);
        }
    }

    /**
     * Gerar link de compartilhamento para a Venda
     */
    public function compartilhar(Request $request, $id)
    {
        try {
            $venda = Venda::find($id);
            
            if (!$venda) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venda não encontrada'
                ], 404);
            }

            // Gerar token único se não existir
            if (!$venda->share_token) {
                $venda->share_token = Str::random(64);
            }

            // Ativar compartilhamento
            $venda->share_enabled = true;
            
            // Definir expiração se fornecida (opcional)
            if ($request->has('expires_at')) {
                $venda->share_expires_at = $request->input('expires_at');
            }
            
            $venda->save();

            // Gerar URL pública
            $shareUrl = url("/public/venda/{$venda->share_token}");

            return response()->json([
                'success' => true,
                'data' => [
                    'share_token' => $venda->share_token,
                    'share_url' => $shareUrl,
                    'share_enabled' => $venda->share_enabled,
                    'share_expires_at' => $venda->share_expires_at
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao compartilhar Venda:', [
                'venda_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar link de compartilhamento'
            ], 500);
        }
    }

    /**
     * Desabilitar compartilhamento da Venda
     */
    public function desabilitarCompartilhamento($id)
    {
        try {
            $venda = Venda::find($id);
            
            if (!$venda) {
                return response()->json([
                    'success' => false,
                    'message' => 'Venda não encontrada'
                ], 404);
            }

            $venda->share_enabled = false;
            $venda->save();

            return response()->json([
                'success' => true,
                'message' => 'Compartilhamento desabilitado com sucesso'
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao desabilitar compartilhamento da Venda:', [
                'venda_id' => $id,
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao desabilitar compartilhamento'
            ], 500);
        }
    }
}
