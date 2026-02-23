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
        if (!Schema::hasTable('vendas') || Schema::hasColumn('vendas', 'tipo_pedido')) {
            return;
        }

        Schema::table('vendas', function (Blueprint $table) {
            $table->string('tipo_pedido', 20)->nullable()->after('tipo_documento')->comment('Tipo do pedido: PERMUTA, NORMAL, etc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('vendas') || !Schema::hasColumn('vendas', 'tipo_pedido')) {
            return;
        }

        Schema::table('vendas', function (Blueprint $table) {
            $table->dropColumn('tipo_pedido');
        });
    }
};
