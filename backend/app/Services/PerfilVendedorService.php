<?php

namespace App\Services;

use App\Models\Venda;
use App\Models\ItemVenda;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PerfilVendedorService
{
    /**
     * Analisar perfil completo do vendedor
     */
    public function analisarPerfilVendedor(int $tenantId, int $vendedorId, array $filtros = []): array
    {
        $dataInicio = $filtros['data_inicio'] ?? Carbon::now()->subDays(30)->startOfDay();
        $dataFim = $filtros['data_fim'] ?? Carbon::now()->endOfDay();

        if (is_string($dataInicio)) {
            $dataInicio = Carbon::parse($dataInicio)->startOfDay();
        }
        if (is_string($dataFim)) {
            $dataFim = Carbon::parse($dataFim)->endOfDay();
        }

        $vendedor = User::find($vendedorId);
        if (!$vendedor) {
            throw new \Exception("Vendedor não encontrado");
        }

        // Buscar todas as vendas finalizadas do vendedor no período
        $vendas = Venda::where('tenant_id', $tenantId)
            ->where('vendedor_id', $vendedorId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('data_finalizacao')
            ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
            ->with('itens.produto')
            ->get();

        if ($vendas->isEmpty()) {
            return $this->perfilVazio($vendedor, $dataInicio, $dataFim);
        }

        // Calcular indicadores
        $indicadores = $this->calcularIndicadores($vendas, $tenantId);

        // Determinar perfil de venda
        $perfilVenda = $this->determinarPerfilVenda($indicadores);

        // Determinar velocidade de fechamento
        $velocidadeFechamento = $this->determinarVelocidadeFechamento($indicadores);

        return [
            'vendedor' => [
                'id' => $vendedor->id,
                'nome' => $vendedor->name,
                'email' => $vendedor->email,
            ],
            'periodo' => [
                'inicio' => $dataInicio->format('Y-m-d'),
                'fim' => $dataFim->format('Y-m-d'),
            ],
            'indicadores' => $indicadores,
            'perfil_venda' => $perfilVenda,
            'velocidade_fechamento' => $velocidadeFechamento,
            'recomendacoes' => $this->gerarRecomendacoes($indicadores, $perfilVenda, $velocidadeFechamento),
        ];
    }

    /**
     * Calcular todos os indicadores
     */
    protected function calcularIndicadores($vendas, int $tenantId): array
    {
        $totalVendas = $vendas->count();
        $totalVolume = $vendas->sum('valor_total');
        $ticketMedio = $totalVendas > 0 ? $totalVolume / $totalVendas : 0;

        // Calcular margem de lucro
        $margemTotal = 0;
        $custoTotal = 0;
        $receitaTotal = 0;

        foreach ($vendas as $venda) {
            foreach ($venda->itens as $item) {
                $valorItem = $item->valor_total ?? ($item->valor_unitario * $item->quantidade);
                $receitaTotal += $valorItem;

                // Tentar pegar custo do produto
                $custoItem = 0;
                if ($item->produto) {
                    // Verificar se tem preco_custo ou custo
                    $custoItem = $item->produto->preco_custo ?? $item->produto->custo ?? 0;
                    $custoItem = $custoItem * $item->quantidade;
                }
                $custoTotal += $custoItem;
            }
        }

        $margemTotal = $receitaTotal - $custoTotal;
        $margemPercentual = $receitaTotal > 0 ? ($margemTotal / $receitaTotal) * 100 : 0;

        // Calcular tempo médio de fechamento
        $temposFechamento = [];
        foreach ($vendas as $venda) {
            if ($venda->data_emissao && $venda->data_finalizacao) {
                $tempo = $venda->data_emissao->diffInHours($venda->data_finalizacao);
                $temposFechamento[] = $tempo;
            }
        }
        $tempoMedioFechamento = count($temposFechamento) > 0 
            ? array_sum($temposFechamento) / count($temposFechamento) 
            : 0;

        // Calcular frequência de vendas (vendas por dia)
        $diasPeriodo = $vendas->min('data_finalizacao') 
            ? $vendas->min('data_finalizacao')->diffInDays($vendas->max('data_finalizacao')) + 1 
            : 1;
        $frequenciaVendas = $diasPeriodo > 0 ? $totalVendas / $diasPeriodo : 0;

        // Calcular descontos médios
        $descontosTotal = $vendas->sum(function($venda) {
            $desconto = $venda->desconto;
            if (is_array($desconto)) {
                return (float)($desconto['valor_aplicado'] ?? 0);
            }
            // Se for accessor que retorna array, pegar do atributo raw
            if (isset($venda->attributes['desconto'])) {
                return (float)($venda->attributes['desconto'] ?? 0);
            }
            return (float)($desconto ?? 0);
        });
        $descontoMedio = $totalVendas > 0 ? $descontosTotal / $totalVendas : 0;
        $descontoPercentualMedio = $totalVolume > 0 ? ($descontosTotal / $totalVolume) * 100 : 0;

        // Calcular variação de ticket (desvio padrão)
        $valoresVendas = $vendas->pluck('valor_total')->toArray();
        $desvioPadraoTicket = count($valoresVendas) > 1 
            ? $this->calcularDesvioPadrao($valoresVendas) 
            : 0;

        return [
            'total_vendas' => $totalVendas,
            'total_volume' => round($totalVolume, 2),
            'ticket_medio' => round($ticketMedio, 2),
            'margem_total' => round($margemTotal, 2),
            'margem_percentual' => round($margemPercentual, 2),
            'custo_total' => round($custoTotal, 2),
            'receita_total' => round($receitaTotal, 2),
            'tempo_medio_fechamento_horas' => round($tempoMedioFechamento, 2),
            'tempo_medio_fechamento_dias' => round($tempoMedioFechamento / 24, 2),
            'frequencia_vendas_dia' => round($frequenciaVendas, 2),
            'desconto_medio' => round($descontoMedio, 2),
            'desconto_percentual_medio' => round($descontoPercentualMedio, 2),
            'desvio_padrao_ticket' => round($desvioPadraoTicket, 2),
            'variacao_ticket' => $ticketMedio > 0 ? round(($desvioPadraoTicket / $ticketMedio) * 100, 2) : 0,
        ];
    }

    /**
     * Determinar perfil de venda (volume vs margem)
     */
    protected function determinarPerfilVenda(array $indicadores): array
    {
        // Comparar com médias gerais (seria ideal buscar do banco, mas vamos usar valores de referência)
        $volumeAlto = $indicadores['total_volume'] > 50000; // R$ 50k+
        $margemAlta = $indicadores['margem_percentual'] > 30; // 30%+

        $tipo = 'equilibrado';
        $descricao = 'Vendedor equilibrado entre volume e margem';

        if ($volumeAlto && !$margemAlta) {
            $tipo = 'volume';
            $descricao = 'Vendedor focado em volume de vendas, prioriza quantidade sobre margem';
        } elseif (!$volumeAlto && $margemAlta) {
            $tipo = 'margem';
            $descricao = 'Vendedor focado em margem de lucro, prioriza qualidade sobre quantidade';
        } elseif ($volumeAlto && $margemAlta) {
            $tipo = 'premium';
            $descricao = 'Vendedor premium: alto volume com alta margem';
        }

        return [
            'tipo' => $tipo,
            'descricao' => $descricao,
            'score_volume' => min(100, ($indicadores['total_volume'] / 100000) * 100),
            'score_margem' => min(100, $indicadores['margem_percentual'] * 2),
        ];
    }

    /**
     * Determinar velocidade de fechamento
     */
    protected function determinarVelocidadeFechamento(array $indicadores): array
    {
        $horasMedias = $indicadores['tempo_medio_fechamento_horas'];
        $diasMedios = $indicadores['tempo_medio_fechamento_dias'];

        $tipo = 'medio';
        $descricao = 'Tempo médio de fechamento normal';

        if ($horasMedias < 24) {
            $tipo = 'rapido';
            $descricao = 'Fecha vendas rapidamente (menos de 1 dia)';
        } elseif ($horasMedias < 72) {
            $tipo = 'medio';
            $descricao = 'Tempo médio de fechamento (1-3 dias)';
        } else {
            $tipo = 'lento';
            $descricao = 'Demora mais para fechar vendas (mais de 3 dias)';
        }

        return [
            'tipo' => $tipo,
            'descricao' => $descricao,
            'horas_medias' => $horasMedias,
            'dias_medias' => $diasMedios,
        ];
    }

    /**
     * Gerar recomendações baseadas no perfil
     */
    protected function gerarRecomendacoes(array $indicadores, array $perfilVenda, array $velocidadeFechamento): array
    {
        $recomendacoes = [];

        // Recomendações baseadas no perfil de venda
        if ($perfilVenda['tipo'] === 'volume') {
            $recomendacoes[] = [
                'tipo' => 'margem',
                'titulo' => 'Focar em Margem',
                'descricao' => 'Tente aumentar a margem de lucro por venda, oferecendo produtos com maior margem ou reduzindo descontos.',
            ];
        } elseif ($perfilVenda['tipo'] === 'margem') {
            $recomendacoes[] = [
                'tipo' => 'volume',
                'titulo' => 'Aumentar Volume',
                'descricao' => 'Considere aumentar o número de vendas para maximizar o faturamento total.',
            ];
        }

        // Recomendações baseadas na velocidade
        if ($velocidadeFechamento['tipo'] === 'lento') {
            $recomendacoes[] = [
                'tipo' => 'velocidade',
                'titulo' => 'Acelerar Fechamento',
                'descricao' => 'Tente reduzir o tempo entre a criação e finalização das vendas. Foque em fechar negócios mais rapidamente.',
            ];
        }

        // Recomendações baseadas em descontos
        if ($indicadores['desconto_percentual_medio'] > 15) {
            $recomendacoes[] = [
                'tipo' => 'desconto',
                'titulo' => 'Reduzir Descontos',
                'descricao' => 'Você está dando muitos descontos. Tente negociar melhor para manter a margem.',
            ];
        }

        // Recomendações baseadas em ticket médio
        if ($indicadores['ticket_medio'] < 500) {
            $recomendacoes[] = [
                'tipo' => 'ticket',
                'titulo' => 'Aumentar Ticket Médio',
                'descricao' => 'Tente vender produtos complementares ou de maior valor para aumentar o ticket médio.',
            ];
        }

        return $recomendacoes;
    }

    /**
     * Calcular desvio padrão
     */
    protected function calcularDesvioPadrao(array $valores): float
    {
        $n = count($valores);
        if ($n === 0) {
            return 0;
        }

        $media = array_sum($valores) / $n;
        $somaQuadrados = 0;

        foreach ($valores as $valor) {
            $somaQuadrados += pow($valor - $media, 2);
        }

        return sqrt($somaQuadrados / $n);
    }

    /**
     * Retornar perfil vazio quando não há vendas
     */
    protected function perfilVazio($vendedor, $dataInicio, $dataFim): array
    {
        return [
            'vendedor' => [
                'id' => $vendedor->id,
                'nome' => $vendedor->name,
                'email' => $vendedor->email,
            ],
            'periodo' => [
                'inicio' => $dataInicio->format('Y-m-d'),
                'fim' => $dataFim->format('Y-m-d'),
            ],
            'indicadores' => [
                'total_vendas' => 0,
                'total_volume' => 0,
                'ticket_medio' => 0,
                'margem_total' => 0,
                'margem_percentual' => 0,
                'tempo_medio_fechamento_horas' => 0,
                'frequencia_vendas_dia' => 0,
            ],
            'perfil_venda' => [
                'tipo' => 'sem_dados',
                'descricao' => 'Sem vendas no período analisado',
            ],
            'velocidade_fechamento' => [
                'tipo' => 'sem_dados',
                'descricao' => 'Sem dados para análise',
            ],
            'recomendacoes' => [
                [
                    'tipo' => 'geral',
                    'titulo' => 'Começar a Vender',
                    'descricao' => 'Não há vendas registradas neste período. Foque em gerar novas oportunidades de venda.',
                ],
            ],
        ];
    }

    /**
     * Listar perfis de todos os vendedores
     */
    public function listarPerfisVendedores(int $tenantId, array $filtros = []): array
    {
        $dataInicio = $filtros['data_inicio'] ?? Carbon::now()->subDays(30)->startOfDay();
        $dataFim = $filtros['data_fim'] ?? Carbon::now()->endOfDay();

        if (is_string($dataInicio)) {
            $dataInicio = Carbon::parse($dataInicio)->startOfDay();
        }
        if (is_string($dataFim)) {
            $dataFim = Carbon::parse($dataFim)->endOfDay();
        }

        // Buscar todos os vendedores que têm vendas no período
        $vendedoresIds = Venda::where('tenant_id', $tenantId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('vendedor_id')
            ->whereNotNull('data_finalizacao')
            ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
            ->distinct()
            ->pluck('vendedor_id');

        $perfis = [];

        foreach ($vendedoresIds as $vendedorId) {
            try {
                $perfil = $this->analisarPerfilVendedor($tenantId, $vendedorId, $filtros);
                $perfis[] = $perfil;
            } catch (\Exception $e) {
                // Ignorar erros individuais
                continue;
            }
        }

        return $perfis;
    }
}
