<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use App\Models\OrdemServico;

class VerificarContasReceberOS extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:verificar-os {--fix : Corrigir automaticamente os vínculos}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica e corrige vínculos entre contas a receber e ordens de serviço';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Verificando vínculos entre contas a receber e ordens de serviço...');
        $this->newLine();

        // 1. Buscar contas sem os_id mas com OS mencionada nas observações
        $contasSemVinculo = ContaReceber::whereNull('os_id')
            ->whereNotNull('observacoes')
            ->where('observacoes', 'LIKE', '%Ordem de Serviço:%')
            ->get();

        if ($contasSemVinculo->isEmpty()) {
            $this->info('✅ Todas as contas estão corretamente vinculadas!');
            return 0;
        }

        $this->warn("Encontradas {$contasSemVinculo->count()} contas sem vínculo:");
        $this->newLine();

        $corrigidas = 0;
        $naoEncontradas = 0;
        $erros = [];

        foreach ($contasSemVinculo as $conta) {
            preg_match('/Ordem de Serviço: (OS-[a-zA-Z0-9-]+)/', $conta->observacoes, $matches);
            
            if (isset($matches[1])) {
                $idOS = $matches[1];
                $os = OrdemServico::where('id_os', $idOS)->first();

                if ($os) {
                    if ($this->option('fix')) {
                        try {
                            $conta->os_id = $os->id;
                            $conta->save();
                            $corrigidas++;
                            $this->line("  ✓ Conta {$conta->id} vinculada à OS {$os->id} ({$idOS})");
                        } catch (\Exception $e) {
                            $erros[] = "Erro ao corrigir conta {$conta->id}: {$e->getMessage()}";
                            $this->error("  ✗ Erro ao vincular conta {$conta->id}");
                        }
                    } else {
                        $this->line("  • Conta {$conta->id} pode ser vinculada à OS {$os->id} ({$idOS})");
                        $corrigidas++;
                    }
                } else {
                    $naoEncontradas++;
                    $this->warn("  ⚠ Conta {$conta->id} - OS {$idOS} não encontrada (provavelmente deletada)");
                }
            }
        }

        $this->newLine();
        $this->info('═══════════════════════════════════════');
        $this->info('📊 RESUMO:');
        $this->info("  Total de contas sem vínculo: {$contasSemVinculo->count()}");
        
        if ($this->option('fix')) {
            $this->info("  Corrigidas: {$corrigidas}");
        } else {
            $this->info("  Podem ser corrigidas: {$corrigidas}");
        }
        
        $this->warn("  OS não encontradas: {$naoEncontradas}");
        
        if (!empty($erros)) {
            $this->error("  Erros: " . count($erros));
        }
        
        $this->info('═══════════════════════════════════════');
        $this->newLine();

        if (!$this->option('fix') && $corrigidas > 0) {
            $this->comment('💡 Execute com --fix para corrigir automaticamente os vínculos');
            $this->comment('   Exemplo: php artisan contas:verificar-os --fix');
        }

        if (!empty($erros)) {
            $this->newLine();
            $this->error('Erros encontrados:');
            foreach ($erros as $erro) {
                $this->error("  • {$erro}");
            }
        }

        return 0;
    }
}

