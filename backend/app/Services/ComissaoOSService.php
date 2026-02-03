<?php

namespace App\Services;

use App\Models\ComissaoOS;
use App\Models\User;
use App\Models\OrdemServico;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ComissaoOSService
{
    /**
     * Calcular e criar comissão para uma OS
     */
    public function calcularComissaoOS(OrdemServico $ordemServico)
    {
        Log::info('=== INICIANDO CÁLCULO DE COMISSÃO ===', [
            'os_id' => $ordemServico->id,
            'id_os' => $ordemServico->id_os,
            'status_os' => $ordemServico->status_os,
            'vendedor_id' => $ordemServico->vendedor_id,
            'valor_total_os' => $ordemServico->valor_total_os,
            'tenant_id' => $ordemServico->tenant_id
        ]);

        try {
            // Verificar se a OS tem vendedor
            if (!$ordemServico->vendedor_id) {
                Log::info('OS sem vendedor, não há comissão para calcular', [
                    'os_id' => $ordemServico->id,
                    'id_os' => $ordemServico->id_os
                ]);
                return null;
            }

            // Buscar o usuário (funcionário) diretamente
            $user = User::find($ordemServico->vendedor_id);
            if (!$user) {
                Log::warning('Usuário não encontrado para calcular comissão', [
                    'user_id' => $ordemServico->vendedor_id,
                    'os_id' => $ordemServico->id
                ]);
                return null;
            }

            Log::info('Usuário encontrado para comissão', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'permite_receber_comissao' => $user->permite_receber_comissao,
                'comissao_servicos' => $user->comissao_servicos
            ]);

            // Verificar se o usuário pode receber comissão
            if (!$user->permite_receber_comissao) {
                Log::info('Usuário não permite receber comissão', [
                    'user_id' => $user->id,
                    'user_nome' => $user->name
                ]);
                return null;
            }

            // Verificar se tem comissão de serviços configurada
            if (!$user->comissao_servicos || $user->comissao_servicos <= 0) {
                Log::info('Usuário sem comissão de serviços configurada', [
                    'user_id' => $user->id,
                    'comissao_servicos' => $user->comissao_servicos
                ]);
                return null;
            }

            // Verificar se a OS está finalizada
            if ($ordemServico->status_os !== 'Finalizada' && $ordemServico->status_os !== 'Entregue') {
                Log::info('OS não está finalizada, não há comissão para calcular', [
                    'os_id' => $ordemServico->id,
                    'status_os' => $ordemServico->status_os
                ]);
                return null;
            }

            // Verificar se já existe comissão para esta OS
            $comissaoExistente = ComissaoOS::where('ordem_servico_id', $ordemServico->id)->first();
            if ($comissaoExistente) {
                Log::info('Comissão já existe para esta OS', [
                    'os_id' => $ordemServico->id,
                    'comissao_id' => $comissaoExistente->id
                ]);
                return $comissaoExistente;
            }

            // Calcular comissão
            $valorComissao = ($ordemServico->valor_total_os * $user->comissao_servicos) / 100;

            Log::info('Calculando comissão', [
                'valor_os' => $ordemServico->valor_total_os,
                'percentual_comissao' => $user->comissao_servicos,
                'valor_comissao_calculado' => $valorComissao
            ]);

            // Sempre criar comissão como Pendente por padrão (pagamento é controlado separadamente)
            $statusPagamento = 'Pendente';
            $dataOsPaga = null; // nunca definir automaticamente aqui

            // Criar comissão (preenchendo também funcionario_id para compatibilidade)
            $comissao = ComissaoOS::create([
                'tenant_id' => $ordemServico->tenant_id ?? $user->tenant_id,
                'user_id' => $user->id,
                'funcionario_id' => $user->id,
                'ordem_servico_id' => $ordemServico->id,
                'valor_os' => $ordemServico->valor_total_os,
                'percentual_comissao' => $user->comissao_servicos,
                'valor_comissao' => $valorComissao,
                'status_pagamento' => $statusPagamento,
                'data_os_finalizada' => $ordemServico->data_finalizacao_os ? $ordemServico->data_finalizacao_os->toDateString() : now()->toDateString(),
                'data_os_paga' => null,
                'observacoes' => "Comissão automática gerada para OS {$ordemServico->id_os}"
            ]);

            Log::info('Comissão criada com sucesso', [
                'comissao_id' => $comissao->id,
                'user_id' => $user->id,
                'user_nome' => $user->name,
                'os_id' => $ordemServico->id,
                'valor_os' => $ordemServico->valor_total_os,
                'percentual_comissao' => $user->comissao_servicos,
                'valor_comissao' => $valorComissao,
                'status_pagamento' => $statusPagamento
            ]);

            return $comissao;

        } catch (\Exception $e) {
            Log::error('Erro ao calcular comissão da OS', [
                'os_id' => $ordemServico->id ?? 'não definido',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Verificar se uma OS foi paga
     */
    private function verificarOSPaga(OrdemServico $ordemServico)
    {
        // Somente considerar paga quando houver evidência de quitação
        // 1) Qualquer pagamento com status conhecido como quitado
        if ($ordemServico->pagamentos && is_array($ordemServico->pagamentos)) {
            $statusQuitado = ['Pago', 'pago', 'Concluido', 'Concluído', 'concluido', 'concluído', 'Quitado', 'quitado'];
            $totalPago = 0;
            foreach ($ordemServico->pagamentos as $pagamento) {
                if (isset($pagamento['status']) && in_array($pagamento['status'], $statusQuitado, true)) {
                    return true;
                }
                // 2) Ou soma dos valores pagos quita o total da OS
                if (isset($pagamento['valor'])) {
                    $totalPago += (float) $pagamento['valor'];
                }
            }
            if ($ordemServico->valor_total_os !== null) {
                $valorTotal = (float) $ordemServico->valor_total_os;
                if ($valorTotal > 0 && $totalPago + 0.01 >= $valorTotal) { // tolerância centavos
                    return true;
                }
            }
        }

        // Não marcar como pago apenas por estar Finalizada/Entregue
        return false;
    }

    /**
     * Atualizar comissão quando o status de pagamento da OS muda
     */
    public function atualizarComissaoPagamento(OrdemServico $ordemServico)
    {
        try {
            $comissao = ComissaoOS::where('ordem_servico_id', $ordemServico->id)->first();
            
            if (!$comissao) {
                return null;
            }

            $osPaga = $this->verificarOSPaga($ordemServico);
            
            if ($osPaga && $comissao->status_pagamento === 'Pendente') {
                $comissao->update([
                    'status_pagamento' => 'Pago',
                    'data_os_paga' => now()->toDateString()
                ]);

                Log::info('Comissão atualizada para paga', [
                    'comissao_id' => $comissao->id,
                    'os_id' => $ordemServico->id
                ]);
            }

            return $comissao;

        } catch (\Exception $e) {
            Log::error('Erro ao atualizar comissão de pagamento', [
                'os_id' => $ordemServico->id ?? 'não definido',
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Processar comissões pendentes para todas as OS finalizadas
     */
    public function processarComissoesPendentes()
    {
        try {
            $osFinalizadas = OrdemServico::whereIn('status_os', ['Finalizada', 'Entregue'])
                ->whereDoesntHave('comissoes')
                ->get();

            $comissoesCriadas = 0;

            foreach ($osFinalizadas as $os) {
                $comissao = $this->calcularComissaoOS($os);
                if ($comissao) {
                    $comissoesCriadas++;
                }
            }

            Log::info('Processamento de comissões pendentes concluído', [
                'os_processadas' => $osFinalizadas->count(),
                'comissoes_criadas' => $comissoesCriadas
            ]);

            return $comissoesCriadas;

        } catch (\Exception $e) {
            Log::error('Erro ao processar comissões pendentes', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 0;
        }
    }

    /**
     * Obter comissões de um funcionário por período
     */
    public function getComissoesUsuario($userId, $dataInicio = null, $dataFim = null)
    {
        $query = ComissaoOS::where('user_id', $userId);

        if ($dataInicio && $dataFim) {
            $query->whereBetween('data_os_finalizada', [$dataInicio, $dataFim]);
        }

        return $query->with(['ordemServico.cliente', 'usuario'])->get();
    }

    /**
     * Obter total de comissões de um usuário
     */
    public function getTotalComissoesUsuario($userId, $status = null)
    {
        $query = ComissaoOS::where('user_id', $userId);

        if ($status === 'pendente') {
            $query->pendentes();
        } elseif ($status === 'pago') {
            $query->pagas();
        }

        return $query->sum('valor_comissao');
    }
} 