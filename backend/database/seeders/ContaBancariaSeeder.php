<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ContaBancaria;
use App\Models\Tenant;
use App\Models\User;

class ContaBancariaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obter o primeiro tenant disponível
        $tenant = Tenant::first();
        
        if (!$tenant) {
            $this->command->error('Nenhum tenant encontrado. Execute o DatabaseSeeder primeiro.');
            return;
        }

        // Criar conta bancária padrão se não existir
        ContaBancaria::firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'nome' => 'Conta Principal'
            ],
            [
                'tipo' => 'conta_corrente',
                'nome_banco' => 'Banco Padrão',
                'codigo_banco' => '001',
                'agencia' => '0001',
                'conta' => '123456',
                'digito_conta' => '0',
                'saldo_atual' => 0.00,
                'saldo_inicial' => 0.00,
                'data_saldo_inicial' => now(),
                'titular_nome' => $tenant->razao_social,
                'ativo' => true,
                'incluir_fluxo_caixa' => true,
                'conta_padrao' => true,
                'cor' => '#3498db',
                'icone' => 'fas fa-university',
                'observacoes' => 'Conta bancária padrão criada automaticamente pelo sistema'
            ]
        );

        // Criar conta de caixa se não existir
        ContaBancaria::firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'nome' => 'Caixa'
            ],
            [
                'tipo' => 'caixa',
                'nome_banco' => 'Caixa Físico',
                'codigo_banco' => '000',
                'agencia' => '0000',
                'conta' => '000000',
                'digito_conta' => '0',
                'saldo_atual' => 0.00,
                'saldo_inicial' => 0.00,
                'data_saldo_inicial' => now(),
                'titular_nome' => $tenant->razao_social,
                'ativo' => true,
                'incluir_fluxo_caixa' => true,
                'conta_padrao' => false,
                'cor' => '#22c55e',
                'icone' => 'fas fa-cash-register',
                'observacoes' => 'Conta de caixa físico para movimentações diárias'
            ]
        );

        $this->command->info('Conta bancária padrão criada com sucesso!');
    }
} 