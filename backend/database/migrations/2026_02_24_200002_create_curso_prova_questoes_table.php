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
        if (Schema::hasTable('curso_prova_questoes')) {
            return;
        }

        Schema::create('curso_prova_questoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('curso_prova_id')->constrained('curso_provas')->onDelete('cascade');
            
            // Tipo e conteúdo
            $table->enum('tipo', [
                'multipla_escolha_uma',
                'multipla_escolha_multiplas',
                'verdadeiro_falso',
                'dissertativa'
            ])->default('multipla_escolha_uma');
            
            $table->text('enunciado')->comment('Texto da questão');
            $table->json('alternativas')->nullable()->comment('Alternativas para múltipla escolha');
            $table->json('respostas_corretas')->nullable()->comment('IDs ou valores das respostas corretas');
            $table->decimal('peso', 5, 2)->default(1.00)->comment('Peso da questão na nota final');
            $table->integer('ordem')->default(0)->comment('Ordem de exibição');
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'curso_prova_id', 'ordem']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curso_prova_questoes');
    }
};
