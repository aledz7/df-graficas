<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Venda;
use App\Models\Notificacao;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class ClienteTendenciaService
{
    /**
     * Analisar tendência de compras dos clientes
     */
    public function analisarTendenciaClientes(int $tenantId, array $config = []): array
    {
        $periodoRecente = $config['periodo_recente_dias'] ?? 30; // Últimos 30 dias
        $periodoAnterior = $config['periodo_anterior_dias'] ?? 30; // 30 dias anteriores
        $percentualQuedaMinimo = $config['percentual_queda_minimo'] ?? 30; // 30% de queda mínima
        $valorMinimoVendas = $config['valor_minimo_vendas'] ?? 500; // Mínimo R$ 500 em vendas no período anterior

        $dataFimRecente = Carbon::now();
        $dataInicioRecente = $dataFimRecente->copy()->subDays($periodoRecente);
        $dataFimAnterior = $dataInicioRecente->copy()->subDay();
        $dataInicioAnterior = $dataFimAnterior->copy()->subDays($periodoAnterior);

        Log::info("Analisando tendência de clientes - Tenant: {$tenantId}");
        Log::info("Período recente: {$dataInicioRecente->format('Y-m-d')} a {$dataFimRecente->format('Y-m-d')}");
        Log::info("Período anterior: {$dataInicioAnterior->format('Y-m-d')} a {$dataFimAnterior->format('Y-m-d')}");

        // Buscar clientes com vendas no período anterior
        $clientesComVendas = Venda::where('tenant_id', $tenantId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('data_finalizacao')
            ->whereBetween('data_finalizacao', [$dataInicioAnterior, $dataFimAnterior])
            ->select('cliente_id', DB::raw('SUM(valor_total) as total_anterior'), DB::raw('COUNT(*) as qtd_vendas_anterior'))
            ->groupBy('cliente_id')
            ->havingRaw('SUM(valor_total) >= ?', [$valorMinimoVendas])
            ->get();

        $clientesComQueda = [];

        foreach ($clientesComVendas as $vendaAnterior) {
            $clienteId = $vendaAnterior->cliente_id;

            // Buscar vendas do período recente
            $vendasRecentes = Venda::where('tenant_id', $tenantId)
                ->where('cliente_id', $clienteId)
                ->where('status', Venda::STATUS_FINALIZADA)
                ->whereNotNull('data_finalizacao')
                ->whereBetween('data_finalizacao', [$dataInicioRecente, $dataFimRecente])
                ->select(
                    DB::raw('COALESCE(SUM(valor_total), 0) as total_recente'),
                    DB::raw('COUNT(*) as qtd_vendas_recente')
                )
                ->first();

            $totalAnterior = (float) $vendaAnterior->total_anterior;
            $totalRecente = (float) ($vendasRecentes->total_recente ?? 0);
            $qtdVendasAnterior = (int) $vendaAnterior->qtd_vendas_anterior;
            $qtdVendasRecente = (int) ($vendasRecentes->qtd_vendas_recente ?? 0);

            // Calcular percentual de queda
            if ($totalAnterior > 0) {
                $percentualQueda = (($totalAnterior - $totalRecente) / $totalAnterior) * 100;
                $percentualQuedaQuantidade = $qtdVendasAnterior > 0 
                    ? (($qtdVendasAnterior - $qtdVendasRecente) / $qtdVendasAnterior) * 100 
                    : 0;

                // Verificar se a queda é significativa
                if ($percentualQueda >= $percentualQuedaMinimo || $percentualQuedaQuantidade >= $percentualQuedaMinimo) {
                    $cliente = Cliente::find($clienteId);
                    
                    if ($cliente) {
                        $clientesComQueda[] = [
                            'cliente_id' => $clienteId,
                            'cliente_nome' => $cliente->nome,
                            'cliente_email' => $cliente->email,
                            'cliente_telefone' => $cliente->telefone,
                            'total_anterior' => $totalAnterior,
                            'total_recente' => $totalRecente,
                            'qtd_vendas_anterior' => $qtdVendasAnterior,
                            'qtd_vendas_recente' => $qtdVendasRecente,
                            'percentual_queda_valor' => round($percentualQueda, 2),
                            'percentual_queda_quantidade' => round($percentualQuedaQuantidade, 2),
                            'periodo_anterior' => [
                                'inicio' => $dataInicioAnterior->format('Y-m-d'),
                                'fim' => $dataFimAnterior->format('Y-m-d'),
                            ],
                            'periodo_recente' => [
                                'inicio' => $dataInicioRecente->format('Y-m-d'),
                                'fim' => $dataFimRecente->format('Y-m-d'),
                            ],
                        ];
                    }
                }
            }
        }

        Log::info("Encontrados " . count($clientesComQueda) . " clientes com queda nas compras");

        return $clientesComQueda;
    }

    /**
     * Gerar alertas para clientes com queda
     */
    public function gerarAlertas(int $tenantId, array $config = []): int
    {
        $clientesComQueda = $this->analisarTendenciaClientes($tenantId, $config);
        $alertasCriados = 0;

        foreach ($clientesComQueda as $cliente) {
            // Verificar se já existe alerta recente para este cliente
            $alertaExistente = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'cliente_diminuindo_compras')
                ->where('cliente_id', $cliente['cliente_id'])
                ->where('created_at', '>=', Carbon::now()->subDays(7))
                ->first();

            if (!$alertaExistente) {
                $percentualQueda = max(
                    $cliente['percentual_queda_valor'],
                    $cliente['percentual_queda_quantidade']
                );

                $titulo = "Cliente Diminuindo Compras: {$cliente['cliente_nome']}";
                $mensagem = "O cliente {$cliente['cliente_nome']} está comprando {$percentualQueda}% menos. ";
                $mensagem .= "Período anterior: R$ " . number_format($cliente['total_anterior'], 2, ',', '.') . " ({$cliente['qtd_vendas_anterior']} vendas). ";
                $mensagem .= "Período recente: R$ " . number_format($cliente['total_recente'], 2, ',', '.') . " ({$cliente['qtd_vendas_recente']} vendas).";

                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'user_id' => null, // Notificação global
                    'tipo' => 'cliente_diminuindo_compras',
                    'titulo' => $titulo,
                    'mensagem' => $mensagem,
                    'cliente_id' => $cliente['cliente_id'],
                    'cliente_nome' => $cliente['cliente_nome'],
                    'prioridade' => 'media',
                    'dados_adicionais' => [
                        'cliente_id' => $cliente['cliente_id'],
                        'cliente_nome' => $cliente['cliente_nome'],
                        'cliente_email' => $cliente['cliente_email'],
                        'cliente_telefone' => $cliente['cliente_telefone'],
                        'total_anterior' => $cliente['total_anterior'],
                        'total_recente' => $cliente['total_recente'],
                        'qtd_vendas_anterior' => $cliente['qtd_vendas_anterior'],
                        'qtd_vendas_recente' => $cliente['qtd_vendas_recente'],
                        'percentual_queda_valor' => $cliente['percentual_queda_valor'],
                        'percentual_queda_quantidade' => $cliente['percentual_queda_quantidade'],
                        'periodo_anterior' => $cliente['periodo_anterior'],
                        'periodo_recente' => $cliente['periodo_recente'],
                    ],
                ]);

                $alertasCriados++;
            }
        }

        Log::info("Criados {$alertasCriados} alertas de clientes diminuindo compras");

        return $alertasCriados;
    }

    /**
     * Listar clientes com queda nas compras
     */
    public function listarClientesComQueda(int $tenantId, array $filtros = []): array
    {
        $config = [
            'periodo_recente_dias' => $filtros['periodo_recente_dias'] ?? 30,
            'periodo_anterior_dias' => $filtros['periodo_anterior_dias'] ?? 30,
            'percentual_queda_minimo' => $filtros['percentual_queda_minimo'] ?? 30,
            'valor_minimo_vendas' => $filtros['valor_minimo_vendas'] ?? 500,
        ];

        return $this->analisarTendenciaClientes($tenantId, $config);
    }
}
