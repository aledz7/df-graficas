<?php

namespace App\Services;

use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RelatorioProducaoService
{
    /**
     * Obter relatório completo de produção
     */
    public function obterRelatorio(int $tenantId, string $dataInicio, string $dataFim): array
    {
        $dataInicioCarbon = Carbon::parse($dataInicio)->startOfDay();
        $dataFimCarbon = Carbon::parse($dataFim)->endOfDay();

        // Buscar todos os itens de OS que entraram em produção no período
        $itens = OrdemServicoItem::where('ordens_servico_itens.tenant_id', $tenantId)
            ->join('ordens_servico', 'ordens_servico_itens.ordem_servico_id', '=', 'ordens_servico.id')
            ->where(function($query) use ($dataInicioCarbon, $dataFimCarbon) {
                // Itens que começaram produção no período OU que já estavam em produção mas foram concluídos no período
                $query->whereBetween('ordens_servico_itens.data_inicio_producao', [$dataInicioCarbon, $dataFimCarbon])
                      ->orWhere(function($q) use ($dataInicioCarbon, $dataFimCarbon) {
                          $q->whereNotNull('ordens_servico_itens.data_inicio_producao')
                            ->where('ordens_servico_itens.data_inicio_producao', '<=', $dataFimCarbon)
                            ->whereBetween('ordens_servico_itens.data_conclusao_producao', [$dataInicioCarbon, $dataFimCarbon]);
                      })
                      ->orWhere(function($q) use ($dataInicioCarbon, $dataFimCarbon) {
                          // Itens sem data_inicio_producao mas com OS criada no período (considerar como início)
                          $q->whereNull('ordens_servico_itens.data_inicio_producao')
                            ->whereBetween('ordens_servico.data_criacao', [$dataInicioCarbon, $dataFimCarbon]);
                      });
            })
            ->select('ordens_servico_itens.*', 'ordens_servico.id_os', 'ordens_servico.data_criacao', 'ordens_servico.data_prevista_entrega', 'ordens_servico.dados_producao')
            ->with(['ordemServico', 'produto'])
            ->get();

        // Calcular indicadores
        $indicadores = $this->calcularIndicadores($itens, $dataInicioCarbon, $dataFimCarbon);

        // Preparar detalhamento dos trabalhos
        $detalhamento = $this->prepararDetalhamento($itens);

        return [
            'indicadores' => $indicadores,
            'detalhamento' => $detalhamento,
            'periodo' => [
                'inicio' => $dataInicioCarbon->format('Y-m-d'),
                'fim' => $dataFimCarbon->format('Y-m-d'),
            ],
        ];
    }

    /**
     * Calcular todos os indicadores
     */
    protected function calcularIndicadores($itens, Carbon $dataInicio, Carbon $dataFim): array
    {
        // Total de trabalhos (itens que entraram em produção no período)
        $totalTrabalhos = $itens->count();

        // Trabalhos concluídos (com data_conclusao_producao)
        $trabalhosConcluidos = $itens->whereNotNull('data_conclusao_producao')->count();
        $percentualConcluidos = $totalTrabalhos > 0 ? ($trabalhosConcluidos / $totalTrabalhos) * 100 : 0;

        // Refações
        $refacoes = $itens->where('is_refacao', true)->count();
        $percentualRefacoes = $totalTrabalhos > 0 ? ($refacoes / $totalTrabalhos) * 100 : 0;

        // Tempo médio de produção (apenas trabalhos concluídos)
        $tempoMedio = $this->calcularTempoMedio($itens->whereNotNull('data_conclusao_producao'));

        // Trabalhos no prazo e com atraso
        $trabalhosNoPrazo = 0;
        $trabalhosComAtraso = 0;
        $atrasos = [];

        foreach ($itens->whereNotNull('data_conclusao_producao') as $item) {
            $prazoEstimado = $this->obterPrazoEstimado($item);
            
            if ($prazoEstimado) {
                $dataConclusao = Carbon::parse($item->data_conclusao_producao);
                $prazo = Carbon::parse($prazoEstimado);
                
                if ($dataConclusao->lte($prazo)) {
                    $trabalhosNoPrazo++;
                } else {
                    $trabalhosComAtraso++;
                    $atrasos[] = $dataConclusao->diffInHours($prazo);
                }
            } else {
                // Se não tem prazo definido, considerar como no prazo
                $trabalhosNoPrazo++;
            }
        }

        $percentualNoPrazo = $trabalhosConcluidos > 0 ? ($trabalhosNoPrazo / $trabalhosConcluidos) * 100 : 0;
        $percentualComAtraso = $trabalhosConcluidos > 0 ? ($trabalhosComAtraso / $trabalhosConcluidos) * 100 : 0;

        // Atraso médio (apenas dos trabalhos atrasados)
        $atrasoMedio = count($atrasos) > 0 ? array_sum($atrasos) / count($atrasos) : 0;

        // Taxa de sucesso (trabalhos no prazo / trabalhos concluídos)
        $taxaSucesso = $trabalhosConcluidos > 0 ? ($trabalhosNoPrazo / $trabalhosConcluidos) * 100 : 0;

        return [
            'total_trabalhos' => $totalTrabalhos,
            'trabalhos_concluidos' => [
                'quantidade' => $trabalhosConcluidos,
                'percentual' => round($percentualConcluidos, 1),
            ],
            'refacao' => [
                'quantidade' => $refacoes,
                'percentual' => round($percentualRefacoes, 1),
            ],
            'tempo_medio' => round($tempoMedio, 1), // em horas
            'no_prazo' => [
                'quantidade' => $trabalhosNoPrazo,
                'percentual' => round($percentualNoPrazo, 1),
            ],
            'com_atraso' => [
                'quantidade' => $trabalhosComAtraso,
                'percentual' => round($percentualComAtraso, 1),
            ],
            'atraso_medio' => round($atrasoMedio, 1), // em horas
            'taxa_sucesso' => round($taxaSucesso, 1),
        ];
    }

    /**
     * Calcular tempo médio de produção em horas
     */
    protected function calcularTempoMedio($itensConcluidos): float
    {
        if ($itensConcluidos->isEmpty()) {
            return 0;
        }

        $tempos = [];
        foreach ($itensConcluidos as $item) {
            $dataInicio = $this->obterDataInicio($item);
            $dataConclusao = Carbon::parse($item->data_conclusao_producao);
            
            if ($dataInicio) {
                $tempos[] = $dataConclusao->diffInHours($dataInicio);
            }
        }

        return count($tempos) > 0 ? array_sum($tempos) / count($tempos) : 0;
    }

    /**
     * Obter data de início da produção
     */
    protected function obterDataInicio($item): ?Carbon
    {
        if ($item->data_inicio_producao) {
            return Carbon::parse($item->data_inicio_producao);
        }
        
        // Se não tem data_inicio_producao, usar data_criacao da OS
        if ($item->data_criacao) {
            return Carbon::parse($item->data_criacao);
        }
        
        return null;
    }

    /**
     * Obter prazo estimado
     */
    protected function obterPrazoEstimado($item): ?string
    {
        // Primeiro tentar pegar do dados_producao da OS
        if ($item->ordemServico && $item->ordemServico->dados_producao) {
            $dadosProducao = is_array($item->ordemServico->dados_producao) 
                ? $item->ordemServico->dados_producao 
                : json_decode($item->ordemServico->dados_producao, true);
            
            if (isset($dadosProducao['prazo_estimado']) && $dadosProducao['prazo_estimado']) {
                return $dadosProducao['prazo_estimado'];
            }
        }
        
        // Se não tem, usar data_prevista_entrega da OS
        if ($item->data_prevista_entrega) {
            return $item->data_prevista_entrega;
        }
        
        return null;
    }

    /**
     * Preparar detalhamento dos trabalhos
     */
    protected function prepararDetalhamento($itens): array
    {
        $detalhamento = [];

        foreach ($itens as $item) {
            $dataInicio = $this->obterDataInicio($item);
            $prazoEstimado = $this->obterPrazoEstimado($item);
            
            // Determinar status
            $status = $this->determinarStatus($item);
            
            // Calcular tempo de produção
            $tempoProducao = null;
            if ($item->data_conclusao_producao && $dataInicio) {
                $dataConclusao = Carbon::parse($item->data_conclusao_producao);
                $horas = $dataConclusao->diffInHours($dataInicio);
                $tempoProducao = round($horas, 1) . 'h';
            }
            
            // Determinar se está no prazo ou com atraso
            $atraso = 'No prazo';
            if ($item->data_conclusao_producao && $prazoEstimado) {
                $dataConclusao = Carbon::parse($item->data_conclusao_producao);
                $prazo = Carbon::parse($prazoEstimado);
                
                if ($dataConclusao->gt($prazo)) {
                    $atraso = 'Com atraso';
                }
            } elseif (!$item->data_conclusao_producao && $prazoEstimado) {
                // Trabalho em produção - verificar se já passou do prazo
                $prazo = Carbon::parse($prazoEstimado);
                if (Carbon::now()->gt($prazo)) {
                    $atraso = 'Com atraso';
                }
            }

            // Obter nome do painel/produto
            $painel = $item->nome_servico_produto;
            if ($item->produto) {
                $painel = $item->produto->nome;
            }

            $detalhamento[] = [
                'id' => $item->id,
                'item' => $item->id_item_os ?? ($item->ordemServico->id_os ?? 'N/A'),
                'painel' => $painel,
                'inicio' => $dataInicio ? $dataInicio->format('d/m/Y H:i') : '-',
                'previsto' => $prazoEstimado ? Carbon::parse($prazoEstimado)->format('d/m/Y H:i') : '-',
                'conclusao' => $item->data_conclusao_producao ? Carbon::parse($item->data_conclusao_producao)->format('d/m/Y H:i') : '-',
                'tempo_producao' => $tempoProducao ?? '-',
                'atraso' => $atraso,
                'status' => $status,
                'is_refacao' => $item->is_refacao ?? false,
            ];
        }

        return $detalhamento;
    }

    /**
     * Determinar status do trabalho
     */
    protected function determinarStatus($item): string
    {
        if ($item->data_conclusao_producao) {
            if ($item->is_refacao) {
                return 'Refação';
            }
            return 'Concluído';
        }
        
        // Verificar status da OS
        if ($item->ordemServico && $item->ordemServico->dados_producao) {
            $dadosProducao = is_array($item->ordemServico->dados_producao) 
                ? $item->ordemServico->dados_producao 
                : json_decode($item->ordemServico->dados_producao, true);
            
            if (isset($dadosProducao['status_producao'])) {
                return $dadosProducao['status_producao'];
            }
        }
        
        return 'Em produção';
    }
}
