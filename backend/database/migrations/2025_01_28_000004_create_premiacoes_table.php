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
        Schema::create('premiacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('vendedor_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('meta_id')->nullable()->constrained('metas_vendas')->onDelete('set null');
            $table->string('tipo')->comment('bonus, brinde, folga, premio_especial');
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->decimal('valor_bonus', 10, 2)->nullable()->comment('Valor do bônus se tipo for bonus');
            $table->string('brinde_descricao')->nullable()->comment('Descrição do brinde se tipo for brinde');
            $table->date('data_folga')->nullable()->comment('Data da folga se tipo for folga');
            $table->enum('status', ['pendente', 'entregue', 'cancelado'])->default('pendente');
            $table->date('data_entrega')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tenant_id', 'vendedor_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['meta_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('premiacoes');
    }
};
