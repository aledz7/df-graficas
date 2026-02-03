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
        Schema::create('ordens_servico', function (Blueprint $table) {
            $table->id();
            $table->string('id_os')->unique(); // Identificador único da OS (ex: OS-20230711-1234)
            $table->unsignedBigInteger('cliente_id')->nullable();
            $table->json('cliente_info')->nullable(); // Informações do cliente no momento da criação
            $table->string('status_os'); // Aberta, Em Andamento, Finalizada, Cancelada
            $table->decimal('valor_total_os', 10, 2);
            $table->timestamp('data_criacao');
            $table->timestamp('data_finalizacao_os')->nullable();
            $table->timestamp('data_validade')->nullable();
            $table->text('observacoes')->nullable();
            $table->unsignedBigInteger('vendedor_id')->nullable();
            $table->string('vendedor_nome')->nullable();
            $table->json('pagamentos')->nullable(); // Informações de pagamento
            $table->json('dados_producao')->nullable(); // Status de produção, prazo, observações internas
            $table->string('tenant_id')->nullable(); // Para suporte multi-tenant
            $table->timestamps();
            
            $table->foreign('cliente_id')->references('id')->on('clientes')->onDelete('set null');
        });
        
        Schema::create('ordens_servico_itens', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ordem_servico_id');
            $table->unsignedBigInteger('produto_id')->nullable();
            $table->string('nome_servico_produto');
            $table->string('tipo_item')->default('unidade'); // unidade, m², ml, etc
            $table->decimal('quantidade', 10, 2);
            $table->decimal('valor_unitario', 10, 2);
            $table->decimal('valor_total', 10, 2);
            $table->decimal('largura', 10, 2)->nullable();
            $table->decimal('altura', 10, 2)->nullable();
            $table->json('acabamentos')->nullable(); // Lista de acabamentos aplicados
            $table->json('detalhes')->nullable(); // Detalhes específicos do item
            $table->timestamps();
            
            $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
            $table->foreign('produto_id')->references('id')->on('produtos')->onDelete('set null');
        });
        
        Schema::create('ordens_servico_anexos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ordem_servico_id');
            $table->string('nome_arquivo');
            $table->string('caminho');
            $table->string('tipo_arquivo');
            $table->decimal('tamanho_kb', 10, 2);
            $table->timestamps();
            
            $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ordens_servico_anexos');
        Schema::dropIfExists('ordens_servico_itens');
        Schema::dropIfExists('ordens_servico');
    }
};
