<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use Illuminate\Support\Facades\DB;

class LimparContasDuplicadas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:limpar-duplicadas {--dry-run : Apenas simular sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove contas a receber duplicadas para a mesma venda, mantendo apenas uma por venda';

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

        $this->info('Iniciando limpeza de contas duplicadas...');

        // Buscar vendas que têm múltiplas contas a receber (apenas não deletadas)
        $vendasComDuplicatas = DB::table('contas_receber')
            ->select('venda_id', DB::raw('COUNT(*) as total_contas'))
            ->whereNotNull('venda_id')
            ->whereNull('deleted_at')
            ->groupBy('venda_id')
            ->having('total_contas', '>', 1)
            ->get();

        if ($vendasComDuplicatas->isEmpty()) {
            $this->info('✅ Nenhuma conta duplicada encontrada!');
            return;
        }

        $this->info("📊 Encontradas {$vendasComDuplicatas->count()} vendas com contas duplicadas");

        $totalContasRemovidas = 0;
        $valorTotalConsolidado = 0;

        foreach ($vendasComDuplicatas as $vendaInfo) {
            $vendaId = $vendaInfo->venda_id;
            $totalContas = $vendaInfo->total_contas;

            // Buscar todas as contas desta venda (apenas não deletadas)
            $contas = ContaReceber::where('venda_id', $vendaId)
                ->orderBy('id', 'asc')
                ->get();

            if ($contas->count() <= 1) {
                continue; // Pular se não há duplicatas
            }

            $this->info("🔄 Processando Venda #{$vendaId} ({$contas->count()} contas):");

            // Calcular valores totais
            $valorTotal = $contas->sum('valor_original');
            $formasPagamento = $contas->pluck('observacoes')->map(function ($obs) {
                // Extrair forma de pagamento da observação
                if (preg_match('/- ([^-]+)$/', $obs, $matches)) {
                    return trim($matches[1]);
                }
                return 'N/A';
            })->unique()->filter()->toArray();

            // Manter a primeira conta e atualizar seus valores
            $contaPrincipal = $contas->first();
            $contasParaRemover = $contas->skip(1);

            $this->line("   📝 Mantendo conta #{$contaPrincipal->id}");
            $this->line("   💰 Valor original: R$ {$contaPrincipal->valor_original} → R$ {$valorTotal}");
            $this->line("   💳 Formas: " . implode(' + ', $formasPagamento));

            if (!$dryRun) {
                // Atualizar a conta principal com os valores consolidados
                $contaPrincipal->update([
                    'valor_original' => $valorTotal,
                    'valor_pendente' => 0, // Já quitada
                    'observacoes' => "Venda PDV - {$contaPrincipal->venda->codigo} - " . implode(' + ', $formasPagamento) . " (Consolidada)"
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

        $this->info('');
        $this->info('📈 RESUMO DA OPERAÇÃO:');
        $this->info("   📊 Vendas processadas: {$vendasComDuplicatas->count()}");
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