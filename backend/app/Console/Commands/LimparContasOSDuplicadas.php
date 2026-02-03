<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use Illuminate\Support\Facades\DB;

class LimparContasOSDuplicadas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:limpar-os-duplicadas {--dry-run : Apenas simular sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove contas a receber duplicadas de Ordens de Serviço que aparecem como "Lançamento"';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info('🔍 MODO SIMULAÇÃO - Nenhuma alteração será feita no banco de dados');
        } else {
            $this->warn('⚠️  MODO REAL - Alterações serão feitas no banco de dados');
            if (!$this->confirm('Deseja continuar?')) {
                $this->info('Operação cancelada.');
                return;
            }
        }

        $this->info('Iniciando limpeza de contas duplicadas de OS...');

        // Buscar contas que são de OS mas não têm os_id preenchido
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

        // Agrupar por código de OS
        $codigosOS = [];
        foreach ($contasOS as $conta) {
            if (preg_match('/OS-([0-9\-a-f]+)/', $conta->observacoes, $matches)) {
                $codigoOS = $matches[1];
                
                if (!isset($codigosOS[$codigoOS])) {
                    $codigosOS[$codigoOS] = [];
                }
                $codigosOS[$codigoOS][] = $conta;
            }
        }

        // Verificar duplicatas
        $duplicatasEncontradas = 0;
        $totalContasRemovidas = 0;
        $valorTotalConsolidado = 0;

        foreach ($codigosOS as $codigo => $contas) {
            if (count($contas) > 1) {
                $duplicatasEncontradas++;
                
                $this->info("🔄 Processando OS-{$codigo} (" . count($contas) . " contas):");
                
                // Calcular valor total
                $valorTotal = collect($contas)->sum('valor_original');
                
                // Manter a primeira conta (mais antiga) e consolidar valores
                $contaPrincipal = $contas[0];
                $contasParaRemover = array_slice($contas, 1);
                
                $this->line("   📝 Mantendo conta #{$contaPrincipal->id}");
                $this->line("   💰 Valor original: R$ {$contaPrincipal->valor_original} → R$ {$valorTotal}");
                
                if (!$dryRun) {
                    // Atualizar a conta principal com o valor consolidado
                    $contaPrincipal->update([
                        'valor_original' => $valorTotal,
                        'valor_pendente' => $contaPrincipal->status === 'quitada' ? 0 : $valorTotal,
                        'observacoes' => $contaPrincipal->observacoes . " (Consolidada)"
                    ]);
                }
                
                // Remover contas duplicadas
                foreach ($contasParaRemover as $conta) {
                    $this->line("   🗑️  Removendo conta #{$conta->id} (R$ {$conta->valor_original})");
                    
                    if (!$dryRun) {
                        $conta->delete();
                    }
                    $totalContasRemovidas++;
                }
                
                $valorTotalConsolidado += $valorTotal;
            }
        }

        if ($duplicatasEncontradas == 0) {
            $this->info('✅ Nenhuma conta duplicada de OS encontrada!');
            return;
        }

        $this->info('');
        $this->info('📈 RESUMO DA OPERAÇÃO:');
        $this->info("   📊 OS processadas: {$duplicatasEncontradas}");
        $this->info("   🗑️  Contas removidas: {$totalContasRemovidas}");
        $this->info("   💰 Valor total consolidado: R$ " . number_format($valorTotalConsolidado, 2, ',', '.'));

        if ($dryRun) {
            $this->info('');
            $this->warn('⚠️  Esta foi apenas uma simulação. Execute sem --dry-run para aplicar as alterações.');
        } else {
            $this->info('');
            $this->info('✅ Limpeza concluída com sucesso!');
        }
    }
}
