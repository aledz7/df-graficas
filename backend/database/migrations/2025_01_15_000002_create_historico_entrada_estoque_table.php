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
        Schema::create('historico_entrada_estoque', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Dados da entrada
            $table->string('codigo_entrada', 50)->unique();
            $table->date('data_entrada');
            $table->string('numero_nota', 50)->nullable();
            $table->date('data_nota')->nullable();
            
            // Fornecedor
            $table->string('fornecedor_id')->nullable();
            $table->string('fornecedor_nome')->nullable();
            
            // Responsável
            $table->foreignId('usuario_id')->constrained('users')->onDelete('restrict');
            $table->string('usuario_nome');
            
            // Itens da entrada
            $table->json('itens');
            
            // Dados adicionais
            $table->text('observacoes')->nullable();
            $table->json('metadados')->nullable();
            
            // Controle
            $table->string('status')->default('confirmada'); // confirmada, cancelada, pendente
            $table->timestamp('data_confirmacao')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices para melhorar consultas
            $table->index(['tenant_id', 'data_entrada']);
            $table->index(['tenant_id', 'fornecedor_id']);
            $table->index(['tenant_id', 'usuario_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'codigo_entrada']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historico_entrada_estoque');
    }
}; 