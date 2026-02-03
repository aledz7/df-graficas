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
            if (!Schema::hasColumn('holerites', 'consumo_interno_itens')) {
                $table->json('consumo_interno_itens')->nullable()->after('total_consumo_interno');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('holerites', function (Blueprint $table) {
            if (Schema::hasColumn('holerites', 'consumo_interno_itens')) {
                $table->dropColumn('consumo_interno_itens');
            }
        });
    }
};

