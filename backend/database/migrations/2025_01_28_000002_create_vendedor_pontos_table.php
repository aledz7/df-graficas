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
        Schema::create('vendedor_pontos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('vendedor_id')->constrained('users')->onDelete('cascade');
            $table->integer('pontos_totais')->default(0)->comment('Total de pontos acumulados');
            $table->integer('nivel_atual')->default(1)->comment('Nível atual (Bronze=1, Prata=2, Ouro=3, Platina=4, Diamante=5)');
            $table->string('badge_atual')->nullable()->comment('Badge atual do vendedor');
            $table->integer('vendas_realizadas')->default(0)->comment('Total de vendas realizadas');
            $table->integer('metas_batidas')->default(0)->comment('Total de metas batidas');
            $table->integer('ticket_medio_batido')->default(0)->comment('Vezes que bateu ticket médio');
            $table->date('ultima_atualizacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tenant_id', 'vendedor_id']);
            $table->index(['tenant_id', 'pontos_totais']);
            $table->index(['tenant_id', 'nivel_atual']);
            $table->unique(['tenant_id', 'vendedor_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendedor_pontos');
    }
};
