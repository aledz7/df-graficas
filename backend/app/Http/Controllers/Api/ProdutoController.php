<?php

namespace App\Http\Controllers\Api;

use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProdutoController extends ResourceController
{
    protected $model = Produto::class;
    
    protected $storeRules = [
        'nome' => 'required|string|max:255',
        'codigo_barras' => 'nullable|string|max:50|unique:produtos,codigo_barras,NULL,id,tenant_id,' . null,
        'preco_custo' => 'required|numeric|min:0',
        'preco_venda' => 'required|numeric|min:0',
        'medida_chapa_largura_cm' => 'nullable|numeric|min:0',
        'medida_chapa_altura_cm' => 'nullable|numeric|min:0',
        'valor_chapa' => 'nullable|numeric|min:0',
        'estoque' => 'sometimes|numeric|min:0',
        'estoque_minimo' => 'sometimes|numeric|min:0',
        'variacao_obrigatoria' => 'sometimes|boolean',
        'categoria_id' => 'required|exists:categorias,id',
        'subcategoria_id' => 'nullable|exists:subcategorias,id',
        'unidade' => 'nullable|string|max:10',
        'descricao_curta' => 'nullable|string|max:1000',
        'descricao_longa' => 'nullable|string|max:10000',
        // 'ativo' => 'boolean', // coluna removida
        'is_composto' => 'boolean',
        'composicao' => 'nullable|array',
        'imagem_principal' => 'nullable|string',
        'galeria_urls' => 'nullable|array',
        'galeria_urls.*' => 'string',
    ];

    protected $updateRules = [
        'nome' => 'sometimes|string|max:255',
        'codigo_barras' => 'nullable|string|max:50',
        'preco_custo' => 'sometimes|numeric|min:0',
        'preco_venda' => 'sometimes|numeric|min:0',
        'medida_chapa_largura_cm' => 'nullable|numeric|min:0',
        'medida_chapa_altura_cm' => 'nullable|numeric|min:0',
        'valor_chapa' => 'nullable|numeric|min:0',
        'estoque' => 'sometimes|numeric|min:0',
        'estoque_minimo' => 'sometimes|numeric|min:0',
        'variacao_obrigatoria' => 'sometimes|boolean',
        'categoria_id' => 'sometimes|exists:categorias,id',
        'subcategoria_id' => 'nullable|exists:subcategorias,id',
        'unidade' => 'nullable|string|max:10',
        'descricao_curta' => 'nullable|string|max:1000',
        'descricao_longa' => 'nullable|string|max:10000',
        // 'ativo' => 'boolean', // coluna removida
        'is_composto' => 'boolean',
        'composicao' => 'nullable|array',
        'imagem_principal' => 'nullable|string',
        'galeria_urls' => 'nullable|array',
        'galeria_urls.*' => 'string',
    ];

    protected $with = ['categoria', 'subcategoria'];

    /**
     * Aplica filtros à consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por termo de busca
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                  ->orWhere('codigo_barras', 'like', "%{$search}%")
                  ->orWhere('descricao_curta', 'like', "%{$search}%")
                  ->orWhere('descricao_longa', 'like', "%{$search}%");
            });
        }

        // Filtrar por categoria
        if ($request->has('categoria_id')) {
            $query->where('categoria_id', $request->input('categoria_id'));
        }

        // Filtrar por subcategoria
        if ($request->has('subcategoria_id')) {
            $query->where('subcategoria_id', $request->input('subcategoria_id'));
        }

        // Filtrar por status (ativo/inativo) - coluna removida
        // if ($request->has('ativo')) {
        //     $query->where('ativo', $request->boolean('ativo'));
        // }

        // Filtrar por estoque baixo
        if ($request->boolean('estoque_baixo')) {
            $query->whereColumn('estoque_atual', '<=', 'estoque_minimo');
        }

        // Filtrar por faixa de preço
        if ($request->has('preco_min')) {
            $query->where('preco_venda', '>=', $request->input('preco_min'));
        }

        if ($request->has('preco_max')) {
            $query->where('preco_venda', '<=', $request->input('preco_max'));
        }

        return $query;
    }

    private function sanitizeNumericFields(&$data): void
    {
        $numericFields = [
            'preco_custo',
            'preco_venda',
            'preco_m2',
            'margem_lucro',
            'preco_promocional',
            'percentual_comissao',
            'estoque',
            'estoque_minimo',
            'medida_chapa_largura_cm',
            'medida_chapa_altura_cm',
            'valor_chapa',
        ];

        foreach ($numericFields as $field) {
            if (array_key_exists($field, $data)) {
                $value = $data[$field];
                if ($value === '' || $value === null) {
                    $data[$field] = null;
                    continue;
                }

                if (is_string($value)) {
                    $trimmed = trim($value);
                    if ($trimmed === '') {
                        $data[$field] = null;
                        continue;
                    }
                    $normalized = str_replace(['.', ','], ['.', '.'], $trimmed);
                    // Se veio no formato brasileiro (1.234,56), substituir separadores adequadamente
                    if (preg_match('/^\d{1,3}(\.\d{3})*,\d+$/', $trimmed)) {
                        $normalized = str_replace('.', '', $trimmed);
                        $normalized = str_replace(',', '.', $normalized);
                    } elseif (strpos($trimmed, ',') !== false && strpos($trimmed, '.') === false) {
                        $normalized = str_replace(',', '.', $trimmed);
                    }
                    $data[$field] = is_numeric($normalized) ? $normalized : $trimmed;
                }
            }
        }
    }

    /**
     * Limpar referências de imagens que não existem no storage
     */
    private function limparReferenciasImagens($produto)
    {
        $galeriaLimpa = [];
        
        if (!empty($produto['galeria_urls']) && is_array($produto['galeria_urls'])) {
            foreach ($produto['galeria_urls'] as $url) {
                $fullPath = storage_path('app/public/' . $url);
                if (file_exists($fullPath)) {
                    $galeriaLimpa[] = $url;
                } else {
                    \Log::warning('Imagem da galeria não encontrada, removendo referência', [
                        'url' => $url,
                        'full_path' => $fullPath,
                        'produto_id' => $produto['id'] ?? 'novo'
                    ]);
                }
            }
        }
        
        $produto['galeria_urls'] = $galeriaLimpa;
        
        // Verificar imagem principal
        if (!empty($produto['imagem_principal'])) {
            $fullPath = storage_path('app/public/' . $produto['imagem_principal']);
            if (!file_exists($fullPath)) {
                \Log::warning('Imagem principal não encontrada, removendo referência', [
                    'url' => $produto['imagem_principal'],
                    'full_path' => $fullPath,
                    'produto_id' => $produto['id'] ?? 'novo'
                ]);
                $produto['imagem_principal'] = null;
            }
        }
        
        return $produto;
    }

    /**
     * Armazenar um produto recém-criado
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        // Log para debug
        \Log::info('Dados recebidos no store do produto:', [
            'all_data' => $request->all(),
            'has_imagem_principal' => $request->has('imagem_principal'),
            'imagem_principal' => $request->input('imagem_principal'),
            'has_galeria_urls' => $request->has('galeria_urls'),
            'galeria_urls' => $request->input('galeria_urls'),
        ]);

        // Validação customizada para código de barras único por tenant
        $rules = $this->storeRules;
        if ($request->has('codigo_barras') && $request->input('codigo_barras')) {
            $rules['codigo_barras'] = 'nullable|string|max:50|unique:produtos,codigo_barras,NULL,id,tenant_id,' . auth()->user()->tenant_id;
        }

        $payload = $request->all();
        $this->sanitizeNumericFields($payload);

        $validator = \Validator::make($payload, $rules);

        if ($validator->fails()) {
            \Log::warning('Validação ao criar produto falhou', [
                'errors' => $validator->errors(),
                'payload' => $payload,
            ]);
            return $this->validationError($validator->errors());
        }

        try {
            $produtoData = $payload;
            $produtoData['tenant_id'] = auth()->user()->tenant_id;

            // Gerar codigo_produto automaticamente se não vier no request
            // ou se o código já existir para este tenant (retry com novo código)
            $codigoFornecido = !empty($produtoData['codigo_produto']);
            $maxRetries = 5;
            $retryCount = 0;

            do {
                if (!$codigoFornecido || $retryCount > 0) {
                    $timestamp = now()->format('YmdHis');
                    $random = strtoupper(Str::random(6));
                    $produtoData['codigo_produto'] = 'PROD-' . $timestamp . '-' . $random;
                }

                $codigoExiste = Produto::where('tenant_id', $produtoData['tenant_id'])
                    ->where('codigo_produto', $produtoData['codigo_produto'])
                    ->exists();

                if ($codigoExiste) {
                    $retryCount++;
                    $codigoFornecido = false; // Forçar geração de novo código
                    usleep(100000); // 100ms para garantir timestamp diferente
                }
            } while ($codigoExiste && $retryCount < $maxRetries);

            if ($codigoExiste) {
                return $this->error('Não foi possível gerar um código único para o produto. Tente novamente.');
            }
            
            // Limpar referências de imagens que não existem
            $produtoData = $this->limparReferenciasImagens($produtoData);
            
            $produto = Produto::create($produtoData);

        \Log::info('Produto criado com sucesso:', [
            'id' => $produto->id,
            'nome' => $produto->nome,
            'imagem_principal' => $produto->imagem_principal,
            'galeria_urls' => $produto->galeria_urls,
        ]);

        return $this->success($produto->load($this->with), 'Produto criado com sucesso', 201);
        } catch (\Exception $e) {
            \Log::error('Erro ao criar produto:', ['error' => $e->getMessage()]);
            return $this->error('Não foi possível criar o produto: ' . $e->getMessage());
        }
    }

    /**
     * Atualizar um produto específico
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $produto = Produto::find($id);

        if (!$produto) {
            return $this->notFound('Produto não encontrado');
        }

        // Validação customizada para código de barras único por tenant
        $rules = $this->updateRules;
        if ($request->has('codigo_barras') && $request->input('codigo_barras')) {
            $rules['codigo_barras'] = 'nullable|string|max:50|unique:produtos,codigo_barras,' . $id . ',id,tenant_id,' . auth()->user()->tenant_id;
        }

        $payload = $request->all();
        $this->sanitizeNumericFields($payload);

        $validator = Validator::make($payload, $rules);

        if ($validator->fails()) {
            \Log::warning('Validação ao atualizar produto falhou', [
                'produto_id' => $produto->id,
                'errors' => $validator->errors(),
                'payload' => $payload,
            ]);
            return $this->validationError($validator->errors());
        }

        try {
            $produtoData = $payload;
            
            // Limpar referências de imagens que não existem
            $produtoData = $this->limparReferenciasImagens($produtoData);
            
            $produto->update($produtoData);

        \Log::info('Produto atualizado com sucesso:', [
            'id' => $produto->id,
            'nome' => $produto->nome,
            'imagem_principal' => $produto->imagem_principal,
            'galeria_urls' => $produto->galeria_urls,
        ]);

        return $this->success($produto->load($this->with), 'Produto atualizado com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao atualizar produto:', ['error' => $e->getMessage()]);
            return $this->error('Não foi possível atualizar o produto: ' . $e->getMessage());
        }
    }

    /**
     * Remover um produto específico
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        \Log::info('Tentando excluir produto', [
            'id' => $id,
            'user_id' => auth()->id(),
            'tenant_id' => auth()->user()->tenant_id ?? null
        ]);

        try {
            $produto = Produto::withCount(['itensVenda', 'orcamentoItens'])
                ->where('tenant_id', auth()->user()->tenant_id)
                ->find($id);

            if (!$produto) {
                \Log::warning('Produto não encontrado', ['id' => $id]);
                return $this->notFound('Produto não encontrado');
            }

            \Log::info('Produto encontrado', [
                'produto_id' => $produto->id,
                'nome' => $produto->nome,
                'tenant_id' => $produto->tenant_id,
                'itens_venda_count' => $produto->itens_venda_count,
                'orcamento_itens_count' => $produto->orcamento_itens_count
            ]);

            // Permitir a exclusão mesmo com associações: será realizado soft delete em produtos
            // Mantemos logs informativos para auditoria
            if ($produto->itens_venda_count > 0 || $produto->orcamento_itens_count > 0) {
                \Log::info('Excluindo (soft delete) produto com associações', [
                    'produto_id' => $produto->id,
                    'itens_venda_count' => $produto->itens_venda_count,
                    'orcamento_itens_count' => $produto->orcamento_itens_count
                ]);
            }

            $produto->delete();
            \Log::info('Produto excluído com sucesso', [
                'produto_id' => $produto->id,
                'nome' => $produto->nome
            ]);
            return $this->success(null, 'Produto removido com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao excluir produto', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Não foi possível remover o produto: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza o estoque do produto
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function atualizarEstoque(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'quantidade' => 'required|integer|min:1',
            'tipo' => 'required|in:entrada,saida',
            'observacao' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $produto = Produto::find($id);

        if (!$produto) {
            return $this->notFound('Produto não encontrado');
        }

        $quantidade = $request->input('quantidade');
        
        if ($request->input('tipo') === 'entrada') {
            $produto->increment('estoque', $quantidade);
        } else {
            if ($produto->estoque < $quantidade) {
                return $this->error('Estoque insuficiente. Estoque atual: ' . $produto->estoque, 400);
            }
            $produto->decrement('estoque', $quantidade);
        }

        // Registrar o movimento de estoque (você pode implementar um sistema de histórico aqui)
        // Exemplo: HistoricoEstoque::registrar($produto, $request->tipo, $quantidade, $request->observacao);

        return $this->success($produto->fresh(), 'Estoque atualizado com sucesso');
    }

    /**
     * Obter produtos com estoque baixo
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function estoqueBaixo(Request $request): JsonResponse
    {
        try {
            // Verificar se o usuário está autenticado
            if (!auth()->check()) {
                return $this->error('Usuário não autenticado', 401);
            }

            $user = auth()->user();
            if (!$user) {
                return $this->error('Usuário não encontrado', 404);
            }

            // Buscar configurações de produtos do usuário
            $configData = \App\Models\DadosUsuario::where('user_id', $user->id)
                ->where('chave', 'produtoConfigGlobal')
                ->first();
            
            $config = $configData ? json_decode($configData->valor, true) : [];
            $percentualAlerta = isset($config['notificarEstoqueBaixoPercentual']) 
                ? (int) $config['notificarEstoqueBaixoPercentual'] 
                : 20; // Padrão 20%

            // Buscar produtos com estoque baixo baseado na porcentagem configurada
            $query = Produto::where('status', true)
                           ->where('tenant_id', $user->tenant_id)
                           ->whereRaw('(estoque / NULLIF(estoque_minimo, 0)) * 100 <= ?', [$percentualAlerta])
                           ->where('estoque_minimo', '>', 0)
                           ->with($this->with);

            $produtos = $query->get();

            // Também incluir produtos com estoque menor que o mínimo (independente do percentual)
            $produtosAbaixoMinimo = Produto::where('status', true)
                                          ->where('tenant_id', $user->tenant_id)
                                          ->whereRaw('estoque < estoque_minimo')
                                          ->where('estoque_minimo', '>', 0)
                                          ->with($this->with)
                                          ->get();

            // Combinar os dois resultados e remover duplicatas
            $produtos = $produtos->merge($produtosAbaixoMinimo)->unique('id');

            // Buscar produtos que têm variações com estoque baixo (independente do estoque principal)
            $produtosComVariacoesBaixas = Produto::where('status', true)
                                                 ->where('tenant_id', $user->tenant_id)
                                                 ->where('variacoes_ativa', true)
                                                 ->where('estoque_minimo', '>', 0)
                                                 ->with($this->with)
                                                 ->get()
                                                 ->filter(function ($produto) use ($percentualAlerta) {
                                                     if (!is_array($produto->variacoes)) {
                                                         return false;
                                                     }

                                                     foreach ($produto->variacoes as $variacao) {
                                                         $estoqueVar = (float) ($variacao['estoque_var'] ?? 0);
                                                         $estoqueMinimo = (float) $produto->estoque_minimo;
                                                         
                                                         // Verificar se a variação está com estoque baixo por percentual
                                                         if ($estoqueMinimo > 0 && ($estoqueVar / $estoqueMinimo) * 100 <= $percentualAlerta) {
                                                             return true;
                                                         }
                                                         
                                                         // Verificar se a variação está com estoque menor que o mínimo (independente do percentual)
                                                         if ($estoqueVar < $estoqueMinimo && $estoqueMinimo > 0) {
                                                             return true;
                                                         }
                                                     }
                                                     return false;
                                                 });

            // Combinar todos os resultados e remover duplicatas
            $produtosFinais = $produtos->merge($produtosComVariacoesBaixas)->unique('id');

            return $this->success($produtosFinais, 'Produtos com estoque baixo recuperados com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produtos com estoque baixo:', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id() ?? 'não autenticado'
            ]);
            return $this->error('Erro ao buscar produtos com estoque baixo');
        }
    }

    /**
     * Buscar produtos por código de barras
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function buscarPorCodigoBarras(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'codigo_barras' => 'required|string'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $produto = Produto::where('codigo_barras', $request->input('codigo_barras'))
                         ->with($this->with)
                         ->first();

        if (!$produto) {
            return $this->notFound('Produto não encontrado com este código de barras');
        }

        return $this->success($produto, 'Produto encontrado');
    }

    /**
     * Obter produtos por tenant (rota pública)
     *
     * @param Request $request
     * @param int $tenantId
     * @return JsonResponse
     */
    public function getByTenant(Request $request, $tenantId): JsonResponse
    {
        try {
            $query = Produto::where('tenant_id', $tenantId)
                           ->with($this->with);

            // Aplicar filtros se existirem
            if (method_exists($this, 'applyFilters')) {
                $query = $this->applyFilters($query, $request);
            }

            // Aplicar ordenação
            $sortField = $request->input('sort_by', 'nome');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortField, $sortOrder);

            $produtos = $query->get();

            return $this->success($produtos, 'Produtos do tenant recuperados com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produtos por tenant:', [
                'tenant_id' => $tenantId,
                'error' => $e->getMessage()
            ]);
            return $this->error('Erro ao carregar produtos do tenant');
        }
    }

    /**
     * Atualizar estoque de uma variação específica
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function atualizarEstoqueVariacao(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'variacao_index' => 'required|integer|min:0',
            'estoque_var' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $produto = Produto::find($id);

            if (!$produto) {
                return $this->notFound('Produto não encontrado');
            }

            // Verificar se o produto tem variações
            if (!$produto->variacoes_ativa || !is_array($produto->variacoes)) {
                return $this->error('Este produto não possui variações ativas');
            }

            $variacaoIndex = $request->input('variacao_index');
            $novoEstoque = $request->input('estoque_var');

            // Verificar se o índice da variação é válido
            if ($variacaoIndex >= count($produto->variacoes)) {
                return $this->error('Índice de variação inválido');
            }

            // Atualizar o estoque da variação específica
            $variacoes = $produto->variacoes;
            $variacoes[$variacaoIndex]['estoque_var'] = $novoEstoque;

            $produto->update(['variacoes' => $variacoes]);

            \Log::info('Estoque de variação atualizado:', [
                'produto_id' => $produto->id,
                'variacao_index' => $variacaoIndex,
                'novo_estoque' => $novoEstoque,
                'user_id' => auth()->id()
            ]);

            return $this->success($produto->fresh(), 'Estoque da variação atualizado com sucesso');

        } catch (\Exception $e) {
            \Log::error('Erro ao atualizar estoque da variação:', [
                'produto_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Não foi possível atualizar o estoque da variação: ' . $e->getMessage());
        }
    }

    /**
     * Atualizar preços de produtos em massa
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function bulkUpdatePrices(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'produto_ids' => 'required|array|min:1',
            'produto_ids.*' => 'integer|exists:produtos,id',
            'ajuste' => 'required|array',
            'ajuste.tipo' => 'required|in:aumento,desconto',
            'ajuste.base' => 'required|in:preco_venda,preco_custo',
            'ajuste.valor_tipo' => 'required|in:percentual,fixo',
            'ajuste.valor' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $produtoIds = $request->input('produto_ids');
            $ajuste = $request->input('ajuste');
            
            // Buscar produtos do tenant atual
            $produtos = Produto::whereIn('id', $produtoIds)
                             ->where('tenant_id', auth()->user()->tenant_id)
                             ->get();

            if ($produtos->isEmpty()) {
                return $this->notFound('Nenhum produto encontrado para atualização');
            }

            $produtosAtualizados = 0;

            foreach ($produtos as $produto) {
                $valorBase = (float) $produto->{$ajuste['base']};
                $valorAjuste = (float) $ajuste['valor'];
                $novoValor = 0;

                // Calcular novo valor baseado no tipo de ajuste
                if ($ajuste['valor_tipo'] === 'percentual') {
                    $percentual = $valorAjuste / 100;
                    if ($ajuste['tipo'] === 'aumento') {
                        $novoValor = $valorBase * (1 + $percentual);
                    } else {
                        $novoValor = $valorBase * (1 - $percentual);
                    }
                } else { // fixo
                    if ($ajuste['tipo'] === 'aumento') {
                        $novoValor = $valorBase + $valorAjuste;
                    } else {
                        $novoValor = $valorBase - $valorAjuste;
                    }
                }

                // Garantir que o valor não seja negativo
                $novoValor = max(0, $novoValor);

                // Atualizar o produto
                $produto->update([
                    $ajuste['base'] => number_format($novoValor, 2, '.', '')
                ]);

                $produtosAtualizados++;
            }

            \Log::info('Preços atualizados em massa:', [
                'produtos_atualizados' => $produtosAtualizados,
                'ajuste' => $ajuste,
                'user_id' => auth()->id()
            ]);

            return $this->success([
                'produtos_atualizados' => $produtosAtualizados,
                'total_solicitado' => count($produtoIds)
            ], "Preços de {$produtosAtualizados} produto(s) atualizados com sucesso");

        } catch (\Exception $e) {
            \Log::error('Erro ao atualizar preços em massa:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Não foi possível atualizar os preços: ' . $e->getMessage());
        }
    }
}
