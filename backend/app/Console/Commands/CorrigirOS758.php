<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use App\Models\OrdemServico;
use App\Http\Controllers\Api\OrdemServicoController;
use Illuminate\Support\Facades\Log;

class CorrigirOS758 extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'os:corrigir-758 {--fix : Corrigir automaticamente}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica e corrige problemas com a OS 758 e sua conta a receber';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Verificando OS 758...');
        $this->newLine();

        // Buscar OS 758 pelo ID
        $os = OrdemServico::where('id', 758)->first();
        
        if (!$os) {
            $this->error('❌ OS 758 não encontrada!');
            return 1;
        }

        $this->info("✅ OS 758 encontrada:");
        $this->line("   ID: {$os->id}");
        $this->line("   ID_OS: {$os->id_os}");
        $this->line("   Status: {$os->status_os}");
        $this->line("   Valor Total: R$ " . number_format($os->valor_total_os, 2, ',', '.'));
        $this->line("   Cliente ID: {$os->cliente_id}");
        $this->newLine();

        // Verificar pagamentos
        $pagamentos = $os->pagamentos ?? [];
        $this->info("📋 Pagamentos:");
        if (empty($pagamentos)) {
            $this->warn("   Nenhum pagamento encontrado");
        } else {
            foreach ($pagamentos as $index => $pagamento) {
                $metodo = $pagamento['metodo'] ?? 'Não informado';
                $valor = $pagamento['valor'] ?? 0;
                $valorFinal = $pagamento['valorFinal'] ?? null;
                $this->line("   Pagamento " . ($index + 1) . ":");
                $this->line("      Método: {$metodo}");
                $this->line("      Valor: R$ " . number_format($valor, 2, ',', '.'));
                if ($valorFinal !== null) {
                    $this->line("      Valor Final: R$ " . number_format($valorFinal, 2, ',', '.'));
                }
            }
        }
        $this->newLine();

        // Verificar se há pagamentos com Crediário
        $pagamentosCrediario = collect($pagamentos)->filter(function($pagamento) {
            return isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário';
        });

        if ($pagamentosCrediario->isEmpty()) {
            $this->warn("⚠️  OS 758 não possui pagamentos em Crediário.");
            $this->info("   Portanto, não deveria ter conta a receber criada.");
            $this->newLine();
            
            // Verificar se existe conta a receber incorreta
            $contasIncorretas = ContaReceber::where('os_id', 758)->get();
            if ($contasIncorretas->isNotEmpty()) {
                $this->error("❌ PROBLEMA ENCONTRADO: Existem contas a receber vinculadas à OS 758 sem crediário!");
                foreach ($contasIncorretas as $conta) {
                    $this->line("   Conta ID: {$conta->id}, Valor: R$ " . number_format($conta->valor_original, 2, ',', '.'));
                }
                if ($this->option('fix')) {
                    foreach ($contasIncorretas as $conta) {
                        $conta->delete();
                        $this->line("   ✓ Conta {$conta->id} removida");
                    }
                }
            }
            return 0;
        }

        // Calcular valor correto do crediário
        $valorCrediarioCorreto = $pagamentosCrediario->sum(function($pagamento) {
            return floatval($pagamento['valorFinal'] ?? $pagamento['valor'] ?? 0);
        });

        $this->info("💰 Valor do Crediário calculado: R$ " . number_format($valorCrediarioCorreto, 2, ',', '.'));
        $this->newLine();

        // Verificar contas a receber existentes
        $contasExistentes = ContaReceber::where('os_id', 758)->get();
        
        if ($contasExistentes->isEmpty()) {
            $this->error("❌ PROBLEMA ENCONTRADO: OS 758 não possui conta a receber criada!");
            $this->info("   A OS tem pagamento em Crediário mas não foi criada conta a receber.");
            $this->newLine();
            
            if ($this->option('fix')) {
                $this->info("🔧 Criando conta a receber para OS 758...");
                try {
                    $controller = new OrdemServicoController();
                    $reflection = new \ReflectionClass($controller);
                    $method = $reflection->getMethod('criarContaReceberOS');
                    $method->setAccessible(true);
                    $method->invoke($controller, $os);
                    
                    $contaCriada = ContaReceber::where('os_id', 758)->first();
                    if ($contaCriada) {
                        $this->info("✅ Conta a receber criada com sucesso!");
                        $this->line("   Conta ID: {$contaCriada->id}");
                        $this->line("   Valor: R$ " . number_format($contaCriada->valor_original, 2, ',', '.'));
                    } else {
                        $this->error("❌ Erro: Conta não foi criada. Verifique os logs.");
                    }
                } catch (\Exception $e) {
                    $this->error("❌ Erro ao criar conta: " . $e->getMessage());
                    Log::error("Erro ao criar conta a receber para OS 758", [
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                $this->comment("💡 Execute com --fix para criar a conta a receber automaticamente");
            }
        } else {
            $this->info("📊 Contas a receber encontradas: {$contasExistentes->count()}");
            $this->newLine();
            
            $problemasEncontrados = false;
            
            foreach ($contasExistentes as $conta) {
                $this->line("   Conta ID: {$conta->id}");
                $this->line("   Valor Original: R$ " . number_format($conta->valor_original, 2, ',', '.'));
                $this->line("   Valor Pendente: R$ " . number_format($conta->valor_pendente, 2, ',', '.'));
                
                // Verificar se o valor está correto
                $diferenca = abs($conta->valor_original - $valorCrediarioCorreto);
                if ($diferenca > 0.01) {
                    $problemasEncontrados = true;
                    $this->error("   ❌ VALOR INCORRETO! Diferença: R$ " . number_format($diferenca, 2, ',', '.'));
                    $this->line("      Valor esperado: R$ " . number_format($valorCrediarioCorreto, 2, ',', '.'));
                    $this->line("      Valor atual: R$ " . number_format($conta->valor_original, 2, ',', '.'));
                    
                    if ($this->option('fix')) {
                        $conta->valor_original = $valorCrediarioCorreto;
                        $conta->valor_pendente = $valorCrediarioCorreto;
                        $conta->save();
                        $this->info("   ✅ Valor corrigido!");
                    }
                } else {
                    $this->info("   ✅ Valor correto");
                }
                $this->newLine();
            }
            
            if (!$problemasEncontrados) {
                $this->info("✅ Tudo está correto com a OS 758!");
            } else {
                if (!$this->option('fix')) {
                    $this->comment("💡 Execute com --fix para corrigir os valores automaticamente");
                }
            }
        }

        // Verificar se há conta a receber com ID 758 que não corresponde à OS 758
        $contaId758 = ContaReceber::where('id', 758)->first();
        if ($contaId758 && $contaId758->os_id != 758) {
            $this->warn("⚠️  ATENÇÃO: Existe uma Conta a Receber com ID 758 que não está vinculada à OS 758!");
            $this->line("   Conta ID 758 está vinculada à OS ID: {$contaId758->os_id}");
            $this->line("   Valor da Conta 758: R$ " . number_format($contaId758->valor_original, 2, ',', '.'));
            $this->newLine();
            
            if ($contaId758->os_id) {
                $osVinculada = OrdemServico::find($contaId758->os_id);
                if ($osVinculada) {
                    $this->line("   OS vinculada à Conta 758:");
                    $this->line("      ID: {$osVinculada->id}");
                    $this->line("      ID_OS: {$osVinculada->id_os}");
                    $this->line("      Valor Total: R$ " . number_format($osVinculada->valor_total_os, 2, ',', '.'));
                }
            }
        }

        return 0;
    }
}






