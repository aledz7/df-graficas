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
        if (Schema::hasTable('treinamento')) {
            return;
        }

        Schema::create('treinamento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('pergunta');
            $table->text('resposta');
            $table->enum('setor', ['atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral'])->default('geral');
            $table->enum('nivel', ['iniciante', 'intermediario', 'avancado'])->default('iniciante');
            $table->integer('ordem')->default(0)->comment('Ordem de aprendizado');
            $table->boolean('ativo')->default(true);
            $table->foreignId('usuario_criacao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_edicao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tenant_id', 'setor', 'ativo']);
            $table->index(['tenant_id', 'nivel', 'ordem']);
            $table->index(['tenant_id', 'ativo', 'ordem']);
            $table->fullText(['pergunta', 'resposta']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('treinamento');
    }
};
