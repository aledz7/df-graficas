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
        if (Schema::hasTable('curso_prova_tentativas')) {
            return;
        }

        Schema::create('curso_prova_tentativas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('curso_id')->constrained('cursos')->onDelete('cascade');
            $table->foreignId('curso_prova_id')->constrained('curso_provas')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');
            
            // Informações da tentativa
            $table->integer('numero_tentativa')->default(1)->comment('Número da tentativa (1, 2, 3...)');
            $table->timestamp('data_inicio')->nullable()->comment('Data e hora de início da prova');
            $table->timestamp('data_envio')->nullable()->comment('Data e hora de envio/submissão');
            $table->decimal('nota_obtida', 5, 2)->nullable()->comment('Nota obtida (%)');
            $table->boolean('aprovado')->default(false)->comment('Se foi aprovado ou não');
            $table->enum('status', ['em_andamento', 'finalizada', 'expirada'])->default('em_andamento');
            
            // Tempo gasto (em segundos)
            $table->integer('tempo_gasto_segundos')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'usuario_id', 'curso_id']);
            $table->index(['tenant_id', 'curso_prova_id', 'usuario_id']);
            $table->index(['tenant_id', 'usuario_id', 'aprovado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('curso_prova_tentativas');
    }
};
