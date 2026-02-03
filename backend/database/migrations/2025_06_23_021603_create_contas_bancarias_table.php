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
        Schema::create('contas_bancarias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Dados básicos
            $table->string('nome');
            $table->string('tipo'); // conta_corrente, poupanca, caixa, carteira, investimento, etc.
            $table->string('codigo_banco', 10)->nullable();
            $table->string('nome_banco', 100)->nullable();
            $table->string('agencia', 20)->nullable();
            $table->string('conta', 30)->nullable();
            $table->string('digito_conta', 5)->nullable();
            $table->string('operacao', 10)->nullable(); // Para contas com mais de um tipo de operação
            
            // Saldos
            $table->decimal('saldo_atual', 15, 2)->default(0);
            $table->decimal('saldo_inicial', 15, 2)->default(0);
            $table->date('data_saldo_inicial');
            
            // Informações adicionais
            $table->string('titular_nome')->nullable();
            $table->string('titular_documento', 20)->nullable();
            $table->string('telefone_contato', 20)->nullable();
            $table->string('email_contato', 100)->nullable();
            
            // Configurações
            $table->boolean('ativo')->default(true);
            $table->boolean('incluir_fluxo_caixa')->default(true);
            $table->boolean('conta_padrao')->default(false);
            $table->string('cor', 20)->default('#3498db');
            $table->string('icone', 50)->default('fas fa-university');
            
            // Dados para conciliação
            $table->string('tipo_conta_banco_central', 10)->nullable(); // CC, CD, PG, etc.
            $table->string('codigo_empresa', 20)->nullable();
            $table->string('codigo_empresa_dv', 2)->nullable();
            $table->string('codigo_empresa_cedente', 20)->nullable();
            $table->string('codigo_empresa_cedente_dv', 2)->nullable();
            $table->string('codigo_cedente', 20)->nullable();
            $table->string('codigo_cedente_dv', 2)->nullable();
            $table->string('carteira', 10)->nullable();
            $table->string('variacao', 10)->nullable();
            $table->string('convenio', 20)->nullable();
            $table->string('especie_documento', 10)->nullable();
            $table->string('especie', 5)->default('R$');
            $table->string('local_pagamento', 255)->nullable();
            $table->string('instrucao1', 255)->nullable();
            $table->string('instrucao2', 255)->nullable();
            $table->string('instrucao3', 255)->nullable();
            $table->string('instrucao4', 255)->nullable();
            $table->string('instrucao5', 255)->nullable();
            
            // Logs e controle
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('observacoes')->nullable();
            $table->json('metadados')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'codigo_banco']);
            $table->index(['tenant_id', 'ativo']);
            $table->unique(['tenant_id', 'nome']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contas_bancarias');
    }
};
