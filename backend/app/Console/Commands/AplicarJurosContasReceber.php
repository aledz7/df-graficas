<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use Illuminate\Support\Facades\Log;

class AplicarJurosContasReceber extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:aplicar-juros {--dry-run : Executa sem aplicar juros, apenas mostra o que seria aplicado}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Aplica juros programados às contas a receber';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando aplicação de juros às contas a receber...');
        
        $isDryRun = $this->option('dry-run');
        
        if ($isDryRun) {
            $this->warn('MODO DRY-RUN: Nenhum juros será aplicado, apenas simulação');
        }

        try {
            // Buscar contas que devem ter juros aplicados
            $contas = ContaReceber::devemAplicarJuros()
                ->with('cliente')
                ->get();

            $contasParaAplicar = $contas->filter(function ($conta) {
                return $conta->deveAplicarJurosHoje();
            });

            if ($contasParaAplicar->isEmpty()) {
                $this->info('Nenhuma conta precisa ter juros aplicados hoje.');
                return 0;
            }

            $this->info("Encontradas {$contasParaAplicar->count()} contas para aplicar juros:");

            $contasAplicadas = [];
            $contasNaoAplicadas = [];

            foreach ($contasParaAplicar as $conta) {
                $valorJuros = $conta->calcularValorJuros();
                
                $this->line("Conta #{$conta->id} - Cliente: {$conta->cliente->nome_completo}");
                $this->line("  Valor pendente: R$ " . number_format($conta->valor_pendente, 2, ',', '.'));
                $this->line("  Juros a aplicar: R$ " . number_format($valorJuros, 2, ',', '.'));
                $this->line("  Tipo: {$conta->tipo_juros} - Frequência: {$conta->frequencia_juros}");
                $this->line("  Data início: " . $conta->data_inicio_cobranca_juros->format('d/m/Y'));
                
                if (!$isDryRun) {
                    if ($conta->aplicarJuros('Aplicação automática via comando')) {
                        $contasAplicadas[] = $conta;
                        $this->info("  ✓ Juros aplicados com sucesso");
                    } else {
                        $contasNaoAplicadas[] = $conta;
                        $this->error("  ✗ Erro ao aplicar juros");
                    }
                } else {
                    $this->info("  [DRY-RUN] Juros seriam aplicados");
                }
                
                $this->line('');
            }

            if (!$isDryRun) {
                $this->info("Resumo da aplicação:");
                $this->info("  Contas com juros aplicados: " . count($contasAplicadas));
                $this->info("  Contas com erro: " . count($contasNaoAplicadas));
                
                // Log da operação
                Log::info('Aplicação automática de juros concluída', [
                    'contas_aplicadas' => count($contasAplicadas),
                    'contas_nao_aplicadas' => count($contasNaoAplicadas),
                    'data_execucao' => now()->toDateTimeString()
                ]);
            } else {
                $this->info("Simulação concluída - {$contasParaAplicar->count()} contas seriam processadas");
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('Erro ao aplicar juros: ' . $e->getMessage());
            Log::error('Erro na aplicação automática de juros', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
} 