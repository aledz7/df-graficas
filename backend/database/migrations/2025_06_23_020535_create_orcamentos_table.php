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
        Schema::create('orcamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo', 50)->unique();
            $table->string('nome_orcamento');
            $table->foreignId('cliente_id')->constrained('clientes');
            $table->foreignId('produto_id')->nullable()->constrained('produtos');
            $table->decimal('area_total_m2', 10, 2)->default(0);
            $table->decimal('custo_total_material', 10, 2)->default(0);
            $table->decimal('custo_total_mao_obra', 10, 2)->default(0);
            $table->decimal('custo_total_adicional', 10, 2)->default(0);
            $table->decimal('valor_total', 10, 2)->default(0);
            $table->decimal('desconto_percentual', 5, 2)->default(0);
            $table->decimal('desconto_valor', 10, 2)->default(0);
            $table->decimal('valor_final', 10, 2)->default(0);
            $table->text('observacoes')->nullable();
            $table->enum('status', ['Rascunho', 'Aguardando Aprovação', 'Aprovado', 'Recusado', 'Cancelado', 'Finalizado'])->default('Rascunho');
            $table->json('dados_pecas')->nullable();
            $table->json('dados_adicionais')->nullable();
            $table->json('dados_pagamento')->nullable();
            $table->foreignId('vendedor_id')->nullable()->constrained('users');
            $table->string('vendedor_nome')->nullable();
            $table->dateTime('data_validade')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orcamentos');
    }
};
