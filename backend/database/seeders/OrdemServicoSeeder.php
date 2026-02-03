<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;

class OrdemServicoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obter o tenant_id do primeiro usuário (ou usar o tenant_id 1 como fallback)
        $tenant_id = \App\Models\User::first()->tenant_id ?? 1;
        
        // OS em produção - Finalizada mas ainda em produção
        $os1 = OrdemServico::create([
            'id_os' => 'OS-20250711-001',
            'status_os' => 'Finalizada',
            'valor_total_os' => 150.00,
            'data_criacao' => now(),
            'dados_producao' => [
                'status_producao' => 'Em Produção',
                'prazo_estimado' => now()->addDays(3)->format('Y-m-d'),
                'observacoes_internas' => 'Teste de OS em produção'
            ],
            'tenant_id' => $tenant_id
        ]);
        
        OrdemServicoItem::create([
            'ordem_servico_id' => $os1->id,
            'tenant_id' => $tenant_id,
            'nome_servico_produto' => 'Banner 1x1m',
            'tipo_item' => 'unidade',
            'quantidade' => 1,
            'valor_unitario' => 150.00,
            'valor_total' => 150.00
        ]);
        
        // OS aguardando entrega
        $os2 = OrdemServico::create([
            'id_os' => 'OS-20250711-002',
            'status_os' => 'Finalizada',
            'valor_total_os' => 300.00,
            'data_criacao' => now(),
            'tenant_id' => $tenant_id,
            'dados_producao' => [
                'status_producao' => 'Aguardando Entrega',
                'prazo_estimado' => now()->addDay()->format('Y-m-d'),
                'observacoes_internas' => 'Teste de OS aguardando entrega'
            ]
        ]);
        
        OrdemServicoItem::create([
            'ordem_servico_id' => $os2->id,
            'tenant_id' => $tenant_id,
            'nome_servico_produto' => 'Adesivo 50x50cm',
            'tipo_item' => 'unidade',
            'quantidade' => 2,
            'valor_unitario' => 150.00,
            'valor_total' => 300.00
        ]);
        
        // OS já entregue
        $os3 = OrdemServico::create([
            'id_os' => 'OS-20250711-003',
            'status_os' => 'Finalizada',
            'valor_total_os' => 300.00,
            'data_criacao' => now()->subDays(5),
            'data_finalizacao_os' => now()->subDays(2),
            'dados_producao' => [
                'status_producao' => 'Entregue',
                'prazo_estimado' => now()->subDay()->format('Y-m-d'),
                'observacoes_internas' => 'Teste de OS já entregue',
                'data_entrega' => now()->subDays(2)->format('Y-m-d')
            ],
            'tenant_id' => $tenant_id
        ]);
        
        OrdemServicoItem::create([
            'ordem_servico_id' => $os3->id,
            'tenant_id' => $tenant_id,
            'nome_servico_produto' => 'Cartão de Visita',
            'tipo_item' => 'unidade',
            'quantidade' => 1000,
            'valor_unitario' => 0.30,
            'valor_total' => 300.00
        ]);
        
        // OS finalizada sem dados de produção (deve aparecer em produção)
        $os4 = OrdemServico::create([
            'id_os' => 'OS-20250711-004',
            'status_os' => 'Finalizada',
            'valor_total_os' => 450.00,
            'data_criacao' => now()->subDay(),
            'data_finalizacao_os' => now(),
        ]);
        
        OrdemServicoItem::create([
            'ordem_servico_id' => $os4->id,
            'tenant_id' => $tenant_id,
            'nome_servico_produto' => 'Faixa 3x1m',
            'tipo_item' => 'unidade',
            'quantidade' => 1,
            'valor_unitario' => 450.00,
            'valor_total' => 450.00
        ]);
    }
}
