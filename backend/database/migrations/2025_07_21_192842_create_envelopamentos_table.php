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
        Schema::create('envelopamentos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->string('codigo_orcamento')->unique();
            $table->string('nome_orcamento')->nullable();
            $table->json('cliente')->nullable(); // {id, nome, cpf_cnpj}
            $table->json('selected_pecas')->nullable(); // Array de peças selecionadas
            $table->json('produto')->nullable(); // Dados do produto selecionado
            $table->json('adicionais')->nullable(); // Serviços adicionais
            $table->decimal('area_total_m2', 10, 4)->default(0);
            $table->decimal('custo_total_material', 10, 2)->default(0);
            $table->decimal('custo_total_adicionais', 10, 2)->default(0);
            $table->decimal('orcamento_total', 10, 2)->default(0);
            $table->text('observacao')->nullable();
            $table->string('status')->default('Rascunho'); // Rascunho, Orçamento Salvo, Finalizado
            $table->datetime('data_criacao');
            $table->datetime('data_validade')->nullable();
            $table->unsignedBigInteger('vendedor_id')->nullable();
            $table->string('vendedor_nome')->nullable();
            $table->json('pagamentos')->nullable(); // Array de pagamentos
            $table->softDeletes();
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'data_criacao']);
            $table->index('codigo_orcamento');
            
            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('vendedor_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('envelopamentos');
    }
};
