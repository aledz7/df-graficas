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
        Schema::create('historico_pontos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('vendedor_id')->constrained('users')->onDelete('cascade');
            $table->string('tipo_acao')->comment('venda, meta_batida, ticket_medio, bonus, penalidade');
            $table->integer('pontos')->comment('Pontos ganhos ou perdidos (negativo para penalidades)');
            $table->string('descricao')->comment('Descrição da ação');
            $table->foreignId('venda_id')->nullable()->constrained('vendas')->onDelete('set null');
            $table->foreignId('meta_id')->nullable()->constrained('metas_vendas')->onDelete('set null');
            $table->json('dados_adicionais')->nullable()->comment('Dados extras sobre a ação');
            $table->date('data_acao');
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'vendedor_id', 'data_acao']);
            $table->index(['tenant_id', 'tipo_acao']);
            $table->index(['vendedor_id', 'data_acao']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historico_pontos');
    }
};
