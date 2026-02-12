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
        Schema::create('treinamento_avisos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');
            $table->enum('tipo', ['nivel_nao_concluido', 'treinamento_atrasado', 'setor_incompleto'])->default('treinamento_atrasado');
            $table->string('titulo');
            $table->text('mensagem');
            $table->enum('nivel_esperado', ['iniciante', 'intermediario', 'avancado'])->nullable();
            $table->integer('dias_atraso')->default(0);
            $table->date('data_limite')->nullable();
            $table->enum('status', ['pendente', 'resolvido', 'ignorado'])->default('pendente');
            $table->timestamp('data_resolucao')->nullable();
            $table->foreignId('resolvido_por_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            // Índices
            $table->index(['tenant_id', 'usuario_id', 'status']);
            $table->index(['tenant_id', 'status', 'tipo']);
            $table->index(['tenant_id', 'data_limite', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treinamento_avisos');
    }
};
