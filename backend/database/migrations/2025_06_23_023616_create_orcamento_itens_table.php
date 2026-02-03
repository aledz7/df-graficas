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
        Schema::create('orcamento_itens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('orcamento_id')->constrained('orcamentos')->onDelete('cascade');
            $table->foreignId('produto_id')->nullable()->constrained('produtos')->onDelete('set null');
            
            // Dados do produto no momento do orçamento (snapshot)
            $table->string('produto_nome');
            $table->string('produto_codigo', 50)->nullable();
            $table->string('produto_unidade', 10)->default('UN');
            $table->text('produto_descricao')->nullable();
            
            // Quantidade e valores
            $table->decimal('quantidade', 10, 3)->default(1);
            $table->decimal('valor_unitario', 10, 2);
            $table->decimal('desconto_percentual', 5, 2)->default(0);
            $table->decimal('desconto_valor', 10, 2)->default(0);
            $table->decimal('acrescimo_percentual', 5, 2)->default(0);
            $table->decimal('acrescimo_valor', 10, 2)->default(0);
            $table->decimal('valor_total', 10, 2);
            
            // Dados adicionais
            $table->text('observacoes')->nullable();
            $table->json('dados_adicionais')->nullable(); // Para personalizações
            
            // Status e controle
            $table->enum('status', ['pendente', 'aprovado', 'reprovado', 'convertido'])->default('pendente');
            // Será adicionado posteriormente em uma migração separada para evitar dependência circular
            $table->unsignedBigInteger('venda_item_id')->nullable();
            
            // Datas importantes
            $table->dateTime('data_aprovacao')->nullable();
            $table->dateTime('data_conversao')->nullable();
            
            // Usuários
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices para melhorar consultas
            $table->index(['tenant_id', 'orcamento_id']);
            $table->index(['tenant_id', 'produto_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orcamento_itens');
    }
};
