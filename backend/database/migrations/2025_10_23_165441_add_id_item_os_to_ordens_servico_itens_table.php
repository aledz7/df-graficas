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
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            if (!Schema::hasColumn('ordens_servico_itens', 'id_item_os')) {
                $table->string('id_item_os')->nullable()->after('id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico_itens', function (Blueprint $table) {
            $table->dropColumn('id_item_os');
        });
    }
};
