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
        if (!Schema::hasTable('holerites')) {
            return;
        }

        Schema::table('holerites', function (Blueprint $table) {
            if (!Schema::hasColumn('holerites', 'total_fretes')) {
                $table->decimal('total_fretes', 10, 2)->default(0)->after('total_comissoes')->comment('Total de fretes próprios do período');
            }
            if (!Schema::hasColumn('holerites', 'fretes_itens')) {
                $table->json('fretes_itens')->nullable()->after('total_fretes')->comment('Array com detalhes dos fretes próprios');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('holerites')) {
            return;
        }

        Schema::table('holerites', function (Blueprint $table) {
            if (Schema::hasColumn('holerites', 'fretes_itens')) {
                $table->dropColumn('fretes_itens');
            }
            if (Schema::hasColumn('holerites', 'total_fretes')) {
                $table->dropColumn('total_fretes');
            }
        });
    }
};
