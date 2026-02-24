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
        if (Schema::hasTable('curso_progresso')) {
            return;
        }

        Schema::create('curso_progresso', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->boolean('iniciado')->default(false);
            $table->boolean('concluido')->default(false);
            $table->timestamp('data_inicio')->nullable();
            $table->timestamp('data_conclusao')->nullable();
            $table->integer('tempo_total_segundos')->default(0)->comment('Tempo total gasto no curso');
            $table->integer('percentual_concluido')->default(0)->comment('Percentual de conclusão (0-100)');
            $table->json('modulos_concluidos')->nullable()->comment('IDs dos módulos concluídos');
            $table->boolean('confirmacao_leitura')->default(false)->comment('Confirmação de leitura (se exigido)');
            $table->timestamp('data_confirmacao_leitura')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            // Índices
            $table->unique(['usuario_id', 'curso_id'], 'unique_usuario_curso');
            $table->index(['tenant_id', 'usuario_id', 'concluido']);
            $table->index(['tenant_id', 'curso_id', 'concluido']);
            $table->index(['tenant_id', 'usuario_id', 'iniciado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curso_progresso');
    }
};
