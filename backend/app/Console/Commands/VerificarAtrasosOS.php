<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationOSService;

class VerificarAtrasosOS extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'os:verificar-atrasos';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica OS com arte atrasada e cria notificações';

    /**
     * Execute the console command.
     */
    public function handle(NotificationOSService $notificationService)
    {
        $this->info('Verificando OS com arte atrasada...');
        
        $quantidade = $notificationService->verificarArteAtrasada();
        
        $this->info("Verificação concluída. {$quantidade} OS(es) com arte atrasada encontrada(s).");
        
        return Command::SUCCESS;
    }
}
