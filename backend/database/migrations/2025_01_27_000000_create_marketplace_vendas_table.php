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
        Schema::create('marketplace_vendas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('numero_sequencial')->unique()->nullable();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Dados da venda
            $table->string('id_venda')->unique(); // ID único da venda (mkt-uuid)
            $table->dateTime('data_venda');
            $table->decimal('valor_total', 10, 2)->default(0);
            $table->string('status_pedido')->default('Aguardando Envio');
            $table->text('observacoes')->nullable();
            
            // Dados do cliente
            $table->string('cliente_nome');
            $table->string('cliente_contato')->nullable();
            $table->text('cliente_endereco')->nullable();
            
            // Dados de envio
            $table->string('codigo_rastreio')->nullable();
            $table->string('link_produto')->nullable();
            
            // Dados do vendedor
            $table->string('vendedor_id')->nullable();
            $table->string('vendedor_nome')->nullable();
            
            // Fotos do produto (JSON)
            $table->json('fotos_produto')->nullable();
            
            // Metadados adicionais
            $table->json('metadados')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'data_venda']);
            $table->index(['tenant_id', 'status_pedido']);
            $table->index(['tenant_id', 'cliente_nome']);
            $table->index('id_venda');
        });
        
        // Tabela para produtos das vendas de marketplace
        Schema::create('marketplace_venda_produtos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketplace_venda_id')->constrained('marketplace_vendas')->onDelete('cascade');
            $table->string('produto_id')->nullable(); // ID único do produto na venda
            
            // Dados do produto
            $table->string('nome');
            $table->integer('quantidade')->default(1);
            $table->decimal('preco_unitario', 10, 2)->default(0);
            $table->decimal('subtotal', 10, 2)->default(0);
            
            // Metadados do produto
            $table->json('metadados')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index('marketplace_venda_id');
            $table->index('produto_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marketplace_venda_produtos');
        Schema::dropIfExists('marketplace_vendas');
    }
}; 