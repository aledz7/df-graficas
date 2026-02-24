<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\KanbanColumn;
use App\Models\KanbanOSPosition;
use App\Models\KanbanOSItemProgress;
use App\Models\OrdemServico;
use App\Models\OrdemServicoItem;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Cliente;
use Carbon\Carbon;

class KanbanTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = Tenant::first();
        
        if (!$tenant) {
            $this->command->error('Nenhum tenant encontrado. Execute o DatabaseSeeder primeiro.');
            return;
        }

        // Buscar ou criar usuário para o Kanban
        $user = User::where('tenant_id', $tenant->id)->first();
        
        if (!$user) {
            $this->command->error('Nenhum usuário encontrado. Execute o DatabaseSeeder primeiro.');
            return;
        }

        // Buscar ou criar cliente de teste
        $cliente = Cliente::where('tenant_id', $tenant->id)->first();
        
        if (!$cliente) {
            $cliente = Cliente::create([
                'tenant_id' => $tenant->id,
                'nome_completo' => 'Cliente Teste Kanban',
                'apelido_fantasia' => 'Cliente Teste',
                'telefone' => '(11) 99999-9999',
                'email' => 'cliente.teste@kanban.com',
            ]);
            $this->command->info("  ✓ Cliente criado: {$cliente->nome_completo}");
        }

        $this->command->info('Criando colunas do Kanban...');

        // 1. Coluna obrigatória "NOVOS PEDIDOS" (já deve existir, mas vamos garantir)
        $colunaNovosPedidos = KanbanColumn::firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'is_obrigatoria' => true,
            ],
            [
                'nome' => 'NOVOS PEDIDOS',
                'cor' => '#8b5cf6',
                'ordem' => 0,
                'is_sistema' => true,
            ]
        );

        // 2. Criar colunas adicionais
        $colunas = [
            [
                'nome' => 'Em Análise',
                'cor' => '#3b82f6',
                'ordem' => 1,
            ],
            [
                'nome' => 'Em Produção',
                'cor' => '#f59e0b',
                'ordem' => 2,
            ],
            [
                'nome' => 'Aguardando Aprovação',
                'cor' => '#ec4899',
                'ordem' => 3,
            ],
            [
                'nome' => 'Finalizado',
                'cor' => '#10b981',
                'ordem' => 4,
            ],
            [
                'nome' => 'Entregue',
                'cor' => '#14b8a6',
                'ordem' => 5,
            ],
        ];

        $colunasCriadas = [];
        foreach ($colunas as $colunaData) {
            $coluna = KanbanColumn::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'user_id' => $user->id,
                    'nome' => $colunaData['nome'],
                ],
                [
                    'cor' => $colunaData['cor'],
                    'ordem' => $colunaData['ordem'],
                    'is_obrigatoria' => false,
                    'is_sistema' => false,
                ]
            );
            $colunasCriadas[] = $coluna;
            $this->command->info("  ✓ Coluna criada: {$coluna->nome}");
        }

        $this->command->info('');
        $this->command->info('Criando OS de teste...');

        // Limpar OS de teste anteriores (incluindo soft deletes)
        $this->command->info('  Limpando OS de teste anteriores...');
        $osToDelete = OrdemServico::withTrashed()
            ->where('tenant_id', $tenant->id)
            ->where('id_os', 'like', 'OS-KB-%')
            ->get();
        
        $count = 0;
        foreach ($osToDelete as $os) {
            // Remover posições do kanban
            KanbanOSPosition::where('ordem_servico_id', $os->id)->delete();
            // Remover progresso dos itens
            KanbanOSItemProgress::where('ordem_servico_id', $os->id)->delete();
            // Remover itens
            OrdemServicoItem::where('ordem_servico_id', $os->id)->delete();
            // Remover OS permanentemente
            $os->forceDelete();
            $count++;
        }
        $this->command->info("  ✓ {$count} OS anteriores removidas");

        // Criar OS de teste
        $osList = [];

        // OS 1: Nova (com arte pronta e prazo)
        $os1 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(1, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Em Andamento',
            'valor_total_os' => 450.00,
            'data_criacao' => now()->subDays(2),
            'data_prevista_entrega' => now()->addDays(3),
            'prazo_tipo' => 'ESPECIFICO',
            'prazo_datahora' => now()->addDays(3),
            'tem_arte_pronta' => true,
            'observacoes' => 'OS de teste para Kanban - Prioridade alta',
        ]);

        // Itens da OS 1
        $item1_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os1->id,
            'nome_servico_produto' => 'Banner 1x1m',
            'tipo_item' => 'unidade',
            'quantidade' => 2,
            'valor_unitario' => 150.00,
            'valor_total' => 300.00,
        ]);

        $item1_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os1->id,
            'nome_servico_produto' => 'Flyer A4',
            'tipo_item' => 'unidade',
            'quantidade' => 500,
            'valor_unitario' => 0.30,
            'valor_total' => 150.00,
        ]);

        // Posicionar na coluna "NOVOS PEDIDOS"
        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os1->id,
            'kanban_coluna_id' => $colunaNovosPedidos->id,
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        $osList[] = ['os' => $os1, 'coluna' => $colunaNovosPedidos, 'items' => [$item1_1, $item1_2]];

        // OS 2: Em Análise
        $os2 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(2, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Em Andamento',
            'valor_total_os' => 850.00,
            'data_criacao' => now()->subDays(5),
            'data_prevista_entrega' => now()->addDays(7),
            'prazo_tipo' => 'PADRAO',
            'tem_arte_pronta' => false,
            'observacoes' => 'OS aguardando análise de viabilidade',
        ]);

        $item2_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os2->id,
            'nome_servico_produto' => 'Cartão de Visita',
            'tipo_item' => 'unidade',
            'quantidade' => 1000,
            'valor_unitario' => 0.50,
            'valor_total' => 500.00,
        ]);

        $item2_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os2->id,
            'nome_servico_produto' => 'Adesivo Vinil',
            'tipo_item' => 'm2',
            'quantidade' => 5,
            'valor_unitario' => 70.00,
            'valor_total' => 350.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os2->id,
            'kanban_coluna_id' => $colunasCriadas[0]->id, // Em Análise
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        $osList[] = ['os' => $os2, 'coluna' => $colunasCriadas[0], 'items' => [$item2_1, $item2_2]];

        // OS 3: Em Produção (com progresso parcial)
        $os3 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(3, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Em Andamento',
            'valor_total_os' => 1200.00,
            'data_criacao' => now()->subDays(3),
            'data_prevista_entrega' => now()->addDays(2),
            'prazo_tipo' => 'ESPECIFICO',
            'prazo_datahora' => now()->addDays(2),
            'tem_arte_pronta' => true,
            'observacoes' => 'OS em produção - 50% concluído',
        ]);

        $item3_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os3->id,
            'nome_servico_produto' => 'Banner 3x1m',
            'tipo_item' => 'unidade',
            'quantidade' => 3,
            'valor_unitario' => 200.00,
            'valor_total' => 600.00,
        ]);

        $item3_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os3->id,
            'nome_servico_produto' => 'Lona 2x1m',
            'tipo_item' => 'unidade',
            'quantidade' => 2,
            'valor_unitario' => 300.00,
            'valor_total' => 600.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os3->id,
            'kanban_coluna_id' => $colunasCriadas[1]->id, // Em Produção
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        // Progresso: primeiro item concluído
        KanbanOSItemProgress::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os3->id,
            'ordem_servico_item_id' => $item3_1->id,
            'user_id' => $user->id,
            'concluido' => true,
            'data_conclusao' => now()->subHours(2),
        ]);

        $osList[] = ['os' => $os3, 'coluna' => $colunasCriadas[1], 'items' => [$item3_1, $item3_2]];

        // OS 4: Aguardando Aprovação
        $os4 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(4, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Aguardando Aprovação',
            'valor_total_os' => 650.00,
            'data_criacao' => now()->subDays(4),
            'data_prevista_entrega' => now()->addDays(5),
            'prazo_tipo' => 'PADRAO',
            'tem_arte_pronta' => true,
            'observacoes' => 'OS aguardando aprovação do cliente',
        ]);

        $item4_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os4->id,
            'nome_servico_produto' => 'Panfleto A5',
            'tipo_item' => 'unidade',
            'quantidade' => 2000,
            'valor_unitario' => 0.25,
            'valor_total' => 500.00,
        ]);

        $item4_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os4->id,
            'nome_servico_produto' => 'Cartaz A3',
            'tipo_item' => 'unidade',
            'quantidade' => 50,
            'valor_unitario' => 3.00,
            'valor_total' => 150.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os4->id,
            'kanban_coluna_id' => $colunasCriadas[2]->id, // Aguardando Aprovação
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        $osList[] = ['os' => $os4, 'coluna' => $colunasCriadas[2], 'items' => [$item4_1, $item4_2]];

        // OS 5: Finalizado (todos os itens concluídos)
        $os5 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(5, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Finalizada',
            'valor_total_os' => 320.00,
            'data_criacao' => now()->subDays(7),
            'data_finalizacao_os' => now()->subDays(1),
            'data_prevista_entrega' => now()->addDays(1),
            'prazo_tipo' => 'PADRAO',
            'tem_arte_pronta' => true,
            'observacoes' => 'OS finalizada - Pronta para entrega',
        ]);

        $item5_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os5->id,
            'nome_servico_produto' => 'Adesivo Personalizado',
            'tipo_item' => 'unidade',
            'quantidade' => 100,
            'valor_unitario' => 2.00,
            'valor_total' => 200.00,
        ]);

        $item5_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os5->id,
            'nome_servico_produto' => 'Etiqueta',
            'tipo_item' => 'unidade',
            'quantidade' => 500,
            'valor_unitario' => 0.24,
            'valor_total' => 120.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os5->id,
            'kanban_coluna_id' => $colunasCriadas[3]->id, // Finalizado
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        // Todos os itens concluídos
        KanbanOSItemProgress::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os5->id,
            'ordem_servico_item_id' => $item5_1->id,
            'user_id' => $user->id,
            'concluido' => true,
            'data_conclusao' => now()->subDays(1),
        ]);

        KanbanOSItemProgress::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os5->id,
            'ordem_servico_item_id' => $item5_2->id,
            'user_id' => $user->id,
            'concluido' => true,
            'data_conclusao' => now()->subDays(1),
        ]);

        $osList[] = ['os' => $os5, 'coluna' => $colunasCriadas[3], 'items' => [$item5_1, $item5_2]];

        // OS 6: Entregue
        $os6 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(6, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Finalizada',
            'valor_total_os' => 750.00,
            'data_criacao' => now()->subDays(10),
            'data_finalizacao_os' => now()->subDays(3),
            'data_prevista_entrega' => now()->subDays(2),
            'prazo_tipo' => 'PADRAO',
            'tem_arte_pronta' => true,
            'observacoes' => 'OS entregue ao cliente',
        ]);

        $item6_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os6->id,
            'nome_servico_produto' => 'Impressão Digital',
            'tipo_item' => 'm2',
            'quantidade' => 10,
            'valor_unitario' => 50.00,
            'valor_total' => 500.00,
        ]);

        $item6_2 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os6->id,
            'nome_servico_produto' => 'Acabamento',
            'tipo_item' => 'unidade',
            'quantidade' => 10,
            'valor_unitario' => 25.00,
            'valor_total' => 250.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os6->id,
            'kanban_coluna_id' => $colunasCriadas[4]->id, // Entregue
            'user_id' => $user->id,
            'ordem' => 0,
        ]);

        // Todos os itens concluídos
        KanbanOSItemProgress::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os6->id,
            'ordem_servico_item_id' => $item6_1->id,
            'user_id' => $user->id,
            'concluido' => true,
            'data_conclusao' => now()->subDays(3),
        ]);

        KanbanOSItemProgress::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os6->id,
            'ordem_servico_item_id' => $item6_2->id,
            'user_id' => $user->id,
            'concluido' => true,
            'data_conclusao' => now()->subDays(3),
        ]);

        $osList[] = ['os' => $os6, 'coluna' => $colunasCriadas[4], 'items' => [$item6_1, $item6_2]];

        // OS 7: Nova (urgente - atrasada)
        $os7 = OrdemServico::create([
            'tenant_id' => $tenant->id,
            'id_os' => 'OS-KB-' . str_pad(7, 4, '0', STR_PAD_LEFT),
            'cliente_id' => $cliente->id,
            'funcionario_id' => $user->id,
            'status_os' => 'Em Andamento',
            'valor_total_os' => 280.00,
            'data_criacao' => now()->subDays(5),
            'data_prevista_entrega' => now()->subDays(1), // Atrasada
            'prazo_tipo' => 'ESPECIFICO',
            'prazo_datahora' => now()->subDays(1), // Atrasada
            'tem_arte_pronta' => true,
            'observacoes' => 'OS URGENTE - Prazo vencido!',
        ]);

        $item7_1 = OrdemServicoItem::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os7->id,
            'nome_servico_produto' => 'Cartão de Visita Urgente',
            'tipo_item' => 'unidade',
            'quantidade' => 500,
            'valor_unitario' => 0.56,
            'valor_total' => 280.00,
        ]);

        KanbanOSPosition::create([
            'tenant_id' => $tenant->id,
            'ordem_servico_id' => $os7->id,
            'kanban_coluna_id' => $colunaNovosPedidos->id,
            'user_id' => $user->id,
            'ordem' => 1,
        ]);

        $osList[] = ['os' => $os7, 'coluna' => $colunaNovosPedidos, 'items' => [$item7_1]];

        $this->command->info('');
        $this->command->info('✓ Kanban populado com sucesso!');
        $this->command->info('');
        $this->command->info('Resumo:');
        $this->command->info('  • Colunas criadas: ' . (count($colunasCriadas) + 1) . ' (incluindo NOVOS PEDIDOS)');
        $this->command->info('  • OS criadas: ' . count($osList));
        $this->command->info('  • Itens criados: ' . array_sum(array_map(function($os) {
            return count($os['items']);
        }, $osList)));
        $this->command->info('');
        $this->command->info('Distribuição das OS:');
        $this->command->info('  • NOVOS PEDIDOS: 2 OS');
        $this->command->info('  • Em Análise: 1 OS');
        $this->command->info('  • Em Produção: 1 OS (50% concluído)');
        $this->command->info('  • Aguardando Aprovação: 1 OS');
        $this->command->info('  • Finalizado: 1 OS (100% concluído)');
        $this->command->info('  • Entregue: 1 OS (100% concluído)');
        $this->command->info('');
    }
}
