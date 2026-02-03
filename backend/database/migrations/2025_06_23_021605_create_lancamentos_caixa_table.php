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
        Schema::create('lancamentos_caixa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo', 50);
            
            // Dados do lançamento
            $table->string('tipo'); // entrada, saida, transferencia, abertura, fechamento
            $table->string('descricao');
            $table->decimal('valor', 10, 2);
            $table->date('data_operacao');
            $table->date('data_conciliacao')->nullable();
            $table->string('status')->default('pendente'); // pendente, conciliado, cancelado
            
            // Categoria do lançamento
            $table->foreignId('categoria_id')->nullable()->constrained('categorias_caixa')->onDelete('set null');
            $table->string('categoria_nome')->nullable();
            
            // Conta bancária/caixa
            $table->foreignId('conta_id')->constrained('contas_bancarias')->onDelete('restrict');
            $table->string('conta_nome');
            
            // Conta de destino (para transferências)
            $table->foreignId('conta_destino_id')->nullable()->constrained('contas_bancarias')->onDelete('set null');
            $table->string('conta_destino_nome')->nullable();
            
            // Dados da operação relacionada (se houver)
            $table->string('operacao_tipo')->nullable(); // venda, orcamento, despesa, etc.
            $table->unsignedBigInteger('operacao_id')->nullable();
            
            // Dados do responsável
            $table->foreignId('usuario_id')->constrained('users')->onDelete('restrict');
            $table->string('usuario_nome');
            
            // Dados adicionais
            $table->text('observacoes')->nullable();
            $table->json('anexos')->nullable();
            $table->json('metadados')->nullable();
            
            // Controle
            $table->string('comprovante_numero', 50)->nullable();
            $table->string('comprovante_tipo', 20)->nullable(); // cheque, boleto, transferencia, etc.
            $table->string('forma_pagamento', 50)->nullable();
            
            // Dados para conciliação bancária
            $table->string('codigo_barras', 100)->nullable();
            $table->string('numero_documento', 50)->nullable();
            $table->string('historico_banco', 255)->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices para melhorar consultas
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'data_operacao']);
            $table->index(['tenant_id', 'conta_id']);
            $table->index(['tenant_id', 'categoria_id']);
            $table->index(['tenant_id', 'operacao_tipo', 'operacao_id']);
            $table->unique(['tenant_id', 'codigo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lancamentos_caixa');
    }
};
