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
        Schema::table('envelopamentos', function (Blueprint $table) {
            if (!Schema::hasColumn('envelopamentos', 'desconto')) {
                $table->decimal('desconto', 10, 2)->default(0)->after('custo_total_adicionais');
            }
            if (!Schema::hasColumn('envelopamentos', 'frete')) {
                $table->decimal('frete', 10, 2)->default(0)->after('desconto_calculado');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('envelopamentos', function (Blueprint $table) {
            if (Schema::hasColumn('envelopamentos', 'frete')) {
                $table->dropColumn('frete');
            }
            if (Schema::hasColumn('envelopamentos', 'desconto')) {
                $table->dropColumn('desconto');
            }
        });
    }
};
