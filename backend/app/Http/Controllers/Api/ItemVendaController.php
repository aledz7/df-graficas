<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ItemVendaController extends Controller
{
    /**
     * Retornar todos os itens da tabela itens_venda
     * Filtra pela data de PAGAMENTO/RECEBIMENTO (quando o dinheiro foi efetivamente recebido)
     * OU pela data de VENDA/CRIAÇÃO do item (quando foi vendido)
     * 
     * Parâmetros:
     * - filtrar_por_data_venda: se true, filtra por data de criação do item (created_at) ou data_emissao da venda
     * - filtrar_por_data_venda: se false ou não informado, filtra por data de pagamento (comportamento padrão)
     * 
     * Lógica alinhada com o Relatório Simplificado:
     * - Vendas PDV à vista: data_emissao (quando foi vendido = quando foi pago)
     * - Vendas PDV a prazo: data_quitacao da conta a receber
     * - OS à vista: data_finalizacao_os
     * - OS a prazo: data_quitacao da conta a receber
     * - Envelopamentos à vista: data de finalização
     * - Envelopamentos a prazo: data_quitacao da conta a receber
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $dataInicio = $request->input('data_inicio');
            $dataFim = $request->input('data_fim');
            $filtrarPorDataVenda = $request->input('filtrar_por_data_venda', false);
            
            // Se não há filtro de data, retornar todos os itens
            if (!$dataInicio && !$dataFim) {
                $itens = DB::table('itens_venda')
                    ->where('tenant_id', $tenantId)
                    ->whereNull('deleted_at')
                    ->get();
                return response()->json($itens);
            }
            
            // Se filtrar por data de venda (criação do item), usar filtro direto na tabela itens_venda
            if ($filtrarPorDataVenda) {
                $query = DB::table('itens_venda')
                    ->where('tenant_id', $tenantId)
                    ->whereNull('deleted_at');
                
                if ($dataInicio) {
                    $query->whereDate('created_at', '>=', $dataInicio);
                }
                if ($dataFim) {
                    $query->whereDate('created_at', '<=', $dataFim);
                }
                
                $itens = $query->get();
                
                \Log::info('📊 [ItemVendaController] Filtro por data de VENDA (created_at):', [
                    'quantidade' => $itens->count(),
                    'data_inicio' => $dataInicio,
                    'data_fim' => $dataFim
                ]);
                
                return response()->json($itens);
            }
            
            // Arrays para armazenar IDs de vendas/OS/envelopamentos que foram PAGOS no período
            $vendasPagasNoPeriodo = [];
            $osPagasNoPeriodo = [];
            $envelopamentosPagosNoPeriodo = [];
            
            // ========================================
            // 1. VENDAS PDV À VISTA (pagas na emissão)
            // ========================================
            // Vendas concluídas onde NÃO é crediário (forma_pagamento não contém 'crediário')
            $vendasAVista = DB::table('vendas')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->where('status', 'concluida')
                ->where(function($q) {
                    $q->whereNull('forma_pagamento')
                      ->orWhere(function($subQ) {
                          $subQ->where('forma_pagamento', 'NOT LIKE', '%crediário%')
                               ->where('forma_pagamento', 'NOT LIKE', '%crediario%');
                      });
                })
                ->where(function($q) use ($dataInicio, $dataFim) {
                    if ($dataInicio) {
                        $q->whereDate('data_emissao', '>=', $dataInicio);
                    }
                    if ($dataFim) {
                        $q->whereDate('data_emissao', '<=', $dataFim);
                    }
                })
                ->pluck('id')
                ->toArray();
            
            $vendasPagasNoPeriodo = array_merge($vendasPagasNoPeriodo, $vendasAVista);
            
            \Log::info('📊 [ItemVendaController] Vendas à vista no período:', [
                'quantidade' => count($vendasAVista),
                'ids' => $vendasAVista
            ]);
            
            // ========================================
            // 2. CONTAS A RECEBER PAGAS NO PERÍODO
            // ========================================
            // Buscar contas a receber que foram quitadas/pagas no período
            $contasReceber = DB::table('contas_receber')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->get();
            
            foreach ($contasReceber as $conta) {
                $foiPagaNoPeriodo = false;
                $dataPagamentoEncontrada = null;
                
                // Prioridade 1: Verificar histórico de pagamentos (mais preciso)
                if ($conta->historico_pagamentos) {
                    $historico = json_decode($conta->historico_pagamentos, true);
                    if (is_array($historico) && !empty($historico)) {
                        foreach ($historico as $pagamento) {
                            if (isset($pagamento['data'])) {
                                $dataPagamento = date('Y-m-d', strtotime($pagamento['data']));
                                if ((!$dataInicio || $dataPagamento >= $dataInicio) && 
                                    (!$dataFim || $dataPagamento <= $dataFim)) {
                                    $foiPagaNoPeriodo = true;
                                    $dataPagamentoEncontrada = $dataPagamento;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Prioridade 2: Verificar data_quitacao
                if (!$foiPagaNoPeriodo && $conta->data_quitacao && $conta->status === 'quitada') {
                    $dataQuitacao = date('Y-m-d', strtotime($conta->data_quitacao));
                    if ((!$dataInicio || $dataQuitacao >= $dataInicio) && 
                        (!$dataFim || $dataQuitacao <= $dataFim)) {
                        $foiPagaNoPeriodo = true;
                        $dataPagamentoEncontrada = $dataQuitacao;
                    }
                }
                
                // Se a conta foi paga no período, adicionar a referência
                if ($foiPagaNoPeriodo) {
                    if ($conta->venda_id) {
                        $vendasPagasNoPeriodo[] = $conta->venda_id;
                    }
                    if ($conta->os_id) {
                        $osPagasNoPeriodo[] = $conta->os_id;
                    }
                    if ($conta->envelopamento_id) {
                        $envelopamentosPagosNoPeriodo[] = $conta->envelopamento_id;
                    }
                    
                    \Log::debug('💰 [ItemVendaController] Conta paga no período:', [
                        'conta_id' => $conta->id,
                        'venda_id' => $conta->venda_id,
                        'os_id' => $conta->os_id,
                        'envelopamento_id' => $conta->envelopamento_id,
                        'data_pagamento' => $dataPagamentoEncontrada
                    ]);
                }
            }
            
            // Remover duplicatas
            $vendasPagasNoPeriodo = array_unique($vendasPagasNoPeriodo);
            $osPagasNoPeriodo = array_unique($osPagasNoPeriodo);
            $envelopamentosPagosNoPeriodo = array_unique($envelopamentosPagosNoPeriodo);
            
            \Log::info('📊 [ItemVendaController] Resumo de pagamentos no período:', [
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
                'vendas_pagas' => count($vendasPagasNoPeriodo),
                'os_pagas' => count($osPagasNoPeriodo),
                'envelopamentos_pagos' => count($envelopamentosPagosNoPeriodo)
            ]);
            
            // ========================================
            // 3. BUSCAR ITENS DE VENDA
            // ========================================
            $query = DB::table('itens_venda')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at');
            
            // Se não há nenhuma venda/OS/envelopamento pago no período, retornar vazio
            if (empty($vendasPagasNoPeriodo) && empty($osPagasNoPeriodo) && empty($envelopamentosPagosNoPeriodo)) {
                \Log::info('📊 [ItemVendaController] Nenhum pagamento encontrado no período');
                return response()->json([]);
            }
            
            // Filtrar itens pelas vendas/OS/envelopamentos pagos no período
            $query->where(function($q) use ($vendasPagasNoPeriodo, $osPagasNoPeriodo, $envelopamentosPagosNoPeriodo) {
                $temFiltro = false;
                
                // Vendas PDV
                if (!empty($vendasPagasNoPeriodo)) {
                    $q->where(function($subQ) use ($vendasPagasNoPeriodo) {
                        $subQ->where(function($tipoQ) {
                            $tipoQ->where('tipo_venda', 'pdv')
                                  ->orWhereNull('tipo_venda')
                                  ->orWhere('tipo_venda', '');
                        })
                        ->whereIn('venda_id', $vendasPagasNoPeriodo);
                    });
                    $temFiltro = true;
                }
                
                // OS
                if (!empty($osPagasNoPeriodo)) {
                    if ($temFiltro) {
                        $q->orWhere(function($subQ) use ($osPagasNoPeriodo) {
                            $subQ->where('tipo_venda', 'os')
                                 ->whereIn('venda_referencia_id', $osPagasNoPeriodo);
                        });
                    } else {
                        $q->where(function($subQ) use ($osPagasNoPeriodo) {
                            $subQ->where('tipo_venda', 'os')
                                 ->whereIn('venda_referencia_id', $osPagasNoPeriodo);
                        });
                        $temFiltro = true;
                    }
                }
                
                // Envelopamentos
                if (!empty($envelopamentosPagosNoPeriodo)) {
                    if ($temFiltro) {
                        $q->orWhere(function($subQ) use ($envelopamentosPagosNoPeriodo) {
                            $subQ->where('tipo_venda', 'envelopamento')
                                 ->whereIn('venda_referencia_id', $envelopamentosPagosNoPeriodo);
                        });
                    } else {
                        $q->where(function($subQ) use ($envelopamentosPagosNoPeriodo) {
                            $subQ->where('tipo_venda', 'envelopamento')
                                 ->whereIn('venda_referencia_id', $envelopamentosPagosNoPeriodo);
                        });
                    }
                }
            });
            
            $itens = $query->get();
            
            // Log detalhado para debug
            \Log::info('📊 [ItemVendaController] Total de itens retornados:', [
                'quantidade' => $itens->count(),
                'data_inicio' => $dataInicio,
                'data_fim' => $dataFim,
                'vendas_pagas_count' => count($vendasPagasNoPeriodo),
                'os_pagas_count' => count($osPagasNoPeriodo),
                'envelopamentos_pagos_count' => count($envelopamentosPagosNoPeriodo)
            ]);
            
            // Log de amostra dos primeiros itens para debug
            if ($itens->count() > 0) {
                $amostra = $itens->take(5)->map(function($item) {
                    return [
                        'id' => $item->id,
                        'produto_id' => $item->produto_id,
                        'produto_nome' => $item->produto_nome,
                        'produto_codigo' => $item->produto_codigo,
                        'venda_id' => $item->venda_id,
                        'tipo_venda' => $item->tipo_venda,
                        'quantidade' => $item->quantidade
                    ];
                });
                \Log::info('📊 [ItemVendaController] Amostra de itens retornados:', $amostra->toArray());
            }
            
            return response()->json($itens);
            
        } catch (\Exception $e) {
            \Log::error('❌ [ItemVendaController] Erro ao buscar itens de venda:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar itens: ' . $e->getMessage()
            ], 500);
        }
    }
}
