<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Seeder para executar todos os seeders de teste
 * Execute: php artisan db:seed --class=RunTestSeeders
 */
class RunTestSeeders extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('=== Executando Seeders de Teste ===');
        $this->command->info('');

        // Executar seeder de chat
        $this->command->info('1. Criando conversas de teste do chat...');
        $this->call(ChatTestSeeder::class);
        $this->command->info('');

        // Executar seeder de kanban
        $this->command->info('2. Criando dados de teste do Kanban...');
        $this->call(KanbanTestSeeder::class);
        $this->command->info('');

        $this->command->info('✓ Todos os seeders de teste foram executados com sucesso!');
    }
}
