<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Produto;
use App\Models\DadosUsuario;
use App\Models\Notificacao;
use Illuminate\Support\Facades\Log;

class VerificarEstoqueBaixo extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'estoque:verificar-baixo {--tenant= : ID do tenant específico}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica produtos com estoque baixo e cria notificações';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando verificação de estoque baixo...');

        try {
            $tenantId = $this->option('tenant');
            
            if ($tenantId) {
                $this->verificarEstoqueBaixoTenant($tenantId);
            } else {
                // Verificar todos os tenants
                $tenants = \App\Models\Tenant::all();
                foreach ($tenants as $tenant) {
                    $this->verificarEstoqueBaixoTenant($tenant->id);
                }
            }

            $this->info('Verificação de estoque baixo concluída com sucesso!');
        } catch (\Exception $e) {
            $this->error('Erro ao verificar estoque baixo: ' . $e->getMessage());
            Log::error('Erro no comando VerificarEstoqueBaixo:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Verifica estoque baixo para um tenant específico
     */
    private function verificarEstoqueBaixoTenant($tenantId)
    {
        $this->info("Verificando tenant ID: {$tenantId}");

        // Buscar configurações globais do tenant
        $configData = DadosUsuario::where('user_id', 1) // Usar user_id em vez de tenant_id
            ->where('chave', 'produtoConfigGlobal')
            ->first();
        
        $config = $configData ? json_decode($configData->valor, true) : [];
        $percentualAlerta = isset($config['notificarEstoqueBaixoPercentual']) 
            ? (int) $config['notificarEstoqueBaixoPercentual'] 
            : 20; // Padrão 20%

        // Buscar produtos com estoque baixo
        $produtosComEstoqueBaixo = Produto::where('tenant_id', $tenantId)
            ->where('status', true)
            ->whereRaw('(estoque / NULLIF(estoque_minimo, 0)) * 100 <= ?', [$percentualAlerta])
            ->where('estoque_minimo', '>', 0)
            ->get();

        $this->info("Encontrados {$produtosComEstoqueBaixo->count()} produtos com estoque baixo");

        foreach ($produtosComEstoqueBaixo as $produto) {
            $this->criarNotificacaoEstoqueBaixo($produto, $tenantId);
        }
    }

    /**
     * Cria notificação para produto com estoque baixo
     */
    private function criarNotificacaoEstoqueBaixo($produto, $tenantId)
    {
        try {
            // Verificar se já existe uma notificação recente para este produto
            $notificacaoExistente = Notificacao::where('tenant_id', $tenantId)
                ->where('tipo', 'estoque_baixo')
                ->where('produto_id', $produto->id)
                ->where('created_at', '>=', now()->subHours(24)) // Não criar notificação se já existe uma nas últimas 24h
                ->first();

            if ($notificacaoExistente) {
                $this->line("Notificação já existe para produto {$produto->nome}");
                return;
            }

            // Calcular percentual atual
            $percentualAtual = $produto->estoque_minimo > 0 
                ? ($produto->estoque / $produto->estoque_minimo) * 100 
                : 0;

            // Criar notificação
            Notificacao::create([
                'tenant_id' => $tenantId,
                'tipo' => 'estoque_baixo',
                'titulo' => 'Estoque Baixo',
                'mensagem' => "O produto \"{$produto->nome}\" está com estoque baixo ({$produto->estoque} unidades). Estoque mínimo: {$produto->estoque_minimo}",
                'produto_id' => $produto->id,
                'produto_nome' => $produto->nome,
                'estoque_atual' => $produto->estoque,
                'estoque_minimo' => $produto->estoque_minimo,
                'percentual_atual' => round($percentualAtual, 2),
                'prioridade' => 'alta',
                'lida' => false,
                'data_criacao' => now(),
            ]);

            $this->line("Notificação criada para produto {$produto->nome}");

        } catch (\Exception $e) {
            $this->error("Erro ao criar notificação para produto {$produto->nome}: " . $e->getMessage());
            Log::error('Erro ao criar notificação de estoque baixo:', [
                'produto_id' => $produto->id,
                'tenant_id' => $tenantId,
                'error' => $e->getMessage()
            ]);
        }
    }
} 