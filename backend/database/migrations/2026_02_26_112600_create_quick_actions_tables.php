<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tabela de ações rápidas disponíveis
        if (!Schema::hasTable('quick_actions')) {
            Schema::create('quick_actions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('codigo'); // Ex: 'novo_pdv', 'novo_pedido', etc
                $table->string('nome'); // Nome da ação
                $table->text('descricao')->nullable();
                $table->string('categoria')->default('geral'); // geral, vendas, operacional, financeiro, cadastros, ferramentas
                $table->string('icone')->nullable(); // Nome do ícone (lucide-react)
                $table->string('cor_padrao')->nullable(); // Cor padrão (blue, green, etc ou hex)
                $table->string('rota')->nullable(); // Rota para navegação
                $table->json('estado')->nullable(); // Estado para passar na navegação (ex: { openNewClientModal: true })
                $table->boolean('ativo')->default(true);
                $table->integer('ordem')->default(0);
                $table->string('permissao_codigo')->nullable(); // Código da permissão necessária (ex: 'pdv_criar')
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->unique(['tenant_id', 'codigo']); // Código único por tenant
            });
        }

        // Tabela de permissões de ações rápidas por perfil/função
        if (!Schema::hasTable('quick_action_permissions')) {
            Schema::create('quick_action_permissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('tipo_permissao')->default('perfil'); // perfil, area, funcao
                $table->string('referencia_id')->nullable(); // ID do perfil, área ou função
                $table->string('action_codigo'); // Código da ação rápida
                $table->boolean('pode_ver')->default(true);
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'tipo_permissao', 'referencia_id'], 'idx_qa_perm_tenant_tipo_ref');
                $table->index(['tenant_id', 'action_codigo'], 'idx_qa_perm_tenant_action');
            });
        }

        // Inserir ações rápidas padrão se não existirem (para cada tenant)
        $tenants = DB::table('tenants')->pluck('id');
        $actionsPadrao = [
            ['codigo' => 'novo_pdv', 'nome' => 'Novo PDV', 'descricao' => 'Abrir ponto de venda', 'categoria' => 'vendas', 'icone' => 'ShoppingCart', 'cor_padrao' => 'blue', 'rota' => '/operacional/pdv', 'ordem' => 1, 'permissao_codigo' => 'pdv_criar'],
            ['codigo' => 'novo_produto', 'nome' => 'Novo Produto', 'descricao' => 'Cadastrar novo produto', 'categoria' => 'cadastros', 'icone' => 'PackagePlus', 'cor_padrao' => 'green', 'rota' => '/cadastros/novo-produto', 'ordem' => 2, 'permissao_codigo' => 'produtos_criar'],
            ['codigo' => 'nova_os', 'nome' => 'Nova OS', 'descricao' => 'Criar nova ordem de serviço', 'categoria' => 'operacional', 'icone' => 'FilePlus2', 'cor_padrao' => 'orange', 'rota' => '/operacional/ordens-servico', 'ordem' => 3, 'permissao_codigo' => 'os_criar'],
            ['codigo' => 'novo_envelopamento', 'nome' => 'Novo Envelopamento', 'descricao' => 'Criar novo orçamento de envelopamento', 'categoria' => 'operacional', 'icone' => 'Palette', 'cor_padrao' => 'purple', 'rota' => '/operacional/envelopamento', 'ordem' => 4, 'permissao_codigo' => 'envelopamento_criar'],
            ['codigo' => 'novo_cliente', 'nome' => 'Novo Cliente', 'descricao' => 'Cadastrar novo cliente', 'categoria' => 'cadastros', 'icone' => 'UserPlus', 'cor_padrao' => 'indigo', 'rota' => '/cadastros/clientes', 'estado' => json_encode(['openNewClientModal' => true]), 'ordem' => 5, 'permissao_codigo' => 'clientes_criar'],
            ['codigo' => 'relatorios', 'nome' => 'Relatórios', 'descricao' => 'Acessar relatórios', 'categoria' => 'geral', 'icone' => 'BarChartHorizontalBig', 'cor_padrao' => 'red', 'rota' => '/relatorios', 'ordem' => 6, 'permissao_codigo' => 'relatorios_ver'],
            ['codigo' => 'novo_pedido', 'nome' => 'Novo Pedido', 'descricao' => 'Criar novo pedido de venda', 'categoria' => 'vendas', 'icone' => 'ShoppingBag', 'cor_padrao' => 'blue', 'rota' => '/operacional/pdv', 'ordem' => 7, 'permissao_codigo' => 'vendas_criar'],
            ['codigo' => 'novo_treinamento', 'nome' => 'Novo Treinamento', 'descricao' => 'Criar novo treinamento interno', 'categoria' => 'ferramentas', 'icone' => 'GraduationCap', 'cor_padrao' => 'violet', 'rota' => '/ferramentas/treinamento-interno', 'ordem' => 8, 'permissao_codigo' => 'treinamento_criar'],
            ['codigo' => 'nova_conta_pagar', 'nome' => 'Nova Conta a Pagar', 'descricao' => 'Registrar nova conta a pagar', 'categoria' => 'financeiro', 'icone' => 'MinusCircle', 'cor_padrao' => 'red', 'rota' => '/financeiro/contas-pagar', 'estado' => json_encode(['openNewModal' => true]), 'ordem' => 9, 'permissao_codigo' => 'contas_pagar_criar'],
            ['codigo' => 'nova_conta_receber', 'nome' => 'Nova Conta a Receber', 'descricao' => 'Registrar nova conta a receber', 'categoria' => 'financeiro', 'icone' => 'PlusCircle', 'cor_padrao' => 'green', 'rota' => '/financeiro/contas-receber', 'estado' => json_encode(['openNewModal' => true]), 'ordem' => 10, 'permissao_codigo' => 'contas_receber_criar'],
        ];
        
        foreach ($tenants as $tenantId) {
            $actionsExistentes = DB::table('quick_actions')
                ->where('tenant_id', $tenantId)
                ->count();
                
            if ($actionsExistentes === 0) {
                foreach ($actionsPadrao as $action) {
                    // Verificar se já existe para este tenant
                    $existe = DB::table('quick_actions')
                        ->where('tenant_id', $tenantId)
                        ->where('codigo', $action['codigo'])
                        ->exists();
                    
                    if (!$existe) {
                        DB::table('quick_actions')->insert(array_merge($action, [
                            'tenant_id' => $tenantId,
                            'ativo' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]));
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quick_action_permissions');
        Schema::dropIfExists('quick_actions');
    }
};
