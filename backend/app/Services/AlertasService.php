<?php

namespace App\Services;

use App\Models\Notificacao;
use App\Models\Produto;
use App\Models\Cliente;
use App\Models\ContaReceber;
use App\Models\MetaVenda;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AlertasService
{
    /**
     * Verificar e criar alertas de estoque baixo
     */
    public function verificarEstoqueBaixo($tenantId)
    {
        $produtos = Produto::where('tenant_id', $tenantId)
            ->where('status', true)
            ->whereNotNull('estoque_minimo')
            ->whereColumn('estoque', '<=', 'estoque_minimo')
            ->get();

        foreach ($produtos as $produto) {
            // Verificar se já existe notificação não lida para este produto
            $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                ->where('produto_id', $produto->id)
                ->where('tipo', 'estoque_baixo')
                ->where('lida', false)
                ->exists();

            if (!$existeNotificacao) {
                $percentual = $produto->estoque_minimo > 0 
                    ? ($produto->estoque / $produto->estoque_minimo) * 100 
                    : 0;

                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'estoque_baixo',
                    'titulo' => 'Estoque Baixo: ' . $produto->nome,
                    'mensagem' => "O produto {$produto->nome} está com estoque baixo. Estoque atual: {$produto->estoque}, Mínimo: {$produto->estoque_minimo}",
                    'produto_id' => $produto->id,
                    'produto_nome' => $produto->nome,
                    'estoque_atual' => $produto->estoque,
                    'estoque_minimo' => $produto->estoque_minimo,
                    'percentual_atual' => $percentual,
                    'prioridade' => 'alta',
                ]);
            }
        }

        return $produtos->count();
    }

    /**
     * Verificar e criar alertas de atraso (contas a receber)
     */
    public function verificarAtrasos($tenantId)
    {
        $hoje = Carbon::today();
        $contasAtrasadas = ContaReceber::where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->where('data_vencimento', '<', $hoje)
            ->whereNull('data_quitacao')
            ->get();

        foreach ($contasAtrasadas as $conta) {
            $diasAtraso = $hoje->diffInDays($conta->data_vencimento);
            
            // Verificar se já existe notificação não lida para esta conta
            $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'atraso')
                ->where('lida', false)
                ->whereRaw('JSON_EXTRACT(dados_adicionais, "$.conta_id") = ?', [$conta->id])
                ->exists();

            if (!$existeNotificacao) {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'atraso',
                    'titulo' => "Conta Atrasada: {$conta->descricao}",
                    'mensagem' => "A conta '{$conta->descricao}' está atrasada há {$diasAtraso} dia(s). Valor: R$ " . number_format($conta->valor_pendente, 2, ',', '.'),
                    'prioridade' => $diasAtraso > 30 ? 'alta' : ($diasAtraso > 15 ? 'media' : 'baixa'),
                    'dados_adicionais' => [
                        'conta_id' => $conta->id,
                        'dias_atraso' => $diasAtraso,
                        'valor' => $conta->valor_pendente,
                    ],
                ]);
            }
        }

        return $contasAtrasadas->count();
    }

    /**
     * Verificar e criar alertas de clientes inativos
     */
    public function verificarClientesInativos($tenantId, $diasInatividade = 90)
    {
        $dataLimite = Carbon::today()->subDays($diasInatividade);
        
        // Buscar clientes que não têm vendas recentes
        $clientesInativos = Cliente::where('clientes.tenant_id', $tenantId)
            ->where('clientes.status', true)
            ->whereDoesntHave('vendas', function($query) use ($dataLimite) {
                $query->where('data_finalizacao', '>=', $dataLimite)
                      ->where('status', 'finalizada');
            })
            ->get();

        foreach ($clientesInativos as $cliente) {
            // Buscar última venda
            $ultimaVenda = Venda::where('tenant_id', $tenantId)
                ->where('cliente_id', $cliente->id)
                ->where('status', 'finalizada')
                ->orderBy('data_finalizacao', 'desc')
                ->first();

            $diasSemComprar = $ultimaVenda 
                ? Carbon::today()->diffInDays($ultimaVenda->data_finalizacao)
                : null;

            // Verificar se já existe notificação não lida para este cliente
            $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'cliente_inativo')
                ->where('lida', false)
                ->whereRaw('JSON_EXTRACT(dados_adicionais, "$.cliente_id") = ?', [$cliente->id])
                ->exists();

            if (!$existeNotificacao && $diasSemComprar && $diasSemComprar >= $diasInatividade) {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'cliente_inativo',
                    'titulo' => "Cliente Inativo: {$cliente->nome_completo}",
                    'mensagem' => "O cliente {$cliente->nome_completo} não realiza compras há {$diasSemComprar} dias. Considere entrar em contato.",
                    'prioridade' => 'media',
                    'dados_adicionais' => [
                        'cliente_id' => $cliente->id,
                        'dias_sem_comprar' => $diasSemComprar,
                        'ultima_venda' => $ultimaVenda ? $ultimaVenda->data_finalizacao->format('d/m/Y') : null,
                    ],
                ]);
            }
        }

        return $clientesInativos->count();
    }

    /**
     * Verificar e criar alertas de meta próxima
     */
    public function verificarMetasProximas($tenantId)
    {
        $hoje = Carbon::today();
        
        // Buscar metas ativas no período atual
        $metas = MetaVenda::where('tenant_id', $tenantId)
            ->where('ativo', true)
            ->where('data_inicio', '<=', $hoje)
            ->where('data_fim', '>=', $hoje)
            ->get();

        $alertasCriados = 0;

        foreach ($metas as $meta) {
            // Calcular vendas realizadas no período
            $vendas = Venda::where('tenant_id', $tenantId)
                ->where('status', 'finalizada')
                ->whereBetween('data_finalizacao', [$meta->data_inicio, $meta->data_fim]);

            if ($meta->tipo === 'vendedor' && $meta->vendedor_id) {
                $vendas->where('vendedor_id', $meta->vendedor_id);
            }

            $valorRealizado = $vendas->sum('valor_total');
            $percentualAlcancado = $meta->valor_meta > 0 
                ? ($valorRealizado / $meta->valor_meta) * 100 
                : 0;

            // Verificar se está próximo da meta (percentual configurado ou padrão 80%)
            $percentualAlerta = $meta->percentual_proximo_alerta ?? 80;

            if ($percentualAlcancado >= $percentualAlerta && $percentualAlcancado < 100) {
                // Verificar se já existe notificação não lida
                $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                    ->where('tipo', 'meta_proxima')
                    ->where('lida', false)
                    ->whereRaw('JSON_EXTRACT(dados_adicionais, "$.meta_id") = ?', [$meta->id])
                    ->exists();

                if (!$existeNotificacao) {
                    $tipoMeta = $meta->tipo === 'empresa' ? 'da Empresa' : 'do Vendedor';
                    $vendedorNome = $meta->vendedor ? $meta->vendedor->name : '';
                    
                    Notificacao::create([
                        'tenant_id' => $tenantId,
                        'user_id' => $meta->tipo === 'vendedor' ? $meta->vendedor_id : null,
                        'tipo' => 'meta_proxima',
                        'titulo' => "Meta Próxima: {$tipoMeta}",
                        'mensagem' => "A meta {$tipoMeta}" . ($meta->tipo === 'vendedor' ? " ({$vendedorNome})" : '') . " está em " . number_format($percentualAlcancado, 2) . "%. Faltam R$ " . number_format($meta->valor_meta - $valorRealizado, 2, ',', '.') . " para bater a meta!",
                        'prioridade' => 'alta',
                        'dados_adicionais' => [
                            'meta_id' => $meta->id,
                            'percentual_alcancado' => $percentualAlcancado,
                            'valor_realizado' => $valorRealizado,
                            'valor_meta' => $meta->valor_meta,
                            'faltam' => $meta->valor_meta - $valorRealizado,
                        ],
                    ]);
                    
                    $alertasCriados++;
                }
            }
        }

        return $alertasCriados;
    }

    /**
     * Executar todas as verificações de alertas
     */
    public function executarTodasVerificacoes($tenantId)
    {
        $resultado = [
            'estoque_baixo' => $this->verificarEstoqueBaixo($tenantId),
            'atrasos' => $this->verificarAtrasos($tenantId),
            'clientes_inativos' => $this->verificarClientesInativos($tenantId),
            'metas_proximas' => $this->verificarMetasProximas($tenantId),
        ];

        return $resultado;
    }
}
