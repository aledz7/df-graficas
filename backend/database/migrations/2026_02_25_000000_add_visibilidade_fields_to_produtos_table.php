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
        Schema::table('produtos', function (Blueprint $table) {
            $table->boolean('venda_pdv')->default(true)->after('status')->comment('Produto disponível para venda no PDV');
            $table->boolean('venda_marketplace')->default(true)->after('venda_pdv')->comment('Produto disponível para venda no Marketplace');
            $table->boolean('uso_interno')->default(false)->after('venda_marketplace')->comment('Produto apenas para uso interno');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn(['venda_pdv', 'venda_marketplace', 'uso_interno']);
        });
    }
};
