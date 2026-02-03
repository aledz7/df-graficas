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
        Schema::table('itens_venda', function (Blueprint $table) {
            // Primeiro, remover a foreign key constraint de venda_id (se existir)
            // Isso é necessário antes de tornar a coluna nullable
            $table->dropForeign(['venda_id']);
        });
        
        Schema::table('itens_venda', function (Blueprint $table) {
            // Tornar venda_id nullable (para OS, Envelopamento, Marketplace que não estão na tabela vendas)
            $table->foreignId('venda_id')->nullable()->change();
            
            // Recriar a foreign key constraint, mas permitindo null
            $table->foreign('venda_id')->references('id')->on('vendas')->onDelete('cascade');
            
            // Adicionar campo para referenciar o ID da venda original (OS, Envelopamento, etc)
            $table->unsignedBigInteger('venda_referencia_id')->nullable()->after('venda_id');
            
            // Adicionar campo para identificar o tipo de venda
            $table->string('tipo_venda', 20)->default('pdv')->after('venda_referencia_id');
            
            // Índice para melhorar consultas por tipo
            $table->index(['tenant_id', 'tipo_venda']);
            $table->index(['tenant_id', 'venda_referencia_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('itens_venda', function (Blueprint $table) {
            // Remover índices
            $table->dropIndex(['tenant_id', 'tipo_venda']);
            $table->dropIndex(['tenant_id', 'venda_referencia_id']);
            
            // Remover campos
            $table->dropColumn(['venda_referencia_id', 'tipo_venda']);
            
            // Reverter venda_id para não-nullable (se necessário, mas pode causar problemas se houver dados)
            // $table->foreignId('venda_id')->nullable(false)->change();
        });
    }
};
