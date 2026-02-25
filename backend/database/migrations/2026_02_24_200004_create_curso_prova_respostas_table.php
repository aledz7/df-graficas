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
        if (Schema::hasTable('curso_prova_respostas')) {
            return;
        }

        Schema::create('curso_prova_respostas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('curso_prova_tentativa_id')->constrained('curso_prova_tentativas')->onDelete('cascade');
            $table->foreignId('curso_prova_questao_id')->constrained('curso_prova_questoes')->onDelete('cascade');
            
            // Resposta do colaborador
            $table->text('resposta')->nullable()->comment('Resposta fornecida (JSON para múltipla escolha, texto para dissertativa)');
            $table->boolean('correta')->default(false)->comment('Se a resposta está correta');
            $table->decimal('pontuacao_obtida', 5, 2)->default(0)->comment('Pontuação obtida nesta questão');
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'curso_prova_tentativa_id']);
            $table->index(['tenant_id', 'curso_prova_questao_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curso_prova_respostas');
    }
};
