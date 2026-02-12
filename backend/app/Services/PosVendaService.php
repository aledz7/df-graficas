<?php

namespace App\Services;

use App\Models\PosVenda;
use App\Models\PosVendaHistorico;
use App\Models\PosVendaTransferencia;
use App\Models\PosVendaAgendamento;
use App\Models\Notificacao;
use App\Models\Venda;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PosVendaService
{
    /**
     * Criar novo pós-venda
     */
    public function criar(int $tenantId, array $dados, int $usuarioId): PosVenda
    {
        DB::beginTransaction();
        try {
            $posVenda = PosVenda::create([
                'tenant_id' => $tenantId,
                'cliente_id' => $dados['cliente_id'],
                'venda_id' => $dados['venda_id'] ?? null,
                'vendedor_id' => $dados['vendedor_id'] ?? null,
                'responsavel_atual_id' => $usuarioId,
                'tipo' => $dados['tipo'] ?? 'satisfacao',
                'observacao' => $dados['observacao'],
                'nota_satisfacao' => $dados['nota_satisfacao'] ?? null,
                'status' => 'pendente',
                'data_abertura' => now(),
                'usuario_abertura_id' => $usuarioId,
            ]);

            // Registrar histórico
            $this->registrarHistorico($posVenda->id, $tenantId, $usuarioId, 'criacao', 'Pós-venda criado', [
                'tipo' => $posVenda->tipo,
                'observacao' => $posVenda->observacao,
            ]);

            DB::commit();
            return $posVenda->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao criar pós-venda: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Atualizar status do pós-venda
     */
    public function atualizarStatus(int $tenantId, int $posVendaId, string $novoStatus, int $usuarioId, ?string $observacao = null): PosVenda
    {
        $posVenda = PosVenda::where('tenant_id', $tenantId)->findOrFail($posVendaId);
        $statusAnterior = $posVenda->status;

        DB::beginTransaction();
        try {
            $posVenda->status = $novoStatus;
            
            if ($novoStatus === 'resolvido' && !$posVenda->data_resolucao) {
                $posVenda->data_resolucao = now();
                $posVenda->usuario_resolucao_id = $usuarioId;
            }

            $posVenda->save();

            // Registrar histórico
            $this->registrarHistorico($posVendaId, $tenantId, $usuarioId, 'status_alterado', 
                "Status alterado de {$statusAnterior} para {$novoStatus}" . ($observacao ? ": {$observacao}" : ''),
                [
                    'status_anterior' => $statusAnterior,
                    'status_novo' => $novoStatus,
                    'observacao' => $observacao,
                ]
            );

            DB::commit();
            return $posVenda->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao atualizar status do pós-venda: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Transferir responsabilidade
     */
    public function transferir(int $tenantId, int $posVendaId, int $novoResponsavelId, string $motivo, int $usuarioId): PosVenda
    {
        $posVenda = PosVenda::where('tenant_id', $tenantId)->findOrFail($posVendaId);
        $responsavelAnteriorId = $posVenda->responsavel_atual_id;

        DB::beginTransaction();
        try {
            // Registrar transferência
            PosVendaTransferencia::create([
                'tenant_id' => $tenantId,
                'pos_venda_id' => $posVendaId,
                'usuario_origem_id' => $responsavelAnteriorId,
                'usuario_destino_id' => $novoResponsavelId,
                'motivo' => $motivo,
                'usuario_transferencia_id' => $usuarioId,
            ]);

            // Atualizar responsável
            $posVenda->responsavel_atual_id = $novoResponsavelId;
            $posVenda->save();

            // Registrar histórico
            $this->registrarHistorico($posVendaId, $tenantId, $usuarioId, 'responsavel_alterado',
                "Responsabilidade transferida para outro usuário. Motivo: {$motivo}",
                [
                    'responsavel_anterior_id' => $responsavelAnteriorId,
                    'responsavel_novo_id' => $novoResponsavelId,
                    'motivo' => $motivo,
                ]
            );

            // Criar notificação para o novo responsável
            $this->criarNotificacaoTransferencia($tenantId, $posVenda, $novoResponsavelId);

            DB::commit();
            return $posVenda->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao transferir pós-venda: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Adicionar observação
     */
    public function adicionarObservacao(int $tenantId, int $posVendaId, string $observacao, int $usuarioId): PosVenda
    {
        $posVenda = PosVenda::where('tenant_id', $tenantId)->findOrFail($posVendaId);

        DB::beginTransaction();
        try {
            // Atualizar observação principal ou criar nova observação no histórico
            $posVenda->observacao = $posVenda->observacao . "\n\n--- Nova observação em " . now()->format('d/m/Y H:i') . " ---\n" . $observacao;
            $posVenda->save();

            // Registrar histórico
            $this->registrarHistorico($posVendaId, $tenantId, $usuarioId, 'observacao_adicionada',
                "Nova observação adicionada: {$observacao}",
                ['observacao' => $observacao]
            );

            DB::commit();
            return $posVenda->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao adicionar observação: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Criar agendamento
     */
    public function criarAgendamento(int $tenantId, int $posVendaId, array $dados, int $usuarioId): PosVendaAgendamento
    {
        $posVenda = PosVenda::where('tenant_id', $tenantId)->findOrFail($posVendaId);

        DB::beginTransaction();
        try {
            $agendamento = PosVendaAgendamento::create([
                'tenant_id' => $tenantId,
                'pos_venda_id' => $posVendaId,
                'responsavel_id' => $dados['responsavel_id'] ?? $posVenda->responsavel_atual_id,
                'data_agendamento' => Carbon::parse($dados['data_agendamento']),
                'observacao' => $dados['observacao'] ?? null,
            ]);

            // Registrar histórico
            $this->registrarHistorico($posVendaId, $tenantId, $usuarioId, 'agendamento_criado',
                "Agendamento criado para " . Carbon::parse($dados['data_agendamento'])->format('d/m/Y H:i'),
                [
                    'agendamento_id' => $agendamento->id,
                    'data_agendamento' => $agendamento->data_agendamento,
                ]
            );

            // Criar notificação de lembrete
            $this->criarNotificacaoAgendamento($tenantId, $agendamento);

            DB::commit();
            return $agendamento->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao criar agendamento: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Concluir agendamento
     */
    public function concluirAgendamento(int $tenantId, int $agendamentoId, int $usuarioId): PosVendaAgendamento
    {
        $agendamento = PosVendaAgendamento::where('tenant_id', $tenantId)->findOrFail($agendamentoId);

        DB::beginTransaction();
        try {
            $agendamento->concluido = true;
            $agendamento->data_conclusao = now();
            $agendamento->usuario_conclusao_id = $usuarioId;
            $agendamento->save();

            // Registrar histórico
            $this->registrarHistorico($agendamento->pos_venda_id, $tenantId, $usuarioId, 'agendamento_concluido',
                "Agendamento concluído",
                ['agendamento_id' => $agendamento->id]
            );

            DB::commit();
            return $agendamento->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro ao concluir agendamento: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Registrar histórico
     */
    protected function registrarHistorico(int $posVendaId, int $tenantId, int $usuarioId, string $tipoAcao, string $descricao, array $dadosAdicionais = []): void
    {
        PosVendaHistorico::create([
            'tenant_id' => $tenantId,
            'pos_venda_id' => $posVendaId,
            'tipo_acao' => $tipoAcao,
            'descricao' => $descricao,
            'usuario_id' => $usuarioId,
            'dados_adicionais' => $dadosAdicionais,
        ]);
    }

    /**
     * Criar notificação de transferência
     */
    protected function criarNotificacaoTransferencia(int $tenantId, PosVenda $posVenda, int $usuarioDestinoId): void
    {
        Notificacao::create([
            'tenant_id' => $tenantId,
            'tipo' => 'alerta',
            'titulo' => 'Pós-Venda Transferido',
            'mensagem' => "Um pós-venda foi transferido para você. Cliente: {$posVenda->cliente->nome}",
            'prioridade' => 'media',
            'dados_adicionais' => [
                'pos_venda_id' => $posVenda->id,
                'tipo' => 'transferencia',
            ],
        ]);
    }

    /**
     * Criar notificação de agendamento
     */
    protected function criarNotificacaoAgendamento(int $tenantId, PosVendaAgendamento $agendamento): void
    {
        // Notificação será criada quando o agendamento estiver próximo
        // Isso pode ser feito via job agendado
    }

    /**
     * Obter métricas de pós-venda por vendedor
     */
    public function obterMetricasPorVendedor(int $tenantId, int $vendedorId, Carbon $dataInicio, Carbon $dataFim): array
    {
        // Vendas do vendedor no período
        $vendasIds = Venda::where('tenant_id', $tenantId)
            ->where('vendedor_id', $vendedorId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereBetween('data_finalizacao', [$dataInicio, $dataFim])
            ->pluck('id');

        $totalVendas = $vendasIds->count();

        // Pós-vendas relacionados às vendas
        $posVendas = PosVenda::where('tenant_id', $tenantId)
            ->where('vendedor_id', $vendedorId)
            ->whereIn('venda_id', $vendasIds)
            ->get();

        $totalPosVendas = $posVendas->count();
        $percentualComPosVenda = $totalVendas > 0 ? ($totalPosVendas / $totalVendas) * 100 : 0;

        // Contar por tipo
        $elogios = $posVendas->where('tipo', 'elogio')->count();
        $reclamacoes = $posVendas->where('tipo', 'reclamacao')->count();
        $retrabalhos = $posVendas->where('tipo', 'ajuste_retrabalho')->count();

        // Média de satisfação
        $notas = $posVendas->whereNotNull('nota_satisfacao')->pluck('nota_satisfacao');
        $mediaSatisfacao = $notas->count() > 0 ? $notas->avg() : null;

        // Calcular pontuação (gamificação)
        $pontuacao = 0;
        $pontuacao += $totalPosVendas * 10; // +10 pontos por pós-venda registrado
        $pontuacao += $elogios * 20; // +20 pontos por elogio
        $pontuacao -= $reclamacoes * 15; // -15 pontos por reclamação
        $pontuacao -= $retrabalhos * 25; // -25 pontos por retrabalho
        if ($mediaSatisfacao) {
            $pontuacao += ($mediaSatisfacao - 3) * 10; // Bônus baseado na média (3 é neutro)
        }

        return [
            'total_vendas' => $totalVendas,
            'total_pos_vendas' => $totalPosVendas,
            'percentual_com_pos_venda' => round($percentualComPosVenda, 2),
            'elogios' => $elogios,
            'reclamacoes' => $reclamacoes,
            'retrabalhos' => $retrabalhos,
            'media_satisfacao' => $mediaSatisfacao ? round($mediaSatisfacao, 2) : null,
            'pontuacao_qualidade' => $pontuacao,
        ];
    }

    /**
     * Verificar e criar alertas de pós-venda pendente
     */
    public function verificarAlertas(int $tenantId): void
    {
        // Alertas para vendas entregues sem pós-venda após X dias
        $diasSemPosVenda = 7; // Configurável
        $dataLimite = Carbon::now()->subDays($diasSemPosVenda);

        $vendasSemPosVenda = Venda::where('tenant_id', $tenantId)
            ->where('status', Venda::STATUS_FINALIZADA)
            ->whereNotNull('data_finalizacao')
            ->where('data_finalizacao', '<=', $dataLimite)
            ->whereDoesntHave('posVendas')
            ->whereNotNull('vendedor_id')
            ->get();

        foreach ($vendasSemPosVenda as $venda) {
            // Verificar se já existe notificação
            $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'alerta')
                ->whereJsonContains('dados_adicionais->venda_id', $venda->id)
                ->whereJsonContains('dados_adicionais->tipo_alerta', 'sem_pos_venda')
                ->exists();

            if (!$existeNotificacao) {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'alerta',
                    'titulo' => 'Venda sem Pós-Venda',
                    'mensagem' => "A venda #{$venda->codigo} foi entregue há mais de {$diasSemPosVenda} dias e ainda não possui pós-venda registrado.",
                    'prioridade' => 'baixa',
                    'dados_adicionais' => [
                        'venda_id' => $venda->id,
                        'vendedor_id' => $venda->vendedor_id,
                        'tipo_alerta' => 'sem_pos_venda',
                    ],
                ]);
            }
        }

        // Alertas para pós-vendas pendentes há muito tempo
        $diasPendente = 14; // Configurável
        $dataLimitePendente = Carbon::now()->subDays($diasPendente);

        $posVendasPendentes = PosVenda::where('tenant_id', $tenantId)
            ->where('status', 'pendente')
            ->where('data_abertura', '<=', $dataLimitePendente)
            ->get();

        foreach ($posVendasPendentes as $posVenda) {
            $existeNotificacao = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'alerta')
                ->whereJsonContains('dados_adicionais->pos_venda_id', $posVenda->id)
                ->whereJsonContains('dados_adicionais->tipo_alerta', 'pos_venda_pendente')
                ->exists();

            if (!$existeNotificacao) {
                Notificacao::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'alerta',
                    'titulo' => 'Pós-Venda Pendente',
                    'mensagem' => "O pós-venda #{$posVenda->id} está pendente há mais de {$diasPendente} dias.",
                    'prioridade' => 'media',
                    'dados_adicionais' => [
                        'pos_venda_id' => $posVenda->id,
                        'responsavel_id' => $posVenda->responsavel_atual_id,
                        'tipo_alerta' => 'pos_venda_pendente',
                    ],
                ]);
            }
        }
    }
}
