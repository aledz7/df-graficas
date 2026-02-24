<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\KanbanColumn;
use App\Models\KanbanOSPosition;
use App\Models\KanbanMovimentacao;
use App\Models\KanbanOSItemProgress;
use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use Carbon\Carbon;

class KanbanController extends Controller
{
    /**
     * Obter todas as colunas do Kanban do usuário
     */
    public function getColumns()
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Buscar ou criar coluna obrigatória "NOVOS PEDIDOS"
            $colunaObrigatoria = KanbanColumn::firstOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'user_id' => $userId,
                    'is_obrigatoria' => true,
                ],
                [
                    'nome' => 'NOVOS PEDIDOS',
                    'cor' => '#8b5cf6', // Roxo
                    'ordem' => 0,
                    'is_sistema' => true,
                ]
            );

            // Buscar todas as colunas do usuário ordenadas
            $columns = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->orderBy('ordem')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $columns,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter colunas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Criar nova coluna
     */
    public function createColumn(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:255',
                'cor' => 'nullable|string|max:7',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Obter a última ordem
            $ultimaOrdem = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->max('ordem') ?? 0;

            $column = KanbanColumn::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'nome' => $request->nome,
                'cor' => $request->cor ?? '#6366f1',
                'ordem' => $ultimaOrdem + 1,
                'is_obrigatoria' => false,
                'is_sistema' => false,
            ]);

            return response()->json([
                'success' => true,
                'data' => $column,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao criar coluna',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Atualizar coluna
     */
    public function updateColumn(Request $request, $id)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $column = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('id', $id)
                ->first();

            if (!$column) {
                return response()->json([
                    'success' => false,
                    'error' => 'Coluna não encontrada',
                ], 404);
            }

            // Não permitir alterar coluna obrigatória
            if ($column->is_obrigatoria) {
                return response()->json([
                    'success' => false,
                    'error' => 'Não é possível alterar a coluna obrigatória',
                ], 403);
            }

            $validator = Validator::make($request->all(), [
                'nome' => 'sometimes|required|string|max:255',
                'cor' => 'sometimes|nullable|string|max:7',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $column->update($request->only(['nome', 'cor']));

            return response()->json([
                'success' => true,
                'data' => $column,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao atualizar coluna',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Excluir coluna
     */
    public function deleteColumn($id)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $column = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('id', $id)
                ->first();

            if (!$column) {
                return response()->json([
                    'success' => false,
                    'error' => 'Coluna não encontrada',
                ], 404);
            }

            // Não permitir excluir coluna obrigatória ou do sistema
            if ($column->is_obrigatoria || $column->is_sistema) {
                return response()->json([
                    'success' => false,
                    'error' => 'Não é possível excluir esta coluna',
                ], 403);
            }

            // Mover todas as OS desta coluna para "NOVOS PEDIDOS"
            $colunaObrigatoria = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('is_obrigatoria', true)
                ->first();

            if ($colunaObrigatoria) {
                KanbanOSPosition::where('kanban_coluna_id', $id)
                    ->where('user_id', $userId)
                    ->update(['kanban_coluna_id' => $colunaObrigatoria->id]);
            }

            $column->delete();

            return response()->json([
                'success' => true,
                'message' => 'Coluna excluída com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao excluir coluna',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reordenar colunas
     */
    public function reorderColumns(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'columns' => 'required|array',
                'columns.*.id' => 'required|exists:kanban_columns,id',
                'columns.*.ordem' => 'required|integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            DB::transaction(function () use ($request, $tenantId, $userId) {
                foreach ($request->columns as $columnData) {
                    KanbanColumn::where('tenant_id', $tenantId)
                        ->where('user_id', $userId)
                        ->where('id', $columnData['id'])
                        ->update(['ordem' => $columnData['ordem']]);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Colunas reordenadas com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao reordenar colunas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter OS do Kanban do usuário
     */
    public function getOS(Request $request)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Buscar todas as OS atribuídas ao usuário
            $osQuery = OrdemServico::where('tenant_id', $tenantId)
                ->where('funcionario_id', $userId)
                ->whereNull('deleted_at')
                ->with(['cliente', 'itens']);

            $osList = $osQuery->get();

            // Buscar posições no Kanban
            $positions = KanbanOSPosition::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->with(['coluna', 'ordemServico.cliente', 'ordemServico.itens'])
                ->get()
                ->keyBy('ordem_servico_id');

            // Buscar progresso dos itens
            $progress = KanbanOSItemProgress::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->get()
                ->groupBy('ordem_servico_id');

            // Organizar OS por coluna
            $osByColumn = [];
            foreach ($osList as $os) {
                $position = $positions->get($os->id);
                
                if ($position) {
                    // OS já está em uma coluna
                    $colunaId = $position->kanban_coluna_id;
                    if (!isset($osByColumn[$colunaId])) {
                        $osByColumn[$colunaId] = [];
                    }
                    
                    $osData = $this->formatOSData($os, $position, $progress->get($os->id, collect()));
                    $osByColumn[$colunaId][] = $osData;
                } else {
                    // OS nova - adicionar à coluna "NOVOS PEDIDOS"
                    $colunaObrigatoria = KanbanColumn::where('tenant_id', $tenantId)
                        ->where('user_id', $userId)
                        ->where('is_obrigatoria', true)
                        ->first();

                    if ($colunaObrigatoria) {
                        // Criar posição
                        $position = KanbanOSPosition::create([
                            'tenant_id' => $tenantId,
                            'ordem_servico_id' => $os->id,
                            'kanban_coluna_id' => $colunaObrigatoria->id,
                            'user_id' => $userId,
                            'ordem' => 0,
                        ]);

                        if (!isset($osByColumn[$colunaObrigatoria->id])) {
                            $osByColumn[$colunaObrigatoria->id] = [];
                        }

                        $osData = $this->formatOSData($os, $position, $progress->get($os->id, collect()));
                        $osByColumn[$colunaObrigatoria->id][] = $osData;
                    }
                }
            }

            // Buscar coluna obrigatória para ordenação
            $colunaObrigatoria = KanbanColumn::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('is_obrigatoria', true)
                ->first();

            // Ordenar OS em cada coluna
            foreach ($osByColumn as $colunaId => &$osList) {
                if ($colunaObrigatoria && $colunaId == $colunaObrigatoria->id) {
                    // Ordenar por prioridade na coluna NOVOS PEDIDOS
                    usort($osList, [$this, 'sortByPriority']);
                } else {
                    // Ordenar por ordem
                    usort($osList, function($a, $b) {
                        return $a['ordem'] <=> $b['ordem'];
                    });
                }
            }

            return response()->json([
                'success' => true,
                'data' => $osByColumn,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter OS',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mover OS entre colunas
     */
    public function moveOS(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'os_id' => 'required|exists:ordens_servico,id',
                'coluna_anterior_id' => 'nullable|exists:kanban_columns,id',
                'coluna_nova_id' => 'required|exists:kanban_columns,id',
                'nova_ordem' => 'nullable|integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Verificar se a OS pertence ao usuário
            $os = OrdemServico::where('tenant_id', $tenantId)
                ->where('funcionario_id', $userId)
                ->where('id', $request->os_id)
                ->first();

            if (!$os) {
                return response()->json([
                    'success' => false,
                    'error' => 'OS não encontrada ou não atribuída a você',
                ], 404);
            }

            DB::transaction(function () use ($request, $tenantId, $userId, $os) {
                // Buscar ou criar posição
                $position = KanbanOSPosition::where('tenant_id', $tenantId)
                    ->where('user_id', $userId)
                    ->where('ordem_servico_id', $request->os_id)
                    ->first();

                $colunaAnteriorId = $position ? $position->kanban_coluna_id : null;

                if ($position) {
                    $position->update([
                        'kanban_coluna_id' => $request->coluna_nova_id,
                        'ordem' => $request->nova_ordem ?? 0,
                    ]);
                } else {
                    $position = KanbanOSPosition::create([
                        'tenant_id' => $tenantId,
                        'ordem_servico_id' => $request->os_id,
                        'kanban_coluna_id' => $request->coluna_nova_id,
                        'user_id' => $userId,
                        'ordem' => $request->nova_ordem ?? 0,
                    ]);
                }

                // Registrar movimentação
                KanbanMovimentacao::create([
                    'tenant_id' => $tenantId,
                    'ordem_servico_id' => $request->os_id,
                    'user_id' => $userId,
                    'coluna_anterior_id' => $colunaAnteriorId,
                    'coluna_nova_id' => $request->coluna_nova_id,
                    'data_movimentacao' => now(),
                ]);
            });

            return response()->json([
                'success' => true,
                'message' => 'OS movida com sucesso',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao mover OS',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Atualizar progresso de item da OS
     */
    public function updateItemProgress(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'os_id' => 'required|exists:ordens_servico,id',
                'item_id' => 'required|exists:ordens_servico_itens,id',
                'concluido' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Verificar se a OS pertence ao usuário
            $os = OrdemServico::where('tenant_id', $tenantId)
                ->where('funcionario_id', $userId)
                ->where('id', $request->os_id)
                ->first();

            if (!$os) {
                return response()->json([
                    'success' => false,
                    'error' => 'OS não encontrada ou não atribuída a você',
                ], 404);
            }

            $progress = KanbanOSItemProgress::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'ordem_servico_id' => $request->os_id,
                    'ordem_servico_item_id' => $request->item_id,
                    'user_id' => $userId,
                ],
                [
                    'concluido' => $request->concluido,
                    'data_conclusao' => $request->concluido ? now() : null,
                ]
            );

            // Calcular progresso total
            $totalItens = OrdemServicoItem::where('ordem_servico_id', $request->os_id)->count();
            $itensConcluidos = KanbanOSItemProgress::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('ordem_servico_id', $request->os_id)
                ->where('concluido', true)
                ->count();

            $progressoPercentual = $totalItens > 0 ? ($itensConcluidos / $totalItens) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'progress' => $progress,
                    'progresso_percentual' => round($progressoPercentual, 2),
                    'itens_concluidos' => $itensConcluidos,
                    'total_itens' => $totalItens,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao atualizar progresso',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter detalhes completos de uma OS
     */
    public function getOSDetails($id)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            $os = OrdemServico::where('tenant_id', $tenantId)
                ->where('funcionario_id', $userId)
                ->where('id', $id)
                ->with(['cliente', 'itens', 'anexos'])
                ->first();

            if (!$os) {
                return response()->json([
                    'success' => false,
                    'error' => 'OS não encontrada ou não atribuída a você',
                ], 404);
            }

            // Buscar progresso dos itens
            $progress = KanbanOSItemProgress::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->where('ordem_servico_id', $id)
                ->get()
                ->keyBy('ordem_servico_item_id');

            // Adicionar progresso aos itens
            $itensComProgresso = $os->itens->map(function ($item) use ($progress) {
                $itemProgress = $progress->get($item->id);
                $item->concluido = $itemProgress ? $itemProgress->concluido : false;
                return $item;
            });

            $totalItens = $os->itens->count();
            $itensConcluidos = $progress->where('concluido', true)->count();
            $progressoPercentual = $totalItens > 0 ? ($itensConcluidos / $totalItens) * 100 : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'os' => $os,
                    'itens' => $itensComProgresso,
                    'progresso' => [
                        'percentual' => round($progressoPercentual, 2),
                        'itens_concluidos' => $itensConcluidos,
                        'total_itens' => $totalItens,
                    ],
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter detalhes da OS',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Formatar dados da OS para o frontend
     */
    private function formatOSData($os, $position, $progress)
    {
        $totalItens = $os->itens->count();
        $itensConcluidos = $progress->where('concluido', true)->count();
        $progressoPercentual = $totalItens > 0 ? ($itensConcluidos / $totalItens) * 100 : 0;

        // Verificar se está atrasado
        $isAtrasado = false;
        if ($os->prazo_datahora) {
            $isAtrasado = Carbon::parse($os->prazo_datahora)->isPast();
        } elseif ($os->data_prevista_entrega) {
            $isAtrasado = Carbon::parse($os->data_prevista_entrega)->isPast();
        }

        return [
            'id' => $os->id,
            'numero_os' => $os->numero_os ?? $os->id_os,
            'cliente' => $os->cliente ? [
                'id' => $os->cliente->id,
                'nome' => $os->cliente->nome_completo ?? $os->cliente->apelido_fantasia ?? 'Cliente',
                'telefone' => $os->cliente->telefone ?? $os->cliente->celular ?? null,
            ] : null,
            'telefone' => $os->cliente_info['telefone'] ?? $os->cliente->telefone ?? null,
            'tem_arte_pronta' => $os->tem_arte_pronta ?? false,
            'prazo_tipo' => $os->prazo_tipo,
            'prazo_datahora' => $os->prazo_datahora,
            'data_prevista_entrega' => $os->data_prevista_entrega,
            'observacoes' => $os->observacoes,
            'itens' => $os->itens->map(function ($item) use ($progress) {
                $itemProgress = $progress->firstWhere('ordem_servico_item_id', $item->id);
                return [
                    'id' => $item->id,
                    'nome' => $item->nome_servico_produto,
                    'quantidade' => $item->quantidade,
                    'concluido' => $itemProgress ? $itemProgress->concluido : false,
                ];
            }),
            'progresso' => [
                'percentual' => round($progressoPercentual, 2),
                'itens_concluidos' => $itensConcluidos,
                'total_itens' => $totalItens,
            ],
            'is_atrasado' => $isAtrasado,
            'coluna_id' => $position->kanban_coluna_id,
            'ordem' => $position->ordem,
        ];
    }

    /**
     * Ordenar por prioridade (para coluna NOVOS PEDIDOS)
     */
    private function sortByPriority($a, $b)
    {
        // 1. Arte pronta + prazo específico
        // 2. Arte pronta
        // 3. Prazo específico
        // 4. Demais OS
        // Em caso de empate: prazo mais próximo, depois mais recente

        $aArtePronta = $a['tem_arte_pronta'] ?? false;
        $bArtePronta = $b['tem_arte_pronta'] ?? false;
        $aPrazoEspecifico = !empty($a['prazo_datahora']);
        $bPrazoEspecifico = !empty($b['prazo_datahora']);

        // Prioridade 1: Arte pronta + prazo específico
        if ($aArtePronta && $aPrazoEspecifico && !($bArtePronta && $bPrazoEspecifico)) {
            return -1;
        }
        if ($bArtePronta && $bPrazoEspecifico && !($aArtePronta && $aPrazoEspecifico)) {
            return 1;
        }

        // Prioridade 2: Arte pronta
        if ($aArtePronta && !$bArtePronta) {
            return -1;
        }
        if ($bArtePronta && !$aArtePronta) {
            return 1;
        }

        // Prioridade 3: Prazo específico
        if ($aPrazoEspecifico && !$bPrazoEspecifico) {
            return -1;
        }
        if ($bPrazoEspecifico && !$aPrazoEspecifico) {
            return 1;
        }

        // Em caso de empate: prazo mais próximo
        if ($aPrazoEspecifico && $bPrazoEspecifico) {
            $aPrazo = Carbon::parse($a['prazo_datahora']);
            $bPrazo = Carbon::parse($b['prazo_datahora']);
            return $aPrazo->lt($bPrazo) ? -1 : 1;
        }

        // Mais recente
        return 0;
    }
}
