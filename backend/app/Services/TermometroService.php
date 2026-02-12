<?php

namespace App\Services;

use App\Models\TermometroConfig;
use App\Models\Venda;
use App\Models\MetaVenda;
use App\Models\ContaReceber;
use App\Models\Cliente;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TermometroService
{
    /**
     * Calcular status do termômetro
     */
    public function calcularStatus(int $tenantId, int $userId, bool $isAdmin): array
    {
        // Verificar permissão
        $config = TermometroConfig::obterOuCriar($tenantId);
        
        if (!$config->usuarioPodeVer($userId, $isAdmin)) {
            return [
                'pode_ver' => false,
                'mensagem' => 'Você não tem permissão para visualizar o termômetro da empresa',
            ];
        }

        // Obter limites personalizados ou usar padrões
        $limites = $config->configuracoes_limites ?? $this->obterLimitesPadrao();

        // Calcular indicadores
        $indicadores = $this->calcularIndicadores($tenantId, $limites);

        // Determinar status geral
        $status = $this->determinarStatus($indicadores);

        return [
            'pode_ver' => true,
            'status' => $status,
            'indicadores' => $indicadores,
            'config' => [
                'todos_usuarios' => $config->todos_usuarios,
                'apenas_admin' => $config->apenas_admin,
                'usuarios_permitidos' => $config->usuarios_permitidos,
            ],
        ];
    }

    /**
     * Calcular todos os indicadores
     */
    protected function calcularIndicadores(int $tenantId, array $limites): array
    {
        $hoje = Carbon::today();
        $mesAtual = $hoje->copy()->startOfMonth();
        $mesFim = $hoje->copy()->endOfMonth();

        // 1. VENDAS (comparar com mês anterior)
        $vendasMesAtual = Venda::where('tenant_id', $tenantId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('data_finalizacao')
            ->whereBetween('data_finalizacao', [$mesAtual, $mesFim])
            ->sum('valor_total');

        $mesAnterior = $mesAtual->copy()->subMonth();
        $mesAnteriorFim = $mesAnterior->copy()->endOfMonth();
        $vendasMesAnterior = Venda::where('tenant_id', $tenantId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('data_finalizacao')
            ->whereBetween('data_finalizacao', [$mesAnterior, $mesAnteriorFim])
            ->sum('valor_total');

        $percentualVendas = $vendasMesAnterior > 0 
            ? (($vendasMesAtual - $vendasMesAnterior) / $vendasMesAnterior) * 100 
            : ($vendasMesAtual > 0 ? 100 : 0);

        $statusVendas = $this->avaliarIndicador($percentualVendas, $limites['vendas']['verde'], $limites['vendas']['amarelo']);

        // 2. METAS (verificar se está batendo as metas do mês)
        $metasMes = MetaVenda::where('tenant_id', $tenantId)
            ->where('ativo', true)
            ->where(function($query) use ($mesAtual, $mesFim) {
                $query->whereBetween('data_inicio', [$mesAtual, $mesFim])
                      ->orWhereBetween('data_fim', [$mesAtual, $mesFim])
                      ->orWhere(function($q) use ($mesAtual, $mesFim) {
                          $q->where('data_inicio', '<=', $mesAtual)
                            ->where('data_fim', '>=', $mesFim);
                      });
            })
            ->get();

        $metasBatidas = 0;
        $totalMetas = $metasMes->count();
        $percentualMetas = 0;

        foreach ($metasMes as $meta) {
            $vendasMeta = Venda::where('tenant_id', $tenantId)
                ->where('status', Venda::STATUS_FINALIZADA)
                ->whereNotNull('data_finalizacao')
                ->whereBetween('data_finalizacao', [$meta->data_inicio, $meta->data_fim]);

            if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
                $vendasMeta->where('vendedor_id', $meta->vendedor_id);
            }

            $valorRealizado = $vendasMeta->sum('valor_total');
            
            if ($valorRealizado >= $meta->valor_meta) {
                $metasBatidas++;
            }
        }

        $percentualMetas = $totalMetas > 0 ? ($metasBatidas / $totalMetas) * 100 : 100;
        $statusMetas = $this->avaliarIndicador($percentualMetas, $limites['metas']['verde'], $limites['metas']['amarelo']);

        // 3. ATRASOS (contas a receber atrasadas)
        $contasAtrasadas = ContaReceber::where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $hoje)
            ->sum('valor_pendente');

        $totalContasReceber = ContaReceber::where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->sum('valor_pendente');

        $percentualAtrasos = $totalContasReceber > 0 
            ? ($contasAtrasadas / $totalContasReceber) * 100 
            : 0;

        $statusAtrasos = $this->avaliarIndicador($percentualAtrasos, $limites['atrasos']['verde'], $limites['atrasos']['amarelo'], true); // Invertido (menos é melhor)

        // 4. CLIENTES INATIVOS (clientes sem comprar há mais de 90 dias)
        $dataLimiteInativos = $hoje->copy()->subDays(90);
        $clientesInativos = Cliente::where('tenant_id', $tenantId)
            ->where('status', true)
            ->whereDoesntHave('vendas', function($query) use ($dataLimiteInativos) {
                $query->where('data_finalizacao', '>=', $dataLimiteInativos)
                      ->where('status', 'finalizada');
            })
            ->count();

        $totalClientes = Cliente::where('tenant_id', $tenantId)
            ->where('status', true)
            ->count();

        $percentualInativos = $totalClientes > 0 
            ? ($clientesInativos / $totalClientes) * 100 
            : 0;

        $statusInativos = $this->avaliarIndicador($percentualInativos, $limites['clientes_inativos']['verde'], $limites['clientes_inativos']['amarelo'], true); // Invertido (menos é melhor)

        return [
            'vendas' => [
                'valor' => round($vendasMesAtual, 2),
                'mes_anterior' => round($vendasMesAnterior, 2),
                'percentual_variacao' => round($percentualVendas, 2),
                'status' => $statusVendas,
                'descricao' => $this->getDescricaoVendas($percentualVendas),
            ],
            'metas' => [
                'batidas' => $metasBatidas,
                'total' => $totalMetas,
                'percentual' => round($percentualMetas, 2),
                'status' => $statusMetas,
                'descricao' => $this->getDescricaoMetas($metasBatidas, $totalMetas),
            ],
            'atrasos' => [
                'valor_atrasado' => round($contasAtrasadas, 2),
                'valor_total' => round($totalContasReceber, 2),
                'percentual' => round($percentualAtrasos, 2),
                'status' => $statusAtrasos,
                'descricao' => $this->getDescricaoAtrasos($contasAtrasadas, $percentualAtrasos),
            ],
            'clientes_inativos' => [
                'quantidade' => $clientesInativos,
                'total' => $totalClientes,
                'percentual' => round($percentualInativos, 2),
                'status' => $statusInativos,
                'descricao' => $this->getDescricaoInativos($clientesInativos, $percentualInativos),
            ],
        ];
    }

    /**
     * Avaliar indicador e retornar status
     */
    protected function avaliarIndicador(float $valor, float $limiteVerde, float $limiteAmarelo, bool $invertido = false): string
    {
        if ($invertido) {
            // Para indicadores invertidos (menos é melhor)
            if ($valor <= $limiteVerde) {
                return 'verde';
            } elseif ($valor <= $limiteAmarelo) {
                return 'amarelo';
            } else {
                return 'vermelho';
            }
        } else {
            // Para indicadores normais (mais é melhor)
            if ($valor >= $limiteVerde) {
                return 'verde';
            } elseif ($valor >= $limiteAmarelo) {
                return 'amarelo';
            } else {
                return 'vermelho';
            }
        }
    }

    /**
     * Determinar status geral do termômetro
     */
    protected function determinarStatus(array $indicadores): string
    {
        $statuses = [
            $indicadores['vendas']['status'],
            $indicadores['metas']['status'],
            $indicadores['atrasos']['status'],
            $indicadores['clientes_inativos']['status'],
        ];

        // Se algum está vermelho, status geral é vermelho
        if (in_array('vermelho', $statuses)) {
            return 'vermelho';
        }

        // Se algum está amarelo, status geral é amarelo
        if (in_array('amarelo', $statuses)) {
            return 'amarelo';
        }

        // Se todos estão verdes, status geral é verde
        return 'verde';
    }

    /**
     * Obter limites padrão
     */
    protected function obterLimitesPadrao(): array
    {
        return [
            'vendas' => [
                'verde' => 0, // Crescimento positivo ou neutro
                'amarelo' => -10, // Queda de até 10%
            ],
            'metas' => [
                'verde' => 80, // 80% ou mais das metas batidas
                'amarelo' => 50, // 50% das metas batidas
            ],
            'atrasos' => [
                'verde' => 10, // Até 10% das contas atrasadas
                'amarelo' => 25, // Até 25% das contas atrasadas
            ],
            'clientes_inativos' => [
                'verde' => 20, // Até 20% dos clientes inativos
                'amarelo' => 40, // Até 40% dos clientes inativos
            ],
        ];
    }

    /**
     * Descrições dos indicadores
     */
    protected function getDescricaoVendas(float $percentual): string
    {
        if ($percentual > 0) {
            return "Vendas cresceram {$percentual}% em relação ao mês anterior";
        } elseif ($percentual < 0) {
            return "Vendas caíram " . abs($percentual) . "% em relação ao mês anterior";
        } else {
            return "Vendas mantiveram o mesmo nível do mês anterior";
        }
    }

    protected function getDescricaoMetas(int $batidas, int $total): string
    {
        if ($total === 0) {
            return "Nenhuma meta configurada para o período";
        }
        return "{$batidas} de {$total} metas batidas";
    }

    protected function getDescricaoAtrasos(float $valor, float $percentual): string
    {
        return "R$ " . number_format($valor, 2, ',', '.') . " em contas atrasadas ({$percentual}% do total)";
    }

    protected function getDescricaoInativos(int $quantidade, float $percentual): string
    {
        return "{$quantidade} clientes inativos ({$percentual}% do total)";
    }

    /**
     * Atualizar configuração de permissões
     */
    public function atualizarPermissoes(int $tenantId, array $dados): TermometroConfig
    {
        $config = TermometroConfig::obterOuCriar($tenantId);
        $config->update($dados);
        return $config->fresh();
    }

    /**
     * Obter configuração
     */
    public function obterConfig(int $tenantId): TermometroConfig
    {
        return TermometroConfig::obterOuCriar($tenantId);
    }
}
