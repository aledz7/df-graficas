<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ComissaoOSService;

class ProcessarComissoesOS extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'comissoes:processar {--funcionario-id= : ID do funcionário específico} {--dry-run : Executar sem salvar}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Processar comissões pendentes de OS finalizadas';

    protected $comissaoService;

    /**
     * Create a new command instance.
     */
    public function __construct(ComissaoOSService $comissaoService)
    {
        parent::__construct();
        $this->comissaoService = $comissaoService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Iniciando processamento de comissões de OS...');

        $funcionarioId = $this->option('funcionario-id');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('⚠️  Modo DRY RUN ativado - nenhuma comissão será criada');
        }

        try {
            if ($funcionarioId) {
                $this->info("📋 Processando comissões para funcionário ID: {$funcionarioId}");
                // Implementar processamento específico por funcionário se necessário
            } else {
                $this->info('📋 Processando todas as comissões pendentes...');
            }

            $comissoesCriadas = $this->comissaoService->processarComissoesPendentes();

            if ($comissoesCriadas > 0) {
                $this->info("✅ Processamento concluído! {$comissoesCriadas} comissões processadas.");
            } else {
                $this->info('ℹ️  Nenhuma comissão pendente encontrada.');
            }

            $this->info('🎉 Processamento finalizado com sucesso!');

        } catch (\Exception $e) {
            $this->error('❌ Erro durante o processamento: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }

        return 0;
    }
}
