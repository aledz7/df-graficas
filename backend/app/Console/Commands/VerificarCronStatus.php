<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class VerificarCronStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cron:verificar-status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica se o cron job do Laravel está configurado e funcionando';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('========================================');
        $this->info('Verificando Status do Cron Job');
        $this->info('========================================');
        $this->line('');

        // Verificar se o cron está configurado
        $cronConfigurado = $this->verificarCronConfigurado();
        
        // Verificar se há logs recentes de execução
        $logsRecentes = $this->verificarLogsRecentes();

        // Verificar última execução do schedule
        $ultimaExecucao = $this->verificarUltimaExecucao();

        $this->line('');
        $this->info('========================================');
        $this->info('RESUMO:');
        $this->info('========================================');
        
        if ($cronConfigurado) {
            $this->info('✓ Cron job está configurado no sistema');
        } else {
            $this->error('✗ Cron job NÃO está configurado no sistema');
            $this->line('');
            $this->warn('Para configurar, execute:');
            $this->line('  bash ' . base_path('configurar-cron.sh'));
            $this->line('');
            $this->line('Ou adicione manualmente ao crontab:');
            $this->line('  * * * * * cd ' . base_path() . ' && php artisan schedule:run >> /dev/null 2>&1');
        }

        if ($logsRecentes) {
            $this->info('✓ Há logs recentes de execução');
        } else {
            $this->warn('⚠ Não foram encontrados logs recentes de execução');
            $this->line('   Isso pode indicar que o cron não está rodando');
        }

        if ($ultimaExecucao) {
            $this->info("✓ Última execução do schedule: {$ultimaExecucao}");
        } else {
            $this->warn('⚠ Não foi possível determinar a última execução');
        }

        $this->line('');
        $this->info('========================================');
        
        return 0;
    }

    /**
     * Verifica se o cron está configurado
     */
    private function verificarCronConfigurado()
    {
        $crontab = shell_exec('crontab -l 2>/dev/null');
        
        if ($crontab && strpos($crontab, 'schedule:run') !== false) {
            return true;
        }
        
        return false;
    }

    /**
     * Verifica se há logs recentes (últimas 24 horas)
     */
    private function verificarLogsRecentes()
    {
        $logPath = storage_path('logs/fechamento-mes-automatico.log');
        
        if (!File::exists($logPath)) {
            return false;
        }

        $ultimaModificacao = File::lastModified($logPath);
        $agora = time();
        $diferenca = $agora - $ultimaModificacao;
        
        // Se o arquivo foi modificado nas últimas 24 horas
        return $diferenca < 86400;
    }

    /**
     * Verifica a última execução do schedule
     */
    private function verificarUltimaExecucao()
    {
        $logPath = storage_path('logs/fechamento-mes-automatico.log');
        
        if (!File::exists($logPath)) {
            return null;
        }

        $conteudo = File::get($logPath);
        $linhas = explode("\n", $conteudo);
        
        // Procurar pela última linha com data/hora
        for ($i = count($linhas) - 1; $i >= 0; $i--) {
            if (preg_match('/\d{4}-\d{2}-\d{2}/', $linhas[$i], $matches)) {
                return $matches[0];
            }
        }
        
        return null;
    }
}

