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
        Schema::table('vendas', function (Blueprint $table) {
            // Adicionar campos para desconto
            $table->string('tipo_desconto', 20)->default('valor')->after('desconto'); // 'percentual' ou 'valor'
            $table->decimal('valor_desconto_original', 10, 2)->default(0)->after('tipo_desconto'); // Valor original (5% ou R$ 10,00)
            $table->decimal('acrescimo_percentual', 5, 2)->default(0)->after('acrescimo'); // Para futuras implementações
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            $table->dropColumn(['tipo_desconto', 'valor_desconto_original', 'acrescimo_percentual']);
        });
    }
};
