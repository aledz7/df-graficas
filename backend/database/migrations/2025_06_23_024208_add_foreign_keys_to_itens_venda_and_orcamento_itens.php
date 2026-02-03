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
        // Adiciona a chave estrangeira em itens_venda referenciando orcamento_itens
        Schema::table('itens_venda', function (Blueprint $table) {
            $table->foreign('orcamento_item_id')
                  ->references('id')
                  ->on('orcamento_itens')
                  ->onDelete('set null');
        });

        // Adiciona a chave estrangeira em orcamento_itens referenciando itens_venda
        Schema::table('orcamento_itens', function (Blueprint $table) {
            $table->foreign('venda_item_id')
                  ->references('id')
                  ->on('itens_venda')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove a chave estrangeira de itens_venda
        Schema::table('itens_venda', function (Blueprint $table) {
            $table->dropForeign(['orcamento_item_id']);
        });

        // Remove a chave estrangeira de orcamento_itens
        Schema::table('orcamento_itens', function (Blueprint $table) {
            $table->dropForeign(['venda_item_id']);
        });
    }
};
