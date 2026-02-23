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
        if (Schema::hasTable('metas_vendas')) {
            return;
        }

        Schema::create('metas_vendas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            
            // Tipo de meta: 'empresa' ou 'vendedor'
            $table->string('tipo')->default('empresa'); // 'empresa' ou 'vendedor'
            
            // Se for meta de vendedor, referenciar o user_id
            $table->foreignId('vendedor_id')->nullable()->constrained('users')->onDelete('cascade');
            
            // Período da meta
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->string('periodo_tipo')->default('mensal'); // 'diario', 'mensal', 'personalizado'
            
            // Valor da meta
            $table->decimal('valor_meta', 15, 2);
            
            // Observações
            $table->text('observacoes')->nullable();
            
            // Status
            $table->boolean('ativo')->default(true);
            
            $table->timestamps();
            $table->softDeletes();
            
            // Índices
            $table->index(['tenant_id', 'tipo', 'data_inicio', 'data_fim']);
            $table->index(['tenant_id', 'vendedor_id', 'data_inicio', 'data_fim']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metas_vendas');
    }
};
