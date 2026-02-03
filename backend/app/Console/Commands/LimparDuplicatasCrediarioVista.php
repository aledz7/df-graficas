<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ContaReceber;
use Illuminate\Support\Facades\DB;

class LimparDuplicatasCrediarioVista extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'contas:limpar-crediario-vista {--dry-run : Apenas simular sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove duplicatas quando crediário é pago à vista (mantém apenas o pagamento à vista)';

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

        $this->info('Iniciando limpeza de duplicatas: Crediário pago à vista...');

        // Buscar grupos de contas com possível duplicação
        $duplicatasPotenciais = DB::select("
            SELECT 
                cliente_id,
                valor_original,
                DATE(data_emissao) as data,
                COUNT(*) as total_contas
            FROM contas_receber 
            WHERE deleted_at IS NULL
            GROUP BY cliente_id, valor_original, DATE(data_emissao)
            HAVING COUNT(*) > 1
        ");

        $duplicacoesEncontradas = 0;
        $contasRemovidas = 0;
        $valorTotalConsolidado = 0;

        foreach ($duplicatasPotenciais as $grupo) {
            // Buscar as contas deste grupo
            $contas = ContaReceber::where('cliente_id', $grupo->cliente_id)
                ->where('valor_original', $grupo->valor_original)
                ->whereDate('data_emissao', $grupo->data)
                ->whereNull('deleted_at')
                ->with('cliente')
                ->orderBy('created_at', 'asc')
                ->get();
            
            if ($contas->count() <= 1) {
                continue;
            }
            
            // Verificar se é caso de crediário + pagamento à vista
            $contaCrediario = null;
            $contaPagamentoVista = null;
            
            foreach ($contas as $conta) {
                if (strpos($conta->observacoes, 'Crediário') !== false) {
                    $contaCrediario = $conta;
                } elseif (strpos($conta->observacoes, 'Dinheiro') !== false || 
                         strpos($conta->observacoes, 'Pix') !== false ||
                         strpos($conta->observacoes, 'Cartão') !== false) {
                    $contaPagamentoVista = $conta;
                }
            }
            
            // Se temos crediário E pagamento à vista, e ambos quitados
            if ($contaCrediario && $contaPagamentoVista && 
                $contaCrediario->status === 'quitada' && 
                $contaPagamentoVista->status === 'quitada') {
                
                $duplicacoesEncontradas++;
                
                $this->info("🔄 Processando duplicação #{$duplicacoesEncontradas}:");
                $this->line("   Cliente: " . ($contas->first()->cliente ? $contas->first()->cliente->nome_completo : "ID {$grupo->cliente_id}"));
                $this->line("   Valor: R$ {$grupo->valor_original}");
                $this->line("   Data: {$grupo->data}");
                
                // Manter o pagamento à vista e remover o crediário
                $this->line("   📝 Mantendo: Conta #{$contaPagamentoVista->id} (Pagamento à vista)");
                $this->line("   🗑️  Removendo: Conta #{$contaCrediario->id} (Crediário duplicado)");
                
                if (!$dryRun) {
                    $contaCrediario->delete();
                }
                
                $contasRemovidas++;
                $valorTotalConsolidado += $grupo->valor_original;
            }
        }

        if ($duplicacoesEncontradas == 0) {
            $this->info('✅ Nenhuma duplicação de crediário+vista encontrada!');
            return;
        }

        $this->info('');
        $this->info('📈 RESUMO DA OPERAÇÃO:');
        $this->info("   📊 Duplicações processadas: {$duplicacoesEncontradas}");
        $this->info("   🗑️  Contas de crediário removidas: {$contasRemovidas}");
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
