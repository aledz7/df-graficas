<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use App\Models\OrdemServicoAnexo;
use App\Models\ContaReceber;
use App\Models\ItemVenda;
use App\Models\LancamentoCaixa;
use App\Models\ContaBancaria;
use App\Models\CategoriaCaixa;
use App\Services\ComissaoOSService;
use App\Services\EstoqueMinimoService;

class OrdemServicoController extends Controller
{
    protected $comissaoService;
    protected $estoqueMinimoService;

    public function __construct(ComissaoOSService $comissaoService, EstoqueMinimoService $estoqueMinimoService)
    {
        $this->comissaoService = $comissaoService;
        $this->estoqueMinimoService = $estoqueMinimoService;
    }
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Log para debug - verificar contagem de ordens
        $totalComDeletadas = OrdemServico::withTrashed()->count();
        $totalAtivas = OrdemServico::count();
        \Log::info('[OS] Index - Contagem de ordens', [
            'total_ativas' => $totalAtivas,
            'total_com_deletadas' => $totalComDeletadas,
            'deletadas' => $totalComDeletadas - $totalAtivas
        ]);
        
        // Verificar se deve carregar relacionamentos
        $with = $request->input('with', 'cliente,itens.produto,anexos');
        $relationships = $with ? explode(',', $with) : [];
        
        $query = $relationships ? OrdemServico::with($relationships) : OrdemServico::query();
        
        // Excluir OS deletadas (soft delete)
        $query->whereNull('deleted_at');
        
        // Filtrar por cliente
        if ($request->has('cliente_id')) {
            $query->where('cliente_id', $request->input('cliente_id'));
        }
        
        // Filtrar por funcionário
        if ($request->has('funcionario_id')) {
            $funcionarioId = $request->input('funcionario_id');
            \Log::info('Filtrando OS por funcionario_id:', ['funcionario_id' => $funcionarioId]);
            $query->where('funcionario_id', $funcionarioId);
        }
        
        // Filtrar por ID específico (busca exata no id que é a chave primária)
        if ($request->has('id')) {
            $id = $request->input('id');
            \Log::info('🔍 [DEBUG] Filtrando OS por ID:', ['id' => $id, 'tipo' => gettype($id)]);
            $query->where('id', $id);
            \Log::info('🔍 [DEBUG] Query após filtro ID:', ['sql' => $query->toSql(), 'bindings' => $query->getBindings()]);
        }
        
        // Filtrar por nome do cliente
        if ($request->has('cliente')) {
            $cliente = $request->input('cliente');
            \Log::info('Filtrando OS por cliente:', ['cliente' => $cliente]);
            $query->whereHas('cliente', function($q) use ($cliente) {
                $q->where('nome_completo', 'like', "%{$cliente}%")
                  ->orWhere('apelido_fantasia', 'like', "%{$cliente}%");
            });
        }
        
        // Filtrar por produto/serviço
        if ($request->has('produto')) {
            $produto = $request->input('produto');
            \Log::info('Filtrando OS por produto:', ['produto' => $produto]);
            $query->whereHas('itens', function($q) use ($produto) {
                $q->where('nome_servico_produto', 'like', "%{$produto}%");
            });
        }
        
        // Filtrar por acabamento
        if ($request->has('acabamento')) {
            $acabamento = $request->input('acabamento');
            \Log::info('Filtrando OS por acabamento:', ['acabamento' => $acabamento]);
            $query->whereHas('itens', function($q) use ($acabamento) {
                $q->where('acabamentos', 'like', "%{$acabamento}%");
            });
        }
        
        // Filtrar por observações
        if ($request->has('obs')) {
            $obs = $request->input('obs');
            \Log::info('Filtrando OS por observações:', ['obs' => $obs]);
            $query->where(function($q) use ($obs) {
                $q->where('observacoes', 'like', "%{$obs}%")
                  ->orWhere('observacoes_gerais_os', 'like', "%{$obs}%")
                  ->orWhereHas('itens', function($subQ) use ($obs) {
                      $subQ->where('detalhes', 'like', "%{$obs}%");
                  });
            });
        }
        
        // Filtrar por status
        if ($request->has('status')) {
            $statuses = explode(',', $request->input('status'));
            \Log::info('Filtrando OS por status:', ['statuses' => $statuses]);
            $query->whereIn('status_os', $statuses);
        }
        
        // Filtrar por data (data_finalizacao_os para OS finalizadas, data_criacao para orçamentos)
        if ($request->has('data_inicio') || $request->has('data_fim')) {
            $dataInicio = $request->has('data_inicio') ? $request->input('data_inicio') . ' 00:00:00' : null;
            $dataFim = $request->has('data_fim') ? $request->input('data_fim') . ' 23:59:59' : null;
            
            $query->where(function($q) use ($dataInicio, $dataFim) {
                // Para OS finalizadas, usar data_finalizacao_os
                $q->where(function($subQ) use ($dataInicio, $dataFim) {
                    $subQ->whereNotNull('data_finalizacao_os');
                    if ($dataInicio) {
                        $subQ->where('data_finalizacao_os', '>=', $dataInicio);
                    }
                    if ($dataFim) {
                        $subQ->where('data_finalizacao_os', '<=', $dataFim);
                    }
                })
                // OU para orçamentos (sem data_finalizacao_os), usar data_criacao
                ->orWhere(function($subQ) use ($dataInicio, $dataFim) {
                    $subQ->whereNull('data_finalizacao_os')
                         ->whereIn('status_os', ['Orçamento Salvo', 'Orçamento Salvo (Editado)']);
                    if ($dataInicio) {
                        $subQ->where('data_criacao', '>=', $dataInicio);
                    }
                    if ($dataFim) {
                        $subQ->where('data_criacao', '<=', $dataFim);
                    }
                });
            });
        }
        
        // Aplicar filtros de busca avançada (apenas se não houver filtro específico por ID)
        if ($request->has('search') && !$request->has('id')) {
            $search = $request->search;
            \Log::info('Filtrando OS por busca geral:', ['search' => $search]);
            $query->where(function($q) use ($search) {
                // Busca por ID (chave primária) se o termo for numérico
                if (is_numeric($search)) {
                    $q->where('id', $search);
                }
                
                // Busca em outros campos
                $q->orWhere('id_os', 'like', "%{$search}%")
                  ->orWhere('observacoes', 'like', "%{$search}%")
                  ->orWhere('observacoes_gerais_os', 'like', "%{$search}%")
                  ->orWhereHas('cliente', function($q) use ($search) {
                      $q->where('nome_completo', 'like', "%{$search}%")
                        ->orWhere('apelido_fantasia', 'like', "%{$search}%");
                  })
                  ->orWhereHas('itens', function($q) use ($search) {
                      $q->where('nome_servico_produto', 'like', "%{$search}%")
                        ->orWhere('detalhes', 'like', "%{$search}%")
                        ->orWhere('acabamentos', 'like', "%{$search}%");
                  });
            });
        }
        
