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
        Schema::table('lancamentos_caixa', function (Blueprint $table) {
            // Remover a foreign key incorreta
            $table->dropForeign(['categoria_id']);
            
            // Adicionar a foreign key correta para a tabela categorias
            $table->foreign('categoria_id')->references('id')->on('categorias')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lancamentos_caixa', function (Blueprint $table) {
            // Remover a foreign key correta
            $table->dropForeign(['categoria_id']);
            
            // Restaurar a foreign key original para categorias_caixa
            $table->foreign('categoria_id')->references('id')->on('categorias_caixa')->onDelete('set null');
        });
    }
};
