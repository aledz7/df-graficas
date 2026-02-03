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
        Schema::create('contas_pagar', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('descricao');
            $table->decimal('valor', 10, 2);
            $table->date('data_vencimento');
            $table->date('data_pagamento')->nullable();
            $table->foreignId('fornecedor_id')->nullable()->constrained('clientes')->onDelete('set null');
            $table->foreignId('categoria_id')->nullable()->constrained('categorias_caixa')->onDelete('set null');
            $table->enum('status', ['pendente', 'pago', 'vencido'])->default('pendente');
            $table->enum('recorrencia', ['nao_recorre', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual'])->default('nao_recorre');
            $table->date('data_fim_contrato')->nullable();
            $table->date('data_inicio_contrato')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('user_id');
            $table->index('fornecedor_id');
            $table->index('categoria_id');
            $table->index('status');
            $table->index('data_vencimento');
            $table->index('recorrencia');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contas_pagar');
    }
};
