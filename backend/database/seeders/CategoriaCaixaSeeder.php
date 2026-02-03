<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CategoriaCaixa;
use App\Models\Tenant;

class CategoriaCaixaSeeder extends Seeder
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

        // Categorias padrão para movimentações de caixa
        $categorias = [
            [
                'nome' => 'Sangria de Caixa',
                'descricao' => 'Retiradas de dinheiro do caixa',
                'tipo' => 'saida',
                'cor' => '#ef4444',
                'icone' => 'arrow-down-circle',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 1,
            ],
            [
                'nome' => 'Suprimento de Caixa',
                'descricao' => 'Adições de dinheiro ao caixa',
                'tipo' => 'entrada',
                'cor' => '#22c55e',
                'icone' => 'arrow-up-circle',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 2,
            ],
            [
                'nome' => 'Vendas',
                'descricao' => 'Receitas provenientes de vendas',
                'tipo' => 'entrada',
                'cor' => '#3b82f6',
                'icone' => 'shopping-cart',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 3,
            ],
            [
                'nome' => 'Despesas Gerais',
                'descricao' => 'Despesas operacionais da empresa',
                'tipo' => 'saida',
                'cor' => '#f59e0b',
                'icone' => 'credit-card',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 4,
            ],
            [
                'nome' => 'Fornecedores',
                'descricao' => 'Pagamentos a fornecedores',
                'tipo' => 'saida',
                'cor' => '#8b5cf6',
                'icone' => 'truck',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 5,
            ],
            [
                'nome' => 'Transferências',
                'descricao' => 'Transferências entre contas',
                'tipo' => 'transferencia',
                'cor' => '#06b6d4',
                'icone' => 'repeat',
                'sistema' => true,
                'ativo' => true,
                'ordem' => 6,
            ],
        ];

        foreach ($categorias as $categoria) {
            CategoriaCaixa::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'nome' => $categoria['nome'],
                ],
                [
                    'descricao' => $categoria['descricao'],
                    'tipo' => $categoria['tipo'],
                    'cor' => $categoria['cor'],
                    'icone' => $categoria['icone'],
                    'sistema' => $categoria['sistema'],
                    'ativo' => $categoria['ativo'],
                    'ordem' => $categoria['ordem'],
                ]
            );
        }

        $this->command->info('Categorias de caixa criadas com sucesso!');
    }
} 