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
        if (Schema::hasTable('curso_provas')) {
            return;
        }

        Schema::create('curso_provas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            
            // Configurações gerais
            $table->string('titulo')->nullable()->comment('Título da prova');
            $table->text('descricao')->nullable()->comment('Descrição/instruções para o colaborador');
            $table->decimal('nota_minima', 5, 2)->default(70.00)->comment('Nota mínima para aprovação (%)');
            $table->integer('tempo_limite_minutos')->nullable()->comment('Tempo limite em minutos (null = sem limite)');
            $table->integer('numero_maximo_tentativas')->nullable()->comment('Número máximo de tentativas (null = ilimitado)');
            $table->boolean('exigir_aprovacao_certificado')->default(true)->comment('Exigir aprovação para liberar certificado');
            $table->boolean('exigir_aprovacao_conclusao')->default(true)->comment('Exigir aprovação para concluir treinamento');
            
            $table->timestamps();
            
            // Índices
            $table->unique('curso_id', 'unique_curso_prova');
            $table->index(['tenant_id', 'curso_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curso_provas');
    }
};