        // Log da query SQL para debug
        \Log::info('🔍 [DEBUG] Query SQL para OS:', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings(),
            'params' => $request->all(),
            'has_id_param' => $request->has('id'),
            'id_value' => $request->input('id'),
            'id_type' => gettype($request->input('id'))
        ]);
        
        $perPage = $request->input('per_page', 15);
        
        // Ordenar por data de finalização se houver filtro de data, senão por data de criação
        $orderByField = ($request->has('data_inicio') || $request->has('data_fim')) 
            ? 'data_finalizacao_os' 
            : 'data_criacao';
        
        $ordens = $query->orderBy($orderByField, 'desc')->paginate($perPage);
        
        // Adicionar headers de cache para evitar cache de ordens deletadas
        return response()->json($ordens)
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        \Log::info('=== CRIANDO ORDEM DE SERVIÇO ===', [
            'request_data' => $request->all(),
            'valor_total_os' => $request->valor_total_os,
            'tipo_valor_total' => gettype($request->valor_total_os),
            'cliente_info' => $request->cliente_info,
            'cliente_id' => $request->cliente_id,
            'funcionario_id' => $request->funcionario_id,
            'funcionario_id_type' => gettype($request->funcionario_id)
        ]);
        
        // Validação básica
        $rules = [
            'cliente_id' => 'nullable',
            'funcionario_id' => 'nullable|exists:users,id',
            'cliente_info' => 'nullable|array',
            'status_os' => 'required|string',
            'valor_total_os' => 'required|numeric',
            'itens' => 'nullable|array',
            'pagamentos' => 'nullable|array',
            'dados_producao' => 'nullable|array',
            'data_prevista_entrega' => 'nullable|date',
            'maquina_impressao_id' => 'nullable|integer',
            'observacoes_gerais_os' => 'nullable|string',
            'tipo_origem' => 'nullable|string',
            'dados_consumo_material' => 'nullable|array',
            'id_os' => 'nullable|string',
        ];
        
        $messages = [
            'data_prevista_entrega.required' => 'A Previsão de Entrega é obrigatória.',
            'data_prevista_entrega.date' => 'A Previsão de Entrega deve ser uma data válida.',
            'maquina_impressao_id.required' => 'A Máquina de Impressão é obrigatória.',
            'maquina_impressao_id.integer' => 'A Máquina de Impressão deve ser um valor válido.',
            'observacoes_gerais_os.required' => 'As Observações Gerais da OS são obrigatórias.',
        ];
        
        // Se não for um orçamento, tornar campos obrigatórios
        if ($request->status_os && !in_array($request->status_os, ['Orçamento Salvo', 'Orçamento Salvo (Editado)'])) {
            $rules['data_prevista_entrega'] = 'required|date';
            $rules['maquina_impressao_id'] = 'required|integer';
            $rules['observacoes_gerais_os'] = 'required|string';
        }
        
        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            \Log::error('Erro de validação ao criar OS:', [
                'errors' => $validator->errors(),
                'input_data' => $request->all(),
                'valor_total_os_input' => $request->valor_total_os,
                'valor_total_os_type' => gettype($request->valor_total_os)
            ]);
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }

        // Usar transação para garantir atomicidade
        return DB::transaction(function () use ($request) {
            $os = new OrdemServico();
            $tenantId = auth()->check() ? auth()->user()->tenant_id : null;
            
            // Função para gerar ID único de forma thread-safe
            $gerarIdUnico = function() {
                $maxTentativas = 10;
                $tentativas = 0;
                
                while ($tentativas < $maxTentativas) {
                    // Usar timestamp + microsegundos + random para evitar colisões
                    $id = 'OS-' . now()->format('YmdHis') . '-' . microtime(true) . '-' . Str::random(6);
                    
                    // Verificar se já existe com LOCK para evitar race condition
                    $existing = DB::table('ordens_servico')
                        ->where('id_os', $id)
                        ->lockForUpdate()
                        ->first();
                    
                    if (!$existing) {
                        return $id;
                    }
                    
                    $tentativas++;
                    usleep(1000); // Aguardar 1ms antes de tentar novamente
                }
                
                throw new \Exception('Não foi possível gerar ID único após ' . $maxTentativas . ' tentativas');
            };

            // Usar o ID enviado pelo frontend se disponível, senão gerar um novo
            $numeroSolicitado = is_numeric($request->numero_os) ? (int)$request->numero_os : null;
            $deveGerarNovoIdOs = false;

            if ($request->id_os && !empty($request->id_os)) {
                // Verificar se o ID já existe (incluindo soft deletes) com LOCK para evitar race condition
                // Buscar por qualquer OS com este id_os, independente de estar deletada ou não
                // REMOVIDO: ->where('tenant_id', $tenantId) - id_os é único globalmente
                $existingOS = DB::table('ordens_servico')
                    ->where('id_os', $request->id_os)
                    ->lockForUpdate()
                    ->first();
                
                if ($existingOS) {
                    \Log::warning('Tentativa de criar OS com ID duplicado (gerando novo automaticamente):', [
                        'id_os' => $request->id_os,
                        'existing_id' => $existingOS->id,
                        'existing_tenant_id' => $existingOS->tenant_id,
                        'current_tenant_id' => $tenantId,
                        'existing_deleted_at' => $existingOS->deleted_at
                    ]);
                    $deveGerarNovoIdOs = true;
                } else {
                    $os->id_os = $request->id_os;
                }
            } else {
                $deveGerarNovoIdOs = true;
            }
            
            // Se cliente_id começa com "funcionario_", é um funcionário
            if ($request->cliente_id && str_starts_with($request->cliente_id, 'funcionario_')) {
                $os->cliente_id = null; // Funcionários não têm cliente_id
                $os->funcionario_id = $request->funcionario_id;
            } else {
                $os->cliente_id = $request->cliente_id;
                $os->funcionario_id = $request->funcionario_id;
            }
            $os->cliente_info = $request->cliente_info;
            
            // CRÍTICO: Verificar se o numero_os solicitado já existe antes de criar
            // Se estiver criando uma nova OS (não atualizando) e o numero_os já existe,
            // gerar um novo número sequencial para evitar sobrescrever OS existente
            if ($numeroSolicitado !== null && $deveGerarNovoIdOs) {
                $numeroJaExiste = OrdemServico::withoutTenant()
                    ->withTrashed()
                    ->when($tenantId, function ($query, $tenantId) {
                        $query->where('tenant_id', $tenantId);
                    })
                    ->where('numero_os', $numeroSolicitado)
                    ->lockForUpdate()
                    ->exists();
                
                if ($numeroJaExiste) {
                    \Log::warning('⚠️ [OrdemServicoController::store] Tentativa de criar OS com numero_os duplicado! Gerando novo número:', [
                        'numero_os_solicitado' => $numeroSolicitado,
                        'tenant_id' => $tenantId
                    ]);
                    // Forçar geração de novo número sequencial
                    $numeroSolicitado = null;
                }
            }
            
            $numeroGerado = $this->resolverNumeroSequencial($tenantId, $numeroSolicitado);
            $os->numero_os = $numeroGerado;

            if ($deveGerarNovoIdOs) {
                $os->id_os = $this->formatarCodigoOS($numeroGerado);
            }
            $os->status_os = $request->status_os;
            $os->valor_total_os = $request->valor_total_os;
            $os->desconto_terceirizado_percentual = $request->desconto_terceirizado_percentual ?? 0;
            $os->desconto_geral_tipo = $request->desconto_geral_tipo ?? 'percentual';
            $os->desconto_geral_valor = $request->desconto_geral_valor ?? 0;
            $os->frete_valor = $request->frete_valor ?? 0;
            $os->data_criacao = $request->data_criacao ?? now();
            $os->data_finalizacao_os = $request->data_finalizacao_os;
            $os->data_validade = $request->data_validade;
            $os->data_prevista_entrega = $request->data_prevista_entrega;
            $os->maquina_impressao_id = $request->maquina_impressao_id;
            $os->observacoes = $request->observacoes;
            $os->observacoes_gerais_os = $request->observacoes_gerais_os;
            $os->tipo_origem = $request->tipo_origem;
            $os->dados_consumo_material = $request->dados_consumo_material;
            // Usar o usuário logado como vendedor se não foi especificado
            $user = auth()->user();
            $os->vendedor_id = $request->vendedor_id ?? $user->id;
            $os->vendedor_nome = $request->vendedor_nome ?? $user->name;
            $os->pagamentos = $request->pagamentos;
            
            // Definir dados de produção automaticamente
            $dadosProducao = $request->dados_producao ?? [];
            
            // Para orçamentos, não marcar produção automaticamente
            if (in_array($os->status_os, ['Orçamento Salvo', 'Orçamento Salvo (Editado)'])) {
                $os->dados_producao = array_merge([
                    'status_producao' => null,
                    'prazo_estimado' => null,
                    'observacoes_internas' => '',
                    'fotos_producao' => []
                ], $dadosProducao);
            } else {
                // Para todas as outras OS, definir automaticamente como "Em Produção"
                // Transferir automaticamente a data_prevista_entrega para prazo_estimado se não estiver definido
                $prazoEstimado = null;
                if ($os->data_prevista_entrega && !isset($dadosProducao['prazo_estimado'])) {
                    $prazoEstimado = $os->data_prevista_entrega;
                } elseif (isset($dadosProducao['prazo_estimado'])) {
                    $prazoEstimado = $dadosProducao['prazo_estimado'];
                }
                
                $os->dados_producao = array_merge([
                    'status_producao' => 'Em Produção',
                    'prazo_estimado' => $prazoEstimado,
                    'observacoes_internas' => '',
                    'fotos_producao' => []
                ], $dadosProducao);
            }
            
            \Log::info('Dados da OS antes de salvar:', [
                'id_os' => $os->id_os,
                'cliente_id' => $os->cliente_id,
                'funcionario_id' => $os->funcionario_id,
                'cliente_info' => $os->cliente_info,
                'valor_total_os' => $os->valor_total_os,
                'tipo_valor_total' => gettype($os->valor_total_os)
            ]);
            
            $os->save();
            
            \Log::info('=== PROCESSANDO COMISSÃO NA API ===', [
                'os_id' => $os->id,
                'id_os' => $os->id_os,
                'status_os' => $os->status_os,
                'vendedor_id' => $os->vendedor_id,
                'valor_total_os' => $os->valor_total_os
            ]);
            
            // Processar comissão se a OS foi finalizada
            if ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue') {
                \Log::info('Status da OS permite comissão, chamando serviço...');
                $resultado = $this->comissaoService->calcularComissaoOS($os);
                \Log::info('Resultado do processamento de comissão:', [
                    'comissao_criada' => $resultado ? 'Sim' : 'Não',
                    'comissao_id' => $resultado ? $resultado->id : null
                ]);
            } else {
                \Log::info('Status da OS não permite comissão:', [
                    'status_os' => $os->status_os
                ]);
            }
            
            // Criar conta a receber se há pagamentos com Crediário
            if ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue') {
                $this->criarContaReceberOS($os);
                
                // Criar lançamentos de caixa para os pagamentos (exceto Crediário)
                $this->criarLancamentosCaixaOS($os);
            }
            
            \Log::info('OS salva com sucesso:', [
                'id' => $os->id,
                'id_os' => $os->id_os,
                'cliente_id' => $os->cliente_id,
                'funcionario_id' => $os->funcionario_id,
                'cliente_info' => $os->cliente_info,
                'valor_total_os' => $os->valor_total_os
            ]);
            
            // Salvar itens da OS
            \Log::info('📦 [OrdemServicoController::store] Verificando itens:', [
                'has_itens' => $request->has('itens'),
                'is_array' => is_array($request->itens),
                'itens_count' => is_array($request->itens) ? count($request->itens) : 0,
                'itens' => $request->itens
            ]);
            
            if ($request->has('itens') && is_array($request->itens)) {
                // Validar estoque mínimo para todos os itens antes de salvar
                $estoqueErrors = [];
                foreach ($request->itens as $item) {
                    $itemErrors = $this->estoqueMinimoService->validarAdicaoItem($item);
                    if (!empty($itemErrors)) {
                        $estoqueErrors = array_merge($estoqueErrors, $itemErrors);
                    }
                }

                if (!empty($estoqueErrors)) {
                    \Log::warning('Erro de estoque mínimo ao criar OS:', [
                        'os_id' => $os->id,
                        'errors' => $estoqueErrors
                    ]);
                    
                    // Deletar a OS criada se houver erro de estoque
                    $os->delete();
                    
                    return response()->json([
                        'message' => 'Erro de estoque mínimo',
                        'errors' => $estoqueErrors
                    ], 422);
                }

                $observacoesItens = [];
                foreach ($request->itens as $item) {
                    \Log::info('📦 Item recebido:', ['item' => $item]);
                    
                    $osItem = new OrdemServicoItem();
                    $osItem->ordem_servico_id = $os->id;
                    $osItem->produto_id = $item['produto_id'] ?? null;
                    $osItem->nome_servico_produto = $item['nome_servico_produto'] ?? $item['nome_produto'] ?? 'Produto/Serviço';
                    $osItem->tipo_item = $item['tipo_item'] ?? 'unidade';
                    
                    // Converter vírgula para ponto em todos os valores numéricos
                    $osItem->quantidade = isset($item['quantidade']) ? (float)str_replace(',', '.', $item['quantidade']) : 1;
                    
                    // Para itens m2, usar valor_unitario_m2 se valor_unitario não estiver presente ou for zero
                    $valorUnitario = isset($item['valor_unitario']) ? (float)str_replace(',', '.', $item['valor_unitario']) : 0;
                    if ($valorUnitario > 0) {
                        $osItem->valor_unitario = $valorUnitario;
                    } elseif (isset($item['valor_unitario_m2'])) {
                        $osItem->valor_unitario = (float)str_replace(',', '.', $item['valor_unitario_m2']);
                    } else {
                        $osItem->valor_unitario = 0;
                    }
                    
                    // Para itens m2, usar subtotal_item se valor_total não estiver presente ou for zero
                    $valorTotal = isset($item['valor_total']) ? (float)str_replace(',', '.', $item['valor_total']) : 0;
                    if ($valorTotal > 0) {
                        $osItem->valor_total = $valorTotal;
                    } elseif (isset($item['subtotal_item'])) {
                        $osItem->valor_total = (float)str_replace(',', '.', $item['subtotal_item']);
                    } else {
                        $osItem->valor_total = 0;
                    }
                    
                    $osItem->largura = isset($item['largura']) ? (float)str_replace(',', '.', $item['largura']) : null;
                    $osItem->altura = isset($item['altura']) ? (float)str_replace(',', '.', $item['altura']) : null;
                    $osItem->acabamentos = $item['acabamentos'] ?? [];
                    $osItem->detalhes = $item['detalhes'] ?? [];
                    $osItem->consumo_material_utilizado = $item['consumo_material_utilizado'] ?? null;
                    $osItem->consumo_largura_peca = isset($item['consumo_largura_peca']) ? (float)str_replace(',', '.', $item['consumo_largura_peca']) : null;
                    $osItem->consumo_altura_peca = isset($item['consumo_altura_peca']) ? (float)str_replace(',', '.', $item['consumo_altura_peca']) : null;
                    $osItem->consumo_quantidade_solicitada = isset($item['consumo_quantidade_solicitada']) ? (int)$item['consumo_quantidade_solicitada'] : null;
                    $osItem->consumo_largura_chapa = isset($item['consumo_largura_chapa']) ? (float)str_replace(',', '.', $item['consumo_largura_chapa']) : null;
                    $osItem->consumo_altura_chapa = isset($item['consumo_altura_chapa']) ? (float)str_replace(',', '.', $item['consumo_altura_chapa']) : null;
                    $osItem->consumo_valor_unitario_chapa = isset($item['consumo_valor_unitario_chapa']) ? (float)str_replace(',', '.', $item['consumo_valor_unitario_chapa']) : null;
                    $osItem->consumo_pecas_por_chapa = isset($item['consumo_pecas_por_chapa']) ? (int)$item['consumo_pecas_por_chapa'] : null;
                    $osItem->consumo_chapas_necessarias = isset($item['consumo_chapas_necessarias']) ? (int)$item['consumo_chapas_necessarias'] : null;
                    $osItem->consumo_custo_total = isset($item['consumo_custo_total']) ? (float)str_replace(',', '.', $item['consumo_custo_total']) : null;
                    $osItem->consumo_custo_unitario = isset($item['consumo_custo_unitario']) ? (float)str_replace(',', '.', $item['consumo_custo_unitario']) : null;
                    $osItem->consumo_aproveitamento_percentual = isset($item['consumo_aproveitamento_percentual']) ? (float)str_replace(',', '.', $item['consumo_aproveitamento_percentual']) : null;
                    // Definir tenant_id manualmente para garantir que seja salvo corretamente
                    $osItem->tenant_id = $os->tenant_id;
                    
                    \Log::info('💾 Salvando item:', [
                        'tipo_item' => $osItem->tipo_item,
                        'quantidade' => $osItem->quantidade,
                        'valor_unitario' => $osItem->valor_unitario,
                        'valor_total' => $osItem->valor_total,
                        'largura' => $osItem->largura,
                        'altura' => $osItem->altura
                    ]);
                    
                    $osItem->save();
                    
                    // Salvar também na tabela itens_venda para relatórios
                    // SEMPRE salvar quando criar nova OS, independente do status (assim funcionará mesmo quando criar direto como Finalizada)
                    if (isset($os->status_os) && ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue' || $os->status_os === 'Concluida')) {
                        try {
                            ItemVenda::create([
                                'tenant_id' => $os->tenant_id,
                                'venda_id' => null, // OS não está na tabela vendas, então NULL
                                'tipo_venda' => 'os',
                                'venda_referencia_id' => $os->id, // Usar este campo para referenciar a OS
                                'produto_id' => $osItem->produto_id,
                                'produto_nome' => $osItem->nome_servico_produto,
                                'produto_codigo' => null,
                                'produto_unidade' => $osItem->tipo_item ?? 'un',
                                'produto_descricao' => null,
                                'quantidade' => $osItem->quantidade,
                                'valor_unitario' => $osItem->valor_unitario,
                                'desconto_percentual' => 0,
                                'desconto_valor' => 0,
                                'acrescimo_percentual' => 0,
                                'acrescimo_valor' => 0,
                                'valor_total' => $osItem->valor_total,
                                'observacoes' => null,
                                'dados_adicionais' => null,
                                'orcamento_item_id' => null,
                            ]);
                        } catch (\Exception $e) {
                            \Log::error('Erro ao salvar item na tabela itens_venda:', [
                                'os_id' => $os->id,
                                'item_id' => $osItem->id,
                                'error' => $e->getMessage()
                            ]);
                        }
                    }
                    
                    // Extrair observação do item para agregar na OS
                    $observacaoItem = '';
                    if (isset($item['detalhes'])) {
                        if (is_array($item['detalhes']) && isset($item['detalhes']['observacao_item'])) {
                            $observacaoItem = $item['detalhes']['observacao_item'];
                        } elseif (is_string($item['detalhes']) && !empty(trim($item['detalhes']))) {
                            $observacaoItem = $item['detalhes'];
                        }
                    }
                    
                    if (!empty($observacaoItem)) {
                        $observacoesItens[] = $observacaoItem;
                    }
                }
                
                // Agregar observações dos itens na coluna observacoes da OS
                if (!empty($observacoesItens)) {
                    $os->observacoes = implode(' | ', $observacoesItens);
                    $os->save();
                }
            }
            
            // Carregar itens para retornar na resposta com relacionamento produto
            $itens = OrdemServicoItem::withoutTenant()
                ->select('*')
                ->where('ordem_servico_id', $os->id)
                ->with(['produto' => function($query) {
                    $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
                }])
                ->get();
            $os->setRelation('itens', $itens);
            $os->load(['cliente', 'anexos']);
            
            \Log::info('📦 [OrdemServicoController::store] Retornando OS com itens:', [
                'os_id' => $os->id,
                'itens_count' => $itens->count()
            ]);
            
            return response()->json([
                'message' => 'Ordem de serviço criada com sucesso',
                'data' => $os
            ], 201);
        }); // Fim da transação DB
    }

    /**
     * Retorna o próximo número sequencial disponível para a OS
     */
    public function getProximoNumero()
    {
        $tenantId = auth()->check() ? auth()->user()->tenant_id : null;

        $numero = DB::transaction(function () use ($tenantId) {
            return $this->resolverNumeroSequencial($tenantId, null);
        });

        return response()->json([
            'numero_os' => $numero,
            'id_os' => $this->formatarCodigoOS($numero)
        ]);
    }

    /**
     * Gera um número sequencial único para a OS respeitando o tenant atual
     */
    protected function resolverNumeroSequencial(?int $tenantId, ?int $numeroSolicitado = null, ?int $ignorarId = null): int
    {
        $queryBase = OrdemServico::withoutTenant()
            ->withTrashed() // Incluir deletados para evitar colisão de número
            ->when($tenantId, function ($query, $tenantId) {
                $query->where('tenant_id', $tenantId);
            });

        if ($numeroSolicitado !== null) {
            $numeroJaUtilizado = (clone $queryBase)
                ->when($ignorarId, function ($query, $ignorarId) {
                    $query->where('id', '!=', $ignorarId);
                })
                ->where('numero_os', $numeroSolicitado)
                ->lockForUpdate()
                ->exists();

            if (!$numeroJaUtilizado) {
                return $numeroSolicitado;
            }
        }

        $ultimoNumero = (clone $queryBase)
            ->lockForUpdate()
            ->orderByDesc('numero_os')
            ->value('numero_os');

        return (int)($ultimoNumero ?? 0) + 1;
    }

    /**
     * Formata o código público da OS baseado no número sequencial
     */
    protected function formatarCodigoOS(int $numero): string
    {
        return 'OS-' . $numero;
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        \Log::info('🔍 [OrdemServicoController::show] Buscando OS:', ['id' => $id]);
        
        // Tentar buscar primeiro pelo ID numérico (chave primária)
        $os = OrdemServico::find($id);
        
        // Se não encontrou pelo ID numérico, tentar buscar pelo id_os (string)
        if (!$os) {
            $os = OrdemServico::where('id_os', $id)->first();
        }
        
        if (!$os) {
            \Log::warning('⚠️ [OrdemServicoController::show] OS não encontrada:', ['id' => $id]);
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }
        
        // Carregar itens manualmente sem TenantScope com relacionamento produto
        $itens = OrdemServicoItem::withoutTenant()
            ->select('*')
            ->where('ordem_servico_id', $os->id)
            ->with(['produto' => function($query) {
                $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
            }])
            ->get();
        
        // Garantir que o relacionamento produto seja carregado em cada item
        foreach ($itens as $item) {
            if ($item->produto_id && !$item->relationLoaded('produto')) {
                $item->load(['produto' => function($query) {
                    $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
                }]);
            }
        }
        
        $os->setRelation('itens', $itens);
        
        // Carregar outros relacionamentos
        $os->load(['cliente', 'anexos']);
        
        \Log::info('✅ [OrdemServicoController::show] OS encontrada:', [
            'id' => $os->id,
            'id_os' => $os->id_os,
            'cliente_id' => $os->cliente_id,
            'itens_count' => $os->itens ? $os->itens->count() : 0,
            'valor_total_os' => $os->valor_total_os
        ]);
        
        if ($os->itens) {
            \Log::info('📦 [OrdemServicoController::show] Itens da OS:', [
                'itens' => $os->itens->map(function($item) {
                    return [
                        'id' => $item->id,
                        'produto_id' => $item->produto_id,
                        'nome_servico_produto' => $item->nome_servico_produto,
                        'quantidade' => $item->quantidade,
                        'valor_unitario' => $item->valor_unitario,
                        'valor_total' => $item->valor_total,
                        'largura' => $item->largura,
                        'altura' => $item->altura,
                        'detalhes' => $item->detalhes,
                        'produto_carregado' => $item->produto ? 'sim' : 'não',
                        'produto_imagem' => $item->produto ? ($item->produto->imagem_principal ?? 'não tem') : 'não carregado'
                    ];
                })->toArray()
            ]);
        } else {
            \Log::warning('⚠️ [OrdemServicoController::show] OS sem itens carregados');
        }
        
        return response()->json($os);
    }

    /**
     * Update the specified resource.
     */
    public function update(Request $request, string $id)
    {
        \Log::info('=== MÉTODO UPDATE CHAMADO ===', [
            'id' => $id,
            'request_data' => $request->all(),
            'status_os_request' => $request->status_os
        ]);

        // Buscar por id numérico ou por id_os (string tipo "OS-...")
        $os = OrdemServico::find($id);
        
        if (!$os) {
            // Tentar buscar por id_os se não encontrou por id numérico
            $os = OrdemServico::where('id_os', $id)->first();
        }
        
        if (!$os) {
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }

        $tenantId = auth()->check() ? auth()->user()->tenant_id : null;
        
        \Log::info('OS encontrada para atualização:', [
            'os_id' => $os->id,
            'status_atual' => $os->status_os,
            'vendedor_id' => $os->vendedor_id
        ]);
        
        // Guardar valor original e status para detectar acréscimos
        $valorTotalOriginal = floatval($os->valor_total_os);
        $statusOriginal = $os->status_os;
        
        // Validação básica
        $rules = [
            'cliente_id' => 'nullable',
            'funcionario_id' => 'nullable|exists:users,id',
            'status_os' => 'required|string',
            'valor_total_os' => 'required|numeric',
            'itens' => 'nullable|array',
            'pagamentos' => 'nullable|array',
            'dados_producao' => 'nullable|array',
            'data_prevista_entrega' => 'nullable|date',
            'maquina_impressao_id' => 'nullable|integer',
            'observacoes_gerais_os' => 'nullable|string',
        ];
        
        $messages = [
            'data_prevista_entrega.required' => 'A Previsão de Entrega é obrigatória.',
            'data_prevista_entrega.date' => 'A Previsão de Entrega deve ser uma data válida.',
            'maquina_impressao_id.required' => 'A Máquina de Impressão é obrigatória.',
            'maquina_impressao_id.integer' => 'A Máquina de Impressão deve ser um valor válido.',
            'observacoes_gerais_os.required' => 'As Observações Gerais da OS são obrigatórias.',
        ];
        
        // Se não for um orçamento, tornar campos obrigatórios
        if ($request->status_os && !in_array($request->status_os, ['Orçamento Salvo', 'Orçamento Salvo (Editado)'])) {
            $rules['data_prevista_entrega'] = 'required|date';
            $rules['maquina_impressao_id'] = 'required|integer';
            $rules['observacoes_gerais_os'] = 'required|string';
        }
        
        $validator = Validator::make($request->all(), $rules, $messages);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }
        
        return DB::transaction(function () use ($request, $os, $tenantId, $statusOriginal, $valorTotalOriginal) {
            // Re-buscar com lock para evitar race condition
            $os = OrdemServico::where('id', $os->id)->lockForUpdate()->first();

            // Se cliente_id começa com "funcionario_", é um funcionário
            if ($request->cliente_id && str_starts_with($request->cliente_id, 'funcionario_')) {
                $os->cliente_id = null; // Funcionários não têm cliente_id
                $os->funcionario_id = $request->funcionario_id ?? $os->funcionario_id;
            } else {
                $os->cliente_id = $request->cliente_id ?? $os->cliente_id;
                $os->funcionario_id = $request->funcionario_id ?? $os->funcionario_id;
            }
            $os->cliente_info = $request->cliente_info ?? $os->cliente_info;

            if ($request->filled('numero_os')) {
                $os->numero_os = $this->resolverNumeroSequencial(
                    $tenantId,
                    is_numeric($request->numero_os) ? (int)$request->numero_os : null,
                    $os->id
                );
            }

        $os->status_os = $request->status_os ?? $os->status_os;
        $os->valor_total_os = $request->valor_total_os ?? $os->valor_total_os;
        $os->desconto_terceirizado_percentual = $request->desconto_terceirizado_percentual ?? $os->desconto_terceirizado_percentual ?? 0;
        $os->desconto_geral_tipo = $request->desconto_geral_tipo ?? $os->desconto_geral_tipo ?? 'percentual';
        $os->desconto_geral_valor = $request->desconto_geral_valor ?? $os->desconto_geral_valor ?? 0;
        $os->frete_valor = $request->frete_valor ?? $os->frete_valor ?? 0;
        $os->data_finalizacao_os = $request->data_finalizacao_os ?? $os->data_finalizacao_os;
        $os->data_validade = $request->data_validade ?? $os->data_validade;
        $os->data_prevista_entrega = $request->data_prevista_entrega ?? $os->data_prevista_entrega;
        $os->maquina_impressao_id = $request->maquina_impressao_id ?? $os->maquina_impressao_id;
        $os->observacoes = $request->observacoes ?? $os->observacoes;
        $os->observacoes_gerais_os = $request->observacoes_gerais_os ?? $os->observacoes_gerais_os;
        
        // Se um orçamento está sendo finalizado, atualizar data_criacao para agora
        $isOrcamentoOriginal = in_array($statusOriginal, ['Orçamento Salvo', 'Orçamento Salvo (Editado)']);
        $isFinalizando = in_array($os->status_os, ['Finalizada', 'Entregue']);
        
        if ($isOrcamentoOriginal && $isFinalizando) {
            \Log::info('📅 [OrdemServicoController::update] Atualizando data_criacao ao finalizar orçamento', [
                'os_id' => $os->id,
                'status_original' => $statusOriginal,
                'status_novo' => $os->status_os,
                'data_criacao_antiga' => $os->data_criacao,
                'data_criacao_nova' => now()
            ]);
            $os->data_criacao = now();
        }
        // Usar o usuário logado como vendedor por padrão
        $user = auth()->user();
        $os->vendedor_id = $request->vendedor_id ?? $os->vendedor_id ?? $user->id;
        $os->vendedor_nome = $request->vendedor_nome ?? $os->vendedor_nome ?? $user->name;
        $os->pagamentos = $request->pagamentos ?? $os->pagamentos;
        
        // Atualizar dados de produção com lógica automática
        $dadosProducao = $request->dados_producao ?? $os->dados_producao ?? [];
        
        // Para orçamentos, não marcar produção automaticamente
        if (in_array($os->status_os, ['Orçamento Salvo', 'Orçamento Salvo (Editado)'])) {
            $os->dados_producao = array_merge([
                'status_producao' => null,
                'prazo_estimado' => null,
                'observacoes_internas' => '',
                'fotos_producao' => []
            ], $dadosProducao);
        } else {
            // Para todas as outras OS, garantir que tenham status "Em Produção" se não definido
            // Transferir automaticamente a data_prevista_entrega para prazo_estimado se não estiver definido
            $prazoEstimado = null;
            if ($os->data_prevista_entrega && !isset($dadosProducao['prazo_estimado'])) {
                $prazoEstimado = $os->data_prevista_entrega;
            } elseif (isset($dadosProducao['prazo_estimado'])) {
                $prazoEstimado = $dadosProducao['prazo_estimado'];
            }
            
            $os->dados_producao = array_merge([
                'status_producao' => 'Em Produção',
                'prazo_estimado' => $prazoEstimado,
                'observacoes_internas' => '',
                'fotos_producao' => []
            ], $dadosProducao);
        }
        
        // Se a OS está sendo finalizada/entregue neste update, sobrepor o vendedor para o usuário autenticado
        if ($request->status_os && in_array($request->status_os, ['Finalizada', 'Entregue'])) {
            $os->vendedor_id = $user->id;
            $os->vendedor_nome = $user->name;
            // Garantir que dados_producao exista e marque como Em Produção quando ainda não definido
            $dadosProducao = $os->dados_producao ?: [];
            if (!is_array($dadosProducao)) {
                $dadosProducao = [];
            }
            if (!isset($dadosProducao['status_producao']) || $dadosProducao['status_producao'] === null) {
                $dadosProducao['status_producao'] = 'Em Produção';
            }
            if (!isset($dadosProducao['prazo_estimado'])) {
                // Transferir automaticamente a data_prevista_entrega para prazo_estimado se disponível
                $dadosProducao['prazo_estimado'] = $os->data_prevista_entrega ?? null;
            }
            if (!isset($dadosProducao['observacoes_internas'])) {
                $dadosProducao['observacoes_internas'] = '';
            }
            if (!isset($dadosProducao['fotos_producao'])) {
                $dadosProducao['fotos_producao'] = [];
            }
            $os->dados_producao = $dadosProducao;
        }

        // Verificar se houve acréscimo de valor em OS já finalizada
        $valorAcrescimo = 0;
        $osJaFinalizada = false;
        
        if ($valorTotalOriginal > 0 && 
            ($statusOriginal === 'Finalizada' || $statusOriginal === 'Entregue') &&
            ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue')) {
            
            $osJaFinalizada = true;
            $valorNovo = floatval($os->valor_total_os);
            $valorAcrescimo = $valorNovo - $valorTotalOriginal;
            
            \Log::info('=== DETECTANDO ACRÉSCIMO EM OS FINALIZADA ===', [
                'os_id' => $os->id,
                'valor_original' => $valorTotalOriginal,
                'valor_novo' => $valorNovo,
                'valor_acrescimo' => $valorAcrescimo,
                'os_ja_finalizada' => $osJaFinalizada
            ]);
        }

        $os->save();
        
        \Log::info('=== PROCESSANDO COMISSÃO NA API ===', [
            'os_id' => $os->id,
            'id_os' => $os->id_os,
            'status_os' => $os->status_os,
            'vendedor_id' => $os->vendedor_id,
            'valor_total_os' => $os->valor_total_os
        ]);
        
        // Processar comissão se a OS foi finalizada
        if ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue') {
            \Log::info('Status da OS permite comissão, chamando serviço...');
            $resultado = $this->comissaoService->calcularComissaoOS($os);
            \Log::info('Resultado do processamento de comissão:', [
                'comissao_criada' => $resultado ? 'Sim' : 'Não',
                'comissao_id' => $resultado ? $resultado->id : null
            ]);
        } else {
            \Log::info('Status da OS não permite comissão:', [
                'status_os' => $os->status_os
            ]);
        }
        
        // Criar conta a receber se há pagamentos com Crediário
        if ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue') {
            // Se houve acréscimo em OS já finalizada, atualizar contas existentes ou criar conta para o valor pendente
            if ($osJaFinalizada && $valorAcrescimo > 0) {
                $contasExistentes = ContaReceber::where('os_id', $os->id)->count();
                
                if ($contasExistentes > 0) {
                    \Log::info('💰 [OrdemServicoController::update] Valor da OS aumentou, atualizando contas a receber existentes', [
                        'os_id' => $os->id,
                        'valor_original' => $valorTotalOriginal,
                        'valor_novo' => floatval($os->valor_total_os),
                        'acrescimo' => $valorAcrescimo,
                        'contas_existentes' => $contasExistentes
                    ]);
                    
                    $this->atualizarContasReceberOS($os, $valorTotalOriginal, floatval($os->valor_total_os));
                } else {
                    $this->criarContaReceberAcrescimo($os, $valorAcrescimo);
                }
            } elseif ($osJaFinalizada && $valorAcrescimo < 0) {
                // Se o valor diminuiu, atualizar as contas a receber existentes
                \Log::info('💰 [OrdemServicoController::update] Valor da OS diminuiu, atualizando contas a receber', [
                    'os_id' => $os->id,
                    'valor_original' => $valorTotalOriginal,
                    'valor_novo' => floatval($os->valor_total_os),
                    'diminuicao' => abs($valorAcrescimo)
                ]);
                
                // Atualizar a data_finalizacao_os para refletir a data da edição
                $os->update(['data_finalizacao_os' => now()]);
                
                \Log::info('📅 [OrdemServicoController::update] Data de finalização da OS atualizada', [
                    'os_id' => $os->id,
                    'nova_data_finalizacao' => now()
                ]);
                
                $this->atualizarContasReceberOS($os, $valorTotalOriginal, floatval($os->valor_total_os));
            } else {
                // Caso normal: criar conta a receber apenas para crediário
                $this->criarContaReceberOS($os);
            }
            
            // Criar lançamentos de caixa para os pagamentos (exceto Crediário)
            // Apenas se a OS está sendo finalizada pela primeira vez ou tem novos pagamentos
            if (!$osJaFinalizada) {
                $this->criarLancamentosCaixaOS($os);
            }
        }
        
        // Não marcar comissão automaticamente como paga; o pagamento é manual pela tela de comissões
        
        // Atualizar itens da OS
        \Log::info('📦 [OrdemServicoController::update] Verificando itens:', [
            'has_itens' => $request->has('itens'),
            'is_array' => is_array($request->itens),
            'itens_count' => is_array($request->itens) ? count($request->itens) : 0,
            'itens' => $request->itens
        ]);
        
        if ($request->has('itens') && is_array($request->itens)) {
            // Remover todos os itens atuais para evitar duplicações nas recriações
            $itensExistentes = OrdemServicoItem::where('ordem_servico_id', $os->id)->get();
            if ($itensExistentes->count() > 0) {
                \Log::info('📉 [OrdemServicoController::update] Limpando itens existentes para recriação segura', [
                    'quantidade' => $itensExistentes->count()
                ]);
                foreach ($itensExistentes as $itemExistente) {
                    \Log::info('🗑️ [OrdemServicoController::update] Removendo item existente:', [
                        'item_id' => $itemExistente->id,
                        'id_item_os' => $itemExistente->id_item_os,
                        'nome' => $itemExistente->nome_servico_produto
                    ]);
                    $itemExistente->delete();
                }
            }

            // Atualizar ou adicionar itens (sempre recriando a lista enviada)
            $observacoesItens = [];
            foreach ($request->itens as $item) {
                $osItem = new OrdemServicoItem();
                $osItem->ordem_servico_id = $os->id;
                $osItem->tenant_id = $os->tenant_id;
                
                // Se o item tem id_item_os, salvar ele
                if (isset($item['id_item_os'])) {
                    $osItem->id_item_os = $item['id_item_os'];
                }
                
                \Log::info('➕ [OrdemServicoController::update] Criando/atualizando item:', [
                    'id_item_os' => $item['id_item_os'] ?? 'novo',
                    'nome' => $item['nome_servico_produto'] ?? $item['nome_produto'] ?? 'Produto/Serviço'
                ]);
                
                // Atualizar dados do item
                $osItem->produto_id = $item['produto_id'] ?? null;
                $osItem->nome_servico_produto = $item['nome_servico_produto'] ?? $item['nome_produto'] ?? 'Produto/Serviço';
                $osItem->tipo_item = $item['tipo_item'] ?? 'unidade';
                
                // Converter vírgula para ponto em todos os valores numéricos
                $osItem->quantidade = isset($item['quantidade']) ? (float)str_replace(',', '.', $item['quantidade']) : 1;
                
                // Para itens m2, usar valor_unitario_m2 se valor_unitario não estiver presente ou for zero
                $valorUnitario = isset($item['valor_unitario']) ? (float)str_replace(',', '.', $item['valor_unitario']) : 0;
                if ($valorUnitario > 0) {
                    $osItem->valor_unitario = $valorUnitario;
                } elseif (isset($item['valor_unitario_m2'])) {
                    $osItem->valor_unitario = (float)str_replace(',', '.', $item['valor_unitario_m2']);
                } else {
                    $osItem->valor_unitario = 0;
                }
                
                // Para itens m2, usar subtotal_item se valor_total não estiver presente ou for zero
                $valorTotal = isset($item['valor_total']) ? (float)str_replace(',', '.', $item['valor_total']) : 0;
                if ($valorTotal > 0) {
                    $osItem->valor_total = $valorTotal;
                } elseif (isset($item['subtotal_item'])) {
                    $osItem->valor_total = (float)str_replace(',', '.', $item['subtotal_item']);
                } else {
                    $osItem->valor_total = 0;
                }
                
                $osItem->largura = isset($item['largura']) ? (float)str_replace(',', '.', $item['largura']) : null;
                $osItem->altura = isset($item['altura']) ? (float)str_replace(',', '.', $item['altura']) : null;
                $osItem->acabamentos = $item['acabamentos'] ?? [];
                $osItem->detalhes = $item['detalhes'] ?? [];
                $osItem->consumo_material_utilizado = $item['consumo_material_utilizado'] ?? null;
                $osItem->consumo_largura_peca = isset($item['consumo_largura_peca']) ? (float)str_replace(',', '.', $item['consumo_largura_peca']) : null;
                $osItem->consumo_altura_peca = isset($item['consumo_altura_peca']) ? (float)str_replace(',', '.', $item['consumo_altura_peca']) : null;
                $osItem->consumo_quantidade_solicitada = isset($item['consumo_quantidade_solicitada']) ? (int)$item['consumo_quantidade_solicitada'] : null;
                $osItem->consumo_largura_chapa = isset($item['consumo_largura_chapa']) ? (float)str_replace(',', '.', $item['consumo_largura_chapa']) : null;
                $osItem->consumo_altura_chapa = isset($item['consumo_altura_chapa']) ? (float)str_replace(',', '.', $item['consumo_altura_chapa']) : null;
                $osItem->consumo_valor_unitario_chapa = isset($item['consumo_valor_unitario_chapa']) ? (float)str_replace(',', '.', $item['consumo_valor_unitario_chapa']) : null;
                $osItem->consumo_pecas_por_chapa = isset($item['consumo_pecas_por_chapa']) ? (int)$item['consumo_pecas_por_chapa'] : null;
                $osItem->consumo_chapas_necessarias = isset($item['consumo_chapas_necessarias']) ? (int)$item['consumo_chapas_necessarias'] : null;
                $osItem->consumo_custo_total = isset($item['consumo_custo_total']) ? (float)str_replace(',', '.', $item['consumo_custo_total']) : null;
                $osItem->consumo_custo_unitario = isset($item['consumo_custo_unitario']) ? (float)str_replace(',', '.', $item['consumo_custo_unitario']) : null;
                $osItem->consumo_aproveitamento_percentual = isset($item['consumo_aproveitamento_percentual']) ? (float)str_replace(',', '.', $item['consumo_aproveitamento_percentual']) : null;
                
                $osItem->save();
                
                // Extrair observação do item para agregar na OS
                $observacaoItem = '';
                if (isset($item['detalhes'])) {
                    if (is_array($item['detalhes']) && isset($item['detalhes']['observacao_item'])) {
                        $observacaoItem = $item['detalhes']['observacao_item'];
                    } elseif (is_string($item['detalhes']) && !empty(trim($item['detalhes']))) {
                        $observacaoItem = $item['detalhes'];
                    }
                }
                
                if (!empty($observacaoItem)) {
                    $observacoesItens[] = $observacaoItem;
                }
            }
            
            // Agregar observações dos itens na coluna observacoes da OS
            if (!empty($observacoesItens)) {
                $os->observacoes = implode(' | ', $observacoesItens);
                $os->save();
            }

            // Sincronizar com a tabela itens_venda se a OS estiver finalizada
            if ($os->status_os === 'Finalizada' || $os->status_os === 'Entregue' || $os->status_os === 'Concluida') {
                try {
                    // Remover itens antigos desta OS na tabela itens_venda
                    ItemVenda::where('venda_referencia_id', $os->id)
                        ->where('tipo_venda', 'os')
                        ->delete();
                    
                    // Recriar itens na tabela itens_venda
                    $itensAtualizados = OrdemServicoItem::where('ordem_servico_id', $os->id)->get();
                    
                    foreach ($itensAtualizados as $osItem) {
                        ItemVenda::create([
                            'tenant_id' => $os->tenant_id,
                            'venda_id' => null, // OS não está na tabela vendas
                            'tipo_venda' => 'os',
                            'venda_referencia_id' => $os->id,
                            'produto_id' => $osItem->produto_id,
                            'produto_nome' => $osItem->nome_servico_produto,
                            'produto_codigo' => null,
                            'produto_unidade' => $osItem->tipo_item ?? 'un',
                            'produto_descricao' => null,
                            'quantidade' => $osItem->quantidade,
                            'valor_unitario' => $osItem->valor_unitario,
                            'desconto_percentual' => 0,
                            'desconto_valor' => 0,
                            'acrescimo_percentual' => 0,
                            'acrescimo_valor' => 0,
                            'valor_total' => $osItem->valor_total,
                            'observacoes' => null,
                            'dados_adicionais' => null,
                            'orcamento_item_id' => null,
                        ]);
                    }
                    
                    \Log::info('Itens da OS sincronizados com itens_venda:', [
                        'os_id' => $os->id,
                        'itens_count' => $itensAtualizados->count()
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Erro ao sincronizar itens da OS com itens_venda:', [
                        'os_id' => $os->id,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }
        
        // Carregar itens para retornar na resposta com relacionamento produto
        $itens = OrdemServicoItem::withoutTenant()
            ->select('*')
            ->where('ordem_servico_id', $os->id)
            ->with(['produto' => function($query) {
                $query->withoutGlobalScope(\App\Models\Scopes\TenantScope::class);
            }])
            ->get();
        $os->setRelation('itens', $itens);
        $os->load(['cliente', 'anexos']);
        
        \Log::info('📦 [OrdemServicoController::update] Retornando OS com itens:', [
            'os_id' => $os->id,
            'itens_count' => $itens->count()
        ]);
        
        return response()->json([
            'message' => 'Ordem de serviço atualizada com sucesso',
            'data' => $os
        ]);
    }); // Fim da transação DB
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        \Log::info('[OS] Iniciando exclusão', [
            'id_os' => $id,
            'user_id' => auth()->id(),
            'tenant_id' => auth()->user()->tenant_id
        ]);
        
        $os = OrdemServico::where('id_os', $id)
            ->where('tenant_id', auth()->user()->tenant_id)
            ->first();
        
        if (!$os) {
            \Log::warning('[OS] OS não encontrada', [
                'id_os' => $id,
                'tenant_id' => auth()->user()->tenant_id
            ]);
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }
        
        \Log::info('[OS] OS encontrada', [
            'id_os' => $id,
            'os_id' => $os->id,
            'status_os' => $os->status_os
        ]);
        
        try {
            return DB::transaction(function () use ($os) {
                \Log::info('[OS] Iniciando transação de exclusão', [
                    'os_id' => $os->id,
                    'status_os' => $os->status_os
                ]);
                
                // Se a OS estava finalizada ou entregue, devolver o estoque
                if (in_array($os->status_os, ['Finalizada', 'Entregue'])) {
                    \Log::info('[OS] Devolvendo estoque', [
                        'os_id' => $os->id,
                        'status_os' => $os->status_os
                    ]);
                    $this->devolverEstoqueOS($os);
                }
                
                \Log::info('[OS] Removendo anexos', [
                    'os_id' => $os->id,
                    'anexos_count' => $os->anexos->count()
                ]);
                
                // Remover anexos do storage
                foreach ($os->anexos as $anexo) {
                    try {
                        Storage::disk('public')->delete($anexo->caminho);
                    } catch (\Exception $e) {
                        \Log::warning('[OS] Erro ao remover anexo', [
                            'anexo_id' => $anexo->id,
                            'caminho' => $anexo->caminho,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
                
                \Log::info('[OS] Fazendo soft delete dos itens e anexos relacionados', [
                    'os_id' => $os->id
                ]);
                
                // Fazer soft delete dos itens e anexos relacionados (não remover permanentemente)
                // Os itens e anexos serão removidos em cascata pelo soft delete da OS
                // ou manualmente se necessário
                
                \Log::info('[OS] Fazendo soft delete da OS', [
                    'os_id' => $os->id
                ]);
                
                // Fazer soft delete da OS (marca deleted_at)
                $os->delete();
                
                \Log::info('[OS] Soft delete dos itens e anexos', [
                    'os_id' => $os->id
                ]);
                
                // Fazer soft delete manual dos itens e anexos se eles tiverem SoftDeletes
                OrdemServicoItem::where('ordem_servico_id', $os->id)->delete();
                OrdemServicoAnexo::where('ordem_servico_id', $os->id)->delete();
                
                \Log::info('[OS] OS excluída com sucesso', [
                    'os_id' => $os->id
                ]);
                
                return response()->json([
                    'message' => 'Ordem de serviço excluída com sucesso'
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Erro ao excluir ordem de serviço:', [
                'id_os' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id()
            ]);
            
            return response()->json([
                'message' => 'Erro ao excluir ordem de serviço: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Devolve o estoque de uma ordem de serviço
     */
    private function devolverEstoqueOS(OrdemServico $os)
    {
        \Log::info('[Estoque][OS] Iniciando devolução de estoque', [
            'os_id' => $os->id_os,
            'itens_count' => $os->itens->count()
        ]);
        
        foreach ($os->itens as $item) {
            \Log::info('[Estoque][OS] Processando item', [
                'item_id' => $item->id,
                'produto_id' => $item->produto_id,
                'quantidade' => $item->quantidade
            ]);
            
            if ($item->produto_id) {
                $produto = \App\Models\Produto::find($item->produto_id);
                if ($produto) {
                    $quantidade = (float) $item->quantidade;
                    
                    \Log::info('[Estoque][OS] Produto encontrado, devolvendo estoque', [
                        'os_id' => $os->id_os,
                        'produto_id' => $produto->id,
                        'quantidade' => $quantidade,
                        'estoque_atual' => $produto->estoque
                    ]);
                    
                    // Devolver estoque do produto principal
                    $produto->increment('estoque', $quantidade);
                    
                    \Log::info('[Estoque][OS] Estoque devolvido com sucesso', [
                        'os_id' => $os->id_os,
                        'produto_id' => $produto->id,
                        'quantidade' => $quantidade,
                        'novo_estoque' => $produto->fresh()->estoque
                    ]);
                    
                    // Se for produto composto, devolver estoque dos componentes
                    if ($produto->is_composto && is_array($produto->composicao)) {
                        \Log::info('[Estoque][OS] Produto composto, devolvendo componentes', [
                            'os_id' => $os->id_os,
                            'produto_id' => $produto->id,
                            'composicao' => $produto->composicao
                        ]);
                        
                        foreach ($produto->composicao as $comp) {
                            $compId = $comp['produtoId'] ?? $comp['produto_id'] ?? $comp['id'] ?? null;
                            $compQtd = (float) ($comp['quantidade'] ?? 0);
                            
                            if ($compId && $compQtd > 0) {
                                $compProduto = \App\Models\Produto::find($compId);
                                if ($compProduto) {
                                    $delta = $compQtd * $quantidade;
                                    $compProduto->increment('estoque', $delta);
                                    
                                    \Log::info('[Estoque][OS] Devolvendo estoque componente', [
                                        'os_id' => $os->id_os,
                                        'produto_principal_id' => $produto->id,
                                        'componente_id' => $compProduto->id,
                                        'quantidade' => $delta
                                    ]);
                                } else {
                                    \Log::warning('[Estoque][OS] Componente não encontrado', [
                                        'os_id' => $os->id_os,
                                        'produto_principal_id' => $produto->id,
                                        'componente_id' => $compId
                                    ]);
                                }
                            }
                        }
                    }
                } else {
                    \Log::warning('[Estoque][OS] Produto não encontrado', [
                        'os_id' => $os->id_os,
                        'produto_id' => $item->produto_id
                    ]);
                }
            } else {
                \Log::info('[Estoque][OS] Item sem produto_id, pulando', [
                    'os_id' => $os->id_os,
                    'item_id' => $item->id
                ]);
            }
        }
        
        \Log::info('[Estoque][OS] Devolução de estoque concluída', [
            'os_id' => $os->id_os
        ]);
    }
    
    /**
     * Listar ordens de serviço em produção
     */
    public function emProducao(Request $request)
    {
        // Log para debug - verificar o tenant_id do usuário autenticado
        $user = auth()->user();

        $query = OrdemServico::with(['cliente', 'itens', 'anexos']);

        // Excluir OS deletadas (soft delete)
        $query->whereNull('deleted_at');

        // CRÍTICO: Excluir orçamentos - apenas OS finalizadas devem aparecer em produção
        $query->whereNotIn('status_os', ['Orçamento Salvo', 'Orçamento Salvo (Editado)']);

        // Filtrar ordens em produção
        $query->where(function ($q) {
            // Excluir OS entregues desta listagem (tanto por status_os quanto por status_producao)
            $q->whereNotIn('status_os', ['Entregue'])
              // Excluir OS com status de produção "Entregue"
              ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) != 'Entregue'")
              // Excluir OS com status de produção "Pronto para Entrega" ou "Aguardando Entrega"
              ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) != 'Pronto para Entrega'")
              ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) != 'Aguardando Entrega'")
              // Incluir apenas OS com status de produção "Em Produção" ou NULL (que serão tratadas como "Em Produção")
              ->where(function ($statusQ) {
                  $statusQ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) IS NULL")
                          ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) = 'Em Produção'")
                          ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(dados_producao, '$.status_producao')) = 'em produção'")
                          ->orWhere('status_os', 'Finalizada');
              });
        });

        // Aplicar filtro de busca se fornecido
        $search = $request->input('search');
        if ($search) {
            $searchTerm = trim($search, '%');
            $searchLike = '%' . $searchTerm . '%';
            $query->where(function ($q) use ($searchLike, $searchTerm) {
                // Buscar por ID da OS (id_os)
                $q->where('id_os', 'like', $searchLike)
                  // Buscar por ID da ordem (id da tabela ordens_servico) - busca exata
                  ->orWhere('id', $searchTerm)
                  // Buscar por ID do cliente (cliente_id) - busca exata
                  ->orWhere('cliente_id', $searchTerm)
                  // Buscar por observações
                  ->orWhere('observacoes', 'like', $searchLike)
                  // Buscar por nome do cliente
                  ->orWhereHas('cliente', function ($query) use ($searchLike) {
                      $query->where('nome_completo', 'like', $searchLike)
                            ->orWhere('apelido_fantasia', 'like', $searchLike);
                  })
                  // Buscar por itens
                  ->orWhereHas('itens', function($query) use ($searchLike) {
                      $query->where('nome_servico_produto', 'like', $searchLike)
                            ->orWhere('detalhes', 'like', $searchLike)
                            ->orWhere('acabamentos', 'like', $searchLike);
                  });
            });
        }

        // Executar a consulta com paginação
        $perPage = $request->input('per_page', 20);
        $result = $query->latest()->paginate($perPage);
        
        // Log para debug - verificar dados do cliente
        if (!$result->isEmpty()) {
            \Log::debug('Dados do cliente nas OS em produção:', [
                'total_os' => $result->count(),
                'primeira_os' => [
                    'id_os' => $result->first()->id_os,
                    'cliente_id' => $result->first()->cliente_id,
                    'cliente_info' => $result->first()->cliente_info,
                    'cliente_relacionamento' => $result->first()->cliente ? [
                        'id' => $result->first()->cliente->id,
                        'nome_completo' => $result->first()->cliente->nome_completo,
                        'nome' => $result->first()->cliente->nome,
                        'apelido_fantasia' => $result->first()->cliente->apelido_fantasia,
                    ] : 'null'
                ]
            ]);
        }
        
        // Se não houver resultados, retornar uma resposta vazia paginada
        if ($result->isEmpty()) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'from' => null,
                    'last_page' => 1,
                    'path' => $request->url(),
                    'per_page' => $perPage,
                    'to' => null,
                    'total' => 0,
                ]
            ]);
        }

        // Aplicar lógica de transferência automática da data_prevista_entrega para prazo_estimado
        $result->getCollection()->transform(function ($os) {
            $dadosProducao = $os->dados_producao;
            
            // Se não há dados_producao, criar estrutura básica
            if (!$dadosProducao || !is_array($dadosProducao)) {
                $dadosProducao = [
                    'status_producao' => 'Em Produção',
                    'prazo_estimado' => null,
                    'observacoes_internas' => '',
                    'fotos_producao' => []
                ];
            }
            
            // Se não há prazo_estimado definido mas há data_prevista_entrega, transferir automaticamente
            if (empty($dadosProducao['prazo_estimado']) && !empty($os->data_prevista_entrega)) {
                // Converter data_prevista_entrega para string no formato YYYY-MM-DD HH:MM:SS
                $dataPrevistaFormatada = $os->data_prevista_entrega->format('Y-m-d H:i:s');
                $dadosProducao['prazo_estimado'] = $dataPrevistaFormatada;
                
                // Atualizar usando update para evitar problemas com o mutator
                $os->update(['dados_producao' => $dadosProducao]);
                
                \Log::info('Transferência automática de data_prevista_entrega para prazo_estimado', [
                    'os_id' => $os->id_os,
                    'data_prevista_entrega' => $os->data_prevista_entrega,
                    'data_prevista_formatada' => $dataPrevistaFormatada,
                    'prazo_estimado' => $dadosProducao['prazo_estimado']
                ]);
            }
            
            // Atualizar o objeto com os dados corrigidos
            $os->setRelation('dados_producao', $dadosProducao);
            
            return $os;
        });

        return response()->json($result);
    }
    
    /**
     * Atualizar o status de produção de uma ordem de serviço
     */
    public function updateStatusProducao(Request $request, string $id)
    {
        // Buscar por id numérico ou por id_os (string tipo "OS-...")
        $os = OrdemServico::find($id);
        
        if (!$os) {
            // Tentar buscar por id_os se não encontrou por id numérico
            $os = OrdemServico::where('id_os', $id)->first();
        }
        
        if (!$os) {
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'status_producao' => 'nullable|string',
            'entregue_por' => 'nullable|string',
            'recebido_por' => 'nullable|string',
            'data_entrega' => 'nullable|date',
            'prazo_estimado' => 'nullable|string',
            'observacoes_internas' => 'nullable|string',
            'fotos_producao' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Obter dados de produção atuais ou criar estrutura inicial
        $dadosProducao = $os->dados_producao ?: [
            'status_producao' => null,
            'prazo_estimado' => null,
            'observacoes_internas' => '',
            'fotos_producao' => []
        ];
        
        // Atualizar campos específicos
        if ($request->has('status_producao')) {
            $dadosProducao['status_producao'] = $request->status_producao;
        }
        
        if ($request->has('prazo_estimado')) {
            $dadosProducao['prazo_estimado'] = $request->prazo_estimado;
        }
        
        if ($request->has('observacoes_internas')) {
            $dadosProducao['observacoes_internas'] = $request->observacoes_internas;
        }

        // Atualizar fotos de produção se fornecidas
        if ($request->has('fotos_producao')) {
            $dadosProducao['fotos_producao'] = $request->fotos_producao;
        }

        // Adicionar dados de entrega se o status for 'Entregue'
        if ($request->status_producao === 'Entregue') {
            $dadosProducao['entregue_por'] = $request->entregue_por;
            $dadosProducao['recebido_por'] = $request->recebido_por;
            $dadosProducao['data_entrega'] = $request->data_entrega;
        }
        
        // Atualizar usando update para evitar problemas com o mutator
        $os->update(['dados_producao' => $dadosProducao]);
        
        return response()->json([
            'message' => 'Status de produção atualizado com sucesso',
            'data' => $os->fresh()
        ]);
    }
    
    /**
     * Upload de anexos para uma ordem de serviço
     */
    public function uploadAnexos(Request $request, string $id)
    {
        $os = OrdemServico::where('id_os', $id)->first();
        
        if (!$os) {
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }
        
        $validator = Validator::make($request->all(), [
            'anexos' => 'required|array',
            'anexos.*' => 'required|file|max:10240', // Max 10MB por arquivo
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors()
            ], 422);
        }
        
        $anexosSalvos = [];
        
        foreach ($request->file('anexos') as $file) {
            $path = $file->store('ordens-servico/' . $os->tenant_id . '/' . $os->id_os, 'public');
            
            $anexo = new OrdemServicoAnexo();
            $anexo->ordem_servico_id = $os->id;
            $anexo->nome_arquivo = $file->getClientOriginalName();
            $anexo->caminho = $path;
            $anexo->tipo_arquivo = $file->getClientMimeType();
            $anexo->tamanho_kb = $file->getSize() / 1024;
            $anexo->save();
            
            $anexosSalvos[] = $anexo;
            
            // Recarregar o modelo para garantir dados atualizados
            $os = $os->fresh();
            
            // Preparar o novo anexo
            $novoAnexo = [
                'id' => $anexo->id,
                'nome' => $anexo->nome_arquivo,
                'url' => asset('storage/' . $path)
            ];
            
            // Obter dados de produção atuais ou inicializar
            $dadosProducao = $os->dados_producao ?: [];
            
            // Inicializar array de fotos se não existir
            if (!isset($dadosProducao['fotos_producao'])) {
                $dadosProducao['fotos_producao'] = [];
            }
            
            // Adicionar novo anexo
            $dadosProducao['fotos_producao'][] = $novoAnexo;
            
            // Atualizar usando update para evitar problemas com o mutator
            $os->update(['dados_producao' => $dadosProducao]);
        }
        
        return response()->json([
            'message' => 'Anexos enviados com sucesso',
            'data' => $anexosSalvos
        ]);
    }
    
    /**
     * Listar anexos de uma ordem de serviço
     */
    public function getAnexos(string $id)
    {
        $os = OrdemServico::where('id_os', $id)->first();
        
        if (!$os) {
            return response()->json([
                'message' => 'Ordem de serviço não encontrada'
            ], 404);
        }
        
        $anexos = OrdemServicoAnexo::where('ordem_servico_id', $os->id)
            ->get()
            ->map(function ($anexo) {
                $anexo->url = asset('storage/' . $anexo->caminho);
                return $anexo;
            });
        
        return response()->json($anexos);
    }

    /**
     * Listar ordens de serviço prontas para entrega
     */
    public function aSeremEntregues(Request $request)
    {
        \Log::info('Iniciando aSeremEntregues', [
            'request' => $request->all(),
            'user' => auth()->user(),
            'headers' => $request->headers->all()
        ]);

        $query = OrdemServico::with(['cliente', 'itens.produto', 'anexos']);

        // Excluir OS deletadas (soft delete)
        $query->whereNull('deleted_at');

        // CRÍTICO: Excluir orçamentos - apenas OS finalizadas devem aparecer para entrega
        $query->whereNotIn('status_os', ['Orçamento Salvo', 'Orçamento Salvo (Editado)']);

        // Filtrar por status de produção "Pronto para Entrega" ou "Aguardando Entrega"
        $query->where(function($q) {
            $q->whereJsonContains('dados_producao->status_producao', 'Pronto para Entrega')
              ->orWhereJsonContains('dados_producao->status_producao', 'Aguardando Entrega');
        });

        // Aplicar filtro de busca se fornecido
        $search = $request->input('search');
        if ($search) {
            $searchTerm = trim($search, '%');
            $searchLike = '%' . $searchTerm . '%';
            $query->where(function ($q) use ($searchLike) {
                $q->where('id_os', 'like', $searchLike)
                  ->orWhere('observacoes', 'like', $searchLike)

                  ->orWhereHas('cliente', function ($query) use ($searchLike) {
                      $query->where('nome_completo', 'like', $searchLike)
                            ->orWhere('apelido_fantasia', 'like', $searchLike);
                  })
                  ->orWhereHas('itens', function($query) use ($searchLike) {
                      $query->where('nome_servico_produto', 'like', $searchLike)
                            ->orWhere('detalhes', 'like', $searchLike)
                            ->orWhere('acabamentos', 'like', $searchLike);
                  });
            });
        }

        // Log da query para debug
        \Log::debug('Query aSeremEntregues:', [
            'sql' => $query->toSql(),
            'bindings' => $query->getBindings()
        ]);

        // Executar a consulta com paginação
        // Ordenar pela data de finalização da OS (data_finalizacao_os) - mais antiga primeiro
        // Se não tiver data_finalizacao_os, usa data_criacao como fallback
        $perPage = $request->input('per_page', 20);
        $result = $query->orderByRaw('COALESCE(data_finalizacao_os, data_criacao) ASC')->paginate($perPage);
        
        // Log do resultado
        \Log::info('Resultado aSeremEntregues', [
            'total' => $result->total(),
            'por_pagina' => $result->perPage(),
            'pagina_atual' => $result->currentPage()
        ]);
        
        // Log para debug - verificar dados do cliente
        if (!$result->isEmpty()) {
            \Log::debug('Dados do cliente nas OS a serem entregues:', [
                'total_os' => $result->count(),
                'primeira_os' => [
                    'id_os' => $result->first()->id_os,
                    'cliente_id' => $result->first()->cliente_id,
                    'cliente_info' => $result->first()->cliente_info,
                    'cliente_relacionamento' => $result->first()->cliente ? [
                        'id' => $result->first()->cliente->id,
                        'nome_completo' => $result->first()->cliente->nome_completo,
                        'nome' => $result->first()->cliente->nome,
                        'apelido_fantasia' => $result->first()->cliente->apelido_fantasia,
                    ] : 'null'
                ]
            ]);
        }
        
        // Se não houver resultados, retornar uma resposta vazia paginada
        if ($result->isEmpty()) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'from' => null,
                    'last_page' => 1,
                    'path' => $request->url(),
                    'per_page' => $perPage,
                    'to' => null,
                    'total' => 0,
                ]
            ]);
        }

        // Aplicar lógica de transferência automática da data_prevista_entrega para prazo_estimado
        $result->getCollection()->transform(function ($os) {
            $dadosProducao = $os->dados_producao;
            
            // Se não há dados_producao, criar estrutura básica
            if (!$dadosProducao || !is_array($dadosProducao)) {
                $dadosProducao = [
                    'status_producao' => 'Pronto para Entrega',
                    'prazo_estimado' => null,
                    'observacoes_internas' => '',
                    'fotos_producao' => []
                ];
            }
            
            // Se não há prazo_estimado definido mas há data_prevista_entrega, transferir automaticamente
            if (empty($dadosProducao['prazo_estimado']) && !empty($os->data_prevista_entrega)) {
                // Converter data_prevista_entrega para string no formato YYYY-MM-DD HH:MM:SS
                $dataPrevistaFormatada = $os->data_prevista_entrega->format('Y-m-d H:i:s');
                $dadosProducao['prazo_estimado'] = $dataPrevistaFormatada;
                
                // Atualizar usando update para evitar problemas com o mutator
                $os->update(['dados_producao' => $dadosProducao]);
                
                \Log::info('Transferência automática de data_prevista_entrega para prazo_estimado (aSeremEntregues)', [
                    'os_id' => $os->id_os,
                    'data_prevista_entrega' => $os->data_prevista_entrega,
                    'data_prevista_formatada' => $dataPrevistaFormatada,
                    'prazo_estimado' => $dadosProducao['prazo_estimado']
                ]);
            }
            
            // Atualizar o objeto com os dados corrigidos
            $os->setRelation('dados_producao', $dadosProducao);
            
            return $os;
        });

        return response()->json($result);
    }

    /**
     * Listar ordens de serviço já entregues
     */
    public function entregues(Request $request)
    {
        $query = OrdemServico::with(['cliente', 'itens.produto', 'anexos']);

        // Excluir OS deletadas (soft delete)
        $query->whereNull('deleted_at');

        // CRÍTICO: Excluir orçamentos - apenas OS finalizadas devem aparecer como entregues
        $query->whereNotIn('status_os', ['Orçamento Salvo', 'Orçamento Salvo (Editado)']);

        // Filtrar por status de produção "Entregue"
        $query->whereJsonContains('dados_producao->status_producao', 'Entregue');

        // Aplicar filtro de busca se fornecido
        $search = $request->input('search');
        if ($search) {
            $searchTerm = trim($search, '%');
            $searchLike = '%' . $searchTerm . '%';
            $query->where(function ($q) use ($searchLike) {
                $q->where('id_os', 'like', $searchLike)
                  ->orWhere('observacoes', 'like', $searchLike)

                  ->orWhereHas('cliente', function ($query) use ($searchLike) {
                      $query->where('nome_completo', 'like', $searchLike)
                            ->orWhere('apelido_fantasia', 'like', $searchLike);
                  })
                  ->orWhereHas('itens', function($query) use ($searchLike) {
                      $query->where('nome_servico_produto', 'like', $searchLike)
                            ->orWhere('detalhes', 'like', $searchLike)
                            ->orWhere('acabamentos', 'like', $searchLike);
                  });
            });
        }

        // Executar a consulta com paginação
        $perPage = $request->input('per_page', 20);
        $result = $query->latest()->paginate($perPage);
        
        // Se não houver resultados, retornar uma resposta vazia paginada
        if ($result->isEmpty()) {
            return response()->json([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'from' => null,
                    'last_page' => 1,
                    'path' => $request->url(),
                    'per_page' => $perPage,
                    'to' => null,
                    'total' => 0,
                ]
            ]);
        }

        return response()->json($result);
    }
    
    /**
     * Cria uma conta a receber para OS finalizadas com pagamento crediário
     * 
     * @param OrdemServico $os
     * @return void
     */
    protected function criarContaReceberOS(OrdemServico $os)
    {
        \Log::info("Iniciando criação de conta a receber para OS", [
            'os_id' => $os->id,
            'id_os' => $os->id_os,
            'status_os' => $os->status_os,
            'valor_total_os' => $os->valor_total_os,
            'cliente_id' => $os->cliente_id
        ]);

        try {
            // Verificar se já existem contas a receber para esta OS
            $contasExistentes = ContaReceber::where('os_id', $os->id)->count();
            
            if ($contasExistentes > 0) {
                \Log::info("Contas a receber já existem para esta OS, pulando criação", [
                    'os_id' => $os->id,
                    'contas_existentes' => $contasExistentes
                ]);
                return;
            }

            // Verificar se há pagamentos com Crediário
            $pagamentos = $os->pagamentos ?? [];
            $pagamentosCrediario = collect($pagamentos)->filter(function($pagamento) {
                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
            });

            if ($pagamentosCrediario->isEmpty()) {
                \Log::info("Nenhum pagamento com Crediário encontrado para esta OS", [
                    'os_id' => $os->id,
                    'pagamentos' => $pagamentos
                ]);
                return;
            }

            // Verificar se há cliente válido
            if (!$os->cliente_id) {
                \Log::warning("OS não possui cliente válido para criar conta a receber", [
                    'os_id' => $os->id,
                    'cliente_id' => $os->cliente_id
                ]);
                return;
            }

            // Calcular valor total dos pagamentos crediário
            // Usar valorFinal quando disponível (valor com taxas aplicadas), senão usar valor
            $valorCrediario = $pagamentosCrediario->sum(function($pagamento) {
                return floatval($pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0);
            });
            
            if ($valorCrediario <= 0) {
                \Log::warning("Valor do crediário é zero ou negativo", [
                    'os_id' => $os->id,
                    'valor_crediario' => $valorCrediario,
                    'pagamentos_crediario' => $pagamentosCrediario->toArray()
                ]);
                return;
            }
            
            \Log::info("Valor do crediário calculado para conta a receber", [
                'os_id' => $os->id,
                'valor_crediario' => $valorCrediario,
                'valor_total_os' => $os->valor_total_os,
                'pagamentos_crediario' => $pagamentosCrediario->toArray()
            ]);

            // Calcular data de vencimento (30 dias a partir da finalização)
            $dataVencimento = now()->addDays(30);
            if ($os->data_finalizacao_os) {
                $dataVencimento = \Carbon\Carbon::parse($os->data_finalizacao_os)->addDays(30);
            }

            // Preparar observações combinando OS e observações gerais
            $observacoesCompletas = "OS {$os->id_os} - Crediário";
            if ($os->observacoes_gerais_os && trim($os->observacoes_gerais_os)) {
                $observacoesCompletas .= "\n\n" . $os->observacoes_gerais_os;
            }

            // Preparar dados da conta a receber
            $dadosContaReceber = [
                'cliente_id' => $os->cliente_id,
                'os_id' => $os->id,
                'descricao' => "OS #{$os->id} - Crediário",
                'valor_original' => $valorCrediario,
                'valor_pendente' => $valorCrediario,
                'data_vencimento' => $dataVencimento,
                'data_emissao' => now()->toDateString(),
                'status' => 'pendente',
                'juros_aplicados' => 0.00,
                'frequencia_juros' => 'unica',
                'total_aplicacoes_juros' => 0,
                'observacoes' => $observacoesCompletas,
                'tenant_id' => $os->tenant_id,
                'created_at' => now(),
                'updated_at' => now()
            ];

            \Log::info("Criando conta a receber com dados", $dadosContaReceber);

            $contaReceber = ContaReceber::create($dadosContaReceber);

            \Log::info("Conta a receber criada com sucesso", [
                'conta_id' => $contaReceber->id,
                'os_id' => $os->id,
                'valor' => $contaReceber->valor_total,
                'vencimento' => $contaReceber->data_vencimento
            ]);

        } catch (\Exception $e) {
            \Log::error("Erro ao criar conta a receber para OS", [
                'os_id' => $os->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Cria uma conta a receber para acréscimo em OS já finalizada
     */
    protected function criarContaReceberAcrescimo(OrdemServico $os, float $valorAcrescimo)
    {
        \Log::info("Criando conta a receber para acréscimo em OS finalizada", [
            'os_id' => $os->id,
            'id_os' => $os->id_os,
            'valor_acrescimo' => $valorAcrescimo
        ]);

        try {
            // Verificar se há cliente válido
            if (!$os->cliente_id) {
                \Log::warning("OS não possui cliente válido para criar conta a receber de acréscimo", [
                    'os_id' => $os->id,
                    'cliente_id' => $os->cliente_id
                ]);
                return;
            }

            // Calcular o valor pendente real da OS considerando pagamentos já recebidos
            $valorTotalOS = floatval($os->valor_total_os);
            $totalPago = 0;
            
            if ($os->pagamentos && is_array($os->pagamentos)) {
                foreach ($os->pagamentos as $pagamento) {
                    $valorPago = floatval($pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0);
                    $totalPago += $valorPago;
                }
            }
            
            $valorPendenteReal = $valorTotalOS - $totalPago;
            
            \Log::info("Cálculo do valor pendente real", [
                'os_id' => $os->id,
                'valor_total_os' => $valorTotalOS,
                'total_pago' => $totalPago,
                'valor_pendente_real' => $valorPendenteReal,
                'valor_acrescimo_calculado' => $valorAcrescimo
            ]);

            // Se não há valor pendente real, não criar conta
            if ($valorPendenteReal <= 0) {
                \Log::info("OS não possui valor pendente real, não criando conta a receber", [
                    'os_id' => $os->id,
                    'valor_pendente_real' => $valorPendenteReal
                ]);
                return;
            }

            // Calcular data de vencimento (30 dias a partir de hoje)
            $dataVencimento = now()->addDays(30);

            // Preparar descrição indicando que é um acréscimo
            $observacoesCompletas = "OS {$os->id_os} - Acréscimo de Valor (Valor Pendente Real)";
            if ($os->observacoes_gerais_os && trim($os->observacoes_gerais_os)) {
                $observacoesCompletas .= "\n\n" . $os->observacoes_gerais_os;
            }

            // Preparar dados da conta a receber com o valor pendente real
            $dadosContaReceber = [
                'cliente_id' => $os->cliente_id,
                'os_id' => $os->id,
                'descricao' => "OS #{$os->id} - Acréscimo",
                'valor_original' => $valorPendenteReal,
                'valor_pendente' => $valorPendenteReal,
                'data_vencimento' => $dataVencimento,
                'data_emissao' => now()->toDateString(),
                'status' => 'pendente',
                'juros_aplicados' => 0.00,
                'frequencia_juros' => 'unica',
                'total_aplicacoes_juros' => 0,
                'observacoes' => $observacoesCompletas,
                'tenant_id' => $os->tenant_id,
                'created_at' => now(),
                'updated_at' => now()
            ];

            \Log::info("Criando conta a receber de acréscimo com dados", $dadosContaReceber);

            $contaReceber = ContaReceber::create($dadosContaReceber);

            \Log::info("Conta a receber de acréscimo criada com sucesso", [
                'conta_id' => $contaReceber->id,
                'os_id' => $os->id,
                'valor' => $contaReceber->valor_original,
                'vencimento' => $contaReceber->data_vencimento
            ]);

        } catch (\Exception $e) {
            \Log::error("Erro ao criar conta a receber de acréscimo para OS", [
                'os_id' => $os->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Atualiza as contas a receber quando o valor de uma OS muda
     * 
     * @param OrdemServico $os
     * @param float $valorAntigo
     * @param float $valorNovo
     * @return void
     */
    protected function atualizarContasReceberOS(OrdemServico $os, float $valorAntigo, float $valorNovo)
    {
        \Log::info("💰 Iniciando atualização de contas a receber para OS", [
            'os_id' => $os->id,
            'id_os' => $os->id_os,
            'valor_antigo' => $valorAntigo,
            'valor_novo' => $valorNovo
        ]);

        try {
            // Buscar todas as contas a receber relacionadas a esta OS
            $contasReceber = ContaReceber::where('os_id', $os->id)->get();
            
            if ($contasReceber->isEmpty()) {
                \Log::warning("⚠️ Nenhuma conta a receber encontrada para OS", [
                    'os_id' => $os->id,
                    'id_os' => $os->id_os
                ]);
                return;
            }

            \Log::info("📋 Contas a receber encontradas", [
                'os_id' => $os->id,
                'total_contas' => $contasReceber->count()
            ]);

            // Calcular a proporção da mudança
            $proporcao = $valorAntigo != 0 ? ($valorNovo / $valorAntigo) : 1;
            
            \Log::info("📐 Proporção calculada", [
                'os_id' => $os->id,
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
                    'os_id' => $os->id,
                    'valor_original_antigo' => $conta->valor_original,
                    'valor_original_novo' => $novoValorOriginal,
                    'valor_pendente_antigo' => $conta->valor_pendente,
                    'valor_pendente_novo' => $novoValorPendente,
                    'status_antigo' => $conta->status,
                    'status_novo' => $novoStatus,
                    'valor_pago' => $valorPago
                ]);

                // Atualizar a conta com a nova data de emissão (data da edição da OS)
                $novaDataEmissao = now()->toDateString();

                // Atualizar a conta
                $conta->update([
                    'valor_original' => $novoValorOriginal,
                    'valor_pendente' => $novoValorPendente,
                    'status' => $novoStatus,
                    'data_emissao' => $novaDataEmissao,
                    // Atualizar a descrição para incluir informação sobre a edição
                    'descricao' => "OS #{$os->id}" . 
                                    ($conta->descricao && str_contains($conta->descricao, 'Crediário') ? " - Crediário" : "") .
                                    ($conta->descricao && str_contains($conta->descricao, 'Acréscimo') ? " - Acréscimo" : "") .
                                    " (Atualizado em " . now()->format('d/m/Y H:i') . ")"
                ]);

                \Log::info("📅 Data de emissão atualizada", [
                    'conta_id' => $conta->id,
                    'os_id' => $os->id,
                    'data_emissao_antiga' => $conta->data_emissao,
                    'data_emissao_nova' => $novaDataEmissao
                ]);

                \Log::info("✅ Conta a receber atualizada com sucesso", [
                    'conta_id' => $conta->id,
                    'os_id' => $os->id
                ]);
            }

            \Log::info("✅ Todas as contas a receber foram atualizadas com sucesso", [
                'os_id' => $os->id,
                'total_contas_atualizadas' => $contasReceber->count()
            ]);

        } catch (\Exception $e) {
            \Log::error("❌ Erro ao atualizar contas a receber para OS", [
                'os_id' => $os->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não interrompe o fluxo da edição se houver erro na atualização das contas
        }
    }

    /**
     * Cria lançamentos de caixa para os pagamentos da OS (exceto Crediário)
     * 
     * @param OrdemServico $os
     * @return void
     */
    protected function criarLancamentosCaixaOS(OrdemServico $os)
    {
        try {
            \Log::info('💰 [criarLancamentosCaixaOS] Iniciando criação de lançamentos para OS', [
                'os_id' => $os->id,
                'id_os' => $os->id_os,
                'pagamentos' => $os->pagamentos
            ]);

            // Verificar se há pagamentos
            $pagamentos = $os->pagamentos ?? [];
            if (empty($pagamentos)) {
                \Log::info('💰 [criarLancamentosCaixaOS] Nenhum pagamento encontrado', [
                    'os_id' => $os->id
                ]);
                return;
            }

            // Verificar se há caixa aberto (opcional - não bloqueia criação de lançamentos)
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', $os->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            $sessaoId = null;
            if ($caixaAberto) {
                // Verificar se o caixa não foi fechado
                $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
                
                if ($sessaoId) {
                    $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                        ->where('tenant_id', $os->tenant_id)
                        ->whereJsonContains('metadados->sessao_id', $sessaoId)
                        ->first();
                    
                    // Se há fechamento, não usar sessao_id mas ainda criar o lançamento
                    if ($fechamento) {
                        \Log::info('💰 [criarLancamentosCaixaOS] Caixa fechado, criando lançamento sem sessao_id', [
                            'os_id' => $os->id
                        ]);
                        $sessaoId = null;
                    }
                }
            } else {
                \Log::info('💰 [criarLancamentosCaixaOS] Nenhum caixa aberto encontrado, criando lançamento sem sessao_id', [
                    'os_id' => $os->id
                ]);
            }

            // Buscar conta de caixa padrão (opcional - não bloqueia criação)
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', $os->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('💰 [criarLancamentosCaixaOS] Conta de caixa não encontrada, usando conta padrão como fallback', [
                    'os_id' => $os->id
                ]);
            }

            // Buscar categoria de receita
            $categoriaReceita = CategoriaCaixa::where('tipo', 'receita')
                ->where('tenant_id', $os->tenant_id)
                ->where('ativo', true)
                ->first();

            // Obter informações do cliente
            $clienteInfo = is_array($os->cliente_info) ? $os->cliente_info : json_decode($os->cliente_info, true);
            $clienteNome = $clienteInfo['nome_completo'] ?? $clienteInfo['nome'] ?? 'Cliente não identificado';

            // Criar lançamento para cada pagamento (exceto Crediário)
            foreach ($pagamentos as $pagamento) {
                // Pular pagamentos com Crediário (são tratados como conta a receber)
                $metodoPagamento = $pagamento['metodo'] ?? $pagamento['forma_pagamento'] ?? '';
                if (strtolower($metodoPagamento) === 'crediário') {
                    \Log::info('💰 [criarLancamentosCaixaOS] Pulando pagamento Crediário', [
                        'os_id' => $os->id,
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
                $contaIdPagamento = $pagamento['conta_bancaria_id'] ?? $pagamento['conta_destino_id'] ?? null;
                
                if ($contaIdPagamento) {
                    $contaBancaria = ContaBancaria::find($contaIdPagamento);
                    if ($contaBancaria && $contaBancaria->tenant_id === $os->tenant_id) {
                        $contaBancariaId = $contaBancaria->id;
                        $contaBancariaNome = $contaBancaria->nome;
                        \Log::info('💰 [criarLancamentosCaixaOS] Usando conta bancária selecionada', [
                            'conta_bancaria_id' => $contaBancariaId,
                            'conta_bancaria_nome' => $contaBancariaNome,
                            'forma_pagamento' => $metodoPagamento
                        ]);
                    } else {
                        \Log::warning('💰 [criarLancamentosCaixaOS] Conta bancária não encontrada ou não pertence ao tenant', [
                            'conta_id' => $contaIdPagamento,
                            'os_tenant_id' => $os->tenant_id,
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
                        \Log::info('💰 [criarLancamentosCaixaOS] Usando conta de caixa para pagamento em dinheiro', [
                            'os_id' => $os->id,
                            'conta_id' => $contaBancariaId
                        ]);
                    } else {
                        // Para outras formas de pagamento ou se não houver conta de caixa, buscar conta padrão do sistema
                        $contaPadrao = ContaBancaria::where('tenant_id', $os->tenant_id)
                            ->where('conta_padrao', true)
                            ->where('ativo', true)
                            ->first();
                        
                        if ($contaPadrao) {
                            $contaBancariaId = $contaPadrao->id;
                            $contaBancariaNome = $contaPadrao->nome;
                            \Log::info('💰 [criarLancamentosCaixaOS] Usando conta padrão do sistema (conta selecionada não encontrada)', [
                                'os_id' => $os->id,
                                'conta_bancaria_id' => $contaBancariaId,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        } else if ($contaCaixa) {
                            // Fallback: usar conta de caixa se não houver conta padrão
                            $contaBancariaId = $contaCaixa->id;
                            $contaBancariaNome = $contaCaixa->nome;
                            \Log::warning('💰 [criarLancamentosCaixaOS] Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                                'os_id' => $os->id,
                                'conta_id' => $contaBancariaId,
                                'forma_pagamento' => $metodoPagamento
                            ]);
                        } else {
                            // Último recurso: buscar qualquer conta ativa do tenant
                            $contaQualquer = ContaBancaria::where('tenant_id', $os->tenant_id)
                                ->where('ativo', true)
                                ->first();
                            
                            if ($contaQualquer) {
                                $contaBancariaId = $contaQualquer->id;
                                $contaBancariaNome = $contaQualquer->nome;
                                \Log::warning('💰 [criarLancamentosCaixaOS] Usando primeira conta ativa encontrada como último recurso', [
                                    'os_id' => $os->id,
                                    'conta_id' => $contaBancariaId,
                                    'forma_pagamento' => $metodoPagamento
                                ]);
                            } else {
                                \Log::error('💰 [criarLancamentosCaixaOS] Nenhuma conta bancária encontrada para criar lançamento', [
                                    'os_id' => $os->id,
                                    'tenant_id' => $os->tenant_id
                                ]);
                                continue; // Pular este pagamento
                            }
                        }
                    }
                }

                $dadosLancamento = [
                    'tenant_id' => $os->tenant_id,
                    'descricao' => "OS #{$os->id_os} - {$clienteNome}",
                    'valor' => $valor,
                    'tipo' => 'entrada',
                    'data_operacao' => $os->data_finalizacao_os ?? now(),
                    'categoria_id' => $categoriaReceita ? $categoriaReceita->id : null,
                    'categoria_nome' => $categoriaReceita ? $categoriaReceita->nome : 'Ordem de Serviço',
                    'conta_id' => $contaBancariaId,
                    'conta_nome' => $contaBancariaNome,
                    'forma_pagamento' => $metodoPagamento,
                    'operacao_tipo' => 'ordem_servico',
                    'operacao_id' => $os->id,
                    'usuario_id' => auth()->id(),
                    'usuario_nome' => auth()->user()->name ?? 'Sistema',
                    'status' => 'concluido',
                    'metadados' => [
                        'sessao_id' => $sessaoId,
                        'os_id' => $os->id,
                        'id_os' => $os->id_os,
                        'cliente_id' => $os->cliente_id,
                        'cliente_nome' => $clienteNome,
                        'parcelas' => $pagamento['parcelas'] ?? 1,
                        'valor_original' => $pagamento['valorOriginal'] ?? $valor,
                        'conta_bancaria_original' => $contaIdPagamento,
                        'observacoes' => "Pagamento OS - {$os->id_os}"
                    ]
                ];

                \Log::info('💰 [criarLancamentosCaixaOS] Criando lançamento', [
                    'os_id' => $os->id,
                    'dados_lancamento' => $dadosLancamento
                ]);

                try {
                    // Validar dados obrigatórios antes de criar
                    if (empty($dadosLancamento['conta_id'])) {
                        \Log::error('💰 [criarLancamentosCaixaOS] Erro: conta_id não definido para lançamento', [
                            'os_id' => $os->id,
                            'dados_lancamento' => $dadosLancamento
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    if (empty($dadosLancamento['valor']) || $dadosLancamento['valor'] <= 0) {
                        \Log::error('💰 [criarLancamentosCaixaOS] Erro: valor inválido para lançamento', [
                            'os_id' => $os->id,
                            'valor' => $dadosLancamento['valor']
                        ]);
                        continue; // Pular este pagamento e continuar com os próximos
                    }
                    
                    $lancamento = LancamentoCaixa::create($dadosLancamento);

                    \Log::info('💰 [criarLancamentosCaixaOS] Lançamento criado com sucesso', [
                        'lancamento_id' => $lancamento->id,
                        'codigo' => $lancamento->codigo,
                        'os_id' => $os->id,
                        'conta_bancaria_id' => $contaBancariaId,
                        'valor' => $valor
                    ]);
                } catch (\Exception $e) {
                    \Log::error('💰 [criarLancamentosCaixaOS] Erro ao criar lançamento', [
                        'os_id' => $os->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                }
            }

        } catch (\Exception $e) {
            \Log::error('💰 [criarLancamentosCaixaOS] Erro geral', [
                'os_id' => $os->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não interrompe o fluxo se houver erro na criação dos lançamentos
        }
    }

    /**
     * Verifica a OS 758 e sua conta a receber
     */
    public function verificarOS758()
    {
        try {
            $os = OrdemServico::where('id', 758)->first();
            
            if (!$os) {
                return response()->json([
                    'success' => false,
                    'message' => 'OS 758 não encontrada',
                    'os' => null
                ], 404);
            }

            $pagamentos = $os->pagamentos ?? [];
            $pagamentosCrediario = collect($pagamentos)->filter(function($pagamento) {
                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
            });

            $valorCrediarioCorreto = 0;
            if ($pagamentosCrediario->isNotEmpty()) {
                $valorCrediarioCorreto = $pagamentosCrediario->sum(function($pagamento) {
                    return floatval($pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0);
                });
            }

            $contasExistentes = ContaReceber::where('os_id', 758)->get();
            $contaId758 = ContaReceber::where('id', 758)->first();

            return response()->json([
                'success' => true,
                'os' => [
                    'id' => $os->id,
                    'id_os' => $os->id_os,
                    'status_os' => $os->status_os,
                    'valor_total_os' => floatval($os->valor_total_os),
                    'cliente_id' => $os->cliente_id,
                    'pagamentos' => $pagamentos,
                    'tem_crediario' => $pagamentosCrediario->isNotEmpty(),
                    'valor_crediario_correto' => $valorCrediarioCorreto
                ],
                'contas' => $contasExistentes->map(function($conta) {
                    return [
                        'id' => $conta->id,
                        'valor_original' => floatval($conta->valor_original),
                        'valor_pendente' => floatval($conta->valor_pendente),
                        'status' => $conta->status
                    ];
                }),
                'conta_id_758' => $contaId758 ? [
                    'id' => $contaId758->id,
                    'os_id' => $contaId758->os_id,
                    'valor_original' => floatval($contaId758->valor_original)
                ] : null,
                'problemas' => [
                    'sem_conta' => $pagamentosCrediario->isNotEmpty() && $contasExistentes->isEmpty(),
                    'valor_incorreto' => $contasExistentes->filter(function($conta) use ($valorCrediarioCorreto) {
                        return abs($conta->valor_original - $valorCrediarioCorreto) > 0.01;
                    })->isNotEmpty(),
                    'conta_id_758_errada' => $contaId758 && $contaId758->os_id != 758
                ]
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao verificar OS 758', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao verificar OS 758: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Corrige problemas da OS 758
     */
    public function corrigirOS758()
    {
        try {
            $os = OrdemServico::where('id', 758)->first();
            
            if (!$os) {
                return response()->json([
                    'success' => false,
                    'message' => 'OS 758 não encontrada'
                ], 404);
            }

            $pagamentos = $os->pagamentos ?? [];
            $pagamentosCrediario = collect($pagamentos)->filter(function($pagamento) {
                return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
            });

            $correcoes = [];

            if ($pagamentosCrediario->isEmpty()) {
                // Remover contas incorretas se não há crediário
                $contasIncorretas = ContaReceber::where('os_id', 758)->get();
                foreach ($contasIncorretas as $conta) {
                    $conta->delete();
                    $correcoes[] = "Conta ID {$conta->id} removida (OS não tem crediário)";
                }
            } else {
                // Calcular valor correto
                $valorCrediarioCorreto = $pagamentosCrediario->sum(function($pagamento) {
                    return floatval($pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0);
                });

                $contasExistentes = ContaReceber::where('os_id', 758)->get();

                if ($contasExistentes->isEmpty()) {
                    // Criar conta a receber
                    $this->criarContaReceberOS($os);
                    $correcoes[] = "Conta a receber criada para OS 758";
                } else {
                    // Corrigir valores incorretos
                    foreach ($contasExistentes as $conta) {
                        $diferenca = abs($conta->valor_original - $valorCrediarioCorreto);
                        if ($diferenca > 0.01) {
                            $conta->valor_original = $valorCrediarioCorreto;
                            $conta->valor_pendente = $valorCrediarioCorreto;
                            $conta->save();
                            $correcoes[] = "Valor da conta ID {$conta->id} corrigido para R$ " . number_format($valorCrediarioCorreto, 2, ',', '.');
                        }
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Correções aplicadas com sucesso',
                'correcoes' => $correcoes
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao corrigir OS 758', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erro ao corrigir OS 758: ' . $e->getMessage()
            ], 500);
        }
    }
}
