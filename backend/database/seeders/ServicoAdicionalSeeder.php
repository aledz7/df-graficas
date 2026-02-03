<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ServicoAdicional;
use App\Models\Tenant;

class ServicoAdicionalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar o primeiro tenant (ou criar um se não existir)
        $tenant = Tenant::first();
        if (!$tenant) {
            $tenant = Tenant::create([
                'nome' => 'Empresa Demo',
                'razao_social' => 'Empresa de Demonstração',
                'cnpj' => '00000000000191',
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
        }

        // Verificar se já existem serviços para este tenant
        $existingCount = ServicoAdicional::where('tenant_id', $tenant->id)->count();
        if ($existingCount > 0) {
            $this->command->info("Já existem {$existingCount} serviços para o tenant {$tenant->id}. Pulando seeder.");
            return;
        }

        $servicos = [
            [
                'nome' => 'Aplicação de Vinil',
                'descricao' => 'Aplicação de vinil adesivo na superfície',
                'preco' => 10.00,
                'categoria' => 'aplicacao',
                'ordem' => 1,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Remoção de Vinil',
                'descricao' => 'Remoção de vinil antigo da superfície',
                'preco' => 5.00,
                'categoria' => 'remocao',
                'ordem' => 2,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Lixamento da Superfície',
                'descricao' => 'Preparação da superfície através de lixamento',
                'preco' => 8.00,
                'categoria' => 'preparacao',
                'ordem' => 3,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Película de Proteção',
                'descricao' => 'Aplicação de película protetora sobre o vinil',
                'preco' => 40.00,
                'categoria' => 'protecao',
                'ordem' => 4,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Limpeza da Superfície',
                'descricao' => 'Limpeza e desengraxante da superfície',
                'preco' => 3.00,
                'categoria' => 'preparacao',
                'ordem' => 5,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Aplicação de Primer',
                'descricao' => 'Aplicação de primer para melhor aderência',
                'preco' => 15.00,
                'categoria' => 'preparacao',
                'ordem' => 6,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Laminação',
                'descricao' => 'Aplicação de laminação sobre o vinil',
                'preco' => 25.00,
                'categoria' => 'protecao',
                'ordem' => 7,
                'tenant_id' => $tenant->id
            ],
            [
                'nome' => 'Corte e Vinco',
                'descricao' => 'Corte e vinco para aplicação em cantos',
                'preco' => 12.00,
                'categoria' => 'aplicacao',
                'ordem' => 8,
                'tenant_id' => $tenant->id
            ]
        ];

        foreach ($servicos as $servico) {
            ServicoAdicional::create($servico);
        }

        $this->command->info("Seeder executado com sucesso! {$tenant->nome} agora tem " . count($servicos) . " serviços adicionais.");
    }
}
