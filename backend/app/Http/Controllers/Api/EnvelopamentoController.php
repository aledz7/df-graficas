<?php

namespace App\Http\Controllers\Api;

use App\Models\Envelopamento;
use App\Models\ItemVenda;
use App\Models\LancamentoCaixa;
use App\Models\ContaBancaria;
use App\Models\CategoriaCaixa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EnvelopamentoController extends ResourceController
{
    protected $model = Envelopamento::class;
    
    protected $storeRules = [
        'codigo_orcamento' => 'required|string|max:255',
        'nome_orcamento' => 'nullable|string|max:255',
        'cliente' => 'nullable|array',
        'cliente_id' => 'nullable|exists:clientes,id',
        'funcionario_id' => 'nullable|exists:users,id',
        'valor_total' => 'required|numeric|min:0',
        'selected_pecas' => 'nullable|array',
        'produto' => 'nullable|array',
        'adicionais' => 'nullable|array',
        'servicos_adicionais_aplicados' => 'nullable|array',
        'area_total_m2' => 'nullable|numeric|min:0',
        'custo_total_material' => 'nullable|numeric|min:0',
        'custo_total_adicionais' => 'nullable|numeric|min:0',
        'desconto' => 'nullable|numeric|min:0',
        'desconto_tipo' => 'nullable|string|in:percentual,valor',
        'desconto_calculado' => 'nullable|numeric|min:0',
        'frete' => 'nullable|numeric|min:0',
        'orcamento_total' => 'nullable|numeric|min:0',
        'observacao' => 'nullable|string',
        'status' => 'required|string|in:Rascunho,Orçamento Salvo,Finalizado',
        'data' => 'nullable|date', // Aceitar data do frontend
        'data_criacao' => 'required_without:data|date',
        'data_validade' => 'nullable|date',
        'vendedor_id' => 'nullable|exists:users,id',
        'vendedor_nome' => 'nullable|string|max:255',
        'pagamentos' => 'nullable|array',
    ];

    protected $updateRules = [
        'codigo_orcamento' => 'sometimes|string|max:255',
        'nome_orcamento' => 'nullable|string|max:255',
        'cliente' => 'nullable|array',
        'cliente_id' => 'nullable|exists:clientes,id',
        'funcionario_id' => 'nullable|exists:users,id',
        'valor_total' => 'sometimes|numeric|min:0',
        'selected_pecas' => 'nullable|array',
        'produto' => 'nullable|array',
        'adicionais' => 'nullable|array',
        'servicos_adicionais_aplicados' => 'nullable|array',
        'area_total_m2' => 'nullable|numeric|min:0',
        'custo_total_material' => 'nullable|numeric|min:0',
        'custo_total_adicionais' => 'nullable|numeric|min:0',
        'desconto' => 'nullable|numeric|min:0',
        'desconto_tipo' => 'nullable|string|in:percentual,valor',
        'desconto_calculado' => 'nullable|numeric|min:0',
        'frete' => 'nullable|numeric|min:0',
        'orcamento_total' => 'nullable|numeric|min:0',
        'observacao' => 'nullable|string',
        'status' => 'sometimes|string|in:Rascunho,Orçamento Salvo,Finalizado',
        'data' => 'nullable|date', // Aceitar data do frontend
        'data_criacao' => 'nullable|date',
        'data_validade' => 'nullable|date',
        'vendedor_id' => 'nullable|exists:users,id',
        'vendedor_nome' => 'nullable|string|max:255',
        'pagamentos' => 'nullable|array',
    ];

    protected $with = ['vendedor', 'funcionario'];

    /**
     * Sobrescreve o método store para validação customizada e debug
     */
    public function store(Request $request): JsonResponse
    {
        // Validação customizada para permitir cliente_id null quando funcionario_id estiver presente
        $rules = $this->storeRules;
        
        // Se funcionario_id estiver presente, cliente_id se torna opcional
        if ($request->has('funcionario_id') && !empty($request->funcionario_id)) {
            $rules['cliente_id'] = 'nullable|exists:clientes,id';
        }
        
        // Se status for "Finalizado", observacao se torna obrigatória
        if ($request->has('status') && $request->status === 'Finalizado') {
            $rules['observacao'] = 'required|string|min:1';
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        
        // Debug: Log dos dados recebidos
        \Log::info('🔍 [EnvelopamentoController::store] Dados recebidos:', [
            'observacao' => $data['observacao'] ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($data['observacao'] ?? null),
            'observacao_empty' => empty($data['observacao'] ?? null),
            'todos_dados' => $data
        ]);
        
        // Mapear campo 'data' do frontend para 'data_criacao' do backend
        if (isset($data['data']) && !isset($data['data_criacao'])) {
            $data['data_criacao'] = $data['data'];
        }
        // Remover o campo 'data' pois não existe na tabela
        unset($data['data']);
        
        // Adicionar tenant_id se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $data['tenant_id'] = auth()->user()->tenant_id;
        }

        // Debug: Log dos dados finais antes de criar
        \Log::info('🔍 [EnvelopamentoController::store] Dados finais antes de criar:', [
            'observacao' => $data['observacao'] ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($data['observacao'] ?? null),
            'observacao_empty' => empty($data['observacao'] ?? null)
        ]);

        $model = $this->model::create($data);
        
        // Salvar item na tabela itens_venda se estiver finalizado
        if (isset($data['status']) && $data['status'] === 'Finalizado' && isset($data['produto'])) {
            $this->salvarItemVendaEnvelopamento($model, $data);
        }
        
        // Debug: Log do modelo criado
        \Log::info('🔍 [EnvelopamentoController::store] Modelo criado:', [
            'id' => $model->id,
            'observacao' => $model->observacao ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($model->observacao ?? null)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Recurso criado com sucesso',
            'data' => $model
        ], 201);
    }

    /**
     * Sobrescreve o método update para validação customizada
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Validação customizada para permitir cliente_id null quando funcionario_id estiver presente
        $rules = $this->updateRules;
        
        // Se funcionario_id estiver presente, cliente_id se torna opcional
        if ($request->has('funcionario_id') && !empty($request->funcionario_id)) {
            $rules['cliente_id'] = 'nullable|exists:clientes,id';
        }
        
        // Se status for "Finalizado", observacao se torna obrigatória
        if ($request->has('status') && $request->status === 'Finalizado') {
            $rules['observacao'] = 'required|string|min:1';
        }
        
        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = $this->model::query();
        
        // Aplicar escopo do tenant se o modelo tiver a coluna tenant_id
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }
        
        $model = $query->find($id);

        if (!$model) {
            return response()->json([
                'success' => false,
                'message' => 'Recurso não encontrado'
            ], 404);
        }

        // Processar os dados antes de salvar
        $data = $request->all();
        
        // Armazenar o valor original antes da atualização para comparação
        $valorOriginal = $model->orcamento_total;
        $valorNovo = isset($data['orcamento_total']) ? floatval($data['orcamento_total']) : $valorOriginal;
        
        // Debug: Log dos dados recebidos no update
        \Log::info('🔍 [EnvelopamentoController::update] Dados recebidos:', [
            'id' => $id,
            'observacao' => $data['observacao'] ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($data['observacao'] ?? null),
            'observacao_empty' => empty($data['observacao'] ?? null),
            'valor_original' => $valorOriginal,
            'valor_novo' => $valorNovo,
            'todos_dados' => $data
        ]);
        
        // Mapear campo 'data' do frontend para 'data_criacao' do backend
        if (isset($data['data']) && !isset($data['data_criacao'])) {
            $data['data_criacao'] = $data['data'];
        }
        // Remover o campo 'data' pois não existe na tabela
        unset($data['data']);
        
        // Se um orçamento está sendo finalizado, atualizar data_criacao para agora
        $isOrcamentoOriginal = in_array($model->status, ['Rascunho', 'Orçamento Salvo']);
        $isFinalizando = isset($data['status']) && $data['status'] === 'Finalizado';
        
        if ($isOrcamentoOriginal && $isFinalizando) {
            $data['data_criacao'] = now();
            \Log::info('📅 [EnvelopamentoController::update] Atualizando data_criacao ao finalizar orçamento', [
                'envelopamento_id' => $model->id,
                'status_original' => $model->status,
                'status_novo' => $data['status'],
                'data_criacao_antiga' => $model->data_criacao,
                'data_criacao_nova' => $data['data_criacao']
            ]);
        }
        
        if (method_exists($this, 'beforeSave')) {
            $data = $this->beforeSave($data, $model);
        }

        // Debug: Log dos dados finais antes de atualizar
        \Log::info('🔍 [EnvelopamentoController::update] Dados finais antes de atualizar:', [
            'id' => $id,
            'observacao' => $data['observacao'] ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($data['observacao'] ?? null),
            'observacao_empty' => empty($data['observacao'] ?? null)
        ]);

        $model->update($data);
        
        // Debug: Log do modelo após atualização
        \Log::info('🔍 [EnvelopamentoController::update] Modelo após atualização:', [
            'id' => $model->id,
            'observacao' => $model->observacao ?? 'NÃO ENCONTRADA',
            'observacao_type' => gettype($model->observacao ?? null)
        ]);

        // Se o envelopamento já está finalizado e o valor mudou, atualizar as contas a receber
        if ($model->status === 'Finalizado' && $valorOriginal != $valorNovo) {
            \Log::info('📊 [EnvelopamentoController::update] Valor do envelopamento mudou, atualizando contas a receber', [
                'envelopamento_id' => $model->id,
                'valor_antigo' => $valorOriginal,
                'valor_novo' => $valorNovo
            ]);
            
            // Atualizar a data_criacao do envelopamento para refletir a data da edição
            $model->update(['data_criacao' => now()]);
            
            \Log::info('📅 [EnvelopamentoController::update] Data de criação do envelopamento atualizada', [
                'envelopamento_id' => $model->id,
                'nova_data_criacao' => now()
            ]);
            
            $this->atualizarContasReceberEnvelopamento($model, $valorOriginal, $valorNovo);
        }

        // Se o envelopamento está finalizado, garantir que o item na tabela itens_venda seja atualizado
        if ($model->status === 'Finalizado') {
            \Log::info('📊 [EnvelopamentoController::update] Atualizando item na tabela itens_venda', [
                'envelopamento_id' => $model->id
            ]);
            $this->salvarItemVendaEnvelopamento($model, $request->all());
        }

        return response()->json([
            'success' => true,
            'message' => 'Recurso atualizado com sucesso',
            'data' => $model
        ]);
    }

    /**
     * Aplica filtros à consulta
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtrar por cliente
        if ($request->has('cliente_id')) {
            $clienteId = $request->input('cliente_id');
            $query->whereJsonContains('cliente->id', $clienteId);
        }

        // Filtrar por funcionário
        if ($request->has('funcionario_id')) {
            $query->where('funcionario_id', $request->input('funcionario_id'));
        }

        // Filtrar por termo de busca
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                  ->orWhere('codigo_orcamento', 'like', "%{$search}%")
                  ->orWhere('nome_orcamento', 'like', "%{$search}%")
                  ->orWhereJsonContains('cliente->nome', $search);
            });
        }

        // Filtrar por status
        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filtrar por vendedor
        if ($request->has('vendedor_id')) {
            $query->where('vendedor_id', $request->input('vendedor_id'));
        }

        // Filtrar por período
        if ($request->has('data_inicio')) {
            $dataInicio = $request->input('data_inicio');
            // Se a data não tem hora, adicionar 00:00:00
            if (!str_contains($dataInicio, ' ')) {
                $dataInicio .= ' 00:00:00';
            }
            $query->where('data_criacao', '>=', $dataInicio);
        }

        if ($request->has('data_fim')) {
            $dataFim = $request->input('data_fim');
            // Se a data não tem hora, adicionar 23:59:59
            if (!str_contains($dataFim, ' ')) {
                $dataFim .= ' 23:59:59';
            }
            $query->where('data_criacao', '<=', $dataFim);
        }

        // Filtrar por expiração
        if ($request->boolean('expirados')) {
            $query->expirados();
        }

        if ($request->boolean('nao_expirados')) {
            $query->naoExpirados();
        }

        return $query;
    }

    /**
     * Processa dados antes de salvar
     */
    protected function beforeSave($data, $model = null)
    {
        // Se for criação, definir tenant_id
        if (!$model) {
            $data['tenant_id'] = auth()->user()->tenant_id;
        }

        // Validar unicidade do código_orcamento
        if (isset($data['codigo_orcamento'])) {
            $query = $this->model::where('codigo_orcamento', $data['codigo_orcamento'])
                                ->where('tenant_id', auth()->user()->tenant_id);
            
            if ($model) {
                $query->where('id', '!=', $model->id);
            }
            
            if ($query->exists()) {
                throw new \Illuminate\Validation\ValidationException(
                    \Illuminate\Support\Facades\Validator::make([], [])->errors(),
                    'O código do orçamento já existe.'
                );
            }
        }

        // Garantir que data_criacao seja definida
        if (!isset($data['data_criacao'])) {
            $data['data_criacao'] = now();
        }

        // Definir data de validade padrão se não fornecida
        if (!isset($data['data_validade']) && $data['status'] !== 'Finalizado') {
            $data['data_validade'] = Carbon::now()->addDays(30); // 30 dias de validade
        }

        return $data;
    }

    /**
     * Buscar orçamento por código
     */
    public function buscarPorCodigo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'codigo' => 'required|string'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $query = $this->model::query();
        
        // Aplicar escopo do tenant
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $envelopamento = $query->where('codigo_orcamento', $request->input('codigo'))->first();

        if (!$envelopamento) {
            return $this->notFound('Orçamento não encontrado');
        }

        return $this->success($envelopamento);
    }

    /**
     * Obter estatísticas de envelopamentos
     */
    public function estatisticas(Request $request): JsonResponse
    {
        $query = $this->model::query();
        
        // Aplicar escopo do tenant
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        // Filtrar por período se fornecido
        if ($request->has('data_inicio') && $request->has('data_fim')) {
            $query->whereBetween('data_criacao', [
                $request->input('data_inicio'),
                $request->input('data_fim')
            ]);
        }

        $estatisticas = [
            'total' => $query->count(),
            'rascunhos' => $query->clone()->where('status', 'Rascunho')->count(),
            'orcamentos_salvos' => $query->clone()->where('status', 'Orçamento Salvo')->count(),
            'finalizados' => $query->clone()->where('status', 'Finalizado')->count(),
            'expirados' => $query->clone()->expirados()->count(),
            'valor_total' => $query->clone()->sum('orcamento_total'),
            'valor_medio' => $query->clone()->avg('orcamento_total'),
        ];

        return $this->success($estatisticas);
    }

    /**
     * Finalizar orçamento
     */
    public function finalizar(Request $request, $id): JsonResponse
    {
        \Log::info('Iniciando finalização do envelopamento', [
            'envelopamento_id' => $id,
            'user_id' => auth()->id(),
            'tenant_id' => auth()->user()->tenant_id
        ]);

        $query = $this->model::query();
        
        // Aplicar escopo do tenant
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $envelopamento = $query->find($id);

        if (!$envelopamento) {
            \Log::error('Envelopamento não encontrado', [
                'envelopamento_id' => $id,
                'tenant_id' => auth()->user()->tenant_id
            ]);
            return $this->notFound();
        }

        // Atualizar dados críticos enviados na requisição antes de prosseguir
        try {
            $dadosAtualizados = [];

            if ($request->has('pagamentos')) {
                $pagamentos = $request->input('pagamentos');

                // Se vier como string JSON, tentar decodificar
                if (is_string($pagamentos)) {
                    $decoded = json_decode($pagamentos, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $pagamentos = $decoded;
                    }
                }

                if (is_array($pagamentos)) {
                    $dadosAtualizados['pagamentos'] = $pagamentos;
                }
            }

            $camposNumericos = [
                'orcamento_total',
                'valor_total',
                'desconto',
                'desconto_calculado',
                'frete',
                'custo_total_material',
                'custo_total_adicionais',
                'area_total_m2',
            ];

            foreach ($camposNumericos as $campo) {
                if ($request->has($campo)) {
                    $valor = $request->input($campo);
                    if ($valor !== null && $valor !== '') {
                        $dadosAtualizados[$campo] = $valor;
                    }
                }
            }

            foreach (['cliente', 'produto', 'adicionais', 'servicos_adicionais_aplicados', 'observacao', 'nome_orcamento'] as $campoArray) {
                if ($request->has($campoArray)) {
                    $dadosAtualizados[$campoArray] = $request->input($campoArray);
                }
            }

            if (!empty($dadosAtualizados)) {
                $envelopamento->fill($dadosAtualizados);
                if ($envelopamento->isDirty()) {
                    $envelopamento->save();
                    \Log::info('Dados do envelopamento atualizados durante finalização', [
                        'envelopamento_id' => $envelopamento->id,
                        'campos_atualizados' => array_keys($dadosAtualizados)
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Falha ao sincronizar dados enviados na finalização do envelopamento', [
                'envelopamento_id' => $envelopamento->id,
                'erro' => $e->getMessage()
            ]);
        }

        // Validar se observação está preenchida
        if (empty(trim($envelopamento->observacao ?? ''))) {
            \Log::error('Tentativa de finalizar envelopamento sem observações', [
                'envelopamento_id' => $id,
                'observacao' => $envelopamento->observacao
            ]);
            return response()->json([
                'success' => false,
                'message' => 'O campo Observações é obrigatório para finalizar o envelopamento.',
                'errors' => ['observacao' => ['O campo Observações é obrigatório']]
            ], 422);
        }

        \Log::info('Envelopamento encontrado', [
            'envelopamento_id' => $envelopamento->id,
            'status' => $envelopamento->status,
            'pode_ser_finalizado' => $envelopamento->podeSerFinalizado(),
            'esta_expirado' => $envelopamento->estaExpirado()
        ]);

        // Se já está finalizado, verificar se já tem conta a receber e lançamentos
        if ($envelopamento->status === 'Finalizado') {
            \Log::info('Envelopamento já foi finalizado, verificando se tem conta a receber e lançamentos', [
                'envelopamento_id' => $envelopamento->id,
                'status' => $envelopamento->status
            ]);
            
            // Recarregar o envelopamento do banco para garantir que tem os dados mais recentes
            $envelopamento->refresh();
            
            // Verificar se já existe conta a receber de crediário para este envelopamento
            // Verificar apenas contas que são de crediário (não quitadas ou com observações indicando crediário)
            $contaCrediarioExistente = \App\Models\ContaReceber::where('envelopamento_id', $envelopamento->id)
                ->where(function($query) {
                    $query->where('status', 'pendente')
                          ->orWhere('observacoes', 'like', '%Crediário%')
                          ->orWhere('observacoes', 'like', '%crediário%')
                          ->orWhere('observacoes', 'like', '%Crediario%')
                          ->orWhere('observacoes', 'like', '%crediario%');
                })
                ->first();
            
            // Verificar se já existem lançamentos no caixa para este envelopamento
            $lancamentosExistentes = \App\Models\LancamentoCaixa::where('operacao_tipo', 'envelopamento')
                ->where('operacao_id', $envelopamento->id)
                ->count();
            
            if ($contaCrediarioExistente && $lancamentosExistentes > 0) {
                \Log::info('Conta a receber de crediário e lançamentos já existem para este envelopamento', [
                    'envelopamento_id' => $envelopamento->id,
                    'conta_receber_id' => $contaCrediarioExistente->id,
                    'lancamentos_count' => $lancamentosExistentes
                ]);
                return $this->success($envelopamento, 'Orçamento já foi finalizado e conta a receber de crediário e lançamentos já existem');
            }
            
            // Se não tem conta a receber de crediário, criar uma
            if (!$contaCrediarioExistente) {
                \Log::info('Criando conta a receber de crediário para envelopamento já finalizado', [
                    'envelopamento_id' => $envelopamento->id
                ]);
                $this->criarContaReceber($envelopamento, $request);
            }
            
            // Se não tem lançamentos, criar
            if ($lancamentosExistentes === 0) {
                \Log::info('Criando lançamentos no caixa para envelopamento já finalizado', [
                    'envelopamento_id' => $envelopamento->id
                ]);
                $this->criarLancamentosCaixaEnvelopamento($envelopamento, $request);
            }
            
            return $this->success($envelopamento, 'Conta a receber e lançamentos criados para orçamento finalizado');
        }

        // Para envelopamentos não finalizados, verificar se podem ser finalizados
        if (!$envelopamento->podeSerFinalizado()) {
            \Log::error('Envelopamento não pode ser finalizado', [
                'envelopamento_id' => $envelopamento->id,
                'status' => $envelopamento->status,
                'pode_ser_finalizado' => $envelopamento->podeSerFinalizado(),
                'esta_expirado' => $envelopamento->estaExpirado()
            ]);
            return $this->error('Orçamento não pode ser finalizado', 400);
        }

        // Recarregar o envelopamento do banco para garantir que tem os dados mais recentes (incluindo pagamentos)
        $envelopamento->refresh();

        \Log::info('Envelopamento recarregado antes de criar lançamentos', [
            'envelopamento_id' => $envelopamento->id,
            'pagamentos' => $envelopamento->pagamentos,
            'pagamentos_count' => is_array($envelopamento->pagamentos) ? count($envelopamento->pagamentos) : 0
        ]);

        // Criar conta a receber para envelopamentos finalizados (antes de atualizar o status)
        $this->criarContaReceber($envelopamento, $request);

        // Criar lançamentos no caixa para pagamentos não crediário
        // Passar também o request para usar pagamentos do request como fallback
        $this->criarLancamentosCaixaEnvelopamento($envelopamento, $request);

        // Salvar item na tabela itens_venda quando finalizar
        $this->salvarItemVendaEnvelopamento($envelopamento, $request->all());
        
        // Atualizar status para Finalizado após criar a conta a receber
        // A data_criacao será atualizada automaticamente pelo método update quando o status mudar para Finalizado
        $envelopamento->update([
            'status' => 'Finalizado',
            'data_validade' => null, // Remove data de validade ao finalizar
        ]);

        \Log::info('Envelopamento atualizado para Finalizado', [
            'envelopamento_id' => $envelopamento->id,
            'novo_status' => 'Finalizado'
        ]);

        \Log::info('Finalização do envelopamento concluída', [
            'envelopamento_id' => $envelopamento->id
        ]);

        return $this->success($envelopamento, 'Orçamento finalizado com sucesso');
    }

    /**
     * Gerar próximo código de orçamento
     */
    public function getNextCodigo(): JsonResponse
    {
        try {
            $query = $this->model::query();
            
            // Aplicar escopo do tenant
            if (in_array('tenant_id', (new $this->model)->getFillable())) {
                $query->where('tenant_id', auth()->user()->tenant_id);
            }

            // Buscar o último código usado
            $ultimoEnvelopamento = $query->orderBy('id', 'desc')->first();
            
            $now = Carbon::now();
            $year = $now->format('Y');
            $month = $now->format('m');
            $day = $now->format('d');
            
            if ($ultimoEnvelopamento) {
                // Extrair número do último código
                $ultimoCodigo = $ultimoEnvelopamento->codigo_orcamento;
                $matches = [];
                
                if (preg_match('/ENV-(\d{4})(\d{2})(\d{2})-(\d{4})/', $ultimoCodigo, $matches)) {
                    $ultimoYear = $matches[1];
                    $ultimoMonth = $matches[2];
                    $ultimoDay = $matches[3];
                    $ultimoNumero = intval($matches[4]);
                    
                    // Se for do mesmo dia, incrementar número
                    if ($ultimoYear === $year && $ultimoMonth === $month && $ultimoDay === $day) {
                        $novoNumero = $ultimoNumero + 1;
                    } else {
                        $novoNumero = 1; // Resetar para 1 se for um novo dia
                    }
                } else {
                    $novoNumero = 1;
                }
            } else {
                $novoNumero = 1;
            }
            
            $codigo = sprintf('ENV-%s%s%s-%04d', $year, $month, $day, $novoNumero);
            
            return $this->success(['codigo' => $codigo]);
            
        } catch (\Exception $e) {
            return $this->error('Erro ao gerar código: ' . $e->getMessage());
        }
    }

    /**
     * Mover para lixeira
     */
    public function moverParaLixeira(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'justificativa' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $query = $this->model::query();
        
        // Aplicar escopo do tenant
        if (in_array('tenant_id', (new $this->model)->getFillable())) {
            $query->where('tenant_id', auth()->user()->tenant_id);
        }

        $envelopamento = $query->find($id);

        if (!$envelopamento) {
            return $this->notFound();
        }

        try {
            return DB::transaction(function () use ($envelopamento, $request) {
                // Se o envelopamento estava finalizado, devolver o estoque
                if ($envelopamento->status === 'Finalizado') {
                    $this->devolverEstoqueEnvelopamento($envelopamento);
                }

                $envelopamento->delete();

                \Log::info('Envelopamento movido para lixeira', [
                    'id' => $envelopamento->id,
                    'justificativa' => $request->input('justificativa'),
                    'usuario' => auth()->user()->id
                ]);

                return $this->success(null, 'Orçamento movido para lixeira com sucesso');
            });
        } catch (\Exception $e) {
            \Log::error('Erro ao mover envelopamento para lixeira', [
                'id' => $envelopamento->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao mover orçamento para lixeira: ' . $e->getMessage());
        }
    }
    
    /**
     * Devolve o estoque de um envelopamento
     */
    private function devolverEstoqueEnvelopamento(Envelopamento $envelopamento)
    {
        $selectedPecas = $envelopamento->selected_pecas ?? [];
        
        if (empty($selectedPecas)) {
            \Log::info('[Estoque][Envelopamento] Nenhuma peça encontrada para devolver estoque', [
                'envelopamento_id' => $envelopamento->id
            ]);
            return;
        }

        foreach ($selectedPecas as $peca) {
            $produto = $peca['produto'] ?? $envelopamento->produto ?? null;
            
            if (!$produto || !isset($produto['id'])) {
                continue;
            }

            // Verificar se o produto é em m²
            $unidade = strtolower(($produto['unidadeMedida'] ?? $produto['unidade_medida'] ?? $produto['tipo_produto'] ?? ''));
            $trataComoM2 = $unidade === 'm2' || $unidade === 'metro_quadrado' || (!empty($produto['preco_m2'] ?? null) && floatval($produto['preco_m2']) > 0);
            
            if ($trataComoM2) {
                // Calcular área da peça
                $alturaM = floatval(str_replace(',', '.', $peca['parte']['altura'] ?? '0')) ?: 0;
                $larguraM = floatval(str_replace(',', '.', $peca['parte']['largura'] ?? '0')) ?: 0;
                $quantidade = intval($peca['quantidade'] ?? 0);
                $areaPeca = $alturaM * $larguraM * $quantidade;

                if ($areaPeca > 0) {
                    $produtoModel = \App\Models\Produto::find($produto['id']);
                    if ($produtoModel) {
                        // Devolver estoque do produto principal
                        $produtoModel->increment('estoque', $areaPeca);
                        
                        \Log::info('[Estoque][Envelopamento] Devolvendo estoque', [
                            'envelopamento_id' => $envelopamento->id,
                            'produto_id' => $produtoModel->id,
                            'area_devolvida' => $areaPeca
                        ]);

                        // Se for produto composto, devolver estoque dos componentes
                        if ($produtoModel->is_composto && is_array($produtoModel->composicao)) {
                            foreach ($produtoModel->composicao as $comp) {
                                $compId = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                                $compQtd = (float) ($comp['quantidade'] ?? 0);
                                
                                if ($compId && $compQtd > 0) {
                                    $compProduto = \App\Models\Produto::find($compId);
                                    if ($compProduto) {
                                        $delta = $compQtd * $areaPeca;
                                        $compProduto->increment('estoque', $delta);
                                        
                                        \Log::info('[Estoque][Envelopamento] Devolvendo estoque componente', [
                                            'envelopamento_id' => $envelopamento->id,
                                            'produto_principal_id' => $produtoModel->id,
                                            'componente_id' => $compProduto->id,
                                            'quantidade' => $delta
                                        ]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Cria uma conta a receber para envelopamentos finalizados
     * 
     * @param Envelopamento $envelopamento
     * @param Request $request
     * @return void
     */
    protected function criarContaReceber(Envelopamento $envelopamento, Request $request)
    {
        \Log::info("Iniciando criação de conta a receber para envelopamento", [
            'envelopamento_id' => $envelopamento->id,
            'status' => $envelopamento->status,
            'orcamento_total' => $envelopamento->orcamento_total,
            'observacao' => $envelopamento->observacao
        ]);

        try {
            // Verificar se já existem contas a receber para crediário deste envelopamento
            // Verificar apenas contas que são de crediário (não quitadas ou com observações indicando crediário)
            $contasCrediarioExistentes = \App\Models\ContaReceber::where('envelopamento_id', $envelopamento->id)
                ->where(function($query) {
                    $query->where('status', 'pendente')
                          ->orWhere('observacoes', 'like', '%Crediário%')
                          ->orWhere('observacoes', 'like', '%crediário%')
                          ->orWhere('observacoes', 'like', '%Crediario%')
                          ->orWhere('observacoes', 'like', '%crediario%');
                })
                ->count();
            
            if ($contasCrediarioExistentes > 0) {
                \Log::info("Contas a receber de crediário já existem para este envelopamento, pulando criação", [
                    'envelopamento_id' => $envelopamento->id,
                    'contas_crediario_existentes' => $contasCrediarioExistentes
                ]);
                return;
            }

            // Obter dados de pagamento do envelopamento
            $dadosPagamento = $envelopamento->pagamentos ?? [];
            
            \Log::info("Dados de pagamento recebidos no envelopamento", [
                'envelopamento_id' => $envelopamento->id,
                'dados_pagamento' => $dadosPagamento
            ]);
            
            // Se não há dados de pagamento, usar dados padrão
            if (empty($dadosPagamento)) {
                $dadosPagamento = [
                    [
                        'metodo' => 'Dinheiro',
                        'valor' => $envelopamento->orcamento_total,
                        'valorOriginal' => $envelopamento->orcamento_total,
                        'valorFinal' => $envelopamento->orcamento_total,
                        'parcelas' => 1,
                        'dataVencimento' => now()->addDays(30)->format('Y-m-d')
                    ]
                ];
                
                \Log::info("Dados de pagamento padrão criados para envelopamento", [
                    'envelopamento_id' => $envelopamento->id,
                    'dados_pagamento' => $dadosPagamento
                ]);
            }

            // Criar conta a receber APENAS para pagamentos em crediário
            foreach ($dadosPagamento as $pagamento) {
                $metodoPagamento = $pagamento['metodo'] ?? '';
                
                \Log::info("Verificando método de pagamento para conta a receber do envelopamento", [
                    'envelopamento_id' => $envelopamento->id,
                    'metodo' => $metodoPagamento,
                    'dados_pagamento' => $dadosPagamento
                ]);
                
                // Pular pagamentos que NÃO são crediário (Dinheiro, Pix, Cartão, etc.)
                // Contas a receber devem ser criadas APENAS para crediário
                if (!in_array(strtolower($metodoPagamento), ['crediário', 'crediario', 'credito', 'crédito'])) {
                    \Log::info("Pulando pagamento que não é crediário - não será criada conta a receber", [
                        'envelopamento_id' => $envelopamento->id,
                        'metodo' => $metodoPagamento
                    ]);
                    continue;
                }
                
                $dataVencimento = isset($pagamento['dataVencimento']) 
                    ? \Carbon\Carbon::parse($pagamento['dataVencimento'])
                    : now()->addDays(30);

                $valor = $pagamento['valorFinal'] ?? $pagamento['valor'];
                
                // Status sempre pendente para crediário
                $status = 'pendente';
                
                \Log::info("Conta a receber será criada como pendente para envelopamento (crediário)", [
                    'envelopamento_id' => $envelopamento->id,
                    'metodo' => $metodoPagamento,
                    'status' => $status,
                    'valor' => $valor
                ]);
                
                // Preparar descrição com ID do envelopamento e observações
                $descricao = "Envelopamento #{$envelopamento->id}";
                if (!empty($envelopamento->observacao)) {
                    $descricao .= " - " . $envelopamento->observacao;
                }
                
                // Extrair cliente_id do campo cliente (JSON)
                $clienteId = null;
                $clienteData = $envelopamento->cliente;
                
                // Se cliente é string JSON, decodificar
                if (is_string($clienteData)) {
                    $clienteData = json_decode($clienteData, true);
                }
                
                // Extrair ID do cliente
                if ($clienteData && is_array($clienteData)) {
                    // Tentar diferentes chaves possíveis para o ID
                    $clienteId = $clienteData['id'] ?? $clienteData['cliente_id'] ?? null;
                    
                    // Se o ID começa com "funcionario_", tentar extrair o ID numérico
                    if (is_string($clienteId) && strpos($clienteId, 'funcionario_') === 0) {
                        $clienteId = str_replace('funcionario_', '', $clienteId);
                    }
                }
                
                // Se ainda não tem cliente_id, verificar se há cliente_id direto no envelopamento
                if (!$clienteId && isset($envelopamento->cliente_id)) {
                    $clienteId = $envelopamento->cliente_id;
                }
                
                \Log::info("Cliente ID extraído para conta a receber", [
                    'envelopamento_id' => $envelopamento->id,
                    'cliente_id' => $clienteId,
                    'cliente_data_type' => gettype($envelopamento->cliente),
                    'cliente_data' => $clienteData
                ]);

                // Preparar observações da conta a receber
                $observacoesConta = "Envelopamento - {$envelopamento->codigo_orcamento} - {$pagamento['metodo']}";
                if (!empty($envelopamento->observacao)) {
                    $observacoesConta .= "\n" . $envelopamento->observacao;
                }

                $dadosContaReceber = [
                    'tenant_id' => $envelopamento->tenant_id,
                    'cliente_id' => $clienteId,
                    'user_id' => $envelopamento->funcionario_id ?? $envelopamento->vendedor_id ?? auth()->id(),
                    'descricao' => $descricao,
                    'valor_original' => $valor,
                    'valor_pendente' => $valor, // Sempre igual ao valor original para crediário (status pendente)
                    'data_emissao' => $envelopamento->data_criacao,
                    'data_vencimento' => $dataVencimento,
                    'status' => $status, // Sempre 'pendente' para crediário
                    'observacoes' => $observacoesConta,
                    'envelopamento_id' => $envelopamento->id,
                ];

                \Log::info("Dados da conta a receber preparados", [
                    'envelopamento_id' => $envelopamento->id,
                    'cliente_id' => $clienteId,
                    'cliente_data' => $envelopamento->cliente,
                    'user_id' => $envelopamento->funcionario_id ?? $envelopamento->vendedor_id ?? auth()->id(),
                    'tenant_id' => $envelopamento->tenant_id,
                    'valor' => $valor,
                    'status' => $status
                ]);

                \Log::info("Criando conta a receber com dados do envelopamento", [
                    'envelopamento_id' => $envelopamento->id,
                    'dados_conta' => $dadosContaReceber
                ]);

                try {
                    $contaReceber = \App\Models\ContaReceber::create($dadosContaReceber);

                    \Log::info("Conta a receber criada com sucesso para envelopamento", [
                        'envelopamento_id' => $envelopamento->id,
                        'conta_id' => $contaReceber->id,
                        'status' => $status,
                        'valor_original' => $contaReceber->valor_original,
                        'valor_pendente' => $contaReceber->valor_pendente,
                        'envelopamento_id_salvo' => $contaReceber->envelopamento_id
                    ]);

                    // Nota: O lançamento no caixa será criado pelo método criarLancamentosCaixaEnvelopamento
                    // que é chamado no método finalizar, então não precisa criar aqui para evitar duplicação
                } catch (\Exception $e) {
                    \Log::error("Erro ao criar conta a receber para envelopamento", [
                        'envelopamento_id' => $envelopamento->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_conta' => $dadosContaReceber
                    ]);
                    throw $e;
                }
            }
        } catch (\Exception $e) {
            \Log::error("Erro ao criar conta a receber para envelopamento {$envelopamento->id}: " . $e->getMessage());
            // Não interrompe o fluxo do envelopamento se houver erro na criação da conta
        }
    }

    /**
     * Recria a conta a receber de crediário para um envelopamento
     * Útil para corrigir casos onde a conta não foi criada corretamente
     * 
     * @param int $id
     * @return JsonResponse
     */
    public function recriarContaReceber($id)
    {
        try {
            $envelopamento = Envelopamento::findOrFail($id);
            
            \Log::info("Recriando conta a receber para envelopamento", [
                'envelopamento_id' => $envelopamento->id,
                'status' => $envelopamento->status
            ]);
            
            // Verificar se o envelopamento foi finalizado
            if ($envelopamento->status !== 'Finalizado') {
                return $this->error('Envelopamento precisa estar finalizado para criar conta a receber', 400);
            }
            
            // Recarregar o envelopamento para garantir dados atualizados
            $envelopamento->refresh();
            
            // Criar um request vazio para passar ao método criarContaReceber
            $request = new Request();
            
            // Chamar o método criarContaReceber
            $this->criarContaReceber($envelopamento, $request);
            
            // Verificar se a conta foi criada
            $contaCriada = \App\Models\ContaReceber::where('envelopamento_id', $envelopamento->id)
                ->where(function($query) {
                    $query->where('status', 'pendente')
                          ->orWhere('observacoes', 'like', '%Crediário%')
                          ->orWhere('observacoes', 'like', '%crediário%')
                          ->orWhere('observacoes', 'like', '%Crediario%')
                          ->orWhere('observacoes', 'like', '%crediario%');
                })
                ->first();
            
            if ($contaCriada) {
                return $this->success([
                    'envelopamento_id' => $envelopamento->id,
                    'conta_receber_id' => $contaCriada->id,
                    'mensagem' => 'Conta a receber de crediário criada com sucesso'
                ], 'Conta a receber criada com sucesso');
            } else {
                // Verificar se há pagamentos em crediário
                $pagamentos = $envelopamento->pagamentos ?? [];
                $temCrediario = false;
                
                foreach ($pagamentos as $pagamento) {
                    $metodo = strtolower($pagamento['metodo'] ?? '');
                    if (in_array($metodo, ['crediário', 'crediario', 'credito', 'crédito'])) {
                        $temCrediario = true;
                        break;
                    }
                }
                
                if (!$temCrediario) {
                    return $this->error('Envelopamento não possui pagamentos em crediário', 400);
                }
                
                return $this->error('Não foi possível criar a conta a receber. Verifique os logs para mais detalhes.', 500);
            }
        } catch (\Exception $e) {
            \Log::error("Erro ao recriar conta a receber para envelopamento", [
                'envelopamento_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->error('Erro ao recriar conta a receber: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Atualiza as contas a receber quando o valor de um envelopamento muda
     * 
     * @param Envelopamento $envelopamento
     * @param float $valorAntigo
     * @param float $valorNovo
     * @return void
     */
    protected function atualizarContasReceberEnvelopamento($envelopamento, $valorAntigo, $valorNovo)
    {
        \Log::info("💰 Iniciando atualização de contas a receber para envelopamento", [
            'envelopamento_id' => $envelopamento->id,
            'valor_antigo' => $valorAntigo,
            'valor_novo' => $valorNovo
        ]);

        try {
            // Buscar todas as contas a receber relacionadas a este envelopamento
            $contasReceber = \App\Models\ContaReceber::where('envelopamento_id', $envelopamento->id)->get();
            
            if ($contasReceber->isEmpty()) {
                \Log::warning("⚠️ Nenhuma conta a receber encontrada para envelopamento", [
                    'envelopamento_id' => $envelopamento->id
                ]);
                return;
            }

            \Log::info("📋 Contas a receber encontradas", [
                'envelopamento_id' => $envelopamento->id,
                'total_contas' => $contasReceber->count()
            ]);

            // Calcular a proporção da mudança
            $proporcao = $valorAntigo != 0 ? ($valorNovo / $valorAntigo) : 1;
            
            \Log::info("📐 Proporção calculada", [
                'envelopamento_id' => $envelopamento->id,
                'proporcao' => $proporcao
            ]);

            foreach ($contasReceber as $conta) {
                // Calcular o novo valor proporcional
                $novoValorOriginal = round($conta->valor_original * $proporcao, 2);
                
                // Calcular quanto foi pago dessa conta
                $valorPago = $conta->valor_original - $conta->valor_pendente;
                
                // Calcular o novo valor pendente
                $novoValorPendente = max(0, $novoValorOriginal - $valorPago);
                
                // Determinar o novo status
                $novoStatus = $conta->status;
                if ($novoValorPendente <= 0) {
                    $novoStatus = 'quitada';
                } elseif ($valorPago > 0 && $novoValorPendente < $novoValorOriginal) {
                    $novoStatus = 'parcial';
                } elseif ($novoValorPendente >= $novoValorOriginal) {
                    $novoStatus = 'pendente';
                }

                \Log::info("💵 Atualizando conta a receber", [
                    'conta_id' => $conta->id,
                    'envelopamento_id' => $envelopamento->id,
                    'valor_original_antigo' => $conta->valor_original,
                    'valor_original_novo' => $novoValorOriginal,
                    'valor_pendente_antigo' => $conta->valor_pendente,
                    'valor_pendente_novo' => $novoValorPendente,
                    'status_antigo' => $conta->status,
                    'status_novo' => $novoStatus,
                    'valor_pago' => $valorPago
                ]);

                // Atualizar a conta com a nova data de emissão (data da edição do envelopamento)
                $novaDataEmissao = now()->toDateString();

                // Atualizar a conta
                $conta->update([
                    'valor_original' => $novoValorOriginal,
                    'valor_pendente' => $novoValorPendente,
                    'status' => $novoStatus,
                    'data_emissao' => $novaDataEmissao,
                    // Atualizar a descrição para incluir informação sobre a edição
                    'descricao' => "Envelopamento #{$envelopamento->id}" . 
                                    (!empty($envelopamento->observacao) ? " - " . $envelopamento->observacao : "") .
                                    " (Atualizado em " . now()->format('d/m/Y H:i') . ")"
                ]);

                \Log::info("📅 Data de emissão atualizada", [
                    'conta_id' => $conta->id,
                    'data_emissao_antiga' => $conta->data_emissao,
                    'data_emissao_nova' => $novaDataEmissao
                ]);

                \Log::info("✅ Conta a receber atualizada com sucesso", [
                    'conta_id' => $conta->id,
                    'envelopamento_id' => $envelopamento->id
                ]);
            }

            \Log::info("✅ Todas as contas a receber foram atualizadas com sucesso", [
                'envelopamento_id' => $envelopamento->id,
                'total_contas_atualizadas' => $contasReceber->count()
            ]);

        } catch (\Exception $e) {
            \Log::error("❌ Erro ao atualizar contas a receber para envelopamento", [
                'envelopamento_id' => $envelopamento->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não interrompe o fluxo da edição se houver erro na atualização das contas
        }
    }
    
    /**
     * Salvar item de Envelopamento na tabela itens_venda
     */
    protected function salvarItemVendaEnvelopamento($envelopamento, $data)
    {
        try {
            \Log::info('🔄 [EnvelopamentoController::salvarItemVendaEnvelopamento] Iniciando sincronização de itens', [
                'envelopamento_id' => $envelopamento->id
            ]);

            // 1. Remover itens existentes
            ItemVenda::where('venda_referencia_id', $envelopamento->id)
                ->where('tipo_venda', 'envelopamento')
                ->delete();

            // 2. Coletar candidatos a itens
            $candidatos = [];
            $valorTotalOrcamento = floatval($envelopamento->orcamento_total ?? 0);

            // 2.1 Produto Principal
            $produto = $data['produto'] ?? $envelopamento->produto ?? null;
            if ($produto && is_array($produto) && !empty($produto['id'])) {
                $candidatos[] = [
                    'produto' => $produto,
                    'quantidade' => 1,
                    'peso' => 0 // Será calculado
                ];
            }

            // 2.2 Peças Selecionadas
            $selectedPecas = $data['selected_pecas'] ?? $envelopamento->selected_pecas ?? [];
            if (is_array($selectedPecas)) {
                foreach ($selectedPecas as $peca) {
                    if (isset($peca['produto']) && !empty($peca['produto']['id'])) {
                        $prod = $peca['produto'];
                        // Tentar obter um preço para peso
                        $preco = floatval($prod['preco_venda'] ?? $prod['valorMetroQuadrado'] ?? $prod['preco_m2'] ?? 0);
                        
                        $candidatos[] = [
                            'produto' => $prod,
                            'quantidade' => $peca['quantidade'] ?? 1,
                            'peso' => $preco * ($peca['quantidade'] ?? 1)
                        ];
                    }
                }
            }

            if (empty($candidatos)) {
                \Log::warning('⚠️ [EnvelopamentoController] Nenhum item encontrado para salvar em itens_venda', [
                    'envelopamento_id' => $envelopamento->id
                ]);
                return;
            }

            // 3. Distribuir Valor Total
            $totalPeso = array_sum(array_column($candidatos, 'peso'));
            $totalItens = count($candidatos);
            $valorRestante = $valorTotalOrcamento;

            foreach ($candidatos as $index => &$candidato) {
                if ($totalPeso > 0) {
                    // Distribuição proporcional ao preço/peso
                    $proporcao = $candidato['peso'] / $totalPeso;
                    $valorItem = round($valorTotalOrcamento * $proporcao, 2);
                } else {
                    // Distribuição igualitária se não houver preços definidos
                    $valorItem = round($valorTotalOrcamento / $totalItens, 2);
                }

                // Ajuste de centavos no último item
                if ($index === $totalItens - 1) {
                    $valorItem = $valorRestante;
                } else {
                    $valorRestante -= $valorItem;
                }

                $candidato['valor_final'] = $valorItem;
            }

            // 4. Salvar Itens
            foreach ($candidatos as $item) {
                $prod = $item['produto'];
                
                ItemVenda::create([
                    'tenant_id' => $envelopamento->tenant_id,
                    'venda_id' => null,
                    'tipo_venda' => 'envelopamento',
                    'venda_referencia_id' => $envelopamento->id,
                    'produto_id' => $prod['id'],
                    'produto_nome' => $prod['nome'] ?? 'Produto',
                    'produto_codigo' => null,
                    'produto_unidade' => $prod['unidadeMedida'] ?? 'un',
                    'produto_descricao' => null,
                    'quantidade' => $item['quantidade'],
                    'valor_unitario' => $item['quantidade'] > 0 ? ($item['valor_final'] / $item['quantidade']) : 0,
                    'desconto_percentual' => 0,
                    'desconto_valor' => 0,
                    'acrescimo_percentual' => 0,
                    'acrescimo_valor' => 0,
                    'valor_total' => $item['valor_final'],
                    'observacoes' => null,
                    'dados_adicionais' => null,
                    'orcamento_item_id' => null,
                ]);
            }
            
            \Log::info('✅ [EnvelopamentoController] Itens sincronizados com sucesso em itens_venda', [
                'envelopamento_id' => $envelopamento->id,
                'total_itens' => count($candidatos),
                'valor_total_distribuido' => $valorTotalOrcamento
            ]);
            
        } catch (\Exception $e) {
            \Log::error('❌ [EnvelopamentoController] Erro ao salvar itens em itens_venda:', [
                'envelopamento_id' => $envelopamento->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Cria lançamentos no fluxo de caixa para os pagamentos do envelopamento (exceto Crediário)
     * 
     * @param Envelopamento $envelopamento
     * @param Request|null $request
     * @return void
     */
    protected function criarLancamentosCaixaEnvelopamento(Envelopamento $envelopamento, $request = null)
    {
        try {
            // Tentar obter pagamentos do envelopamento primeiro
            $pagamentos = $envelopamento->pagamentos ?? [];
            
            // Se não houver pagamentos no envelopamento ou for array vazio, tentar obter do request
            if ((empty($pagamentos) || !is_array($pagamentos) || count($pagamentos) === 0) && $request && $request->has('pagamentos')) {
                $pagamentosRequest = $request->input('pagamentos');
                
                // Se vier como string JSON, tentar decodificar
                if (is_string($pagamentosRequest)) {
                    $decoded = json_decode($pagamentosRequest, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $pagamentosRequest = $decoded;
                    }
                }
                
                if (is_array($pagamentosRequest)) {
                    $pagamentos = $pagamentosRequest;
                    \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Usando pagamentos do request', [
                        'envelopamento_id' => $envelopamento->id,
                        'pagamentos_count' => count($pagamentos)
                    ]);
                }
            }

            \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Iniciando criação de lançamentos para envelopamento', [
                'envelopamento_id' => $envelopamento->id,
                'codigo_orcamento' => $envelopamento->codigo_orcamento,
                'pagamentos' => $pagamentos,
                'pagamentos_count' => is_array($pagamentos) ? count($pagamentos) : 0,
                'pagamentos_from_envelopamento' => !empty($envelopamento->pagamentos),
                'pagamentos_from_request' => $request && $request->has('pagamentos')
            ]);

            // Verificar se há pagamentos válidos
            if (empty($pagamentos) || !is_array($pagamentos) || count($pagamentos) === 0) {
                \Log::warning('💰 [criarLancamentosCaixaEnvelopamento] Nenhum pagamento válido encontrado', [
                    'envelopamento_id' => $envelopamento->id,
                    'pagamentos' => $pagamentos,
                    'pagamentos_type' => gettype($pagamentos),
                    'pagamentos_count' => is_array($pagamentos) ? count($pagamentos) : 'N/A'
                ]);
                return;
            }

            // Verificar se há caixa aberto (opcional - não bloqueia criação de lançamentos)
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', $envelopamento->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            $sessaoId = null;
            if ($caixaAberto) {
                // Verificar se o caixa não foi fechado
                $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', $envelopamento->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();
                    
                    // Se há fechamento, não usar sessao_id mas ainda criar o lançamento
                    if ($fechamento) {
                        \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Caixa fechado, criando lançamento sem sessao_id', [
                            'envelopamento_id' => $envelopamento->id
                        ]);
                        $sessaoId = null;
                    }
                }
            } else {
                \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Nenhum caixa aberto encontrado, criando lançamento sem sessao_id', [
                    'envelopamento_id' => $envelopamento->id
                ]);
            }

            // Buscar conta de caixa padrão (opcional - não bloqueia criação)
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', $envelopamento->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('💰 [criarLancamentosCaixaEnvelopamento] Conta de caixa não encontrada, usando conta padrão como fallback', [
                    'envelopamento_id' => $envelopamento->id
                ]);
            }

            // Buscar categoria de receita
            $categoriaReceita = CategoriaCaixa::where('tipo', 'receita')
                ->where('tenant_id', $envelopamento->tenant_id)
                ->where('ativo', true)
                ->first();

            // Obter informações do cliente
            $clienteInfo = is_array($envelopamento->cliente) ? $envelopamento->cliente : json_decode($envelopamento->cliente, true);
            $clienteNome = $clienteInfo['nome_completo'] ?? $clienteInfo['nome'] ?? 'Cliente não identificado';

            // Criar lançamento para cada pagamento (exceto Crediário)
            foreach ($pagamentos as $pagamento) {
                $metodoPagamento = $pagamento['metodo'] ?? $pagamento['forma_pagamento'] ?? '';
                
                // Pular pagamentos com Crediário (são tratados como conta a receber)
                if (strtolower($metodoPagamento) === 'crediário' || strtolower($metodoPagamento) === 'crediario') {
                    \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Pulando pagamento Crediário', [
                        'envelopamento_id' => $envelopamento->id,
                        'valor' => $pagamento['valor'] ?? 0
                    ]);
                    continue;
                }

                $valor = $pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0;
                if ($valor <= 0) {
                    continue;
                }

                // Determinar a conta bancária
                $contaBancariaId = null;
                $contaBancariaNome = null;
                
                // Verificar se tem conta_bancaria_id ou conta_destino_id no pagamento
                $contaIdPagamento = $pagamento['conta_bancaria_id'] ?? 
                                   $pagamento['contaDestinoId'] ?? 
                                   $pagamento['conta_destino_id'] ?? 
                                   null;
                
                if ($contaIdPagamento) {
                    $contaBancaria = ContaBancaria::find($contaIdPagamento);
                    if ($contaBancaria && $contaBancaria->tenant_id === $envelopamento->tenant_id) {
                        $contaBancariaId = $contaBancaria->id;
                        $contaBancariaNome = $contaBancaria->nome;
                        \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Usando conta bancária selecionada', [
                            'conta_bancaria_id' => $contaBancariaId,
                            'conta_bancaria_nome' => $contaBancariaNome,
                            'forma_pagamento' => $metodoPagamento
                        ]);
                    } else {
                        \Log::warning('💰 [criarLancamentosCaixaEnvelopamento] Conta bancária não encontrada ou não pertence ao tenant', [
                            'conta_id' => $contaIdPagamento,
                            'envelopamento_tenant_id' => $envelopamento->tenant_id,
                            'conta_tenant_id' => $contaBancaria ? $contaBancaria->tenant_id : null
                        ]);
                    }
                }
                
                // Se não encontrou conta específica, usar estratégia baseada no tipo de pagamento
                if (!$contaBancariaId) {
                    $metodoPagamentoLower = strtolower($metodoPagamento);
                    
                    if ($metodoPagamentoLower === 'dinheiro' && $contaCaixa) {
                        // Para dinheiro, usar conta de caixa se disponível
                        $contaBancariaId = $contaCaixa->id;
                        $contaBancariaNome = $contaCaixa->nome;
                        \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Usando conta de caixa para pagamento em dinheiro', [
                            'envelopamento_id' => $envelopamento->id,
                            'conta_id' => $contaBancariaId
                        ]);
                    } else {
                        // Para outras formas de pagamento ou se não houver conta de caixa, buscar conta padrão do sistema
                        $contaPadrao = ContaBancaria::where('tenant_id', $envelopamento->tenant_id)
                            ->where('conta_padrao', true)
                            ->where('ativo', true)
                            ->first();
                        
                        if ($contaPadrao) {
                            $contaBancariaId = $contaPadrao->id;
                            $contaBancariaNome = $contaPadrao->nome;
                            \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Usando conta padrão do sistema (conta selecionada não encontrada)', [
                                'envelopamento_id' => $envelopamento->id,
                                'conta_bancaria_id' => $contaBancariaId,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        } else if ($contaCaixa) {
                            // Fallback: usar conta de caixa se não houver conta padrão
                            $contaBancariaId = $contaCaixa->id;
                            $contaBancariaNome = $contaCaixa->nome;
                            \Log::warning('💰 [criarLancamentosCaixaEnvelopamento] Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                                'envelopamento_id' => $envelopamento->id,
                                'conta_id' => $contaBancariaId,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        } else {
                            // Último recurso: buscar qualquer conta ativa do tenant
                            $contaQualquer = ContaBancaria::where('tenant_id', $envelopamento->tenant_id)
                                ->where('ativo', true)
                                ->first();
                            
                            if ($contaQualquer) {
                                $contaBancariaId = $contaQualquer->id;
                                $contaBancariaNome = $contaQualquer->nome;
                                \Log::warning('💰 [criarLancamentosCaixaEnvelopamento] Usando primeira conta ativa encontrada como último recurso', [
                                    'envelopamento_id' => $envelopamento->id,
                                    'conta_id' => $contaBancariaId,
                                    'forma_pagamento' => $metodoPagamento
                                ]);
                            } else {
                                \Log::error('💰 [criarLancamentosCaixaEnvelopamento] Nenhuma conta bancária encontrada para criar lançamento', [
                                    'envelopamento_id' => $envelopamento->id,
                                    'tenant_id' => $envelopamento->tenant_id
                                ]);
                                continue; // Pular este pagamento
                            }
                        }
                    }
                }

                $dadosLancamento = [
                    'tenant_id' => $envelopamento->tenant_id,
                    'descricao' => "Envelopamento #{$envelopamento->codigo_orcamento} - {$clienteNome}",
                    'valor' => $valor,
                    'tipo' => 'entrada',
                    'data_operacao' => $envelopamento->data_criacao ?? now(),
                    'categoria_id' => $categoriaReceita ? $categoriaReceita->id : null,
                    'categoria_nome' => $categoriaReceita ? $categoriaReceita->nome : 'Envelopamento',
                    'conta_id' => $contaBancariaId,
                    'conta_nome' => $contaBancariaNome,
                    'forma_pagamento' => $metodoPagamento,
                    'operacao_tipo' => 'envelopamento',
                    'operacao_id' => $envelopamento->id,
                    'usuario_id' => auth()->id(),
                    'usuario_nome' => auth()->user()->name ?? 'Sistema',
                    'status' => 'concluido',
                    'metadados' => [
                        'sessao_id' => $sessaoId,
                        'envelopamento_id' => $envelopamento->id,
                        'codigo_orcamento' => $envelopamento->codigo_orcamento,
                        'cliente_id' => $clienteInfo['id'] ?? null,
                        'cliente_nome' => $clienteNome,
                        'parcelas' => $pagamento['parcelas'] ?? 1,
                        'valor_original' => $pagamento['valorOriginal'] ?? $valor,
                        'conta_bancaria_original' => $contaIdPagamento,
                        'observacoes' => "Pagamento Envelopamento - {$envelopamento->codigo_orcamento}"
                    ]
                ];

                \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Criando lançamento', [
                    'envelopamento_id' => $envelopamento->id,
                    'dados_lancamento' => $dadosLancamento
                ]);

                try {
                    // Validar dados obrigatórios antes de criar
                    if (empty($dadosLancamento['conta_id'])) {
                        \Log::error('💰 [criarLancamentosCaixaEnvelopamento] Erro: conta_id não definido para lançamento', [
                            'envelopamento_id' => $envelopamento->id,
                            'dados_lancamento' => $dadosLancamento
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    if (empty($dadosLancamento['valor']) || $dadosLancamento['valor'] <= 0) {
                        \Log::error('💰 [criarLancamentosCaixaEnvelopamento] Erro: valor inválido para lançamento', [
                            'envelopamento_id' => $envelopamento->id,
                            'valor' => $dadosLancamento['valor']
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    $lancamento = LancamentoCaixa::create($dadosLancamento);

                    \Log::info('💰 [criarLancamentosCaixaEnvelopamento] Lançamento criado com sucesso', [
                        'lancamento_id' => $lancamento->id,
                        'codigo' => $lancamento->codigo,
                        'envelopamento_id' => $envelopamento->id,
                        'conta_bancaria_id' => $contaBancariaId,
                        'valor' => $valor
                    ]);
                } catch (\Exception $e) {
                    \Log::error('💰 [criarLancamentosCaixaEnvelopamento] Erro ao criar lançamento', [
                        'envelopamento_id' => $envelopamento->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                }
            }

        } catch (\Exception $e) {
            \Log::error('💰 [criarLancamentosCaixaEnvelopamento] Erro geral', [
                'envelopamento_id' => $envelopamento->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não interrompe o fluxo se houver erro na criação dos lançamentos
        }
    }
}
