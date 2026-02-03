<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use App\Models\OrdemServico;
use Illuminate\Support\Facades\DB;

class RemoverContasOrfas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:remover-orfas {--dry-run : Apenas simular sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove contas a receber órfãs (que referenciam OS que não existem mais)';

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

        $this->info('Iniciando remoção de contas órfãs...');

        // Buscar contas que aparecem como "Lançamento" e são de OS mas não têm OS correspondente
        $contasOrfas = ContaReceber::whereNull('venda_id')
            ->whereNull('os_id') 
            ->whereNull('envelopamento_id')
            ->whereNull('deleted_at')
            ->where(function($query) {
                $query->where('observacoes', 'like', '%Ordem de Serviço%')
                      ->orWhere('observacoes', 'like', '%OS-%')
                      ->orWhere('descricao', 'like', '%OS #%');
            })
            ->get();

        if ($contasOrfas->isEmpty()) {
            $this->info('✅ Nenhuma conta órfã encontrada!');
            return;
        }

        $contasParaRemover = [];

        foreach ($contasOrfas as $conta) {
            // Tentar extrair o código da OS das observações
            $codigoOS = null;
            if (preg_match('/OS-([0-9\-a-f]+)/', $conta->observacoes, $matches)) {
                $codigoOS = $matches[1];
            }

            if (!$codigoOS) {
                continue;
            }

            // Verificar se a OS existe no banco
            $os = OrdemServico::where('id_os', 'like', "%{$codigoOS}")
                ->first();

            if (!$os) {
                $contasParaRemover[] = $conta;
            }
        }

        if (empty($contasParaRemover)) {
            $this->info('✅ Nenhuma conta órfã encontrada para remover!');
            return;
        }

        $this->info("📊 Encontradas " . count($contasParaRemover) . " contas órfãs para remover:");

        $valorTotalRemovido = 0;

        foreach ($contasParaRemover as $conta) {
            // Extrair código da OS
            preg_match('/OS-([0-9\-a-f]+)/', $conta->observacoes, $matches);
            $codigoOS = $matches[1];

            $this->line("   🗑️  Conta #{$conta->id}: R$ {$conta->valor_original} (OS-{$codigoOS} não existe)");
            $this->line("      Cliente: " . ($conta->cliente ? $conta->cliente->nome_completo : "ID {$conta->cliente_id}"));
            $this->line("      Status: {$conta->status}");

            $valorTotalRemovido += $conta->valor_original;

            if (!$dryRun) {
                $conta->delete();
            }
        }

        $this->info('');
        $this->info('📈 RESUMO DA REMOÇÃO:');
        $this->info("   🗑️  Contas órfãs removidas: " . count($contasParaRemover));
        $this->info("   💰 Valor total removido: R$ " . number_format($valorTotalRemovido, 2, ',', '.'));

        if ($dryRun) {
            $this->info('');
            $this->warn('⚠️  Esta foi apenas uma simulação. Execute sem --dry-run para aplicar as alterações.');
        } else {
            $this->info('');
            $this->info('✅ Remoção concluída com sucesso!');
        }
    }
}
