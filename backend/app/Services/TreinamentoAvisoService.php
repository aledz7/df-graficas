<?php

namespace App\Services;

use App\Models\TreinamentoRegraAlerta;
use App\Models\TreinamentoAviso;
use App\Models\TreinamentoProgresso;
use App\Models\Treinamento;
use App\Models\User;
use App\Models\Notificacao;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TreinamentoAvisoService
{
    /**
     * Executar verificação de atrasos no treinamento
     */
    public function executarVerificacoes(int $tenantId): void
    {
        Log::info("Executando verificações de treinamento para o tenant: {$tenantId}");
        
        $regras = TreinamentoRegraAlerta::where('tenant_id', $tenantId)
            ->where('ativo', true)
            ->get();

        foreach ($regras as $regra) {
            $this->verificarRegra($regra, $tenantId);
        }

        Log::info("Verificações de treinamento concluídas para o tenant: {$tenantId}");
    }

    /**
     * Verificar uma regra específica
     */
    protected function verificarRegra(TreinamentoRegraAlerta $regra, int $tenantId): void
    {
        $usuarios = User::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where('is_admin', false);

        // Filtrar por setor se necessário
        if ($regra->setor_alvo !== 'todos') {
            $usuarios->where('setor', $regra->setor_alvo);
        }

        $usuarios = $usuarios->get();

        foreach ($usuarios as $usuario) {
            $atrasado = false;
            $diasAtraso = 0;
            $dataLimite = null;

            switch ($regra->tipo) {
                case 'nivel_nao_concluido':
                    $atrasado = $this->verificarNivelNaoConcluido($usuario, $regra, $diasAtraso, $dataLimite);
                    break;
                case 'treinamento_atrasado':
                    $atrasado = $this->verificarTreinamentoAtrasado($usuario, $regra, $diasAtraso, $dataLimite);
                    break;
                case 'setor_incompleto':
                    $atrasado = $this->verificarSetorIncompleto($usuario, $regra, $diasAtraso, $dataLimite);
                    break;
            }

            if ($atrasado) {
                $this->criarAviso($usuario, $regra, $diasAtraso, $dataLimite);
            }
        }
    }

    /**
     * Verificar se nível não foi concluído
     */
    protected function verificarNivelNaoConcluido(User $usuario, TreinamentoRegraAlerta $regra, &$diasAtraso, &$dataLimite): bool
    {
        if (!$regra->nivel_alvo) {
            return false;
        }

        $dataLimite = Carbon::parse($usuario->created_at)->addDays($regra->prazo_dias);
        $diasAtraso = max(0, Carbon::now()->diffInDays($dataLimite, false));

        if ($diasAtraso > 0) {
            return false; // Ainda não passou o prazo
        }

        // Verificar se concluiu todos os treinamentos do nível
        $treinamentosNivel = Treinamento::where('tenant_id', $usuario->tenant_id)
            ->where('ativo', true)
            ->where('nivel', $regra->nivel_alvo)
            ->where(function($query) use ($usuario) {
                $query->where('setor', $usuario->setor)
                      ->orWhere('setor', 'geral');
            })
            ->pluck('id');

        $concluidos = TreinamentoProgresso::where('usuario_id', $usuario->id)
            ->whereIn('treinamento_id', $treinamentosNivel)
            ->where('concluido', true)
            ->count();

        return $concluidos < $treinamentosNivel->count();
    }

    /**
     * Verificar se treinamento está atrasado
     */
    protected function verificarTreinamentoAtrasado(User $usuario, TreinamentoRegraAlerta $regra, &$diasAtraso, &$dataLimite): bool
    {
        $dataLimite = Carbon::parse($usuario->created_at)->addDays($regra->prazo_dias);
        $diasAtraso = max(0, Carbon::now()->diffInDays($dataLimite, false));

        if ($diasAtraso > 0) {
            return false; // Ainda não passou o prazo
        }

        // Verificar progresso geral
        $progressoEsperado = 100; // 100% do treinamento
        return $usuario->progresso_treinamento < $progressoEsperado;
    }

    /**
     * Verificar se setor está incompleto
     */
    protected function verificarSetorIncompleto(User $usuario, TreinamentoRegraAlerta $regra, &$diasAtraso, &$dataLimite): bool
    {
        $dataLimite = Carbon::parse($usuario->created_at)->addDays($regra->prazo_dias);
        $diasAtraso = max(0, Carbon::now()->diffInDays($dataLimite, false));

        if ($diasAtraso > 0) {
            return false;
        }

        // Verificar se concluiu todos os treinamentos do setor
        $treinamentosSetor = Treinamento::where('tenant_id', $usuario->tenant_id)
            ->where('ativo', true)
            ->where('setor', $usuario->setor)
            ->pluck('id');

        $concluidos = TreinamentoProgresso::where('usuario_id', $usuario->id)
            ->whereIn('treinamento_id', $treinamentosSetor)
            ->where('concluido', true)
            ->count();

        return $concluidos < $treinamentosSetor->count();
    }

    /**
     * Criar aviso de treinamento
     */
    protected function criarAviso(User $usuario, TreinamentoRegraAlerta $regra, int $diasAtraso, $dataLimite): void
    {
        // Verificar se já existe aviso pendente
        $avisoExistente = TreinamentoAviso::where('tenant_id', $usuario->tenant_id)
            ->where('usuario_id', $usuario->id)
            ->where('tipo', $regra->tipo)
            ->where('status', 'pendente')
            ->first();

        if ($avisoExistente) {
            // Atualizar aviso existente
            $avisoExistente->update([
                'dias_atraso' => $diasAtraso,
                'data_limite' => $dataLimite,
            ]);
            return;
        }

        // Criar novo aviso
        $titulo = $regra->mensagem_personalizada 
            ?: $this->gerarTituloPadrao($regra, $diasAtraso);
        
        $mensagem = $this->gerarMensagemPadrao($regra, $usuario, $diasAtraso);

        $aviso = TreinamentoAviso::create([
            'tenant_id' => $usuario->tenant_id,
            'usuario_id' => $usuario->id,
            'tipo' => $regra->tipo,
            'titulo' => $titulo,
            'mensagem' => $mensagem,
            'nivel_esperado' => $regra->nivel_alvo,
            'dias_atraso' => $diasAtraso,
            'data_limite' => $dataLimite,
            'status' => 'pendente',
        ]);

        // Criar notificações
        if ($regra->notificar_colaborador) {
            Notificacao::create([
                'tenant_id' => $usuario->tenant_id,
                'tipo' => 'treinamento_atrasado',
                'titulo' => $titulo,
                'mensagem' => $mensagem,
                'user_id' => $usuario->id,
                'prioridade' => 'alta',
                'dados_adicionais' => [
                    'aviso_id' => $aviso->id,
                    'tipo' => $regra->tipo,
                ],
            ]);
        }

        if ($regra->notificar_gestor) {
            // Notificar admins/gestores
            $gestores = User::where('tenant_id', $usuario->tenant_id)
                ->where('is_admin', true)
                ->where('is_active', true)
                ->get();

            foreach ($gestores as $gestor) {
                Notificacao::create([
                    'tenant_id' => $usuario->tenant_id,
                    'tipo' => 'treinamento_atrasado_gestor',
                    'titulo' => "Colaborador com treinamento atrasado: {$usuario->name}",
                    'mensagem' => "O colaborador {$usuario->name} está com treinamento atrasado. {$mensagem}",
                    'user_id' => $gestor->id,
                    'prioridade' => 'media',
                    'dados_adicionais' => [
                        'aviso_id' => $aviso->id,
                        'usuario_id' => $usuario->id,
                        'tipo' => $regra->tipo,
                    ],
                ]);
            }
        }
    }

    /**
     * Gerar título padrão
     */
    protected function gerarTituloPadrao(TreinamentoRegraAlerta $regra, int $diasAtraso): string
    {
        return match($regra->tipo) {
            'nivel_nao_concluido' => "Nível {$regra->nivel_alvo} não concluído",
            'treinamento_atrasado' => "Treinamento atrasado ({$diasAtraso} dias)",
            'setor_incompleto' => "Treinamento do setor incompleto",
            default => "Treinamento pendente",
        };
    }

    /**
     * Gerar mensagem padrão
     */
    protected function gerarMensagemPadrao(TreinamentoRegraAlerta $regra, User $usuario, int $diasAtraso): string
    {
        return match($regra->tipo) {
            'nivel_nao_concluido' => "Você ainda não concluiu todos os treinamentos do nível {$regra->nivel_alvo}. Prazo: {$regra->prazo_dias} dias após o cadastro.",
            'treinamento_atrasado' => "Seu treinamento está atrasado em {$diasAtraso} dias. Complete o treinamento o quanto antes.",
            'setor_incompleto' => "Você ainda não concluiu todos os treinamentos do seu setor ({$usuario->setor}).",
            default => "Você possui treinamentos pendentes.",
        };
    }
}
