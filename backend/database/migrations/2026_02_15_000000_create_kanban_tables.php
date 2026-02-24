<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tabela de colunas Kanban por usuário
        if (!Schema::hasTable('kanban_columns')) {
            Schema::create('kanban_columns', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('user_id'); // Usuário dono da coluna
                $table->string('nome'); // Nome da coluna
                $table->string('cor')->default('#6366f1'); // Cor da coluna
                $table->integer('ordem')->default(0); // Ordem de exibição
                $table->boolean('is_obrigatoria')->default(false); // Se é a coluna "NOVOS PEDIDOS"
                $table->boolean('is_sistema')->default(false); // Se é coluna do sistema (não pode ser excluída)
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index(['tenant_id', 'user_id', 'ordem'], 'idx_kanban_col_tenant_user_ordem');
            });
        }

        // Tabela de relacionamento OS <-> Coluna Kanban
        if (!Schema::hasTable('kanban_os_positions')) {
            Schema::create('kanban_os_positions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('ordem_servico_id');
                $table->unsignedBigInteger('kanban_coluna_id');
                $table->unsignedBigInteger('user_id'); // Usuário dono do Kanban
                $table->integer('ordem')->default(0); // Ordem dentro da coluna
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
                $table->foreign('kanban_coluna_id')->references('id')->on('kanban_columns')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                
                // Uma OS só pode estar em uma coluna por usuário
                $table->unique(['ordem_servico_id', 'user_id'], 'unique_os_user');
                $table->index(['tenant_id', 'user_id', 'kanban_coluna_id'], 'idx_kanban_pos_tenant_user_col');
            });
        }

        // Tabela de movimentações (log)
        if (!Schema::hasTable('kanban_movimentacoes')) {
            Schema::create('kanban_movimentacoes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('ordem_servico_id');
                $table->unsignedBigInteger('user_id'); // Usuário que fez a movimentação
                $table->unsignedBigInteger('coluna_anterior_id')->nullable();
                $table->unsignedBigInteger('coluna_nova_id');
                $table->timestamp('data_movimentacao');
                $table->text('observacao')->nullable();
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('coluna_anterior_id')->references('id')->on('kanban_columns')->onDelete('set null');
                $table->foreign('coluna_nova_id')->references('id')->on('kanban_columns')->onDelete('cascade');
                $table->index(['tenant_id', 'user_id', 'ordem_servico_id'], 'idx_kanban_mov_tenant_user_os');
                $table->index(['data_movimentacao'], 'idx_kanban_mov_data');
            });
        }

        // Tabela de progresso de itens da OS (checklist)
        if (!Schema::hasTable('kanban_os_items_progress')) {
            Schema::create('kanban_os_items_progress', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('tenant_id');
                $table->unsignedBigInteger('ordem_servico_id');
                $table->unsignedBigInteger('ordem_servico_item_id');
                $table->unsignedBigInteger('user_id'); // Usuário que marcou como concluído
                $table->boolean('concluido')->default(false);
                $table->timestamp('data_conclusao')->nullable();
                $table->timestamps();
                
                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
                $table->foreign('ordem_servico_item_id')->references('id')->on('ordens_servico_itens')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                
                // Um item só pode ter um registro de progresso por usuário
                $table->unique(['ordem_servico_item_id', 'user_id'], 'unique_item_user');
                $table->index(['tenant_id', 'user_id', 'ordem_servico_id'], 'idx_kanban_progress_tenant_user_os');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kanban_os_items_progress');
        Schema::dropIfExists('kanban_movimentacoes');
        Schema::dropIfExists('kanban_os_positions');
        Schema::dropIfExists('kanban_columns');
    }
};
