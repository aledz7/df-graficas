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
        Schema::create('configuracoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Identificação e organização
            $table->string('grupo'); // empresa, pdv, orcamento, nfe, etc.
            $table->string('chave');
            $table->string('nome');
            $table->text('descricao')->nullable();
            
            // Valores
            $table->text('valor_texto')->nullable();
            $table->decimal('valor_numero', 15, 4)->nullable();
            $table->boolean('valor_booleano')->nullable();
            $table->date('valor_data')->nullable();
            $table->time('valor_hora')->nullable();
            $table->dateTime('valor_data_hora')->nullable();
            $table->json('valor_json')->nullable();
            
            // Tipo e validação
            $table->string('tipo')->default('texto'); // texto, numero, booleano, data, hora, data_hora, json, select, multiselect
            $table->json('opcoes')->nullable(); // Para selects e multiselects
            $table->json('validacao')->nullable(); // Regras de validação
            
            // Ordem e visibilidade
            $table->integer('ordem')->default(0);
            $table->boolean('visivel')->default(true);
            $table->boolean('editavel')->default(true);
            $table->boolean('obrigatorio')->default(false);
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'grupo']);
            $table->unique(['tenant_id', 'grupo', 'chave']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracoes');
    }
};
