<?php

namespace App\Services;

use App\Models\DashboardWidget;
use App\Models\DashboardConfig;
use App\Models\DashboardPermission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * Obter widgets disponíveis para um usuário
     */
    public function getWidgetsDisponiveis(int $tenantId, int $userId = null): array
    {
        $user = $userId ? User::find($userId) : null;
        $userAreas = $user ? $this->getUserAreas($user) : [];

        $widgets = DashboardWidget::where('ativo', true)
            ->orderBy('ordem')
            ->get();

        $widgetsDisponiveis = [];

        foreach ($widgets as $widget) {
            $podeVer = true;
            
            if ($userId) {
                $podeVer = DashboardPermission::podeVerWidget($tenantId, $userId, $widget->codigo, $userAreas);
            }

            if ($podeVer) {
                $widgetsDisponiveis[] = [
                    'id' => $widget->id,
                    'codigo' => $widget->codigo,
                    'nome' => $widget->nome,
                    'descricao' => $widget->descricao,
                    'categoria' => $widget->categoria,
                    'tipo' => $widget->tipo,
                    'icone' => $widget->icone,
                    'cor_padrao' => $widget->cor_padrao,
                    'configuracao_padrao' => $widget->configuracao_padrao,
                ];
            }
        }

        return $widgetsDisponiveis;
    }

    /**
     * Obter configuração de dashboard do usuário
     */
    public function getConfiguracao(int $tenantId, int $userId = null): array
    {
        $config = null;

        if ($userId) {
            // Buscar configuração específica do usuário
            $config = DashboardConfig::getUsuario($tenantId, $userId);
        }

        if (!$config) {
            // Buscar configuração padrão do tenant
            $config = DashboardConfig::getPadrao($tenantId);
        }

        if (!$config) {
            // Criar configuração padrão com widgets padrão
            $widgetsPadrao = $this->getWidgetsDisponiveis($tenantId, $userId);
            $widgetsVisiveis = array_slice(array_column($widgetsPadrao, 'codigo'), 0, 8); // Primeiros 8 widgets

            $config = DashboardConfig::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'widgets_visiveis' => $widgetsVisiveis,
                'layout' => $this->getLayoutPadrao($widgetsVisiveis),
                'is_padrao' => !$userId,
            ]);
        }

        return [
            'id' => $config->id,
            'layout' => $config->layout ?? $this->getLayoutPadrao($config->widgets_visiveis ?? []),
            'widgets_visiveis' => $config->widgets_visiveis ?? [],
        ];
    }

    /**
     * Salvar configuração de dashboard
     */
    public function salvarConfiguracao(int $tenantId, int $userId = null, array $dados): array
    {
        $config = DashboardConfig::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'user_id' => $userId,
            ],
            [
                'nome_configuracao' => $dados['nome_configuracao'] ?? null,
                'layout' => $dados['layout'] ?? null,
                'widgets_visiveis' => $dados['widgets_visiveis'] ?? [],
                'is_padrao' => $dados['is_padrao'] ?? (!$userId),
            ]
        );

        return [
            'success' => true,
            'config' => $config,
        ];
    }

    /**
     * Obter dados de um widget específico
     */
    public function getDadosWidget(int $tenantId, string $widgetCodigo, array $filtros = []): array
    {
        $widget = DashboardWidget::where('codigo', $widgetCodigo)->first();

        if (!$widget || !$widget->ativo) {
            return ['error' => 'Widget não encontrado'];
        }

        // Buscar dados específicos do widget
        $dados = match($widgetCodigo) {
            'vendas_dia_qtd' => $this->getVendasDiaQtd($tenantId),
            'vendas_dia_valor' => $this->getVendasDiaValor($tenantId),
            'os_aberto' => $this->getOSAberto($tenantId),
            'os_em_producao' => $this->getOSEmProducao($tenantId),
            'envelopamentos_orcados' => $this->getEnvelopamentosOrcados($tenantId),
            'estoque_baixo' => $this->getEstoqueBaixo($tenantId),
            'total_clientes' => $this->getTotalClientes($tenantId),
            'total_receber' => $this->getTotalReceber($tenantId),
            'total_pagar' => $this->getTotalPagar($tenantId),
            'ticket_medio' => $this->getTicketMedio($tenantId, $filtros),
            'novos_clientes_mes' => $this->getNovosClientesMes($tenantId),
            'vendas_mes' => $this->getVendasMes($tenantId),
            'faturamento_mes' => $this->getFaturamentoMes($tenantId),
            'producao_trabalhos' => $this->getProducaoTrabalhos($tenantId, $filtros),
            'producao_concluidos' => $this->getProducaoConcluidos($tenantId, $filtros),
            'producao_atrasados' => $this->getProducaoAtrasados($tenantId, $filtros),
            default => ['error' => 'Widget não implementado'],
        };

        return [
            'widget' => [
                'codigo' => $widget->codigo,
                'nome' => $widget->nome,
                'tipo' => $widget->tipo,
                'icone' => $widget->icone,
                'cor_padrao' => $widget->cor_padrao,
            ],
            'dados' => $dados,
        ];
    }

    /**
     * Obter áreas do usuário
     */
    protected function getUserAreas(User $user): array
    {
        $areas = [];
        
        // Aqui você pode implementar a lógica para obter as áreas do usuário
        // Por exemplo, baseado em permissões, cargo, etc.
        
        return $areas;
    }

    /**
     * Layout padrão do grid
     */
    protected function getLayoutPadrao(array $widgetsVisiveis): array
    {
        $layout = [];
        $colunas = 4; // Grid de 4 colunas
        
        foreach ($widgetsVisiveis as $index => $codigo) {
            $layout[] = [
                'codigo' => $codigo,
                'x' => ($index % $colunas) * 3,
                'y' => intval($index / $colunas) * 3,
                'w' => 3,
                'h' => 3,
            ];
        }
        
        return $layout;
    }

    // Métodos para buscar dados dos widgets
    protected function getVendasDiaQtd(int $tenantId): array
    {
        $hoje = now()->startOfDay();
        $count = DB::table('vendas')
            ->where('tenant_id', $tenantId)
            ->where('status', 'finalizada')
            ->whereDate('created_at', $hoje)
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getVendasDiaValor(int $tenantId): array
    {
        $hoje = now()->startOfDay();
        $total = DB::table('vendas')
            ->where('tenant_id', $tenantId)
            ->where('status', 'finalizada')
            ->whereDate('created_at', $hoje)
            ->sum('valor_total');
        
        return ['valor' => number_format($total, 2, ',', '.'), 'tipo' => 'moeda'];
    }

    protected function getOSAberto(int $tenantId): array
    {
        $count = DB::table('ordens_servico')
            ->where('tenant_id', $tenantId)
            ->whereIn('status_os', ['Orçamento', 'Orçamento Salvo', 'Orçamento Salvo (Editado)'])
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getOSEmProducao(int $tenantId): array
    {
        $count = DB::table('ordens_servico')
            ->where('tenant_id', $tenantId)
            ->whereRaw("JSON_EXTRACT(dados_producao, '$.status_producao') = 'Em Produção'")
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getEnvelopamentosOrcados(int $tenantId): array
    {
        $count = DB::table('envelopamentos')
            ->where('tenant_id', $tenantId)
            ->whereIn('status', ['Orçamento Salvo', 'Rascunho'])
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getEstoqueBaixo(int $tenantId): array
    {
        $count = DB::table('produtos')
            ->where('tenant_id', $tenantId)
            ->whereRaw('estoque <= estoque_minimo')
            ->where('status', true)
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero', 'subtexto' => 'Itens abaixo do mínimo'];
    }

    protected function getTotalClientes(int $tenantId): array
    {
        $count = DB::table('clientes')
            ->where('tenant_id', $tenantId)
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getTotalReceber(int $tenantId): array
    {
        $total = DB::table('contas_receber')
            ->where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->sum('valor_pendente');
        
        return ['valor' => number_format($total, 2, ',', '.'), 'tipo' => 'moeda'];
    }

    protected function getTotalPagar(int $tenantId): array
    {
        $total = DB::table('contas_pagar')
            ->where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->sum('valor_pendente');
        
        return ['valor' => number_format($total, 2, ',', '.'), 'tipo' => 'moeda'];
    }

    protected function getTicketMedio(int $tenantId, array $filtros = []): array
    {
        $query = DB::table('vendas')
            ->where('tenant_id', $tenantId)
            ->where('status', 'finalizada');
        
        if (isset($filtros['data_inicio'])) {
            $query->whereDate('created_at', '>=', $filtros['data_inicio']);
        }
        if (isset($filtros['data_fim'])) {
            $query->whereDate('created_at', '<=', $filtros['data_fim']);
        }
        
        $total = $query->sum('valor_total');
        $count = $query->count();
        
        $ticketMedio = $count > 0 ? $total / $count : 0;
        
        return ['valor' => number_format($ticketMedio, 2, ',', '.'), 'tipo' => 'moeda'];
    }

    protected function getNovosClientesMes(int $tenantId): array
    {
        $inicioMes = now()->startOfMonth();
        $count = DB::table('clientes')
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', $inicioMes)
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getVendasMes(int $tenantId): array
    {
        $inicioMes = now()->startOfMonth();
        $count = DB::table('vendas')
            ->where('tenant_id', $tenantId)
            ->where('status', 'finalizada')
            ->where('created_at', '>=', $inicioMes)
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getFaturamentoMes(int $tenantId): array
    {
        $inicioMes = now()->startOfMonth();
        $total = DB::table('vendas')
            ->where('tenant_id', $tenantId)
            ->where('status', 'finalizada')
            ->where('created_at', '>=', $inicioMes)
            ->sum('valor_total');
        
        return ['valor' => number_format($total, 2, ',', '.'), 'tipo' => 'moeda'];
    }

    protected function getProducaoTrabalhos(int $tenantId, array $filtros = []): array
    {
        $dataInicio = $filtros['data_inicio'] ?? now()->startOfMonth()->format('Y-m-d');
        $dataFim = $filtros['data_fim'] ?? now()->endOfMonth()->format('Y-m-d');
        
        $count = DB::table('ordens_servico_itens')
            ->join('ordens_servico', 'ordens_servico_itens.ordem_servico_id', '=', 'ordens_servico.id')
            ->where('ordens_servico_itens.tenant_id', $tenantId)
            ->whereNotNull('ordens_servico_itens.data_inicio_producao')
            ->whereNull('ordens_servico_itens.data_conclusao_producao')
            ->whereBetween('ordens_servico_itens.data_inicio_producao', [$dataInicio, $dataFim])
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getProducaoConcluidos(int $tenantId, array $filtros = []): array
    {
        $dataInicio = $filtros['data_inicio'] ?? now()->startOfMonth()->format('Y-m-d');
        $dataFim = $filtros['data_fim'] ?? now()->endOfMonth()->format('Y-m-d');
        
        $count = DB::table('ordens_servico_itens')
            ->join('ordens_servico', 'ordens_servico_itens.ordem_servico_id', '=', 'ordens_servico.id')
            ->where('ordens_servico_itens.tenant_id', $tenantId)
            ->whereNotNull('ordens_servico_itens.data_conclusao_producao')
            ->whereBetween('ordens_servico_itens.data_conclusao_producao', [$dataInicio, $dataFim])
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }

    protected function getProducaoAtrasados(int $tenantId, array $filtros = []): array
    {
        $dataInicio = $filtros['data_inicio'] ?? now()->startOfMonth()->format('Y-m-d');
        $dataFim = $filtros['data_fim'] ?? now()->endOfMonth()->format('Y-m-d');
        
        $count = DB::table('ordens_servico_itens')
            ->join('ordens_servico', 'ordens_servico_itens.ordem_servico_id', '=', 'ordens_servico.id')
            ->where('ordens_servico_itens.tenant_id', $tenantId)
            ->whereNotNull('ordens_servico_itens.data_conclusao_producao')
            ->whereBetween('ordens_servico_itens.data_conclusao_producao', [$dataInicio, $dataFim])
            ->whereRaw('ordens_servico_itens.data_conclusao_producao > COALESCE(JSON_UNQUOTE(JSON_EXTRACT(ordens_servico.dados_producao, "$.prazo_estimado")), ordens_servico.data_prevista_entrega)')
            ->count();
        
        return ['valor' => $count, 'tipo' => 'numero'];
    }
}
