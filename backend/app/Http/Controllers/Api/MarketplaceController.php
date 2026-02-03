<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplaceVenda;
use App\Models\MarketplaceVendaProduto;
use App\Models\ItemVenda;
use App\Services\EstoqueService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class MarketplaceController extends Controller
{
    /**
     * Salvar vendas de marketplace
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function salvarVendas(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'dados' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()], 422);
        }

        try {
            $user = Auth::user();
            
            return DB::transaction(function () use ($request, $user) {
                // Limpar vendas existentes do tenant
                MarketplaceVenda::where('tenant_id', $user->tenant_id)->delete();
                
                $vendasSalvas = [];
                
                foreach ($request->dados as $vendaData) {
                    // Gerar número sequencial
                    $ultimo = MarketplaceVenda::whereNotNull('numero_sequencial')->max('numero_sequencial') ?? 0;
                    $novoNumero = $ultimo + 1;
                    $idVenda = 'MKT' . str_pad($novoNumero, 6, '0', STR_PAD_LEFT);
                    
                    // Verificar se o ID já existe
                    while (MarketplaceVenda::where('id_venda', $idVenda)->exists()) {
                        $novoNumero++;
                        $idVenda = 'MKT' . str_pad($novoNumero, 6, '0', STR_PAD_LEFT);
                    }
                    // Criar a venda
                    $venda = MarketplaceVenda::create([
                        'user_id' => $user->id,
                        'numero_sequencial' => $novoNumero,
                        'id_venda' => $idVenda,
                        'data_venda' => $vendaData['data_venda'] ?? now(),
                        'valor_total' => $vendaData['valor_total'] ?? 0,
                        'status_pedido' => $vendaData['status_pedido'] ?? 'Aguardando Envio',
                        'observacoes' => $vendaData['observacoes'] ?? null,
                        'cliente_nome' => $vendaData['cliente_nome'] ?? '',
                        'cliente_contato' => $vendaData['cliente_contato'] ?? null,
                        'cliente_endereco' => $vendaData['cliente_endereco'] ?? null,
                        'codigo_rastreio' => $vendaData['codigo_rastreio'] ?? null,
                        'link_produto' => $vendaData['link_produto'] ?? null,
                        'vendedor_id' => $vendaData['vendedor_id'] ?? null,
                        'vendedor_nome' => $vendaData['vendedor_nome'] ?? null,
                        'fotos_produto' => is_array($vendaData['fotos_produto'] ?? null) ? $vendaData['fotos_produto'] : null,
                        'metadados' => $vendaData['metadados'] ?? null,
                    ]);
                    
                    // Criar os produtos da venda
                    if (isset($vendaData['produtos']) && is_array($vendaData['produtos'])) {
                        foreach ($vendaData['produtos'] as $produtoData) {
                            $produtoMkt = MarketplaceVendaProduto::create([
                                'marketplace_venda_id' => $venda->id,
                                'produto_id' => $produtoData['produto_id'] ?? null,
                                'nome' => $produtoData['nome'] ?? '',
                                'quantidade' => $produtoData['quantidade'] ?? 1,
                                'preco_unitario' => $produtoData['preco_unitario'] ?? 0,
                                'subtotal' => $produtoData['subtotal'] ?? 0,
                                'metadados' => $produtoData['metadados'] ?? null,
                            ]);
                            
                            // Salvar também na tabela itens_venda para relatórios
                            try {
                                ItemVenda::create([
                                    'tenant_id' => $user->tenant_id,
                                    'venda_id' => null, // Marketplace não está na tabela vendas
                                    'tipo_venda' => 'marketplace',
                                    'venda_referencia_id' => $venda->id,
                                    'produto_id' => $produtoData['produto_id'] ?? null,
                                    'produto_nome' => $produtoData['nome'] ?? '',
                                    'produto_codigo' => null,
                                    'produto_unidade' => 'un',
                                    'produto_descricao' => null,
                                    'quantidade' => $produtoData['quantidade'] ?? 1,
                                    'valor_unitario' => $produtoData['preco_unitario'] ?? 0,
                                    'desconto_percentual' => 0,
                                    'desconto_valor' => 0,
                                    'acrescimo_percentual' => 0,
                                    'acrescimo_valor' => 0,
                                    'valor_total' => $produtoData['subtotal'] ?? 0,
                                    'observacoes' => null,
                                    'dados_adicionais' => null,
                                    'orcamento_item_id' => null,
                                ]);
                            } catch (\Exception $e) {
                                \Log::error('Erro ao salvar item marketplace na tabela itens_venda:', [
                                    'venda_id' => $venda->id,
                                    'produto_nome' => $produtoData['nome'] ?? '',
                                    'error' => $e->getMessage()
                                ]);
                            }
                        }
                    }
                    
                    // Carregar relacionamentos para retorno
                    $venda->load('produtos');
                    $vendasSalvas[] = $venda;
                }
                
                return response()->json(['message' => 'Vendas de marketplace salvas com sucesso', 'data' => $vendasSalvas], 200);
            });
            
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao salvar vendas de marketplace: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Obter vendas de marketplace
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function obterVendas(Request $request)
    {
        try {
            $user = Auth::user();
            
            $query = MarketplaceVenda::with('produtos')
                ->where('tenant_id', $user->tenant_id);
            
            // Aplicar filtros de data se fornecidos
            if ($request->has('data_inicio')) {
                $query->where('data_venda', '>=', $request->input('data_inicio') . ' 00:00:00');
            }
            
            if ($request->has('data_fim')) {
                $query->where('data_venda', '<=', $request->input('data_fim') . ' 23:59:59');
            }
            
            $vendas = $query->orderBy('data_venda', 'desc')->get();
            
            // Converter para o formato esperado pelo frontend
            $vendasFormatadas = $vendas->map(function ($venda) {
                return [
                    'id' => $venda->id_venda,
                    'data_venda' => $venda->data_venda->toISOString(),
                    'cliente_nome' => $venda->cliente_nome,
                    'cliente_contato' => $venda->cliente_contato,
                    'cliente_endereco' => $venda->cliente_endereco,
                    'produtos' => $venda->produtos->map(function ($produto) {
                        return [
                            'id' => $produto->produto_id,
                            'nome' => $produto->nome,
                            'quantidade' => (int) $produto->quantidade,
                            'preco_unitario' => (float) $produto->preco_unitario,
                            'subtotal' => (float) $produto->subtotal,
                        ];
                    })->toArray(),
                    'valor_total' => (float) $venda->valor_total,
                    'status_pedido' => $venda->status_pedido,
                    'codigo_rastreio' => $venda->codigo_rastreio,
                    'link_produto' => $venda->link_produto,
                    'fotos_produto' => $venda->fotos_produto,
                    'observacoes' => $venda->observacoes,
                    'vendedor_id' => $venda->vendedor_id,
                    'vendedor_nome' => $venda->vendedor_nome,
                ];
            });

            return response()->json($vendasFormatadas, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao obter vendas de marketplace: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Salvar uma única venda de marketplace
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function salvarVenda(Request $request)
    {
        \Log::info('Salvando venda de marketplace', [
            'request_data' => $request->all(),
            'user_id' => Auth::id()
        ]);
        
        $validator = Validator::make($request->all(), [
            'id' => 'nullable|string',
            'data_venda' => 'required|date',
            'cliente_nome' => 'required|string',
            'produtos' => 'required|array|min:1',
            'valor_total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            \Log::error('Validação falhou', ['errors' => $validator->errors()]);
            return response()->json(['error' => $validator->errors()], 422);
        }

        try {
            $user = Auth::user();
            
            return DB::transaction(function () use ($request, $user) {
                // Verificar se é uma atualização
                $venda = null;
                if ($request->id) {
                    $venda = MarketplaceVenda::where('tenant_id', $user->tenant_id)
                        ->where('id_venda', $request->id)
                        ->first();
                }
                
                if ($venda) {
                    // Estornar estoque dos produtos antigos antes de remover
                    $produtosAntigos = $venda->produtos()->get();
                    $itensAntigos = $produtosAntigos->map(function ($p) {
                        $metadados = is_array($p->metadados ?? null) ? $p->metadados : [];
                        $variacao = $metadados['variacao'] ?? null;
                        return [
                            'produto_id' => $p->produto_id,
                            'quantidade' => $p->quantidade ?? 1,
                            'dados_adicionais' => $variacao ? ['variacao' => $variacao] : [],
                        ];
                    })->filter(fn ($i) => !empty($i['produto_id']))->values()->toArray();
                    if (!empty($itensAntigos)) {
                        (new EstoqueService())->ajustarEstoqueFromItens($itensAntigos, 'increment');
                    }

                    // Atualizar venda existente
                    $venda->update([
                        'data_venda' => $request->data_venda,
                        'valor_total' => $request->valor_total,
                        'status_pedido' => $request->status_pedido ?? $venda->status_pedido,
                        'observacoes' => $request->observacoes ?? $venda->observacoes,
                        'cliente_nome' => $request->cliente_nome,
                        'cliente_contato' => $request->cliente_contato ?? $venda->cliente_contato,
                        'cliente_endereco' => $request->cliente_endereco ?? $venda->cliente_endereco,
                        'codigo_rastreio' => $request->codigo_rastreio ?? $venda->codigo_rastreio,
                        'link_produto' => $request->link_produto ?? $venda->link_produto,
                        'vendedor_id' => $request->vendedor_id ?? $venda->vendedor_id,
                        'vendedor_nome' => $request->vendedor_nome ?? $venda->vendedor_nome,
                        'fotos_produto' => is_array($request->fotos_produto) ? $request->fotos_produto : $venda->fotos_produto,
                    ]);
                    
                // Remover produtos antigos
                    $venda->produtos()->delete();
                    
                    // Remover itens_venda antigos para evitar duplicação
                    ItemVenda::where('venda_referencia_id', $venda->id)
                        ->where('tipo_venda', 'marketplace')
                        ->delete();
                } else {
                    // Gerar número sequencial
                    $ultimo = MarketplaceVenda::whereNotNull('numero_sequencial')->max('numero_sequencial') ?? 0;
                    $novoNumero = $ultimo + 1;
                    $idVenda = 'MKT' . str_pad($novoNumero, 6, '0', STR_PAD_LEFT);
                    
                    // Verificar se o ID já existe
                    while (MarketplaceVenda::where('id_venda', $idVenda)->exists()) {
                        $novoNumero++;
                        $idVenda = 'MKT' . str_pad($novoNumero, 6, '0', STR_PAD_LEFT);
                    }
                    
                    // Criar nova venda
                    $venda = MarketplaceVenda::create([
                        'user_id' => $user->id,
                        'numero_sequencial' => $novoNumero,
                        'id_venda' => $idVenda,
                        'data_venda' => $request->data_venda,
                        'valor_total' => $request->valor_total,
                        'status_pedido' => $request->status_pedido ?? 'Aguardando Envio',
                        'observacoes' => $request->observacoes ?? null,
                        'cliente_nome' => $request->cliente_nome,
                        'cliente_contato' => $request->cliente_contato ?? null,
                        'cliente_endereco' => $request->cliente_endereco ?? null,
                        'codigo_rastreio' => $request->codigo_rastreio ?? null,
                        'link_produto' => $request->link_produto ?? null,
                        'vendedor_id' => $request->vendedor_id ?? null,
                        'vendedor_nome' => $request->vendedor_nome ?? null,
                        'fotos_produto' => is_array($request->fotos_produto) ? $request->fotos_produto : null,
                    ]);
                }
                
                // Baixar estoque dos novos produtos
                $itensParaEstoque = collect($request->produtos)
                    ->filter(fn ($p) => !empty($p['produto_id'] ?? null))
                    ->map(fn ($p) => [
                        'produto_id' => $p['produto_id'],
                        'quantidade' => $p['quantidade'] ?? 1,
                        'dados_adicionais' => [
                            'variacao' => $p['metadados']['variacao'] ?? $p['variacao'] ?? null,
                        ],
                    ])
                    ->toArray();
                if (!empty($itensParaEstoque)) {
                    (new EstoqueService())->ajustarEstoqueFromItens($itensParaEstoque, 'decrement');
                }

                // Criar os produtos da venda
                foreach ($request->produtos as $produtoData) {
                    $metadados = ['variacao' => $produtoData['metadados']['variacao'] ?? $produtoData['variacao'] ?? null];
                    $produtoMkt = MarketplaceVendaProduto::create([
                        'marketplace_venda_id' => $venda->id,
                        'produto_id' => $produtoData['produto_id'] ?? null,
                        'nome' => $produtoData['nome'],
                        'quantidade' => $produtoData['quantidade'] ?? 1,
                        'preco_unitario' => $produtoData['preco_unitario'] ?? 0,
                        'subtotal' => $produtoData['subtotal'] ?? 0,
                        'metadados' => $metadados,
                    ]);
                    
                    // Salvar também na tabela itens_venda para relatórios
                    try {
                        ItemVenda::create([
                            'tenant_id' => $user->tenant_id,
                            'venda_id' => null, // Marketplace não está na tabela vendas
                            'tipo_venda' => 'marketplace',
                            'venda_referencia_id' => $venda->id,
                            'produto_id' => $produtoData['produto_id'] ?? null,
                            'produto_nome' => $produtoData['nome'],
                            'produto_codigo' => null,
                            'produto_unidade' => 'un',
                            'produto_descricao' => null,
                            'quantidade' => $produtoData['quantidade'] ?? 1,
                            'valor_unitario' => $produtoData['preco_unitario'] ?? 0,
                            'desconto_percentual' => 0,
                            'desconto_valor' => 0,
                            'acrescimo_percentual' => 0,
                            'acrescimo_valor' => 0,
                            'valor_total' => $produtoData['subtotal'] ?? 0,
                            'observacoes' => null,
                            'dados_adicionais' => null,
                            'orcamento_item_id' => null,
                        ]);
                    } catch (\Exception $e) {
                        \Log::error('Erro ao salvar item marketplace na tabela itens_venda:', [
                            'venda_id' => $venda->id,
                            'produto_nome' => $produtoData['nome'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }
                
                // Carregar relacionamentos para retorno
                $venda->load('produtos');
                
                return response()->json(['message' => 'Venda salva com sucesso', 'data' => $venda], 200);
            });
            
        } catch (\Exception $e) {
            \Log::error('Erro ao salvar venda de marketplace', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Erro ao salvar venda: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Método de teste para debug
     */
    public function testeDebug()
    {
        try {
            $user = Auth::user();
            
            // Verificar dados do usuário
            $userData = [
                'id' => $user->id,
                'email' => $user->email,
                'tenant_id' => $user->tenant_id,
                'name' => $user->name
            ];
            
            // Verificar vendas no banco
            $vendasCount = MarketplaceVenda::where('tenant_id', $user->tenant_id)->count();
            $vendasSample = MarketplaceVenda::where('tenant_id', $user->tenant_id)
                ->select('id', 'id_venda', 'cliente_nome', 'tenant_id', 'user_id')
                ->limit(5)
                ->get();
            
            // Verificar se há vendas de outros usuários no mesmo tenant
            $outrasVendas = MarketplaceVenda::where('tenant_id', $user->tenant_id)
                ->where('user_id', '!=', $user->id)
                ->select('id', 'id_venda', 'cliente_nome', 'tenant_id', 'user_id')
                ->limit(5)
                ->get();
            
            return response()->json([
                'user' => $userData,
                'vendas_count' => $vendasCount,
                'vendas_sample' => $vendasSample,
                'outras_vendas' => $outrasVendas,
                'message' => 'Debug info'
            ]);
            
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Excluir uma venda de marketplace
     *
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function excluirVenda($id)
    {
        try {
            $user = Auth::user();
            
            $venda = MarketplaceVenda::where('tenant_id', $user->tenant_id)
                ->where('id_venda', $id)
                ->first();
            
            if (!$venda) {
                return response()->json(['error' => 'Venda não encontrada'], 404);
            }

            // Restaurar estoque antes de excluir
            $produtos = $venda->produtos()->get();
            $itensParaEstorno = $produtos->map(fn ($p) => [
                'produto_id' => $p->produto_id,
                'quantidade' => $p->quantidade ?? 1,
                'dados_adicionais' => is_array($p->metadados ?? null) && isset($p->metadados['variacao']) ? ['variacao' => $p->metadados['variacao']] : [],
            ])->filter(fn ($i) => !empty($i['produto_id']))->values()->toArray();
            if (!empty($itensParaEstorno)) {
                (new EstoqueService())->ajustarEstoqueFromItens($itensParaEstorno, 'increment');
            }
            
            $venda->delete();
            
            return response()->json(['message' => 'Venda excluída com sucesso'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao excluir venda: ' . $e->getMessage()], 500);
        }
    }
}
