<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Aplicar juros programados diariamente às 8h da manhã
        $schedule->command('contas:aplicar-juros')
                ->dailyAt('08:00')
                ->appendOutputTo(storage_path('logs/juros-aplicados.log'));

        // Verificar fechamento automático de mês todos os dias às 23:59
        // Executa no final do dia para incluir todas as transações até 23:59 do dia configurado
        $schedule->command('funcionarios:fechar-mes-automatico')
                ->dailyAt('23:59')
                ->appendOutputTo(storage_path('logs/fechamento-mes-automatico.log'));

        // Verificar OS com arte atrasada a cada hora
        $schedule->command('os:verificar-atrasos')
                ->hourly()
                ->appendOutputTo(storage_path('logs/verificacao-atrasos-os.log'));
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
} 