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
        if (Schema::hasTable('treinamento_progresso')) {
            return;
        }

        Schema::create('treinamento_progresso', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('treinamento_id')->constrained('treinamento')->onDelete('cascade');
            $table->boolean('concluido')->default(false);
            $table->timestamp('data_conclusao')->nullable();
            $table->integer('tempo_leitura_segundos')->nullable()->comment('Tempo gasto lendo o conteúdo');
            $table->text('observacoes')->nullable();
            $table->timestamps();

            // Índices
            $table->unique(['usuario_id', 'treinamento_id'], 'unique_usuario_treinamento');
            $table->index(['tenant_id', 'usuario_id', 'concluido']);
            $table->index(['tenant_id', 'treinamento_id', 'concluido']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treinamento_progresso');
    }
};
