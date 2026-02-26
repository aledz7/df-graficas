<?php

namespace App\Http\Controllers\Api;

use App\Models\ContaReceber;
use App\Models\LancamentoCaixa;
use App\Models\ContaBancaria;
use App\Models\CategoriaCaixa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ContaReceberController extends BaseController
{
    /**
     * Lista todas as contas a receber
     */
    public function index(Request $request)
    {
        try {
            $query = ContaReceber::query();

            // Filtros
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('cliente_id')) {
                $query->where('cliente_id', $request->cliente_id);
            }

            if ($request->has('os_id')) {
                $query->where('os_id', $request->os_id);
            }

            if ($request->has('envelopamento_id')) {
                $query->where('envelopamento_id', $request->envelopamento_id);
            }

            if ($request->has('venda_id')) {
                $query->where('venda_id', $request->venda_id);
            }

            if ($request->has('vencimento_de')) {
                $query->whereDate('data_vencimento', '>=', $request->vencimento_de);
            }

            if ($request->has('vencimento_ate')) {
                $query->whereDate('data_vencimento', '<=', $request->vencimento_ate);
            }

            // Filtros de data de emissão (mesmo critério usado no frontend)
            if ($request->has('data_inicio')) {
                $query->where('data_emissao', '>=', $request->input('data_inicio') . ' 00:00:00');
            }

            if ($request->has('data_fim')) {
                $query->where('data_emissao', '<=', $request->input('data_fim') . ' 23:59:59');
            }

            // Filtros de data de pagamento (busca no histórico de pagamentos)
            if ($request->has('pagamento_de')) {
                $query->whereRaw("JSON_LENGTH(historico_pagamentos) > 0")
                    ->where(function($q) use ($request) {
                        $q->whereRaw("JSON_EXTRACT(historico_pagamentos, '$[*].data') LIKE ?", ['%' . $request->pagamento_de . '%'])
                          ->orWhereRaw("JSON_EXTRACT(historico_pagamentos, '$[0].data') >= ?", [$request->pagamento_de]);
                    });
            }

            if ($request->has('pagamento_ate')) {
                $query->whereRaw("JSON_LENGTH(historico_pagamentos) > 0")
                    ->where(function($q) use ($request) {
                        $q->whereRaw("JSON_EXTRACT(historico_pagamentos, '$[*].data') LIKE ?", ['%' . $request->pagamento_ate . '%'])
                          ->orWhereRaw("JSON_EXTRACT(historico_pagamentos, '$[0].data') <= ?", [$request->pagamento_ate]);
                    });
            }

            // Filtrar contas relacionadas a vendas excluídas (soft deleted)
            $vendasExcluidas = DB::table('vendas')
                ->whereNotNull('deleted_at')
                ->pluck('id')
                ->map(function($id) {
                    return (string)$id;
                })
                ->toArray();
            
            $query->where(function ($q) use ($vendasExcluidas) {
                $q->whereNull('venda_id')
                  ->orWhereNotIn('venda_id', $vendasExcluidas);
            });

            // Filtrar contas relacionadas a envelopamentos excluídos (soft deleted)
            $envelopamentosExcluidos = DB::table('envelopamentos')
                ->whereNotNull('deleted_at')
                ->pluck('id')
                ->map(function($id) {
                    return (string)$id;
                })
                ->toArray();
            
            $query->where(function ($q) use ($envelopamentosExcluidos) {
                $q->whereNull('envelopamento_id')
                  ->orWhereNotIn('envelopamento_id', $envelopamentosExcluidos);
            });

            // Filtrar contas relacionadas a ordens de serviço excluídas (soft deleted)
            $ordensExcluidas = DB::table('ordens_servico')
                ->whereNotNull('deleted_at')
                ->when($tenantId = auth()->user()->tenant_id ?? null, function($query) use ($tenantId) {
                    return $query->where('tenant_id', $tenantId);
                })
                ->pluck('id')
                ->toArray();
            
            if (!empty($ordensExcluidas)) {
                $query->where(function ($q) use ($ordensExcluidas) {
                    $q->whereNull('os_id')
                      ->orWhereNotIn('os_id', $ordensExcluidas);
                });
            }

            $contas = $query->with(['cliente', 'ordemServico', 'envelopamento'])->orderBy('data_vencimento')->get();

            // Adicionar o status calculado e informações adicionais para cada conta
            $contas->each(function ($conta) {
                $conta->status_calculado = $conta->status_calculado;
                
                // Adicionar informações adicionais para OSs
                if ($conta->os_id) {
                    $os = \DB::table('ordens_servico')->where('id', $conta->os_id)->first();
                    if ($os) {
                        // Buscar observações dos itens da OS
                        $itensOS = \DB::table('ordens_servico_itens')
                            ->where('ordem_servico_id', $conta->os_id)
                            ->select(['detalhes'])
                            ->get();
                        
                        $observacoesItens = [];
                        foreach ($itensOS as $item) {
                            if ($item->detalhes) {
                                $detalhesArray = $item->detalhes;
                                if (is_array($detalhesArray)) {
                                    // Se for um array associativo, procurar por observacao_item
                                    if (isset($detalhesArray['observacao_item'])) {
                                        $observacoesItens[] = $detalhesArray['observacao_item'];
                                    } else {
                                        // Se for um array numérico, tratar como observação do item
                                        $observacoesItens[] = implode(', ', $detalhesArray);
                                    }
                                }
                            }
                        }
                        
                        $conta->info_adicional = [
                            'tipo' => 'os',
                            'observacoes' => $os->observacoes_gerais_os ?: $os->observacoes,
                            'observacoes_itens' => !empty($observacoesItens) ? implode("\n", $observacoesItens) : null,
                            'status' => $os->status_os,
                        ];
                    }
                }
            });

            return $this->success($contas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar contas a receber: ' . $e->getMessage());
        }
    }

    /**
     * Mostra uma conta específica
     */
    public function show($id)
    {
        try {
            // Verificar se o ID é válido
            if (!is_numeric($id) || $id <= 0) {
                \Log::error('❌ [ContaReceberController::show] ID inválido: ' . $id);
                return $this->error('ID da conta inválido', 400);
            }
            
            $conta = ContaReceber::with(['cliente', 'ordemServico', 'envelopamento'])->find($id);
            
            if (!$conta) {
                \Log::error('❌ [ContaReceberController::show] Conta não encontrada - ID: ' . $id);
                return $this->error('Conta não encontrada', 404);
            }
            
            // Buscar histórico de pagamentos
            $historicoPagamentos = [];
            if ($conta->historico_pagamentos) {
                $historicoPagamentos = collect($conta->historico_pagamentos)->map(function ($pagamento) {
                    return [
                        'data' => $pagamento['data'],
                        'valor' => $pagamento['valor'],
                        'forma_pagamento' => $pagamento['forma_pagamento'],
                        'observacoes' => $pagamento['observacoes'] ?? null,
                    ];
                })->toArray();
            }
            \Log::info('Historico pagamentos processado: ' . json_encode($historicoPagamentos));

            // Buscar itens baseado no tipo de conta
            $itensVenda = [];
            $tipoConta = null;
            
            // Verificar se é venda (PDV) - primeiro pelo venda_id, depois pelas observações
            if ($conta->venda_id) {
                $tipoConta = 'venda';
                // Buscar a venda usando o relacionamento do Eloquent (respeita soft delete e tenant)
                $venda = $conta->venda;
                
                if ($venda) {
                    // Buscar itens usando o relacionamento do Eloquent (respeita soft delete e tenant)
                    // Carregar também o relacionamento com produto para ter acesso à imagem
                    $itensVenda = $venda->itens()->with('produto')->get()->toArray();
                }
            } elseif ($conta->observacoes && preg_match('/VEN\d+/', $conta->observacoes, $matches)) {
                $tipoConta = 'venda';
                $vendaCodigo = $matches[0];
                
                // Buscar a venda usando o modelo Eloquent (respeita soft delete e tenant)
                $venda = \App\Models\Venda::where('codigo', $vendaCodigo)->first();
                
                if ($venda) {
                    // Buscar itens usando o relacionamento do Eloquent (respeita soft delete e tenant)
                    // Carregar também o relacionamento com produto para ter acesso à imagem
                    $itensVenda = $venda->itens()->with('produto')->get()->toArray();
                }
            }
            
            // Processar itens de venda se encontrados
            if ($tipoConta === 'venda' && !empty($itensVenda)) {
                $itensVenda = collect($itensVenda)->map(function ($item) {
                    // Garantir que o item seja acessado como array
                    $item = is_array($item) ? $item : (array) $item;
                    
                    $valorUnitario = $item['valor_unitario'] ?? 0;
                    $quantidade = $item['quantidade'] ?? 1;
                    $subtotal = ($valorUnitario * $quantidade);
                    
                    $descontoValor = $item['desconto_valor'] ?? 0;
                    $descontoPercentual = $item['desconto_percentual'] ?? 0;
                    $desconto = $descontoValor + (($subtotal * $descontoPercentual) / 100);
                    
                    $acrescimoValor = $item['acrescimo_valor'] ?? 0;
                    $acrescimoPercentual = $item['acrescimo_percentual'] ?? 0;
                    $acrescimo = $acrescimoValor + (($subtotal * $acrescimoPercentual) / 100);
                    
                    $total = $subtotal - $desconto + $acrescimo;
                    
                    // Processar dados adicionais
                    $dadosAdicionais = $item['dados_adicionais'] ?? [];
                    
                    // Extrair variação dos dados adicionais
                    $variacao = null;
                    if (isset($dadosAdicionais['variacao'])) {
                        $variacao = $dadosAdicionais['variacao'];
                    } elseif (isset($dadosAdicionais['variacao_id'])) {
                        $variacao = ['id' => $dadosAdicionais['variacao_id']];
                        if (isset($dadosAdicionais['variacao_nome'])) {
                            $variacao['nome'] = $dadosAdicionais['variacao_nome'];
                        }
                    }
                    
                    // Extrair imagem principal
                    $imagemPrincipal = null;
                    if (isset($dadosAdicionais['imagem_principal'])) {
                        $imagemPrincipal = $dadosAdicionais['imagem_principal'];
                    } elseif (isset($item['produto']['imagem_principal'])) {
                        $imagemPrincipal = $item['produto']['imagem_principal'];
                    }
                    
                    // Determinar o tipo do item
                    $tipoItem = 'produto'; // padrão
                    if (isset($dadosAdicionais['tipo_item'])) {
                        $tipoItem = $dadosAdicionais['tipo_item'];
                    } elseif (isset($item['produto']['tipo'])) {
                        $tipoItem = $item['produto']['tipo'];
                    }
                    
                    return [
                        'id' => $item['id'] ?? null,
                        'produto_id' => $item['produto_id'] ?? null,
                        'produto_nome' => $item['produto_nome'] ?? '',
                        'produto_codigo' => $item['produto_codigo'] ?? null,
                        'produto_unidade' => $item['produto_unidade'] ?? 'un',
                        'produto_descricao' => $item['produto_descricao'] ?? null,
                        'quantidade' => $quantidade,
                        'valor_unitario' => $valorUnitario,
                        'desconto_percentual' => $descontoPercentual,
                        'desconto_valor' => $descontoValor,
                        'acrescimo_percentual' => $acrescimoPercentual,
                        'acrescimo_valor' => $acrescimoValor,
                        'subtotal' => $subtotal,
                        'desconto_total' => $desconto,
                        'acrescimo_total' => $acrescimo,
                        'total' => $total,
                        'observacoes' => $item['observacoes'] ?? null,
                        'dados_adicionais' => [
                            'variacao' => $variacao,
                            'imagem_principal' => $imagemPrincipal,
                            'tipo_item' => $tipoItem,
                        ],
                        'tipo_item' => $tipoItem,
                    ];
                })
                ->toArray();
            }
            // Verificar se é envelopamento
            if ($conta->envelopamento_id) {
                $tipoConta = 'envelopamento';
                
                $envelopamento = \DB::table('envelopamentos')->where('id', $conta->envelopamento_id)->first();
                
                if ($envelopamento) {
                    
                    // Buscar serviços adicionais para mapear IDs para nomes
                    $servicosMap = [];
                    $servicosAdicionais = \DB::table('servicos_adicionais')->get();
                    foreach ($servicosAdicionais as $servico) {
                        $servicosMap[$servico->id] = $servico->nome;
                    }
                    
                    // Processar selected_pecas se existir
                    if ($envelopamento->selected_pecas) {
                        $selectedPecas = json_decode($envelopamento->selected_pecas, true);
                        if (is_array($selectedPecas)) {
                            foreach ($selectedPecas as $index => $peca) {
                                // Calcular área da peça
                                $area = ($peca['parte']['largura'] ?? 0) * ($peca['parte']['altura'] ?? 0);
                                $quantidade = $peca['quantidade'] ?? 1;
                                $valorMetroQuadrado = $peca['produto']['valorMetroQuadrado'] ?? 0;
                                
                                // Valor do material (área × valor/m²)
                                $valorMaterial = $area * $valorMetroQuadrado;
                                
                                // Calcular valor dos serviços adicionais
                                $valorServicos = 0;
                                $servicosNomes = [];
                                if (isset($peca['servicosAdicionais']) && is_array($peca['servicosAdicionais'])) {
                                    foreach ($peca['servicosAdicionais'] as $servicoId => $ativo) {
                                        if ($ativo) {
                                            $servicosNomes[] = $servicosMap[$servicoId] ?? 'Serviço ' . $servicoId;
                                            // Buscar o valor do serviço específico
                                            try {
                                                $servico = \DB::table('servicos_adicionais')->where('id', $servicoId)->first();
                                                if ($servico) {
                                                    // Verificar se existe a coluna tipo_calculo, senão usar valor fixo
                                                    if (isset($servico->tipo_calculo) && $servico->tipo_calculo === 'por_metro_quadrado') {
                                                        $valorServicos += $servico->valor * $area;
                                                    } else {
                                                        // Valor fixo por peça (padrão)
                                                        $valorServicos += $servico->valor;
                                                    }
                                                }
                                            } catch (\Exception $e) {
                                                \Log::warning('Erro ao buscar serviço ID ' . $servicoId . ': ' . $e->getMessage());
                                                // Continuar sem adicionar valor do serviço
                                            }
                                        }
                                    }
                                }
                                
                                // Valor total da peça (material + serviços)
                                $totalPeca = $valorMaterial + $valorServicos;
                                
                                $itensVenda[] = [
                                    'id' => 'peca_' . $index,
                                    'produto_id' => $peca['produto']['id'] ?? null,
                                    'produto_nome' => $peca['parte']['nome'] ?? 'Peça ' . ($index + 1),
                                    'produto_codigo' => $peca['produto']['id'] ?? null,
                                    'produto_unidade' => 'm²',
                                    'produto_descricao' => $peca['produto']['nome'] ?? null,
                                    'quantidade' => $area, // Quantidade em m² (área da peça)
                                    'valor_unitario' => $valorMetroQuadrado, // Preço por m² do material
                                    'desconto_percentual' => 0,
                                    'desconto_valor' => 0,
                                    'acrescimo_percentual' => 0,
                                    'acrescimo_valor' => 0,
                                    'subtotal' => $totalPeca, // Valor total da peça (material + serviços)
                                    'desconto_total' => 0,
                                    'acrescimo_total' => 0,
                                    'total' => $totalPeca, // Valor total da peça (material + serviços)
                                    'area' => $area,
                                    'largura' => $peca['parte']['largura'] ?? 0,
                                    'altura' => $peca['parte']['altura'] ?? 0,
                                    'servicos' => implode(', ', $servicosNomes),
                                    'valor_metro_quadrado' => $valorMetroQuadrado,
                                    'valor_material' => $valorMaterial,
                                    'valor_servicos' => $valorServicos,
                                ];
                            }
                        }
                    }
                } else {
                    \Log::info('Envelopamento não encontrado para ID: ' . $conta->envelopamento_id);
                }
            }
            // Inicializar info_adicional
            $infoAdicional = null;
            
            // Verificar se é OS
            $osId = $conta->os_id;
            
            // Se não há os_id, tentar extrair das observações
            if (!$osId && $conta->observacoes && preg_match('/OS-([a-f0-9-]+)/i', $conta->observacoes, $matches)) {
                $osCodigo = 'OS-' . $matches[1];
                $os = \App\Models\OrdemServico::where('id_os', $osCodigo)->first();
                if ($os) {
                    $osId = $os->id;
                    \Log::info('OS encontrada pelas observações: ' . $osCodigo . ' (ID: ' . $osId . ')');
                }
            }
            
            // Tentar extrair da descrição também
            if (!$osId && $conta->descricao && preg_match('/OS #(\d+)-([a-f0-9]+)/i', $conta->descricao, $matches)) {
                $osCodigo = 'OS-' . $matches[2];
                $os = \App\Models\OrdemServico::where('id_os', $osCodigo)->first();
                if ($os) {
                    $osId = $os->id;
                    \Log::info('OS encontrada pela descrição: ' . $osCodigo . ' (ID: ' . $osId . ')');
                }
            }
            
            if ($osId) {
                $tipoConta = 'os';
                
                $itensOS = \DB::table('ordens_servico_itens')
                    ->where('ordem_servico_id', $osId)
                    ->select([
                        'id',
                        'produto_id',
                        'nome_servico_produto',
                        'tipo_item',
                        'quantidade',
                        'valor_unitario',
                        'valor_total',
                        'largura',
                        'altura',
                        'acabamentos',
                        'detalhes'
                    ])
                    ->get();
                
                $itensVenda = $itensOS->map(function ($item) {
                    $acabamentos = '';
                    if ($item->acabamentos) {
                        $acabamentosArray = json_decode($item->acabamentos, true);
                        if (is_array($acabamentosArray)) {
                            // Processar acabamentos que podem ser strings ou arrays
                            $acabamentosProcessados = array_map(function($acab) {
                                if (is_array($acab)) {
                                    // Se for array, pegar o nome ou converter para string
                                    return isset($acab['nome']) ? $acab['nome'] : (isset($acab['name']) ? $acab['name'] : json_encode($acab));
                                }
                                return $acab;
                            }, $acabamentosArray);
                            $acabamentos = implode(', ', $acabamentosProcessados);
                        }
                    }
                    
                    $detalhes = '';
                    $observacoesItem = '';
                    if ($item->detalhes) {
                        // O campo detalhes já é um array devido ao accessor do modelo
                        $detalhesArray = $item->detalhes;
                        if (is_array($detalhesArray)) {
                            // Se for um array associativo, procurar por observacao_item
                            if (isset($detalhesArray['observacao_item'])) {
                                $observacoesItem = $detalhesArray['observacao_item'];
                                // Manter outros detalhes
                                $outrosDetalhes = array_filter($detalhesArray, function($key) {
                                    return $key !== 'observacao_item';
                                }, ARRAY_FILTER_USE_KEY);
                                if (!empty($outrosDetalhes)) {
                                    $detalhes = implode(', ', $outrosDetalhes);
                                }
                            } else {
                                // Se for um array numérico, tratar como observação do item
                                $observacoesItem = implode(', ', $detalhesArray);
                            }
                        }
                    }
                    
                    return [
                        'id' => $item->id,
                        'produto_id' => $item->produto_id,
                        'produto_nome' => $item->nome_servico_produto,
                        'produto_codigo' => null,
                        'produto_unidade' => 'un',
                        'produto_descricao' => $detalhes,
                        'quantidade' => $item->quantidade,
                        'valor_unitario' => $item->valor_unitario,
                        'desconto_percentual' => 0,
                        'desconto_valor' => 0,
                        'acrescimo_percentual' => 0,
                        'acrescimo_valor' => 0,
                        'subtotal' => $item->valor_unitario * $item->quantidade,
                        'desconto_total' => 0,
                        'acrescimo_total' => 0,
                        'total' => $item->valor_total,
                        'largura' => $item->largura,
                        'altura' => $item->altura,
                        'acabamentos' => $acabamentos,
                        'tipo_item' => $item->tipo_item,
                        'observacoes' => $observacoesItem, // Observações específicas do item
                        'detalhes' => $detalhes, // Outros detalhes do item
                    ];
                })
                ->toArray();
                
                // Agregar observações dos itens
                $observacoesItens = [];
                foreach ($itensVenda as $item) {
                    if (!empty($item['observacoes'])) {
                        $observacoesItens[] = $item['observacoes'];
                    }
                }
                
                // Buscar dados da OS para info_adicional
                $os = \DB::table('ordens_servico')->where('id', $osId)->first();
                if ($os) {
                    $infoAdicional = [
                        'tipo' => 'os',
                        'desconto' => $os->desconto_geral_valor,
                        'desconto_tipo' => $os->desconto_geral_tipo,
                        'frete' => $os->frete_valor,
                        'valor_total' => $os->valor_total_os,
                        'observacoes' => $os->observacoes_gerais_os ?: $os->observacoes,
                        'observacoes_itens' => !empty($observacoesItens) ? implode("\n", $observacoesItens) : null,
                        'status' => $os->status_os,
                    ];
                }
            }

            // Buscar parcelas se houver
            $parcelas = [];
            if ($conta->hasParcelas) {
                $parcelas = $conta->parcelas()->with('cliente')->get()->map(function ($parcela) {
                    return [
                        'id' => $parcela->id,
                        'descricao' => $parcela->descricao,
                        'valor_pendente' => $parcela->valor_pendente,
                        'data_vencimento' => $parcela->data_vencimento,
                        'status' => $parcela->status,
                        'parcelamento_info' => $parcela->parcelamento_info,
                    ];
                })->toArray();
            }

            // Preparar dados de configuração de juros
            $configJuros = null;
            if ($conta->tipo_juros && $conta->valor_juros && $conta->data_inicio_cobranca_juros) {
                $configJuros = [
                    'tipo' => $conta->tipo_juros,
                    'valor' => $conta->valor_juros,
                    'data_inicio_cobranca' => $conta->data_inicio_cobranca_juros,
                    'frequencia' => $conta->frequencia_juros,
                    'ultima_aplicacao' => $conta->ultima_aplicacao_juros,
                    'total_aplicacoes' => $conta->total_aplicacoes_juros,
                    'historico' => $conta->historico_juros
                ];
            }

            // Buscar informações adicionais baseado no tipo de conta
            
            if ($tipoConta === 'envelopamento' && $conta->envelopamento_id) {
                $envelopamento = \DB::table('envelopamentos')->where('id', $conta->envelopamento_id)->first();
                if ($envelopamento) {
                    $infoAdicional = [
                        'tipo' => 'envelopamento',
                        'desconto' => $envelopamento->desconto,
                        'desconto_tipo' => $envelopamento->desconto_tipo,
                        'desconto_calculado' => $envelopamento->desconto_calculado,
                        'frete' => $envelopamento->frete,
                        'valor_total' => $envelopamento->orcamento_total,
                        'custo_material' => $envelopamento->custo_total_material,
                        'custo_adicionais' => $envelopamento->custo_total_adicionais,
                        'observacoes' => $envelopamento->observacao, // Adicionar observações do Envelopamento
                        'pagamentos' => $envelopamento->pagamentos ? json_decode($envelopamento->pagamentos, true) : null,
                    ];
                }
            } elseif ($tipoConta === 'venda') {
                // Buscar venda usando venda_id ou código das observações
                $venda = null;
                if ($conta->venda_id) {
                    $venda = $conta->venda;
                } elseif ($conta->observacoes && preg_match('/VEN\d+/', $conta->observacoes, $matches)) {
                    $vendaCodigo = $matches[0];
                    $venda = \App\Models\Venda::where('codigo', $vendaCodigo)->first();
                }
                
                if ($venda) {
                    $infoAdicional = [
                        'tipo' => 'venda',
                        'desconto' => $venda->desconto_valor, // Usar o valor do desconto calculado
                        'desconto_tipo' => $venda->tipo_desconto,
                        'frete' => 0, // Vendas não têm frete separado
                        'valor_total' => $venda->valor_total,
                        'observacoes' => $venda->observacoes,
                        'pagamentos' => $venda->dados_pagamento,
                    ];
                }
            }

            $dadosCompletos = [
                'conta' => $conta,
                'config_juros' => $configJuros,
                'historico_pagamentos' => $historicoPagamentos,
                'itens_venda' => $itensVenda,
                'parcelas' => $parcelas,
                'tipo_conta' => $tipoConta,
                'venda_id' => $conta->observacoes ? preg_match('/VEN\d+/', $conta->observacoes, $matches) ? $matches[0] : null : null,
                'os_id' => $conta->os_id,
                'envelopamento_id' => $conta->envelopamento_id,
                'info_adicional' => $infoAdicional,
            ];

            return $this->success($dadosCompletos);
        } catch (\Exception $e) {
            \Log::error('❌ [ContaReceberController::show] Erro ao buscar conta ID ' . $id . ': ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return $this->error('Erro ao buscar conta: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Cria uma nova conta a receber
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cliente_id' => 'required|exists:clientes,id',
            'descricao' => 'required|string|max:255',
            'valor_original' => 'required|numeric|min:0',
            'data_vencimento' => 'required|date',
            'data_emissao' => 'nullable|date',
            'observacoes' => 'nullable|string|max:1000',
            'os_id' => 'nullable|exists:ordens_servico,id',
            'envelopamento_id' => 'nullable|exists:envelopamentos,id',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            // Verificar duplicatas antes de criar
            $query = ContaReceber::where('cliente_id', $request->cliente_id)
                ->where('valor_original', $request->valor_original)
                ->where('data_emissao', $request->data_emissao ?? now()->toDateString());

            // Verificar por OS específica se fornecida
            if ($request->os_id) {
                $contaExistente = $query->where('os_id', $request->os_id)->first();
                if ($contaExistente) {
                    \Log::warning('Tentativa de criar conta duplicada para OS', [
                        'os_id' => $request->os_id,
                        'cliente_id' => $request->cliente_id,
                        'valor' => $request->valor_original,
                        'conta_existente_id' => $contaExistente->id
                    ]);
                    return $this->success($contaExistente->load('cliente'), 'Conta a receber já existe para esta OS');
                }
            }

            // Verificar por envelopamento específico se fornecido
            if ($request->envelopamento_id) {
                $contaExistente = $query->where('envelopamento_id', $request->envelopamento_id)->first();
                if ($contaExistente) {
                    \Log::warning('Tentativa de criar conta duplicada para envelopamento', [
                        'envelopamento_id' => $request->envelopamento_id,
                        'cliente_id' => $request->cliente_id,
                        'valor' => $request->valor_original,
                        'conta_existente_id' => $contaExistente->id
                    ]);
                    return $this->success($contaExistente->load('cliente'), 'Conta a receber já existe para este envelopamento');
                }
            }

            // Verificar duplicatas de crediário vs pagamento à vista (mesmo cliente, valor e data)
            $contaExistentePagamentoVista = $query->where(function($q) {
                $q->where('observacoes', 'like', '%Dinheiro%')
                  ->orWhere('observacoes', 'like', '%Pix%')
                  ->orWhere('observacoes', 'like', '%Cartão%');
            })->first();
            
            // Se está tentando criar crediário mas já existe pagamento à vista
            if ($contaExistentePagamentoVista && 
                (strpos($request->observacoes ?? '', 'Crediário') !== false || 
                 strpos($request->descricao ?? '', 'Crediário') !== false)) {
                
                \Log::warning('Tentativa de criar conta de crediário quando já existe pagamento à vista', [
                    'cliente_id' => $request->cliente_id,
                    'valor' => $request->valor_original,
                    'conta_vista_id' => $contaExistentePagamentoVista->id,
                    'nova_conta_observacoes' => $request->observacoes
                ]);
                return $this->success($contaExistentePagamentoVista->load('cliente'), 'Pagamento já foi registrado à vista para este valor');
            }
            
            // Se está tentando criar pagamento à vista mas já existe crediário
            $contaExistenteCrediario = $query->where(function($q) {
                $q->where('observacoes', 'like', '%Crediário%')
                  ->orWhere('descricao', 'like', '%Crediário%');
            })->first();
            
            if ($contaExistenteCrediario && 
                (strpos($request->observacoes ?? '', 'Dinheiro') !== false || 
                 strpos($request->observacoes ?? '', 'Pix') !== false ||
                 strpos($request->observacoes ?? '', 'Cartão') !== false)) {
                
                \Log::warning('Tentativa de criar pagamento à vista quando já existe crediário', [
                    'cliente_id' => $request->cliente_id,
                    'valor' => $request->valor_original,
                    'conta_crediario_id' => $contaExistenteCrediario->id,
                    'nova_conta_observacoes' => $request->observacoes
                ]);
                
                // Se o crediário ainda está pendente, marcar como quitado e retornar
                if ($contaExistenteCrediario->status === 'pendente') {
                    $contaExistenteCrediario->update([
                        'status' => 'quitada',
                        'valor_pendente' => 0,
                        'data_quitacao' => now(),
                        'observacoes' => $contaExistenteCrediario->observacoes . ' (Pago à vista)'
                    ]);
                    
                    \Log::info('Conta de crediário marcada como quitada ao invés de criar duplicata', [
                        'conta_id' => $contaExistenteCrediario->id
                    ]);
                }
                
                return $this->success($contaExistenteCrediario->load('cliente'), 'Crediário já existe - marcado como pago à vista');
            }

            // Verificar duplicatas genéricas (mesmo cliente, valor e data) para contas "Lançamento"
            if (!$request->os_id && !$request->envelopamento_id && !$request->venda_id) {
                $contaExistente = $query->whereNull('os_id')
                    ->whereNull('envelopamento_id')
                    ->whereNull('venda_id')
                    ->where('descricao', $request->descricao)
                    ->first();
                
                if ($contaExistente) {
                    \Log::warning('Tentativa de criar conta duplicada do tipo Lançamento', [
                        'cliente_id' => $request->cliente_id,
                        'valor' => $request->valor_original,
                        'descricao' => $request->descricao,
                        'conta_existente_id' => $contaExistente->id
                    ]);
                    return $this->success($contaExistente->load('cliente'), 'Conta a receber similar já existe');
                }
            }

            $conta = ContaReceber::create([
                'cliente_id' => $request->cliente_id,
                'descricao' => $request->descricao,
                'valor_original' => $request->valor_original,
                'valor_pendente' => $request->valor_original,
                'data_vencimento' => $request->data_vencimento,
                'data_emissao' => $request->data_emissao ?? now(),
                'observacoes' => $request->observacoes,
                'status' => 'pendente',
                'user_id' => auth()->id(),
                'os_id' => $request->os_id,
                'envelopamento_id' => $request->envelopamento_id,
            ]);

            \Log::info('Conta a receber criada com sucesso', [
                'conta_id' => $conta->id,
                'cliente_id' => $conta->cliente_id,
                'os_id' => $conta->os_id,
                'envelopamento_id' => $conta->envelopamento_id,
                'valor' => $conta->valor_original
            ]);

            return $this->success($conta->load('cliente'), 'Conta a receber criada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao criar conta a receber: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza uma conta a receber
     */
    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'cliente_id' => 'sometimes|exists:clientes,id',
            'descricao' => 'sometimes|string|max:255',
            'valor_original' => 'sometimes|numeric|min:0',
            'data_vencimento' => 'sometimes|date',
            'data_emissao' => 'sometimes|date',
            'observacoes' => 'nullable|string|max:1000',
            'os_id' => 'nullable|exists:ordens_servico,id',
            'envelopamento_id' => 'nullable|exists:envelopamentos,id',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $conta = ContaReceber::findOrFail($id);
            
            $conta->update($request->all());

            return $this->success($conta->load('cliente'), 'Conta atualizada com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar conta: ' . $e->getMessage());
        }
    }

    /**
     * Remove uma conta a receber
     */
    public function destroy($id)
    {
        try {
            $conta = ContaReceber::findOrFail($id);
            $conta->delete();

            return $this->success(null, 'Conta removida com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover conta: ' . $e->getMessage());
        }
    }

    /**
     * Registra um pagamento para a conta
     */
    public function receber(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'valor' => 'required|numeric|min:0.01',
            'data_pagamento' => 'required|date',
            'forma_pagamento' => 'required|string|max:50',
            'observacoes' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            \Log::info('Iniciando recebimento de conta', ['conta_id' => $id]);
            
            $conta = ContaReceber::findOrFail($id);

            if ($request->valor > $conta->valor_pendente) {
                return $this->error('Valor do pagamento não pode ser maior que o valor pendente', 422);
            }

            // Registrar o pagamento no histórico
            $dadosPagamento = [
                'valor' => $request->valor,
                'data' => $request->data_pagamento,
                'forma_pagamento' => $request->forma_pagamento,
                'observacoes' => $request->observacoes
            ];

            $sucesso = $conta->registrarPagamento($dadosPagamento);
            
            if (!$sucesso) {
                return $this->error('Erro ao registrar pagamento', 500);
            }

            \Log::info('Conta atualizada com sucesso', [
                'conta_id' => $id,
                'valor_pago' => $request->valor,
                'valor_pendente_apos' => $conta->valor_pendente,
                'status' => $conta->status
            ]);

            // Criar lançamento na tabela lancamentos_caixa
            $this->criarLancamentoCaixa($conta, [
                'valor' => $request->valor,
                'forma_pagamento' => $request->forma_pagamento,
                'data_pagamento' => $request->data_pagamento,
                'observacoes' => $request->observacoes
            ]);

            return $this->success($conta->load('cliente'), 'Pagamento registrado com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao registrar pagamento', [
                'conta_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao registrar pagamento: ' . $e->getMessage());
        }
    }

    /**
     * Aplica juros a uma conta em atraso (método manual)
     */
    public function aplicarJuros(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'percentual_juros' => 'required|numeric|min:0|max:100',
            'motivo' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $conta = ContaReceber::findOrFail($id);

            if ($conta->status === 'quitada') {
                return $this->error('Não é possível aplicar juros a uma conta quitada', 422);
            }

            $valorJuros = ($conta->valor_pendente * $request->percentual_juros) / 100;
            
            $conta->valor_pendente += $valorJuros;
            $conta->juros_aplicados = ($conta->juros_aplicados ?? 0) + $valorJuros;

            $conta->save();

            return $this->success($conta->load('cliente'), 'Juros aplicados com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao aplicar juros: ' . $e->getMessage());
        }
    }

    /**
     * Configura juros programados para uma conta
     */
    public function configurarJuros(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'tipo' => 'required|in:percentual,fixo',
            'valor' => 'required|numeric|min:0',
            'data_inicio_cobranca' => 'required|date',
            'frequencia' => 'required|in:unica,diaria,semanal,mensal',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $conta = ContaReceber::findOrFail($id);

            if ($conta->status === 'quitada') {
                return $this->error('Não é possível configurar juros para uma conta quitada', 422);
            }

            $conta->configurarJuros($request->all());

            return $this->success($conta->load('cliente'), 'Configuração de juros salva com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao configurar juros: ' . $e->getMessage());
        }
    }

    /**
     * Aplica juros programados a uma conta específica
     */
    public function aplicarJurosProgramados(Request $request, $id)
    {
        try {
            $conta = ContaReceber::findOrFail($id);

            if (!$conta->hasConfigJuros()) {
                return $this->error('Esta conta não possui configuração de juros', 422);
            }

            if (!$conta->deveAplicarJurosHoje()) {
                return $this->error('Não é momento de aplicar juros a esta conta', 422);
            }

            $sucesso = $conta->aplicarJuros($request->motivo ?? 'Aplicação manual de juros');

            if ($sucesso) {
                return $this->success($conta->load('cliente'), 'Juros aplicados com sucesso');
            } else {
                return $this->error('Não foi possível aplicar juros a esta conta');
            }
        } catch (\Exception $e) {
            return $this->error('Erro ao aplicar juros: ' . $e->getMessage());
        }
    }

    /**
     * Lista contas que devem ter juros aplicados hoje
     */
    public function contasParaAplicarJuros()
    {
        try {
            $contas = ContaReceber::devemAplicarJuros()
                ->with('cliente')
                ->get()
                ->filter(function ($conta) {
                    return $conta->deveAplicarJurosHoje();
                });

            return $this->success($contas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar contas para aplicar juros: ' . $e->getMessage());
        }
    }

    /**
     * Aplica juros programados a todas as contas elegíveis
     */
    public function aplicarJurosEmLote()
    {
        try {
            $contas = ContaReceber::devemAplicarJuros()
                ->with('cliente')
                ->get();

            $contasAplicadas = [];
            $contasNaoAplicadas = [];

            foreach ($contas as $conta) {
                if ($conta->deveAplicarJurosHoje()) {
                    if ($conta->aplicarJuros('Aplicação automática em lote')) {
                        $contasAplicadas[] = $conta;
                    } else {
                        $contasNaoAplicadas[] = $conta;
                    }
                }
            }

            return $this->success([
                'contas_aplicadas' => $contasAplicadas,
                'contas_nao_aplicadas' => $contasNaoAplicadas,
                'total_aplicadas' => count($contasAplicadas),
                'total_nao_aplicadas' => count($contasNaoAplicadas)
            ], 'Processamento de juros concluído');
        } catch (\Exception $e) {
            return $this->error('Erro ao aplicar juros em lote: ' . $e->getMessage());
        }
    }

    /**
     * Lista contas com juros configurados
     */
    public function contasComJurosConfigurados()
    {
        try {
            $contas = ContaReceber::comJurosConfigurados()
                ->with('cliente')
                ->orderBy('data_inicio_cobranca_juros')
                ->get();

            return $this->success($contas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar contas com juros configurados: ' . $e->getMessage());
        }
    }

    /**
     * Registra pagamento com parcelamento
     */
    public function registrarPagamentoComParcelamento(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'pagamentos' => 'array',
            'pagamentos.*.valor' => 'required|numeric|min:0',
            'pagamentos.*.forma_pagamento' => 'required|string|max:50',
            'pagamentos.*.observacoes' => 'nullable|string|max:500',
            'criar_parcelamento' => 'boolean',
            'dados_parcelamento' => 'required_if:criar_parcelamento,true|array',
            'dados_parcelamento.num_parcelas' => 'required_if:criar_parcelamento,true|integer|min:2',
            'dados_parcelamento.intervalo_dias' => 'required_if:criar_parcelamento,true|integer|min:1',
            'dados_parcelamento.data_primeira_parcela' => 'required_if:criar_parcelamento,true|date',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            \Log::info('Iniciando registro de pagamento para conta a receber', ['conta_id' => $id]);
            
            $conta = ContaReceber::findOrFail($id);

            $totalPago = 0;
            $parcelas = [];
            
            // Garantir que pagamentos seja um array
            $pagamentos = $request->pagamentos ?? [];
            
            // Se não for apenas parcelamento, processar pagamentos
            if (!$request->criar_parcelamento || !empty($pagamentos)) {
                // Calcular o total dos pagamentos que serão registrados
                $totalPagamentos = collect($pagamentos)->sum('valor');
                
                // Verificar se há valor pendente para receber
                // Só bloquear se a conta estiver realmente quitada (status = 'quitada') E não há valor pendente
                if ($conta->status === 'quitada' && $conta->valor_pendente <= 0 && $totalPagamentos > 0) {
                    return $this->error('Não é possível registrar pagamento em uma conta já quitada (valor pendente: R$ ' . number_format($conta->valor_pendente, 2, ',', '.') . ')', 422);
                }
                
                // Se a conta tem valor pendente <= 0 mas não está quitada, permitir o pagamento
                // Isso pode acontecer em casos de arredondamento ou inconsistências temporárias
                if ($conta->valor_pendente <= 0 && $conta->status !== 'quitada' && $totalPagamentos > 0) {
                    \Log::warning('Conta com valor pendente <= 0 mas status não quitada', [
                        'conta_id' => $conta->id,
                        'valor_pendente' => $conta->valor_pendente,
                        'status' => $conta->status,
                        'total_pagamentos' => $totalPagamentos
                    ]);
                }
                
                // Verificar se o total dos pagamentos não excede o valor pendente
                if ($totalPagamentos > $conta->valor_pendente && $conta->valor_pendente > 0) {
                    return $this->error('O valor total dos pagamentos (R$ ' . number_format($totalPagamentos, 2, ',', '.') . ') não pode ser maior que o valor pendente (R$ ' . number_format($conta->valor_pendente, 2, ',', '.') . ')', 422);
                }

                // Registrar pagamentos (apenas os com valor > 0)
                foreach ($pagamentos as $pagamento) {
                    if ($pagamento['valor'] > 0) {
                        // Verificar se o pagamento não excede o valor pendente
                        if ($pagamento['valor'] > $conta->valor_pendente) {
                            \Log::warning('Pagamento excede valor pendente, ajustando', [
                                'conta_id' => $conta->id,
                                'valor_pagamento' => $pagamento['valor'],
                                'valor_pendente' => $conta->valor_pendente
                            ]);
                            // Ajustar o valor do pagamento para não exceder o pendente
                            $pagamento['valor'] = $conta->valor_pendente;
                        }
                        
                        $resultado = $conta->registrarPagamento([
                            'valor' => $pagamento['valor'],
                            'forma_pagamento' => $pagamento['forma_pagamento'],
                            'observacoes' => $pagamento['observacoes'] ?? null,
                        ]);
                        
                        if ($resultado === false) {
                            \Log::error('Falha ao registrar pagamento', [
                                'conta_id' => $conta->id,
                                'valor_pagamento' => $pagamento['valor'],
                                'status_conta' => $conta->status
                            ]);
                            continue; // Pular este pagamento se falhou
                        }
                        
                        $totalPago += $pagamento['valor'];
                    }
                }

                \Log::info('Pagamentos registrados na conta', [
                    'conta_id' => $id,
                    'total_pago' => $totalPago,
                    'valor_pendente_apos' => $conta->valor_pendente
                ]);

                // Criar lançamentos na tabela lancamentos_caixa
                $this->criarLancamentosCaixa($conta, $pagamentos);
            }

            // Criar parcelamento se solicitado
            if ($request->criar_parcelamento && $conta->valor_pendente > 0) {
                $parcelas = $conta->criarParcelas($request->dados_parcelamento);
                $mensagem = "Parcelamento realizado com sucesso. Foram criadas " . count($parcelas) . " parcelas.";
            } else {
                $mensagem = $totalPago > 0 ? "Pagamento de R$ " . number_format($totalPago, 2, ',', '.') . " registrado com sucesso." : "Operação realizada com sucesso.";
            }

            return $this->success([
                'conta' => $conta->load('cliente'),
                'parcelas' => $parcelas,
                'total_pago' => $totalPago,
                'valor_restante' => $conta->valor_pendente
            ], $mensagem);

        } catch (\Exception $e) {
            \Log::error('Erro ao registrar pagamento', [
                'conta_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao registrar pagamento: ' . $e->getMessage());
        }
    }

    /**
     * Cria lançamentos na tabela lancamentos_caixa para os pagamentos recebidos
     */
    private function criarLancamentosCaixa($conta, $pagamentos)
    {
        try {
            \Log::info('Iniciando criação de lançamentos no caixa', [
                'conta_id' => $conta->id,
                'total_pagamentos' => count($pagamentos)
            ]);

            // Verificar se há caixa aberto
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            if (!$caixaAberto) {
                \Log::info('Nenhum caixa aberto encontrado, não criando lançamentos', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Verificar se o caixa não foi fechado
            $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
            
            \Log::info('Verificando status do caixa', [
                'caixa_aberto_id' => $caixaAberto->id,
                'sessao_id' => $sessaoId
            ]);

            $fechamento = null;
            if ($sessaoId) {
                $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                    ->where('tenant_id', auth()->user()->tenant_id)
                    ->whereJsonContains('metadados->sessao_id', $sessaoId)
                    ->first();
            }

            \Log::info('Status do caixa', [
                'tem_fechamento' => $fechamento ? 'sim' : 'não',
                'fechamento_id' => $fechamento ? $fechamento->id : null
            ]);

            // Se há fechamento, o caixa está fechado
            if ($fechamento) {
                \Log::info('Caixa fechado, não criando lançamentos', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Buscar conta de caixa
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('Conta de caixa não encontrada', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Buscar categoria de receita
            $categoriaReceita = CategoriaCaixa::where('tipo', 'receita')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            // Criar lançamento para cada pagamento
            foreach ($pagamentos as $pagamento) {
            // Determinar a conta bancária baseada no tipo de pagamento
            $contaBancariaId = null;
            $contaBancariaNome = null;
            $contaBancaria = null;
            
            // Se tem conta_bancaria_id, usar a conta selecionada (para qualquer forma de pagamento)
            if (isset($pagamento['conta_bancaria_id']) && $pagamento['conta_bancaria_id']) {
                $contaBancaria = ContaBancaria::find($pagamento['conta_bancaria_id']);
                if ($contaBancaria && $contaBancaria->tenant_id === auth()->user()->tenant_id) {
                    $contaBancariaId = $contaBancaria->id;
                    $contaBancariaNome = $contaBancaria->nome;
                    \Log::info('Usando conta bancária selecionada para lançamento', [
                        'conta_bancaria_id' => $contaBancariaId,
                        'conta_bancaria_nome' => $contaBancariaNome,
                        'forma_pagamento' => $pagamento['forma_pagamento']
                    ]);
                }
            }
            
            // Se não encontrou conta específica, usar a conta de caixa apenas para dinheiro
            // Para outras formas de pagamento, buscar conta padrão do sistema
            if (!$contaBancariaId) {
                $formaPagamento = strtolower($pagamento['forma_pagamento'] ?? 'dinheiro');
                
                if ($formaPagamento === 'dinheiro') {
                    // Para dinheiro, usar conta de caixa
                    $contaBancariaId = $contaCaixa->id;
                    $contaBancariaNome = $contaCaixa->nome;
                    \Log::info('Usando conta de caixa para pagamento em dinheiro', [
                        'conta_id' => $contaBancariaId
                    ]);
                } else {
                    // Para outras formas de pagamento, buscar conta padrão do sistema
                    $contaPadrao = ContaBancaria::where('tenant_id', auth()->user()->tenant_id)
                        ->where('conta_padrao', true)
                        ->where('ativo', true)
                        ->first();
                    
                    if ($contaPadrao) {
                        $contaBancariaId = $contaPadrao->id;
                        $contaBancariaNome = $contaPadrao->nome;
                        \Log::info('Usando conta padrão do sistema (conta selecionada não encontrada)', [
                            'conta_bancaria_id' => $contaBancariaId,
                            'forma_pagamento' => $pagamento['forma_pagamento']
                        ]);
                    } else {
                        // Fallback: usar conta de caixa se não houver conta padrão
                        $contaBancariaId = $contaCaixa->id;
                        $contaBancariaNome = $contaCaixa->nome;
                        \Log::warning('Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                            'conta_id' => $contaBancariaId,
                            'forma_pagamento' => $pagamento['forma_pagamento']
                        ]);
                    }
                }
            }
                
                $dadosLancamento = [
                    'tenant_id' => auth()->user()->tenant_id,
                    'descricao' => "Recebimento: {$conta->descricao}",
                    'valor' => $pagamento['valor'],
                    'tipo' => 'entrada',
                    'data_operacao' => $pagamento['data_pagamento'] ?? now(),
                    'categoria_id' => $categoriaReceita ? $categoriaReceita->id : null,
                    'categoria_nome' => $categoriaReceita ? $categoriaReceita->nome : 'Receitas',
                    'conta_id' => $contaBancariaId,
                    'conta_nome' => $contaBancariaNome,
                    'forma_pagamento' => $pagamento['forma_pagamento'],
                    'operacao_tipo' => 'conta_receber_recebida',
                    'operacao_id' => $conta->id,
                    'usuario_id' => auth()->id(),
                    'usuario_nome' => auth()->user()->name,
                    'status' => 'concluido',
                    'metadados' => [
                        'sessao_id' => $sessaoId,
                        'conta_receber_id' => $conta->id,
                        'cliente_id' => $conta->cliente_id,
                        'cliente_nome' => $conta->cliente ? $conta->cliente->nome_completo : 'Cliente não encontrado',
                        'data_vencimento' => $conta->data_vencimento,
                        'observacoes' => $pagamento['observacoes'] ?? null,
                        'conta_bancaria_original' => $pagamento['conta_bancaria_id'] ?? null,
                        'conta_bancaria_nome' => $contaBancariaNome,
                        'conta_bancaria_banco' => $contaBancaria ? $contaBancaria->nome_banco : null
                    ]
                ];

                \Log::info('Criando lançamento no caixa', [
                    'dados_lancamento' => $dadosLancamento
                ]);

                try {
                    $lancamento = LancamentoCaixa::create($dadosLancamento);

                    \Log::info('Lançamento no caixa criado com sucesso', [
                        'lancamento_id' => $lancamento->id,
                        'codigo' => $lancamento->codigo,
                        'conta_id' => $conta->id
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Erro ao criar lançamento no caixa', [
                        'conta_id' => $conta->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                        'dados_lancamento' => $dadosLancamento
                    ]);
                    // Não falhar o processo por erro no lançamento
                }
            }

        } catch (\Exception $e) {
            \Log::error('Erro ao criar lançamentos no caixa', [
                'conta_id' => $conta->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não falhar o processo por erro nos lançamentos
        }
    }

    /**
     * Cria um lançamento na tabela lancamentos_caixa para um pagamento recebido
     */
    private function criarLancamentoCaixa($conta, $pagamento)
    {
        try {
            \Log::info('Iniciando criação de lançamento no caixa', [
                'conta_id' => $conta->id,
                'valor' => $pagamento['valor']
            ]);

            // Verificar se há caixa aberto
            $caixaAberto = LancamentoCaixa::where('operacao_tipo', 'abertura_caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->orderBy('data_operacao', 'desc')
                ->first();

            if (!$caixaAberto) {
                \Log::info('Nenhum caixa aberto encontrado, não criando lançamento', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Verificar se o caixa não foi fechado
            $sessaoId = $caixaAberto->metadados['sessao_id'] ?? null;
            
            $fechamento = null;
            if ($sessaoId) {
                $fechamento = LancamentoCaixa::where('operacao_tipo', 'fechamento_caixa')
                    ->where('tenant_id', auth()->user()->tenant_id)
                    ->whereJsonContains('metadados->sessao_id', $sessaoId)
                    ->first();
            }

            // Se há fechamento, o caixa está fechado
            if ($fechamento) {
                \Log::info('Caixa fechado, não criando lançamento', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Buscar conta de caixa
            $contaCaixa = ContaBancaria::where('tipo', 'caixa')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            if (!$contaCaixa) {
                \Log::warning('Conta de caixa não encontrada', [
                    'conta_id' => $conta->id
                ]);
                return;
            }

            // Buscar categoria de receita
            $categoriaReceita = CategoriaCaixa::where('tipo', 'receita')
                ->where('tenant_id', auth()->user()->tenant_id)
                ->where('ativo', true)
                ->first();

            // Determinar a conta bancária baseada no tipo de pagamento
            $contaBancariaId = null;
            $contaBancariaNome = null;
            
            // Se tem conta_bancaria_id, usar a conta selecionada (para qualquer forma de pagamento)
            if (isset($pagamento['conta_bancaria_id']) && $pagamento['conta_bancaria_id']) {
                $contaBancaria = ContaBancaria::find($pagamento['conta_bancaria_id']);
                if ($contaBancaria && $contaBancaria->tenant_id === auth()->user()->tenant_id) {
                    $contaBancariaId = $contaBancaria->id;
                    $contaBancariaNome = $contaBancaria->nome;
                    \Log::info('Usando conta bancária selecionada', [
                        'conta_bancaria_id' => $contaBancariaId,
                        'conta_bancaria_nome' => $contaBancariaNome,
                        'forma_pagamento' => $pagamento['forma_pagamento']
                    ]);
                }
            }
            
            // Se não encontrou conta específica, usar a conta de caixa apenas para dinheiro
            // Para outras formas de pagamento, buscar conta padrão do sistema
            if (!$contaBancariaId) {
                $formaPagamento = strtolower($pagamento['forma_pagamento'] ?? 'dinheiro');
                
                if ($formaPagamento === 'dinheiro') {
                    // Para dinheiro, usar conta de caixa
                    $contaBancariaId = $contaCaixa->id;
                    $contaBancariaNome = $contaCaixa->nome;
                    \Log::info('Usando conta de caixa para pagamento em dinheiro', [
                        'conta_id' => $contaBancariaId
                    ]);
                } else {
                    // Para outras formas de pagamento, buscar conta padrão do sistema
                    $contaPadrao = ContaBancaria::where('tenant_id', auth()->user()->tenant_id)
                        ->where('conta_padrao', true)
                        ->where('ativo', true)
                        ->first();
                    
                    if ($contaPadrao) {
                        $contaBancariaId = $contaPadrao->id;
                        $contaBancariaNome = $contaPadrao->nome;
                        \Log::info('Usando conta padrão do sistema (conta selecionada não encontrada)', [
                            'conta_bancaria_id' => $contaBancariaId,
                            'forma_pagamento' => $pagamento['forma_pagamento']
                        ]);
                    } else {
                        // Fallback: usar conta de caixa se não houver conta padrão
                        $contaBancariaId = $contaCaixa->id;
                        $contaBancariaNome = $contaCaixa->nome;
                        \Log::warning('Nenhuma conta padrão encontrada, usando conta de caixa como fallback', [
                            'conta_id' => $contaBancariaId,
                            'forma_pagamento' => $pagamento['forma_pagamento']
                        ]);
                    }
                }
            }

            $dadosLancamento = [
                'tenant_id' => auth()->user()->tenant_id,
                'descricao' => "Recebimento: {$conta->descricao}",
                'valor' => $pagamento['valor'],
                'tipo' => 'entrada',
                'data_operacao' => $pagamento['data_pagamento'] ?? now(),
                'categoria_id' => $categoriaReceita ? $categoriaReceita->id : null,
                'categoria_nome' => $categoriaReceita ? $categoriaReceita->nome : 'Receitas',
                'conta_id' => $contaBancariaId,
                'conta_nome' => $contaBancariaNome,
                'forma_pagamento' => $pagamento['forma_pagamento'],
                'operacao_tipo' => 'conta_receber_recebida',
                'operacao_id' => $conta->id,
                'usuario_id' => auth()->id(),
                'usuario_nome' => auth()->user()->name,
                'status' => 'concluido',
                'metadados' => [
                    'sessao_id' => $sessaoId,
                    'conta_receber_id' => $conta->id,
                    'cliente_id' => $conta->cliente_id,
                    'cliente_nome' => $conta->cliente ? $conta->cliente->nome_completo : 'Cliente não encontrado',
                    'data_vencimento' => $conta->data_vencimento,
                    'observacoes' => $pagamento['observacoes'] ?? null,
                    'conta_bancaria_original' => $pagamento['conta_bancaria_id'] ?? null
                ]
            ];

            \Log::info('Criando lançamento no caixa', [
                'dados_lancamento' => $dadosLancamento
            ]);

            try {
                $lancamento = LancamentoCaixa::create($dadosLancamento);

                \Log::info('Lançamento no caixa criado com sucesso', [
                    'lancamento_id' => $lancamento->id,
                    'codigo' => $lancamento->codigo,
                    'conta_id' => $conta->id
                ]);
            } catch (\Exception $e) {
                \Log::error('Erro ao criar lançamento no caixa', [
                    'conta_id' => $conta->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'dados_lancamento' => $dadosLancamento
                ]);
                // Não falhar o processo por erro no lançamento
            }

        } catch (\Exception $e) {
            \Log::error('Erro ao criar lançamento no caixa', [
                'conta_id' => $conta->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            // Não falhar o processo por erro no lançamento
        }
    }

    /**
     * Lista parcelas de uma conta
     */
    public function listarParcelas($id)
    {
        try {
            $conta = ContaReceber::findOrFail($id);
            $parcelas = $conta->parcelas()->with('cliente')->get();

            return $this->success($parcelas);
        } catch (\Exception $e) {
            return $this->error('Erro ao listar parcelas: ' . $e->getMessage());
        }
    }

    /**
     * Lista contas parceladas
     */
    public function contasParceladas()
    {
        try {
            $contas = ContaReceber::parceladas()
                ->with(['cliente', 'contaOrigem'])
                ->orderBy('data_vencimento')
                ->get();

            return $this->success($contas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar contas parceladas: ' . $e->getMessage());
        }
    }

    /**
     * Busca recebimentos de clientes para relatório
     */
    public function recebimentosClientes(Request $request)
    {
        try {
            $query = ContaReceber::with('cliente')
                ->whereNotNull('historico_pagamentos')
                ->where('historico_pagamentos', '!=', '[]')
                ->where('historico_pagamentos', '!=', 'null');

            // Filtrar por user_id apenas se o usuário estiver autenticado
            if (auth()->check()) {
                $query->where('user_id', auth()->id());
            }

            // Filtros
            if ($request->has('cliente_id')) {
                $query->where('cliente_id', $request->cliente_id);
            }

            if ($request->has('data_inicio')) {
                $query->whereDate('data_quitacao', '>=', $request->data_inicio);
            }

            if ($request->has('data_fim')) {
                $query->whereDate('data_quitacao', '<=', $request->data_fim);
            }

            $contas = $query->get();

            \Log::info('Contas encontradas para recebimentos:', [
                'total_contas' => $contas->count(),
                'user_id' => auth()->id()
            ]);

            $recebimentos = [];

            foreach ($contas as $conta) {
                \Log::info('Processando conta:', [
                    'conta_id' => $conta->id,
                    'historico_pagamentos' => $conta->historico_pagamentos,
                    'is_array' => is_array($conta->historico_pagamentos)
                ]);

                if ($conta->historico_pagamentos && is_array($conta->historico_pagamentos)) {
                    foreach ($conta->historico_pagamentos as $pagamento) {
                        $recebimentos[] = [
                            'id' => $conta->id . '_' . $pagamento['data'],
                            'clienteId' => $conta->cliente_id,
                            'clienteNome' => $conta->cliente ? $conta->cliente->nome_completo : 'Cliente não encontrado',
                            'data' => $pagamento['data'],
                            'valor' => $pagamento['valor'],
                            'formaPagamento' => $pagamento['forma_pagamento'] ?? 'Não informado',
                            'observacoes' => $pagamento['observacoes'] ?? '',
                            'origem' => $conta->descricao,
                            'contaId' => $conta->id
                        ];
                    }
                }
            }

            \Log::info('Recebimentos processados:', [
                'total_recebimentos' => count($recebimentos)
            ]);

            // Ordenar por data (mais recente primeiro)
            usort($recebimentos, function($a, $b) {
                return strtotime($b['data']) - strtotime($a['data']);
            });

            return $this->success($recebimentos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar recebimentos:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Erro ao buscar recebimentos: ' . $e->getMessage());
        }
    }

    /**
     * Retorna o total de valores pendentes a receber (independente de período).
     * Utilizado para calcular a Projeção de Saldo no Fluxo de Caixa.
     */
    public function totaisPendentes()
    {
        try {
            $tenantId = auth()->user()->tenant_id ?? null;

            $query = ContaReceber::whereIn('status', ['pendente', 'vencido']);

            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            } else {
                $query->where('user_id', auth()->id());
            }

            $totalAReceber     = $query->sum('valor_pendente');
            $totalVencido      = (clone $query)->where('status', 'vencido')->sum('valor_pendente');
            $quantidadePendente = (clone $query)->count();

            return $this->success([
                'total_a_receber'      => round((float) $totalAReceber, 2),
                'total_vencido'        => round((float) $totalVencido, 2),
                'quantidade_pendente'  => (int) $quantidadePendente,
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar totais pendentes: ' . $e->getMessage());
        }
    }
} 