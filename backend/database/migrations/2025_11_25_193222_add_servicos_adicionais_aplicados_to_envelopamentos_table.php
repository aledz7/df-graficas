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
            if (!Schema::hasColumn('envelopamentos', 'servicos_adicionais_aplicados')) {
                $table->json('servicos_adicionais_aplicados')->nullable()->after('custo_total_adicionais')->comment('Array de serviços adicionais aplicados com id e nome');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('envelopamentos', function (Blueprint $table) {
            if (Schema::hasColumn('envelopamentos', 'servicos_adicionais_aplicados')) {
                $table->dropColumn('servicos_adicionais_aplicados');
            }
        });
    }
};
