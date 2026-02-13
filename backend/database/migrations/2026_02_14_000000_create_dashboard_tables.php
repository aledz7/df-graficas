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
        // Tabela de widgets disponíveis
        if (!Schema::hasTable('dashboard_widgets')) {
            Schema::create('dashboard_widgets', function (Blueprint $table) {
                $table->id();
                $table->string('codigo')->unique(); // Ex: 'vendas_dia', 'os_aberto', etc
                $table->string('nome');
                $table->text('descricao')->nullable();
                $table->string('categoria')->default('geral'); // geral, financeiro, operacional, vendas, producao
                $table->string('tipo')->default('card'); // card, grafico, tabela, feed
                $table->json('configuracao_padrao')->nullable(); // Configurações padrão do widget
                $table->boolean('ativo')->default(true);
                $table->integer('ordem')->default(0);
                $table->string('icone')->nullable(); // Nome do ícone (lucide-react)
                $table->string('cor_padrao')->nullable(); // Cor padrão do widget
                $table->timestamps();
            });
        }

        // Tabela de configurações de dashboard por usuário
        if (!Schema::hasTable('dashboard_configs')) {
            Schema::create('dashboard_configs', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('user_id')->nullable(); // null = configuração padrão do tenant
                $table->string('nome_configuracao')->nullable(); // Nome da configuração (para templates)
                $table->json('layout')->nullable(); // Grid layout, posições dos widgets
                $table->json('widgets_visiveis')->nullable(); // Array de códigos de widgets visíveis
                $table->boolean('is_padrao')->default(false); // Se é a configuração padrão
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['tenant_id', 'user_id']);
            });
        }

        // Tabela de permissões de widgets por perfil/função
        if (!Schema::hasTable('dashboard_permissions')) {
            Schema::create('dashboard_permissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->string('tipo_permissao')->default('perfil'); // perfil, area, funcao
                $table->string('referencia_id')->nullable(); // ID do perfil, área ou função
                $table->string('widget_codigo'); // Código do widget
                $table->boolean('pode_ver')->default(true);
                $table->boolean('pode_configurar')->default(false);
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->index(['tenant_id', 'tipo_permissao', 'referencia_id'], 'idx_dash_perm_tenant_tipo_ref');
                $table->index(['tenant_id', 'widget_codigo'], 'idx_dash_perm_tenant_widget');
            });
        }

        // Inserir widgets padrão se não existirem
        $widgetsExistentes = DB::table('dashboard_widgets')->count();
        if ($widgetsExistentes === 0) {
            $widgetsPadrao = [
                ['codigo' => 'vendas_dia_qtd', 'nome' => 'Vendas do Dia (Qtd)', 'descricao' => 'Quantidade de vendas realizadas hoje', 'categoria' => 'vendas', 'tipo' => 'card', 'icone' => 'ShoppingCart', 'cor_padrao' => 'green', 'ordem' => 1],
                ['codigo' => 'vendas_dia_valor', 'nome' => 'Vendas do Dia (Valor)', 'descricao' => 'Valor total vendido hoje', 'categoria' => 'vendas', 'tipo' => 'card', 'icone' => 'DollarSign', 'cor_padrao' => 'green', 'ordem' => 2],
                ['codigo' => 'os_aberto', 'nome' => 'OS em Aberto', 'descricao' => 'Quantidade de ordens de serviço em aberto', 'categoria' => 'operacional', 'tipo' => 'card', 'icone' => 'ClipboardList', 'cor_padrao' => 'indigo', 'ordem' => 3],
                ['codigo' => 'os_em_producao', 'nome' => 'OS em Produção', 'descricao' => 'Quantidade de ordens em produção', 'categoria' => 'operacional', 'tipo' => 'card', 'icone' => 'Package', 'cor_padrao' => 'blue', 'ordem' => 4],
                ['codigo' => 'envelopamentos_orcados', 'nome' => 'Orç. Envelopamento', 'descricao' => 'Envelopamentos orçados', 'categoria' => 'operacional', 'tipo' => 'card', 'icone' => 'Palette', 'cor_padrao' => 'purple', 'ordem' => 5],
                ['codigo' => 'estoque_baixo', 'nome' => 'Estoque Baixo', 'descricao' => 'Itens com estoque abaixo do mínimo', 'categoria' => 'operacional', 'tipo' => 'card', 'icone' => 'Archive', 'cor_padrao' => 'orange', 'ordem' => 6],
                ['codigo' => 'total_clientes', 'nome' => 'Total de Clientes', 'descricao' => 'Quantidade total de clientes cadastrados', 'categoria' => 'geral', 'tipo' => 'card', 'icone' => 'Users', 'cor_padrao' => 'blue', 'ordem' => 7],
                ['codigo' => 'total_receber', 'nome' => 'Total à Receber', 'descricao' => 'Valor total a receber de clientes', 'categoria' => 'financeiro', 'tipo' => 'card', 'icone' => 'DollarSign', 'cor_padrao' => 'green', 'ordem' => 8],
                ['codigo' => 'total_pagar', 'nome' => 'Total à Pagar', 'descricao' => 'Valor total a pagar', 'categoria' => 'financeiro', 'tipo' => 'card', 'icone' => 'MinusCircle', 'cor_padrao' => 'red', 'ordem' => 9],
                ['codigo' => 'ticket_medio', 'nome' => 'Ticket Médio', 'descricao' => 'Valor médio por venda', 'categoria' => 'vendas', 'tipo' => 'card', 'icone' => 'TrendingUp', 'cor_padrao' => 'blue', 'ordem' => 10],
                ['codigo' => 'novos_clientes_mes', 'nome' => 'Novos Clientes (Mês)', 'descricao' => 'Clientes cadastrados este mês', 'categoria' => 'vendas', 'tipo' => 'card', 'icone' => 'UserPlus', 'cor_padrao' => 'green', 'ordem' => 11],
                ['codigo' => 'vendas_mes', 'nome' => 'Vendas do Mês', 'descricao' => 'Total de vendas realizadas este mês', 'categoria' => 'vendas', 'tipo' => 'card', 'icone' => 'Calendar', 'cor_padrao' => 'blue', 'ordem' => 12],
                ['codigo' => 'faturamento_mes', 'nome' => 'Faturamento do Mês', 'descricao' => 'Faturamento total do mês atual', 'categoria' => 'financeiro', 'tipo' => 'card', 'icone' => 'TrendingUp', 'cor_padrao' => 'green', 'ordem' => 13],
                ['codigo' => 'producao_trabalhos', 'nome' => 'Trabalhos em Produção', 'descricao' => 'Total de trabalhos em produção', 'categoria' => 'producao', 'tipo' => 'card', 'icone' => 'Factory', 'cor_padrao' => 'yellow', 'ordem' => 14],
                ['codigo' => 'producao_concluidos', 'nome' => 'Trabalhos Concluídos', 'descricao' => 'Trabalhos concluídos no período', 'categoria' => 'producao', 'tipo' => 'card', 'icone' => 'CheckCircle2', 'cor_padrao' => 'green', 'ordem' => 15],
                ['codigo' => 'producao_atrasados', 'nome' => 'Trabalhos Atrasados', 'descricao' => 'Trabalhos com atraso', 'categoria' => 'producao', 'tipo' => 'card', 'icone' => 'AlertCircle', 'cor_padrao' => 'red', 'ordem' => 16],
            ];

            foreach ($widgetsPadrao as $widget) {
                DB::table('dashboard_widgets')->insert(array_merge($widget, [
                    'ativo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dashboard_permissions');
        Schema::dropIfExists('dashboard_configs');
        Schema::dropIfExists('dashboard_widgets');
    }
};
