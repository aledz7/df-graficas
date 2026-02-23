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
        if (Schema::hasTable('fretes_entregas')) {
            return;
        }

        Schema::create('fretes_entregas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('venda_id')->constrained('vendas')->onDelete('cascade');
            $table->foreignId('opcao_frete_id')->nullable()->constrained('opcoes_frete')->onDelete('set null');
            $table->foreignId('entregador_id')->nullable()->constrained('entregadores')->onDelete('set null');
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->onDelete('set null');
            
            // Dados da entrega
            $table->decimal('valor_frete', 10, 2);
            $table->integer('prazo_frete')->nullable()->comment('Prazo em dias');
            $table->date('data_entrega')->nullable();
            $table->dateTime('data_entrega_realizada')->nullable();
            
            // Localização
            $table->string('bairro')->nullable();
            $table->string('cidade')->nullable();
            $table->string('estado', 2)->nullable();
            $table->string('cep', 10)->nullable();
            
            // Status e pagamento
            $table->enum('status', ['pendente', 'entregue', 'cancelado'])->default('pendente');
            $table->enum('status_pagamento', ['pendente', 'pago', 'integrado_holerite'])->default('pendente');
            $table->date('data_pagamento')->nullable();
            $table->string('forma_pagamento')->nullable()->comment('PIX, dinheiro, etc');
            $table->text('observacoes')->nullable();
            
            // Integração com holerite (se for próprio)
            $table->foreignId('holerite_id')->nullable()->constrained('holerites')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'status_pagamento']);
            $table->index(['tenant_id', 'entregador_id']);
            $table->index(['tenant_id', 'data_entrega']);
            $table->index(['venda_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fretes_entregas');
    }
};
