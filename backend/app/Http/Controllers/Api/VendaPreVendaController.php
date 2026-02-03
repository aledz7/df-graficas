<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\User;
use App\Models\Notificacao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class VendaPreVendaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = Venda::with(['cliente', 'itens.produto'])
                         ->where('status', Venda::STATUS_PRE_VENDA)
                         ->orderBy('created_at', 'desc');

            // Filtros
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('codigo', 'like', "%{$search}%")
                      ->orWhere('cliente_nome', 'like', "%{$search}%")
                      ->orWhere('cliente_telefone', 'like', "%{$search}%");
                });
            }

            $vendas = $query->paginate($request->get('per_page', 15));

            return response()->json([
                'success' => true,
                'data' => $vendas
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar vendas de pré-venda: ' . $e->getMessage()
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
                'cliente.nome' => 'required|string|max:255',
                'cliente.telefone' => 'required|string|max:20',
                'cliente.email' => 'nullable|email|max:255',
                'cliente.endereco' => 'nullable|string|max:500',
                'cliente.forma_pagamento' => 'nullable|string|in:cartao_entrega,pix,dinheiro',
                'itens' => 'required|array|min:1',
                'itens.*.produto_id' => 'required|exists:produtos,id',
                'itens.*.quantidade' => 'required|numeric|min:1',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'total' => 'required|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            DB::beginTransaction();

            // Sempre criar um novo cliente para cada pedido
            $telefone = $request->cliente['telefone'];
            $email = $request->cliente['email'] ?? null;
            $tenantId = auth()->user()->tenant_id;
            
            // Criar novo cliente para cada pedido
            $cliente = Cliente::create([
                'tenant_id' => $tenantId,
                'nome_completo' => $request->cliente['nome'],
                'email' => $email,
                'telefone_principal' => $telefone,
                'cpf_cnpj' => 'TEMP' . time() . rand(100, 999), // CPF temporário único
                'tipo_pessoa' => 'Pessoa Física',
                'status' => true,
                'logradouro' => $request->cliente['endereco'] ?? null,
                'observacoes' => 'Cliente cadastrado através do catálogo público - Pedido ' . date('Y-m-d H:i:s'),
            ]);

            // Criar venda de pré-venda
            $venda = Venda::create([
                'tenant_id' => $tenantId,
                'codigo' => Venda::gerarCodigoUnico(),
                'cliente_id' => $cliente->id,
                'usuario_id' => auth()->id(),
                'tipo_documento' => Venda::TIPO_VENDA,
                'status' => Venda::STATUS_PRE_VENDA,
                'status_pagamento' => Venda::PAGAMENTO_PENDENTE,
                'forma_pagamento' => $request->cliente['forma_pagamento'] ?? null,
                'cliente_nome' => $cliente->nome_completo,
                'cliente_telefone' => $cliente->telefone_principal,
                'cliente_email' => $cliente->email,
                'subtotal' => $request->total,
                'valor_total' => $request->total,
                'valor_restante' => $request->total,
                'observacoes' => $request->observacoes ?? 'Pedido realizado através do catálogo público',
                'data_emissao' => now(),
                'metadados' => [
                    'origem' => 'catalogo_publico',
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'dados_cliente' => $request->cliente,
                    'cliente_existente' => $cliente->wasRecentlyCreated ? false : true,
                ]
            ]);

            // Criar itens da venda
            foreach ($request->itens as $item) {
                // Buscar dados do produto
                $produto = Produto::find($item['produto_id']);
                
                ItemVenda::create([
                    'tenant_id' => $tenantId,
                    'venda_id' => $venda->id,
                    'tipo_venda' => 'pdv',
                    'produto_id' => $item['produto_id'],
                    'produto_nome' => $produto->nome,
                    'produto_codigo' => $produto->codigo_produto,
                    'produto_unidade' => $produto->unidade_medida ?? 'UN',
                    'produto_descricao' => $produto->descricao_curta,
                    'quantidade' => $item['quantidade'],
                    'valor_unitario' => $item['preco_unitario'],
                    'desconto_percentual' => 0,
                    'desconto_valor' => 0,
                    'acrescimo_percentual' => 0,
                    'acrescimo_valor' => 0,
                    'valor_total' => $item['quantidade'] * $item['preco_unitario'],
                ]);
            }

            // Criar notificação (tabela notificacoes)
            try {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'user_id' => auth()->id(),
                    'tipo' => 'pre_venda',
                    'titulo' => 'Nova Pré-Venda Realizada',
                    'mensagem' => 'Pré-venda #' . $venda->id . ' - ' . $venda->cliente_nome . ' • Total R$ ' . number_format($venda->valor_total, 2, ',', '.'),
                    'prioridade' => 'media',
                    'lida' => false,
                    'data_criacao' => now(),
                ]);
            } catch (\Throwable $e) {
                // Não falhar a transação por causa da notificação
                \Log::warning('Falha ao criar notificação de pré-venda', [
                    'erro' => $e->getMessage(),
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda criada com sucesso',
                'data' => [
                    'venda' => $venda->load(['cliente', 'itens.produto']),
                    'cliente_novo' => $cliente->wasRecentlyCreated,
                    'cliente_id' => $cliente->id
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $venda = Venda::with(['cliente', 'itens.produto'])
                         ->where('status', Venda::STATUS_PRE_VENDA)
                         ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $venda
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Venda de pré-venda não encontrada'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $venda = Venda::where('status', Venda::STATUS_PRE_VENDA)->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'status' => 'sometimes|in:' . Venda::STATUS_PRE_VENDA . ',' . Venda::STATUS_FINALIZADA . ',' . Venda::STATUS_CANCELADA,
                'observacoes' => 'nullable|string',
                'forma_pagamento' => 'nullable|string',
                'dados_pagamento' => 'nullable|array',
                'valor_pago' => 'nullable|numeric|min:0',
                'status_pagamento' => 'nullable|string',
                'data_finalizacao' => 'nullable|date',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $venda->update($request->only([
                'status', 
                'observacoes', 
                'forma_pagamento', 
                'dados_pagamento', 
                'valor_pago', 
                'status_pagamento',
                'data_finalizacao'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda atualizada com sucesso',
                'data' => $venda->load(['cliente', 'itens.produto'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $venda = Venda::where('status', Venda::STATUS_PRE_VENDA)->findOrFail($id);
            $venda->delete();

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda excluída com sucesso'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Aprovar venda de pré-venda (converter para venda finalizada)
     */
    public function approve($id)
    {
        try {
            DB::beginTransaction();

            $venda = Venda::where('status', Venda::STATUS_PRE_VENDA)->findOrFail($id);
            
            $venda->update([
                'status' => Venda::STATUS_FINALIZADA,
                'data_finalizacao' => now(),
                'metadados' => array_merge($venda->metadados ?? [], [
                    'aprovado_por' => auth()->id(),
                    'aprovado_em' => now()->toDateTimeString(),
                ])
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda aprovada com sucesso',
                'data' => $venda->load(['cliente', 'itens.produto'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao aprovar venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rejeitar venda de pré-venda (cancelar)
     */
    public function reject($id)
    {
        try {
            DB::beginTransaction();

            $venda = Venda::with('itens')->where('status', Venda::STATUS_PRE_VENDA)->findOrFail($id);
            
            // Estorna o estoque dos itens
            $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
            
            $venda->update([
                'status' => Venda::STATUS_CANCELADA,
                'status_pagamento' => Venda::PAGAMENTO_CANCELADO,
                'data_cancelamento' => now(),
                'metadados' => array_merge($venda->metadados ?? [], [
                    'rejeitado_por' => auth()->id(),
                    'rejeitado_em' => now()->toDateTimeString(),
                ])
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda rejeitada com sucesso',
                'data' => $venda->load(['cliente', 'itens.produto'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao rejeitar venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancelar venda de pré-venda
     */
    public function cancel($id)
    {
        try {
            DB::beginTransaction();

            $venda = Venda::with('itens')->where('status', Venda::STATUS_PRE_VENDA)->findOrFail($id);
            
            // Estorna o estoque dos itens
            $this->processarItensVenda($venda, $venda->itens->toArray(), 'increment');
            
            $venda->update([
                'status' => Venda::STATUS_CANCELADA,
                'status_pagamento' => Venda::PAGAMENTO_CANCELADO,
                'data_cancelamento' => now(),
                'metadados' => array_merge($venda->metadados ?? [], [
                    'cancelado_por' => auth()->id(),
                    'cancelado_em' => now()->toDateTimeString(),
                ])
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venda de pré-venda cancelada com sucesso',
                'data' => $venda->load(['cliente', 'itens.produto'])
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao cancelar venda de pré-venda: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar venda de pré-venda via WhatsApp
     */
    public function enviar($id)
    {
        try {
            $venda = Venda::with(['cliente', 'itens.produto'])
                         ->where('status', Venda::STATUS_PRE_VENDA)
                         ->findOrFail($id);

            // Gerar mensagem do WhatsApp
            $mensagem = $this->gerarMensagemWhatsApp($venda);
            
            // Gerar URL do WhatsApp
            $telefone = preg_replace('/[^0-9]/', '', $venda->cliente_telefone);
            $urlWhatsApp = "https://wa.me/{$telefone}?text=" . urlencode($mensagem);

            return response()->json([
                'success' => true,
                'message' => 'URL do WhatsApp gerada com sucesso',
                'data' => [
                    'url_whatsapp' => $urlWhatsApp,
                    'mensagem' => $mensagem,
                    'venda' => $venda
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar URL do WhatsApp: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar mensagem para WhatsApp
     */
    private function gerarMensagemWhatsApp($venda)
    {
        $mensagem = "🛒 *PEDIDO DE PRÉ-VENDA*\n\n";
        $mensagem .= "Código: *{$venda->codigo}*\n";
        $mensagem .= "Cliente: *{$venda->cliente_nome}*\n";
        $mensagem .= "Telefone: *{$venda->cliente_telefone}*\n";
        
        if ($venda->cliente_email) {
            $mensagem .= "E-mail: *{$venda->cliente_email}*\n";
        }
        
        $mensagem .= "\n*ITENS DO PEDIDO:*\n";
        
        foreach ($venda->itens as $item) {
            $mensagem .= "• {$item->produto->nome} - Qtd: {$item->quantidade} - R$ " . number_format($item->preco_total, 2, ',', '.') . "\n";
        }
        
        $mensagem .= "\n*TOTAL: R$ " . number_format($venda->valor_total, 2, ',', '.') . "*\n\n";
        
        if ($venda->observacoes) {
            $mensagem .= "*Observações:*\n{$venda->observacoes}\n\n";
        }
        
        $mensagem .= "Data: " . $venda->created_at->format('d/m/Y H:i') . "\n";
        $mensagem .= "Origem: Catálogo Público";

        return $mensagem;
    }

    /**
     * Criar venda de pré-venda para tenant específico (rota pública)
     *
     * @param Request $request
     * @param int $tenantId
     * @return \Illuminate\Http\JsonResponse
     */
    public function createForTenant(Request $request, $tenantId)
    {
        try {
            $validator = Validator::make($request->all(), [
                'cliente.nome' => 'required|string|max:255',
                'cliente.telefone' => 'required|string|max:20',
                'cliente.email' => 'nullable|email|max:255',
                'cliente.endereco' => 'nullable|string|max:500',
                'itens' => 'required|array|min:1',
                'itens.*.produto_id' => 'required|numeric|min:1',
                'itens.*.quantidade' => 'required|numeric|min:1',
                'itens.*.preco_unitario' => 'required|numeric|min:0',
                'total' => 'required|numeric|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verificar se todos os produtos existem no tenant
            $produtoIds = collect($request->itens)->pluck('produto_id')->unique();
            $produtosExistentes = Produto::withoutTenant()
                                        ->whereIn('id', $produtoIds)
                                        ->where('tenant_id', $tenantId)
                                        ->pluck('id');
            
            $produtosInexistentes = $produtoIds->diff($produtosExistentes);
            if ($produtosInexistentes->isNotEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Produtos não encontrados: ' . $produtosInexistentes->implode(', ')
                ], 422);
            }

            DB::beginTransaction();

            // Sempre criar um novo cliente para cada pedido
            $telefone = $request->cliente['telefone'];
            $email = $request->cliente['email'] ?? null;
            
            // Criar novo cliente para cada pedido
            $cliente = Cliente::create([
                'tenant_id' => $tenantId,
                'nome_completo' => $request->cliente['nome'],
                'email' => $email,
                'telefone_principal' => $telefone,
                'cpf_cnpj' => 'TEMP' . time() . rand(100, 999), // CPF temporário único
                'tipo_pessoa' => 'Pessoa Física',
                'status' => true,
                'logradouro' => $request->cliente['endereco'] ?? null,
                'observacoes' => 'Cliente cadastrado através do catálogo público - Pedido ' . date('Y-m-d H:i:s'),
            ]);

            // Buscar um usuário do tenant para associar à venda
            $usuario = User::where('tenant_id', $tenantId)->first();
            if (!$usuario) {
                throw new \Exception('Nenhum usuário encontrado para este tenant');
            }

            // Criar venda de pré-venda
            $venda = Venda::create([
                'tenant_id' => $tenantId,
                'codigo' => Venda::gerarCodigoUnico(),
                'cliente_id' => $cliente->id,
                'usuario_id' => $usuario->id,
                'tipo_documento' => Venda::TIPO_VENDA,
                'status' => Venda::STATUS_PRE_VENDA,
                'status_pagamento' => Venda::PAGAMENTO_PENDENTE,
                'forma_pagamento' => $request->cliente['forma_pagamento'] ?? null,
                'cliente_nome' => $cliente->nome_completo,
                'cliente_telefone' => $cliente->telefone_principal,
                'cliente_email' => $cliente->email,
                'subtotal' => $request->total,
                'valor_total' => $request->total,
                'valor_restante' => $request->total,
                'observacoes' => $request->observacoes ?? 'Pedido realizado através do catálogo público',
                'data_emissao' => now(),
                'metadados' => [
                    'origem' => 'catalogo_publico',
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'dados_cliente' => $request->cliente,
                    'cliente_existente' => $cliente->wasRecentlyCreated ? false : true,
                ]
            ]);

            // Criar itens da venda
            foreach ($request->itens as $item) {
                // Buscar dados do produto
                $produto = Produto::withoutTenant()
                                 ->where('id', $item['produto_id'])
                                 ->where('tenant_id', $tenantId)
                                 ->first();
                
                if (!$produto) {
                    throw new \Exception('Produto não encontrado: ' . $item['produto_id']);
                }
                
                ItemVenda::create([
                    'tenant_id' => $tenantId,
                    'venda_id' => $venda->id,
                    'tipo_venda' => 'pdv',
                    'produto_id' => $item['produto_id'],
                    'produto_nome' => $produto->nome,
                    'produto_codigo' => $produto->codigo_produto,
                    'produto_unidade' => $produto->unidade_medida ?? 'UN',
                    'produto_descricao' => $produto->descricao_curta,
                    'quantidade' => $item['quantidade'],
                    'valor_unitario' => $item['preco_unitario'],
                    'desconto_percentual' => 0,
                    'desconto_valor' => 0,
                    'acrescimo_percentual' => 0,
                    'acrescimo_valor' => 0,
                    'valor_total' => $item['quantidade'] * $item['preco_unitario'],
                ]);
            }

            // Criar notificação (tabela notificacoes) para o tenant informado
            try {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $usuario->id ?? null,
                    'tipo' => 'pre_venda',
                    'titulo' => 'Nova Pré-Venda Realizada',
                    'mensagem' => 'Pré-venda #' . $venda->id . ' - ' . $venda->cliente_nome . ' • Total R$ ' . number_format($venda->valor_total, 2, ',', '.'),
                    'prioridade' => 'media',
                    'lida' => false,
                    'data_criacao' => now(),
                ]);
            } catch (\Throwable $e) {
                \Log::warning('Falha ao criar notificação de pré-venda (public)', [
                    'erro' => $e->getMessage(),
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pedido criado com sucesso',
                'data' => [
                    'venda' => $venda->load(['cliente', 'itens.produto']),
                    'cliente_novo' => $cliente->wasRecentlyCreated,
                    'cliente_id' => $cliente->id
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar pedido: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Processa os itens de uma venda para estornar ou decrementar estoque
     * 
     * @param Venda $venda
     * @param array $itens
     * @param string $operacao 'increment' ou 'decrement'
     * @return void
     */
    protected function processarItensVenda(Venda $venda, array $itens, string $operacao)
    {
        foreach ($itens as $item) {
            // Atualiza o estoque
            $produto = Produto::find($item['produto_id']);
            if ($produto) {
                $isComposto = (bool) ($produto->is_composto ?? false);
                $composicao = $produto->composicao ?? [];
                
                // Verificar se é item com variação (não ajustar produto principal)
                $variacaoDataCheck = $item['dados_adicionais']['variacao'] ?? $item['variacao'] ?? null;
                $vd = $variacaoDataCheck ? (is_array($variacaoDataCheck) ? $variacaoDataCheck : json_decode($variacaoDataCheck, true)) : null;
                $temVariacaoNoItem = $vd && !empty($vd['id_variacao'] ?? $vd['id'] ?? null);
                $temVariacoesAtivas = (bool) ($produto->variacoes_ativa ?? false) && is_array($produto->variacoes ?? null) && count($produto->variacoes ?? []) > 0;

                if (!($temVariacaoNoItem && $temVariacoesAtivas)) {
                    $ajustePrincipal = $operacao === 'increment' ? (float) $item['quantidade'] : -(float) $item['quantidade'];
                    $produto->increment('estoque', $ajustePrincipal);
                }
                
                // Se for produto composto, ajusta também os componentes
                if ($isComposto && is_array($composicao) && count($composicao) > 0) {
                    foreach ($composicao as $comp) {
                        $compIdRaw = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                        $compQtd = (float) ($comp['quantidade'] ?? 0);
                        
                        if (!$compIdRaw || $compQtd <= 0) {
                            continue;
                        }
                        
                        $componenteProduto = Produto::find($compIdRaw);
                        if ($componenteProduto) {
                            $ajusteComponente = $operacao === 'increment' ? ($compQtd * (float) $item['quantidade']) : -($compQtd * (float) $item['quantidade']);
                            
                            \Log::info('[Estoque][Componente] Ajustando produto composto', [
                                'produto_id' => $componenteProduto->id,
                                'operacao' => $operacao,
                                'ajuste' => $ajusteComponente,
                            ]);
                            
                            $componenteProduto->increment('estoque', $ajusteComponente);
                        }
                    }
                }
                
                // Se o produto tem variações, ajusta o estoque da variação
                $variacaoData = null;
                
                \Log::info('[Estoque][Variação][PreVenda] 🔍 DEBUG - Verificando variação no item', [
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
                    \Log::info('[Estoque][Variação][PreVenda] ✅ Variação encontrada em dados_adicionais', [
                        'variacao_data' => $variacaoData,
                    ]);
                } elseif (isset($item['variacao'])) {
                    $variacaoData = is_array($item['variacao']) 
                        ? $item['variacao'] 
                        : json_decode($item['variacao'], true);
                    \Log::info('[Estoque][Variação][PreVenda] ✅ Variação encontrada diretamente', [
                        'variacao_data' => $variacaoData,
                    ]);
                } else {
                    \Log::info('[Estoque][Variação][PreVenda] ❌ Nenhuma variação encontrada no item');
                }
                
                $variacaoId = ($variacaoData && is_array($variacaoData)) ? ($variacaoData['id_variacao'] ?? $variacaoData['id'] ?? null) : null;
                if ($variacaoData && $variacaoId !== null && $variacaoId !== '') {
                    $variacoes = $produto->variacoes ?? [];
                    
                    \Log::info('[Estoque][Variação][PreVenda] Tentando ajustar variação', [
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
                            
                            \Log::info('[Estoque][Variação][PreVenda] ✅ Variação ajustada com sucesso', [
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
                            
                            \Log::info('[Estoque][Variação][PreVenda] 💾 Após salvar no banco', [
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
