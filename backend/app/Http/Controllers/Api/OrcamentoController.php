<?php

namespace App\Http\Controllers\Api;

use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class OrcamentoController extends ResourceController
{
    protected $model = Orcamento::class;
    
    protected $storeRules = [
        'cliente_id' => 'required|exists:clientes,id',
        'usuario_id' => 'required|exists:users,id',
        'data_emissao' => 'required|date',
        'data_validade' => 'required|date|after_or_equal:data_emissao',
        'status' => 'required|in:rascunho,enviado,aprovado,rejeitado,cancelado,concluido',
        'valor_subtotal' => 'required|numeric|min:0',
        'valor_desconto' => 'required|numeric|min:0',
        'valor_total' => 'required|numeric|min:0',
        'observacoes' => 'nullable|string',
        'condicoes_pagamento' => 'nullable|string',
        'validade_proposta' => 'nullable|integer|min:1',
        'tipo_desconto' => 'nullable|in:percentual,valor',
        'itens' => 'required|array|min:1',
        'itens.*.produto_id' => 'required_without:itens.*.descricao|nullable|exists:produtos,id',
        'itens.*.descricao' => 'required_without:itens.*.produto_id|nullable|string|max:255',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.valor_unitario' => 'required|numeric|min:0',
        'itens.*.desconto' => 'nullable|numeric|min:0',
        'itens.*.tipo_desconto' => 'nullable|in:percentual,valor',
        'itens.*.subtotal' => 'required|numeric|min:0',
        'itens.*.observacoes' => 'nullable|string',
    ];

    protected $updateRules = [
        'cliente_id' => 'sometimes|exists:clientes,id',
        'usuario_id' => 'sometimes|exists:users,id',
        'data_emissao' => 'sometimes|date',
        'data_validade' => 'sometimes|date|after_or_equal:data_emissao',
        'status' => 'sometimes|in:rascunho,enviado,aprovado,rejeitado,cancelado,concluido',
        'valor_subtotal' => 'sometimes|numeric|min:0',
        'valor_desconto' => 'sometimes|numeric|min:0',
        'valor_total' => 'sometimes|numeric|min:0',
        'observacoes' => 'nullable|string',
        'condicoes_pagamento' => 'nullable|string',
        'validade_proposta' => 'nullable|integer|min:1',
        'tipo_desconto' => 'nullable|in:percentual,valor',
        'itens' => 'sometimes|array|min:1',
        'itens.*.produto_id' => 'required_without:itens.*.descricao|nullable|exists:produtos,id',
        'itens.*.descricao' => 'required_without:itens.*.produto_id|nullable|string|max:255',
        'itens.*.quantidade' => 'required|numeric|min:0.001',
        'itens.*.valor_unitario' => 'required|numeric|min:0',
        'itens.*.desconto' => 'nullable|numeric|min:0',
        'itens.*.tipo_desconto' => 'nullable|in:percentual,valor',
        'itens.*.subtotal' => 'required|numeric|min:0',
        'itens.*.observacoes' => 'nullable|string',
    ];

    protected $with = ['cliente', 'usuario', 'itens'];

    /**
     * Sobrescreve o método store para adicionar tenant_id automaticamente
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        return DB::transaction(function () use ($request) {
            // Cria o orçamento
            $data = $request->except('itens');
            $data['tenant_id'] = $request->user()->tenant_id;
            
            $orcamento = $this->model::create($data);
            
            // Adiciona os itens
            $this->salvarItens($orcamento, $request->input('itens', []));
            
            // Recarrega o orçamento com os relacionamentos
            $orcamento->load($this->with);
            
            return $this->success($orcamento, 'Orçamento criado com sucesso', 201);
        });
    }

    /**
     * Sobrescreve o método update para lidar com itens do orçamento
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id): \Illuminate\Http\JsonResponse
    {
        $validator = Validator::make($request->all(), $this->updateRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $orcamento = $this->model::find($id);

        if (!$orcamento) {
            return $this->notFound();
        }

        return DB::transaction(function () use ($request, $orcamento) {
            // Atualiza o orçamento
            $data = $request->except('itens');
            $orcamento->update($data);
            
            // Remove os itens antigos e adiciona os novos
            if ($request->has('itens')) {
                $orcamento->itens()->delete();
                $this->salvarItens($orcamento, $request->input('itens', []));
            }
            
            // Recarrega o orçamento com os relacionamentos
            $orcamento->load($this->with);
            
            return $this->success($orcamento, 'Orçamento atualizado com sucesso');
        });
    }

    /**
     * Salva os itens do orçamento
     * 
     * @param Orcamento $orcamento
     * @param array $itens
     * @return void
     */
    protected function salvarItens(Orcamento $orcamento, array $itens)
    {
        foreach ($itens as $item) {
            $item['tenant_id'] = $orcamento->tenant_id;
            $orcamento->itens()->create($item);
        }
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
        
        // Filtrar por status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }
        
        // Filtrar por tipo de orçamento
        if ($request->has('tipo_orcamento')) {
            $query->where('tipo_orcamento', $request->input('tipo_orcamento'));
        }
        
        // Filtrar por data de emissão
        if ($request->has('data_inicio')) {
            $query->where('data_emissao', '>=', $request->input('data_inicio'));
        }
        
        if ($request->has('data_fim')) {
            $query->where('data_emissao', '<=', $request->input('data_fim'));
        }
        
        // Filtrar por valor
        if ($request->has('valor_min')) {
            $query->where('valor_total', '>=', $request->input('valor_min'));
        }
        
        if ($request->has('valor_max')) {
            $query->where('valor_total', '<=', $request->input('valor_max'));
        }
        
        // Busca por termo
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhereHas('cliente', function($q) use ($search) {
                      $q->where('nome', 'like', "%{$search}%");
                  });
            });
        }
        
        return $query;
    }
    
    /**
     * Remover um orçamento específico
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        $orcamento = $this->model::find($id);

        if (!$orcamento) {
            return $this->notFound();
        }

        // Verificar se o orçamento pode ser excluído (apenas rascunhos e cancelados)
        if (!in_array($orcamento->status, ['rascunho', 'cancelado'])) {
            return $this->error('Apenas orçamentos em rascunho ou cancelados podem ser excluídos', 422);
        }

        try {
            return DB::transaction(function () use ($orcamento) {
                // Remover itens do orçamento
                $orcamento->itens()->delete();
                
                // Remover o orçamento
                $orcamento->delete();
                
                return $this->success(null, 'Orçamento removido com sucesso');
            });
        } catch (\Exception $e) {
            return $this->error('Não foi possível remover o orçamento: ' . $e->getMessage());
        }
    }

    /**
     * Aprova um orçamento
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function aprovar($id)
    {
        return $this->atualizarStatus($id, 'aprovado');
    }
    
    /**
     * Rejeita um orçamento
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function rejeitar($id)
    {
        return $this->atualizarStatus($id, 'rejeitado');
    }
    
    /**
     * Cancela um orçamento
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function cancelar($id)
    {
        return $this->atualizarStatus($id, 'cancelado');
    }
    
    /**
     * Atualiza o status de um orçamento
     * 
     * @param int $id
     * @param string $status
     * @return JsonResponse
     */
    protected function atualizarStatus($id, $status)
    {
        $orcamento = $this->model::find($id);
        
        if (!$orcamento) {
            return $this->notFound();
        }
        
        $orcamento->update(['status' => $status]);
        
        return $this->success($orcamento, "Orçamento {$status} com sucesso");
    }
    
    /**
     * Gera um PDF do orçamento
     * 
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function pdf($id)
    {
        $orcamento = $this->model::with(['cliente', 'itens'])->find($id);
        
        if (!$orcamento) {
            return $this->notFound();
        }
        
        // Aqui você pode implementar a geração do PDF
        // Exemplo com DomPDF:
        // $pdf = \PDF::loadView('orcamentos.pdf', compact('orcamento'));
        // return $pdf->download("orcamento-{$orcamento->id}.pdf");
        
        // Por enquanto, retornamos apenas os dados
        return $this->success($orcamento);
    }
    
    /**
     * Envia o orçamento por e-mail
     * 
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function enviarEmail(Request $request, $id)
    {
        $orcamento = $this->model::with(['cliente'])->find($id);
        
        if (!$orcamento) {
            return $this->notFound();
        }
        
        $validator = Validator::make($request->all(), [
            'assunto' => 'required|string|max:255',
            'mensagem' => 'required|string',
            'anexar_pdf' => 'boolean',
        ]);
        
        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }
        
        try {
            // Aqui você pode implementar o envio de e-mail
            // Exemplo:
            // \Mail::to($orcamento->cliente->email)
            //     ->send(new OrcamentoEnviado($orcamento, $request->assunto, $request->mensagem, $request->anexar_pdf));
            
            // Atualiza o status para 'enviado'
            $orcamento->update(['status' => 'enviado']);
            
            return $this->success(null, 'Orçamento enviado por e-mail com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao enviar e-mail: ' . $e->getMessage());
        }
    }
    
    /**
     * Retorna as estatísticas de orçamentos
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function estatisticas(Request $request)
    {
        $query = $this->model::query();
        
        // Aplica filtros comuns
        $this->applyFilters($query, $request);
        
        // Total de orçamentos
        $total = $query->count();
        
        // Total por status
        $porStatus = $this->model::select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->get()
            ->pluck('total', 'status');
        
        // Valor total orçado
        $valorTotal = $this->model::sum('valor_total');
        
        // Média de valor por orçamento
        $mediaValor = $total > 0 ? $valorTotal / $total : 0;
        
        // Taxa de conversão (aprovados / totais)
        $aprovados = $this->model::where('status', 'aprovado')->count();
        $taxaConversao = $total > 0 ? ($aprovados / $total) * 100 : 0;
        
        // Orçamentos por período (últimos 12 meses)
        $periodos = [];
        for ($i = 11; $i >= 0; $i--) {
            $data = now()->subMonths($i);
            $mesAno = $data->format('Y-m');
            
            $totalPeriodo = $this->model::whereYear('created_at', $data->year)
                ->whereMonth('created_at', $data->month)
                ->count();
                
            $periodos[$mesAno] = $totalPeriodo;
        }
        
        return $this->success([
            'total' => $total,
            'por_status' => $porStatus,
            'valor_total' => $valorTotal,
            'media_valor' => $mediaValor,
            'taxa_conversao' => $taxaConversao,
            'periodos' => $periodos,
        ]);
    }

    /**
     * Salva um rascunho de orçamento
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function saveRascunho(Request $request)
    {
        \Log::info('=== INICIANDO saveRascunho ===', [
            'user_id' => auth()->id(),
            'request_data' => $request->all(),
            'request_size' => strlen(json_encode($request->all()))
        ]);

        try {
            // Se não há dados, limpa o rascunho
            if (empty($request->all())) {
                \Log::info('Limpando rascunho - dados vazios');
                // Remove rascunho existente do usuário
                $this->model::where('vendedor_id', auth()->id())
                    ->where('status', 'Rascunho')
                    ->delete();
                
                return $this->success(null, 'Rascunho limpo com sucesso');
            }

            // Mapear campos do frontend para o banco
            $data = $request->all();
            
            \Log::info('Dados originais recebidos:', $data);
            
            // Mapear campos específicos
            if (isset($data['observacao'])) {
                $data['observacoes'] = $data['observacao'];
                unset($data['observacao']);
            }
            
            if (isset($data['selectedPecas'])) {
                $data['dados_pecas'] = $data['selectedPecas'];
                unset($data['selectedPecas']);
            }
            
            if (isset($data['adicionais'])) {
                $data['dados_adicionais'] = $data['adicionais'];
                unset($data['adicionais']);
            }
            
            if (isset($data['pagamentos'])) {
                $data['dados_pagamento'] = $data['pagamentos'];
                unset($data['pagamentos']);
            }
            
            if (isset($data['orcamentoTotal'])) {
                $data['valor_total'] = $data['orcamentoTotal'];
                unset($data['orcamentoTotal']);
            }
            
            if (isset($data['areaTotalM2'])) {
                $data['area_total_m2'] = $data['areaTotalM2'];
                unset($data['areaTotalM2']);
            }
            
            if (isset($data['custoTotalMaterial'])) {
                $data['custo_total_material'] = $data['custoTotalMaterial'];
                unset($data['custoTotalMaterial']);
            }
            
            if (isset($data['custoTotalAdicionais'])) {
                $data['custo_total_adicional'] = $data['custoTotalAdicionais'];
                unset($data['custoTotalAdicionais']);
            }
            
            // Remover campos que não existem no banco
            $fieldsToRemove = [
                'pecaAvulsa', 'cliente', 'produto', 'data'
            ];
            foreach ($fieldsToRemove as $field) {
                unset($data[$field]);
            }
            
            // Mapear cliente_id se vier do objeto cliente
            if (isset($request->cliente['id']) && !empty($request->cliente['id'])) {
                $data['cliente_id'] = $request->cliente['id'];
            } else {
                $data['cliente_id'] = null;
            }
            
            // Mapear produto_id se vier do objeto produto
            if (isset($request->produto['id']) && !empty($request->produto['id'])) {
                $data['produto_id'] = $request->produto['id'];
            } else {
                $data['produto_id'] = null;
            }

            // Garantir que campos obrigatórios tenham valores padrão
            if (empty($data['nome_orcamento'])) {
                $data['nome_orcamento'] = 'Rascunho de Orçamento';
            }
            
            if (empty($data['codigo'])) {
                $data['codigo'] = 'RASCUNHO-' . time();
            }

            \Log::info('Dados após mapeamento:', $data);

            // Validação básica para rascunho
            $validator = Validator::make($data, [
                'cliente_id' => 'nullable|exists:clientes,id',
                'produto_id' => 'nullable|exists:produtos,id',
                'data_validade' => 'nullable|date',
                'valor_total' => 'nullable|numeric|min:0',
                'observacoes' => 'nullable|string',
                'dados_pecas' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                \Log::error('Erro de validação no saveRascunho:', $validator->errors()->toArray());
                return $this->validationError($validator->errors());
            }

            \Log::info('Validação passou, buscando rascunho existente');

            // Busca rascunho existente ou cria novo
            $rascunho = $this->model::where('vendedor_id', auth()->id())
                ->where('status', 'Rascunho')
                ->first();

            if ($rascunho) {
                \Log::info('Atualizando rascunho existente', ['rascunho_id' => $rascunho->id]);
                // Atualiza rascunho existente
                $rascunho->update($data);
                
                return $this->success($rascunho, 'Rascunho atualizado com sucesso');
            } else {
                \Log::info('Criando novo rascunho');
                // Cria novo rascunho
                $data['vendedor_id'] = auth()->id();
                $data['vendedor_nome'] = auth()->user()->name;
                $data['status'] = 'Rascunho';
                $data['data_validade'] = $data['data_validade'] ?? now()->addDays(15);
                $data['tenant_id'] = auth()->user()->tenant_id;
                
                \Log::info('Dados finais para criação:', $data);
                
                $rascunho = $this->model::create($data);
                
                \Log::info('Rascunho criado com sucesso', ['rascunho_id' => $rascunho->id]);
                
                return $this->success($rascunho, 'Rascunho criado com sucesso', 201);
            }
        } catch (\Exception $e) {
            \Log::error('Erro no saveRascunho:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all()
            ]);
            return $this->error('Erro ao salvar rascunho: ' . $e->getMessage());
        }
    }

    /**
     * Recupera o rascunho de orçamento do usuário
     * 
     * @return JsonResponse
     */
    public function getRascunho()
    {
        \Log::info('=== INICIANDO getRascunho ===', [
            'user_id' => auth()->id(),
            'user_tenant_id' => auth()->user()->tenant_id ?? 'null',
            'user_is_super_admin' => auth()->user()->isSuperAdmin() ?? false
        ]);

        try {
            // Verificar se há orçamentos do usuário (sem filtro de status primeiro)
            $totalOrcamentos = $this->model::where('vendedor_id', auth()->id())->count();
            \Log::info('Total de orçamentos do usuário:', ['total' => $totalOrcamentos]);

            // Verificar orçamentos com status 'Rascunho' (case sensitive)
            $rascunhosRascunho = $this->model::where('vendedor_id', auth()->id())
                ->where('status', 'Rascunho')
                ->count();
            \Log::info('Orçamentos com status "Rascunho":', ['total' => $rascunhosRascunho]);

            // Verificar orçamentos com status 'rascunho' (lowercase)
            $rascunhosLowercase = $this->model::where('vendedor_id', auth()->id())
                ->where('status', 'rascunho')
                ->count();
            \Log::info('Orçamentos com status "rascunho":', ['total' => $rascunhosLowercase]);

            // Buscar o rascunho (testando ambos os casos)
            $rascunho = $this->model::where('vendedor_id', auth()->id())
                ->where(function($query) {
                    $query->where('status', 'Rascunho')
                          ->orWhere('status', 'rascunho');
                })
                ->first();

            \Log::info('Resultado da busca por rascunho:', [
                'rascunho_encontrado' => $rascunho ? true : false,
                'rascunho_id' => $rascunho ? $rascunho->id : null,
                'rascunho_status' => $rascunho ? $rascunho->status : null
            ]);

            if (!$rascunho) {
                \Log::info('Nenhum rascunho encontrado, retornando sucesso com null');
                return $this->success(null, 'Nenhum rascunho encontrado');
            }

            \Log::info('Rascunho encontrado, retornando dados');
            return $this->success($rascunho);
        } catch (\Exception $e) {
            \Log::error('Erro no getRascunho:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao recuperar rascunho: ' . $e->getMessage());
        }
    }

    /**
     * Busca orçamentos de envelopamento
     * 
     * @param Request $request
     * @return JsonResponse
     */
    public function getEnvelopamentos(Request $request)
    {
        try {
            $query = $this->model::with(['cliente', 'itens'])
                ->where('tipo_orcamento', 'envelopamento')
                ->where('status', 'Finalizado'); // Filtrar apenas orçamentos finalizados

            // Aplicar filtros
            $this->applyFilters($query, $request);

            // Ordenar por data de criação (mais recentes primeiro)
            $query->orderBy('created_at', 'desc');

            // Paginar resultados
            $perPage = $request->input('per_page', 15);
            $orcamentos = $query->paginate($perPage);

            // Transformar dados para o formato esperado pelo frontend
            $orcamentos->getCollection()->transform(function ($orcamento) {
                return [
                    'id' => $orcamento->id,
                    'codigo' => $orcamento->codigo,
                    'nome_orcamento' => $orcamento->nome_orcamento,
                    'cliente' => $orcamento->cliente ? [
                        'id' => $orcamento->cliente->id,
                        'nome' => $orcamento->cliente->nome_completo ?? $orcamento->cliente->nome ?? 'Cliente não informado'
                    ] : null,
                    'status' => $orcamento->status,
                    'orcamentoTotal' => $orcamento->valor_total,
                    'data_criacao_iso' => $orcamento->created_at,
                    'data_validade' => $orcamento->data_validade,
                    'vendedor_nome' => $orcamento->vendedor_nome,
                    'observacoes' => $orcamento->observacoes,
                    'itens_count' => $orcamento->itens ? $orcamento->itens->count() : 0
                ];
            });

            return $this->success($orcamentos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar orçamentos de envelopamento:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao buscar orçamentos de envelopamento: ' . $e->getMessage());
        }
    }
}
