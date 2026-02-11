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
            if (!Schema::hasColumn('produtos', 'valor_minimo')) {
                $table->decimal('valor_minimo', 10, 2)->nullable()->default(null)->after('preco_metro_linear')
                    ->comment('Valor mínimo de venda para este produto. Quando o cálculo resultar em valor menor, usar este valor.');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn('valor_minimo');
        });
    }
};
