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
        Schema::create('pedidos_pre_venda', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo', 50)->unique();
            
            // Dados do cliente
            $table->string('cliente_nome');
            $table->string('cliente_email')->nullable();
            $table->string('cliente_telefone', 20);
            $table->text('cliente_endereco')->nullable();
            
            // Dados do pedido
            $table->decimal('total', 10, 2);
            $table->enum('status', ['pendente', 'aprovado', 'rejeitado', 'cancelado', 'finalizado'])->default('pendente');
            $table->string('origem', 100)->default('catalogo_publico'); // catalogo_publico, whatsapp, email, etc.
            $table->text('observacoes')->nullable();
            
            // Dados JSON para flexibilidade
            $table->json('dados_cliente')->nullable(); // Dados completos do cliente
            $table->json('dados_itens')->nullable(); // Itens do pedido
            $table->json('metadados')->nullable(); // Metadados adicionais
            
            // Datas importantes
            $table->timestamp('data_pedido');
            $table->timestamp('data_aprovacao')->nullable();
            $table->timestamp('data_finalizacao')->nullable();
            
            // Usuário que aprovou/rejeitou
            $table->foreignId('usuario_aprovacao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('usuario_aprovacao_nome')->nullable();
            
            // Venda gerada a partir do pedido
            $table->foreignId('venda_gerada_id')->nullable()->constrained('vendas')->onDelete('set null');
            $table->string('venda_gerada_codigo')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'origem']);
            $table->index(['tenant_id', 'data_pedido']);
            $table->index('cliente_telefone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pedidos_pre_venda');
    }
}; 