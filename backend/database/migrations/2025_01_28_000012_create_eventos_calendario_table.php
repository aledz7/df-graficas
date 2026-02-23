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
        if (Schema::hasTable('eventos_calendario')) {
            return;
        }

        Schema::create('eventos_calendario', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->date('data_inicio');
            $table->date('data_fim')->nullable(); // Para eventos de múltiplos dias
            $table->enum('tipo', ['volta_aulas', 'eleicoes', 'datas_comerciais', 'feriado', 'evento_especial', 'outro'])->default('outro');
            $table->enum('impacto', ['alto', 'medio', 'baixo'])->default('medio');
            $table->boolean('recorrente')->default(false);
            $table->enum('frequencia_recorrencia', ['anual', 'mensal', 'semanal'])->nullable();
            $table->integer('ano_base')->nullable(); // Para eventos recorrentes
            $table->boolean('ativo')->default(true);
            $table->text('observacoes')->nullable();
            $table->json('metadados')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'data_inicio']);
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'ativo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eventos_calendario');
    }
};
