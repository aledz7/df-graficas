<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use App\Models\Venda;
use Illuminate\Support\Facades\DB;

class CorrigirContasVendaLancamento extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:corrigir-venda-lancamento {--dry-run : Apenas simular sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige contas de vendas PDV que aparecem como "Lançamento" preenchendo o venda_id';

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

        $this->info('Iniciando correção de contas de vendas que aparecem como "Lançamento"...');

        // Buscar contas que aparecem como "Lançamento" mas são de vendas PDV
        $contasVenda = ContaReceber::whereNull('venda_id')
            ->whereNull('os_id') 
            ->whereNull('envelopamento_id')
            ->whereNull('deleted_at')
            ->where(function($query) {
                $query->where('observacoes', 'like', '%Venda PDV%')
                      ->orWhere('observacoes', 'like', '%VEN%')
                      ->orWhere('descricao', 'like', '%Venda #VEN%');
            })
            ->get();

        if ($contasVenda->isEmpty()) {
            $this->info('✅ Nenhuma conta de venda encontrada para corrigir!');
            return;
        }

        $this->info("📊 Encontradas {$contasVenda->count()} contas de vendas aparecendo como 'Lançamento'");

        $contasCorrigidas = 0;
        $contasNaoEncontradas = 0;

        foreach ($contasVenda as $conta) {
            // Tentar extrair o código da venda das observações ou descrição
            $codigoVenda = null;
            
            if (preg_match('/VEN(\d+)/', $conta->observacoes, $matches)) {
                $codigoVenda = 'VEN' . $matches[1];
            } elseif (preg_match('/VEN(\d+)/', $conta->descricao, $matches)) {
                $codigoVenda = 'VEN' . $matches[1];
            }

            if (!$codigoVenda) {
                $contasNaoEncontradas++;
                $this->line("   ⚠️  Conta #{$conta->id}: Código da venda não encontrado");
                continue;
            }

            // Buscar a venda no banco pelo código
            $venda = Venda::where('codigo', $codigoVenda)->first();

            if (!$venda) {
                $contasNaoEncontradas++;
                $this->line("   ⚠️  Conta #{$conta->id}: Venda {$codigoVenda} não encontrada no banco");
                continue;
            }

            $this->line("   🔧 Conta #{$conta->id}: Corrigindo venda_id para {$venda->id} ({$codigoVenda})");

            if (!$dryRun) {
                $conta->update(['venda_id' => $venda->id]);
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
}
