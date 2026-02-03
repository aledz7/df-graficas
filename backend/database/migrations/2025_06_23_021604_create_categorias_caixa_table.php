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
        Schema::create('categorias_caixa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Dados básicos
            $table->string('nome');
            $table->string('tipo'); // receita, despesa, transferencia, investimento, etc.
            $table->string('cor', 20)->default('#6b7280');
            $table->string('icone', 50)->default('fas fa-tag');
            
            // Categoria pai para hierarquia
            $table->foreignId('categoria_pai_id')->nullable()->constrained('categorias_caixa')->onDelete('set null');
            
            // Controle
            $table->boolean('ativo')->default(true);
            $table->boolean('sistema')->default(false); // Se for uma categoria do sistema (não pode ser excluída)
            $table->integer('ordem')->default(0);
            
            // Metadados
            $table->text('descricao')->nullable();
            $table->json('metadados')->nullable();
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'categoria_pai_id']);
            $table->index(['tenant_id', 'ativo']);
            $table->unique(['tenant_id', 'nome', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorias_caixa');
    }
};
