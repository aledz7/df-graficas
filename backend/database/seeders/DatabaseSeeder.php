<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Desabilitar verificações de chave estrangeira para evitar erros
        \DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        // Limpar tabelas
        \DB::table('users')->truncate();
        \DB::table('tenants')->truncate();
        \DB::table('configuracoes')->truncate();
        
        // Criar tenant padrão
        $tenant = Tenant::create([
            'nome' => 'Empresa Demo',
            'razao_social' => 'Empresa de Demonstração',
            'cnpj' => '00000000000191', // CNPJ válido para testes
            'email' => 'contato@empresademo.com.br',
            'telefone' => '(11) 99999-9999',
            'cep' => '00000-000',
            'logradouro' => 'Rua Exemplo',
            'numero' => '123',
            'cidade' => 'São Paulo',
            'uf' => 'SP',
            'ativo' => true,
            'data_ativacao' => now(),
            'plano' => 'gratuito',
        ]);
        
        // Criar usuário administrador
        $admin = User::create([
            'name' => 'Administrador',
            'email' => 'admin@empresa.com',
            'password' => Hash::make('admin123'),
            'tenant_id' => $tenant->id,
            'is_admin' => true,
            'email_verified_at' => now(),
        ]);
        
        // Executar o seeder de configurações da empresa
        $this->call(EmpresaConfigSeeder::class);
        
        // Executar seeders adicionais
        $this->call([
            AdminConfiguracaoSeeder::class,
            ConfiguracoesIniciaisSeeder::class,
            ContaBancariaSeeder::class,
            CategoriaCaixaSeeder::class,
            OrdemServicoSeeder::class,
            // ServicoAdicionalSeeder::class, // Comentado até executar a migration
            // Adicione outros seeders aqui, se necessário
        ]);
        
        // Habilitar verificações de chave estrangeira novamente
        \DB::statement('SET FOREIGN_KEY_CHECKS=1');
        
        $this->command->info('Database seeded successfully!');
    }
}
