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
        Schema::create('pos_venda_historico', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('pos_venda_id');
            $table->enum('tipo_acao', ['criacao', 'status_alterado', 'observacao_adicionada', 'nota_alterada', 'responsavel_alterado', 'agendamento_criado', 'agendamento_concluido'])->default('observacao_adicionada');
            $table->enum('status_anterior', ['pendente', 'em_andamento', 'resolvido'])->nullable();
            $table->enum('status_novo', ['pendente', 'em_andamento', 'resolvido'])->nullable();
            $table->text('descricao');
            $table->unsignedBigInteger('usuario_id');
            $table->json('dados_adicionais')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('pos_venda_id')->references('id')->on('pos_venda')->onDelete('cascade');
            $table->foreign('usuario_id')->references('id')->on('users')->onDelete('restrict');
            
            $table->index(['tenant_id', 'pos_venda_id']);
            $table->index(['tenant_id', 'usuario_id']);
            $table->index(['pos_venda_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_venda_historico');
    }
};
