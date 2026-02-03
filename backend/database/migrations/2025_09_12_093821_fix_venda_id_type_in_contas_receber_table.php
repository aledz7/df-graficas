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
        Schema::table('contas_receber', function (Blueprint $table) {
            // Alterar o tipo do campo venda_id de string para unsignedBigInteger
            $table->unsignedBigInteger('venda_id')->nullable()->change();
            
            // Adicionar foreign key para venda_id
            $table->foreign('venda_id')->references('id')->on('vendas')->onDelete('set null');
            
            // Adicionar índice para melhorar performance
            $table->index('venda_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contas_receber', function (Blueprint $table) {
            // Remover foreign key e índice
            $table->dropForeign(['venda_id']);
            $table->dropIndex(['venda_id']);
            
            // Voltar o tipo para string (se necessário)
            $table->string('venda_id')->nullable()->change();
        });
    }
};