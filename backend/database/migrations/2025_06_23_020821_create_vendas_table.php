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
        Schema::create('vendas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo', 50);
            $table->foreignId('cliente_id')->constrained('clientes')->onDelete('restrict');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('restrict');
            $table->string('tipo_documento', 20)->default('venda'); // venda, orcamento, orcamento_aprovado
            $table->string('status', 20)->default('aberta'); // aberta, finalizada, cancelada, estornada
            $table->string('status_pagamento', 20)->default('pendente'); // pendente, pago, atrasado, cancelado
            $table->string('forma_pagamento', 50)->nullable();
            
            // Dados do cliente
            $table->string('cliente_nome');
            $table->string('cliente_cpf_cnpj', 20)->nullable();
            $table->string('cliente_telefone', 20)->nullable();
            $table->string('cliente_email')->nullable();
            
            // Valores
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('desconto', 10, 2)->default(0);
            $table->decimal('acrescimo', 10, 2)->default(0);
            $table->decimal('valor_total', 10, 2)->default(0);
            $table->decimal('valor_pago', 10, 2)->default(0);
            $table->decimal('valor_restante', 10, 2)->default(0);
            
            // Dados adicionais
            $table->text('observacoes')->nullable();
            $table->string('vendedor_nome')->nullable();
            $table->foreignId('vendedor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->json('dados_pagamento')->nullable(); // Formas de pagamento e valores
            $table->json('metadados')->nullable(); // Dados adicionais
            
            // Datas importantes
            $table->dateTime('data_emissao');
            $table->dateTime('data_finalizacao')->nullable();
            $table->dateTime('data_cancelamento')->nullable();
            $table->date('data_vencimento')->nullable();
            
            // Controle
            $table->string('chave_acesso', 44)->nullable(); // Para NF-e
            $table->string('numero_nf', 20)->nullable();
            $table->string('serie_nf', 10)->nullable();
            $table->string('modelo_nf', 2)->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices compostos para melhorar consultas comuns
            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'status_pagamento']);
            $table->index(['tenant_id', 'data_emissao']);
            $table->index(['tenant_id', 'cliente_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendas');
    }
};
