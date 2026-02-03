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
        Schema::create('configuracoes_pontos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->boolean('ativo')->default(true);
            $table->decimal('pontos_por_reais', 10, 2)->default(50.00);
            $table->integer('validade_meses')->default(12);
            $table->integer('resgate_minimo')->default(50);
            $table->text('descricao')->nullable();
            $table->json('regras_adicionais')->nullable();
            $table->timestamps();

            // Índices
            $table->index('tenant_id');
            $table->index('ativo');

            // Chave estrangeira
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracoes_pontos');
    }
};
