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
        if (Schema::hasTable('treinamento_regras_alerta')) {
            return;
        }

        Schema::create('treinamento_regras_alerta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('nome')->comment('Nome da regra (ex: Nível 1 em 7 dias)');
            $table->enum('tipo', ['nivel_nao_concluido', 'treinamento_atrasado', 'setor_incompleto'])->default('treinamento_atrasado');
            $table->enum('nivel_alvo', ['iniciante', 'intermediario', 'avancado'])->nullable();
            $table->enum('setor_alvo', ['atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral', 'todos'])->default('todos');
            $table->integer('prazo_dias')->comment('Prazo em dias para concluir');
            $table->boolean('ativo')->default(true);
            $table->boolean('notificar_colaborador')->default(true);
            $table->boolean('notificar_gestor')->default(true);
            $table->text('mensagem_personalizada')->nullable();
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'ativo']);
            $table->index(['tenant_id', 'tipo', 'ativo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treinamento_regras_alerta');
    }
};
