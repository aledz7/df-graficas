<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use App\Models\OrdemServico;
use Illuminate\Support\Facades\DB;

class CorrigirContasOSLancamento extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:corrigir-os-lancamento {--dry-run : Apenas simular sem fazer alterações} {--remove-duplicates : Remove contas duplicadas ao invés de corrigir}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige contas de OS que aparecem como "Lançamento" preenchendo o os_id ou remove duplicatas';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $removeDuplicates = $this->option('remove-duplicates');
        
        if ($dryRun) {
            $this->info('🔍 MODO SIMULAÇÃO - Nenhuma alteração será feita no banco de dados');
        } else {
            $this->warn('⚠️  MODO REAL - Alterações serão feitas no banco de dados');
            if (!$this->confirm('Deseja continuar?')) {
                $this->info('Operação cancelada.');
                return;
            }
        }

        if ($removeDuplicates) {
            $this->info('🗑️  Modo: REMOVER contas duplicadas');
        } else {
            $this->info('🔧 Modo: CORRIGIR os_id das contas de OS');
        }

        $this->info('Iniciando correção de contas OS que aparecem como "Lançamento"...');

        // Buscar contas que aparecem como "Lançamento" mas são de OS
        $contasOS = ContaReceber::whereNull('venda_id')
            ->whereNull('os_id') 
            ->whereNull('envelopamento_id')
            ->whereNull('deleted_at')
            ->where(function($query) {
                $query->where('observacoes', 'like', '%Ordem de Serviço%')
                      ->orWhere('observacoes', 'like', '%OS-%')
                      ->orWhere('descricao', 'like', '%OS #%');
            })
            ->orderBy('created_at', 'asc')
            ->get();

        if ($contasOS->isEmpty()) {
            $this->info('✅ Nenhuma conta de OS encontrada para corrigir!');
            return;
        }

        $this->info("📊 Encontradas {$contasOS->count()} contas de OS aparecendo como 'Lançamento'");

        if ($removeDuplicates) {
            $this->removerDuplicatas($contasOS, $dryRun);
        } else {
            $this->corrigirOsId($contasOS, $dryRun);
        }
    }

    private function corrigirOsId($contasOS, $dryRun)
    {
        $contasCorrigidas = 0;
        $contasNaoEncontradas = 0;

        foreach ($contasOS as $conta) {
            // Tentar extrair o código da OS das observações
            $codigoOS = null;
            if (preg_match('/OS-([0-9\-a-f]+)/', $conta->observacoes, $matches)) {
                $codigoOS = $matches[1];
            }

            if (!$codigoOS) {
                $contasNaoEncontradas++;
                $this->line("   ⚠️  Conta #{$conta->id}: Código da OS não encontrado nas observações");
                continue;
            }

            // Buscar a OS no banco pelo código
            $os = OrdemServico::where('id_os', 'like', "%{$codigoOS}")
                ->first();

            if (!$os) {
                $contasNaoEncontradas++;
                $this->line("   ⚠️  Conta #{$conta->id}: OS com código {$codigoOS} não encontrada no banco");
                continue;
            }

            $this->line("   🔧 Conta #{$conta->id}: Corrigindo os_id para {$os->id} (OS-{$codigoOS})");

            if (!$dryRun) {
                $conta->update(['os_id' => $os->id]);
            }
            
            $contasCorrigidas++;
        }

        $this->info('');
        $this->info('📈 RESUMO DA CORREÇÃO:');
        $this->info("   ✅ Contas corrigidas: {$contasCorrigidas}");
        $this->info("   ⚠️  Contas não encontradas: {$contasNaoEncontradas}");

        if ($dryRun) {
            $this->info('');
            $this->warn('⚠️  Esta foi apenas uma simulação. Execute sem --dry-run para aplicar as alterações.');
        } else {
            $this->info('');
            $this->info('✅ Correção concluída com sucesso!');
        }
    }

    private function removerDuplicatas($contasOS, $dryRun)
    {
        // Agrupar por cliente, valor e data
        $grupos = [];
        foreach ($contasOS as $conta) {
            $chave = $conta->cliente_id . '|' . $conta->valor_original . '|' . $conta->data_emissao->format('Y-m-d');
            if (!isset($grupos[$chave])) {
                $grupos[$chave] = [];
            }
            $grupos[$chave][] = $conta;
        }

        $gruposComDuplicatas = 0;
        $contasRemovidas = 0;

        foreach ($grupos as $chave => $contas) {
            if (count($contas) > 1) {
                $gruposComDuplicatas++;
                list($clienteId, $valor, $data) = explode('|', $chave);
                
                $this->info("🔄 Processando grupo duplicado - Cliente: {$clienteId}, Valor: R$ {$valor}, Data: {$data} (" . count($contas) . " contas):");
                
                // Manter a primeira conta (mais antiga) e remover as outras
                $contaPrincipal = $contas[0];
                $contasParaRemover = array_slice($contas, 1);
                
                $this->line("   📝 Mantendo conta #{$contaPrincipal->id}");
                
                foreach ($contasParaRemover as $conta) {
                    $this->line("   🗑️  Removendo conta #{$conta->id}");
                    
                    if (!$dryRun) {
                        $conta->delete();
                    }
                    $contasRemovidas++;
                }
            }
        }

        if ($gruposComDuplicatas == 0) {
            $this->info('✅ Nenhuma duplicata encontrada!');
            return;
        }

        $this->info('');
        $this->info('📈 RESUMO DA REMOÇÃO:');
        $this->info("   📊 Grupos processados: {$gruposComDuplicatas}");
        $this->info("   🗑️  Contas removidas: {$contasRemovidas}");

        if ($dryRun) {
            $this->info('');
            $this->warn('⚠️  Esta foi apenas uma simulação. Execute sem --dry-run para aplicar as alterações.');
        } else {
            $this->info('');
            $this->info('✅ Remoção concluída com sucesso!');
        }
    }
}
