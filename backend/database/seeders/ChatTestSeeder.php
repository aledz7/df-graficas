<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChatThread;
use App\Models\ChatThreadMember;
use App\Models\ChatMessage;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class ChatTestSeeder extends Seeder
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

        // Buscar usuários existentes
        $users = User::where('tenant_id', $tenant->id)->limit(5)->get();
        
        // Criar usuários de teste se não houver usuários suficientes
        if ($users->count() < 2) {
            $this->command->info('Criando usuários de teste para o chat...');
            
            // Criar usuários de teste
            $testUsers = [
                [
                    'name' => 'João Silva',
                    'email' => 'joao.silva@teste.com',
                    'password' => Hash::make('123456'),
                ],
                [
                    'name' => 'Maria Santos',
                    'email' => 'maria.santos@teste.com',
                    'password' => Hash::make('123456'),
                ],
                [
                    'name' => 'Pedro Oliveira',
                    'email' => 'pedro.oliveira@teste.com',
                    'password' => Hash::make('123456'),
                ],
                [
                    'name' => 'Ana Costa',
                    'email' => 'ana.costa@teste.com',
                    'password' => Hash::make('123456'),
                ],
            ];

            foreach ($testUsers as $index => $testUser) {
                if ($users->count() <= $index) {
                    $newUser = User::create([
                        'name' => $testUser['name'],
                        'email' => $testUser['email'],
                        'password' => $testUser['password'],
                        'tenant_id' => $tenant->id,
                        'is_admin' => false,
                        'email_verified_at' => now(),
                    ]);
                    $users->push($newUser);
                    $this->command->info("  ✓ Usuário criado: {$newUser->name} ({$newUser->email})");
                }
            }
            
            // Recarregar usuários
            $users = User::where('tenant_id', $tenant->id)->limit(5)->get();
        }

        $user1 = $users[0];
        $user2 = $users[1];
        $user3 = $users->count() > 2 ? $users[2] : $user1;
        $user4 = $users->count() > 3 ? $users[3] : $user2;

        // 1. Conversa direta entre user1 e user2
        $thread1 = ChatThread::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'direto',
            'nome' => null,
            'is_privado' => true,
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread1->id,
            'user_id' => $user1->id,
            'role' => 'member',
            'last_read_at' => now()->subHours(2),
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread1->id,
            'user_id' => $user2->id,
            'role' => 'member',
            'last_read_at' => now()->subMinutes(30),
        ]);

        // Mensagens na conversa direta
        $messages1 = [
            ['texto' => 'Olá! Como está o andamento da OS #123?', 'user' => $user1, 'created' => now()->subHours(3)],
            ['texto' => 'Está tudo certo! Já finalizei a arte e está pronta para produção.', 'user' => $user2, 'created' => now()->subHours(2)],
            ['texto' => 'Perfeito! Quando você acha que fica pronta?', 'user' => $user1, 'created' => now()->subHours(2)],
            ['texto' => 'Acho que até amanhã no final da tarde. Vou te avisar quando terminar!', 'user' => $user2, 'created' => now()->subHours(1)],
            ['texto' => 'Ótimo! Obrigado! 👍', 'user' => $user1, 'created' => now()->subMinutes(30)],
        ];

        foreach ($messages1 as $msg) {
            ChatMessage::create([
                'thread_id' => $thread1->id,
                'user_id' => $msg['user']->id,
                'texto' => $msg['texto'],
                'tipo' => 'texto',
                'created_at' => $msg['created'],
                'updated_at' => $msg['created'],
            ]);
        }

        // 2. Grupo de Produção
        $thread2 = ChatThread::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'grupo',
            'nome' => 'Equipe de Produção',
            'setor' => 'Producao',
            'descricao' => 'Grupo para discussões sobre produção',
            'criado_por' => $user1->id,
            'is_privado' => false,
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread2->id,
            'user_id' => $user1->id,
            'role' => 'admin',
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread2->id,
            'user_id' => $user2->id,
            'role' => 'member',
        ]);

        if ($user3) {
            ChatThreadMember::create([
                'thread_id' => $thread2->id,
                'user_id' => $user3->id,
                'role' => 'member',
            ]);
        }

        // Mensagens no grupo
        $messages2 = [
            ['texto' => 'Bom dia pessoal! Hoje temos várias OS para finalizar.', 'user' => $user1, 'created' => now()->subDays(1)->setTime(8, 0)],
            ['texto' => 'Bom dia! Já estou começando pela OS #123', 'user' => $user2, 'created' => now()->subDays(1)->setTime(8, 15)],
            ['texto' => 'Ótimo! A OS #124 também precisa ser priorizada, é urgente!', 'user' => $user1, 'created' => now()->subDays(1)->setTime(8, 30), 'is_urgente' => true],
            ['texto' => 'Entendido! Vou priorizar a #124 então.', 'user' => $user2, 'created' => now()->subDays(1)->setTime(8, 35)],
            ['texto' => 'Alguém pode me ajudar com a impressão do banner?', 'user' => $user3 ?? $user1, 'created' => now()->subHours(5)],
            ['texto' => 'Claro! Estou livre agora, posso ajudar.', 'user' => $user2, 'created' => now()->subHours(4)],
        ];

        foreach ($messages2 as $msg) {
            ChatMessage::create([
                'thread_id' => $thread2->id,
                'user_id' => $msg['user']->id,
                'texto' => $msg['texto'],
                'tipo' => 'texto',
                'is_urgente' => $msg['is_urgente'] ?? false,
                'created_at' => $msg['created'],
                'updated_at' => $msg['created'],
            ]);
        }

        // 3. Grupo Comercial
        $thread3 = ChatThread::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'grupo',
            'nome' => 'Comercial',
            'setor' => 'Comercial',
            'descricao' => 'Discussões comerciais e vendas',
            'criado_por' => $user1->id,
            'is_privado' => false,
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread3->id,
            'user_id' => $user1->id,
            'role' => 'admin',
        ]);

        ChatThreadMember::create([
            'thread_id' => $thread3->id,
            'user_id' => $user2->id,
            'role' => 'member',
        ]);

        if ($user4) {
            ChatThreadMember::create([
                'thread_id' => $thread3->id,
                'user_id' => $user4->id,
                'role' => 'member',
            ]);
        }

        // Mensagens no grupo comercial
        $messages3 = [
            ['texto' => 'Pessoal, temos um novo cliente interessado em um orçamento grande!', 'user' => $user1, 'created' => now()->subDays(2)->setTime(14, 0), 'is_importante' => true],
            ['texto' => 'Ótimo! Qual o tipo de serviço?', 'user' => $user2, 'created' => now()->subDays(2)->setTime(14, 15)],
            ['texto' => 'É para material gráfico completo: banners, flyers, cartões...', 'user' => $user1, 'created' => now()->subDays(2)->setTime(14, 20)],
            ['texto' => 'Vou preparar o orçamento hoje ainda!', 'user' => $user2, 'created' => now()->subDays(2)->setTime(14, 25)],
        ];

        foreach ($messages3 as $msg) {
            ChatMessage::create([
                'thread_id' => $thread3->id,
                'user_id' => $msg['user']->id,
                'texto' => $msg['texto'],
                'tipo' => 'texto',
                'is_importante' => $msg['is_importante'] ?? false,
                'created_at' => $msg['created'],
                'updated_at' => $msg['created'],
            ]);
        }

        // 4. Outra conversa direta
        if ($user3) {
            $thread4 = ChatThread::create([
                'tenant_id' => $tenant->id,
                'tipo' => 'direto',
                'nome' => null,
                'is_privado' => true,
            ]);

            ChatThreadMember::create([
                'thread_id' => $thread4->id,
                'user_id' => $user1->id,
                'role' => 'member',
            ]);

            ChatThreadMember::create([
                'thread_id' => $thread4->id,
                'user_id' => $user3->id,
                'role' => 'member',
            ]);

            // Mensagens
            $messages4 = [
                ['texto' => 'Oi! Você pode revisar a arte que enviei?', 'user' => $user1, 'created' => now()->subHours(6)],
                ['texto' => 'Claro! Vou dar uma olhada agora.', 'user' => $user3, 'created' => now()->subHours(5)],
                ['texto' => 'Encontrei alguns ajustes necessários. Posso fazer?', 'user' => $user3, 'created' => now()->subHours(4)],
                ['texto' => 'Sim, pode fazer! Obrigado!', 'user' => $user1, 'created' => now()->subHours(3)],
            ];

            foreach ($messages4 as $msg) {
                ChatMessage::create([
                    'thread_id' => $thread4->id,
                    'user_id' => $msg['user']->id,
                    'texto' => $msg['texto'],
                    'tipo' => 'texto',
                    'created_at' => $msg['created'],
                    'updated_at' => $msg['created'],
                ]);
            }
        }

        // Atualizar timestamps das threads
        $thread1->touch();
        $thread2->touch();
        $thread3->touch();
        if (isset($thread4)) {
            $thread4->touch();
        }

        $this->command->info('');
        $this->command->info('✓ Conversas de teste criadas com sucesso!');
        $this->command->info('');
        $this->command->info('Conversas criadas:');
        $this->command->info('  • 1 conversa direta entre ' . $user1->name . ' e ' . $user2->name . ' (' . count($messages1) . ' mensagens)');
        $this->command->info('  • 1 grupo: Equipe de Produção (' . count($messages2) . ' mensagens)');
        $this->command->info('  • 1 grupo: Comercial (' . count($messages3) . ' mensagens)');
        if (isset($thread4)) {
            $this->command->info('  • 1 conversa direta entre ' . $user1->name . ' e ' . $user3->name . ' (' . count($messages4) . ' mensagens)');
        }
        $this->command->info('');
        $this->command->info('Total: ' . (isset($thread4) ? '4' : '3') . ' conversas criadas');
    }
}
