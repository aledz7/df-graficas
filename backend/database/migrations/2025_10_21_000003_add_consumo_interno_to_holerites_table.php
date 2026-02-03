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
        Schema::table('holerites', function (Blueprint $table) {
            if (!Schema::hasColumn('holerites', 'total_consumo_interno')) {
                $table->decimal('total_consumo_interno', 10, 2)->default(0)->after('total_comissoes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('holerites', function (Blueprint $table) {
            if (Schema::hasColumn('holerites', 'total_consumo_interno')) {
                $table->dropColumn('total_consumo_interno');
            }
        });
    }
};

