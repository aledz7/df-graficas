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
        Schema::table('ordens_servico', function (Blueprint $table) {
            if (!Schema::hasColumn('ordens_servico', 'data_prevista_entrega')) {
                $table->dateTime('data_prevista_entrega')->nullable()->after('data_validade');
            }
            if (!Schema::hasColumn('ordens_servico', 'maquina_impressao_id')) {
                $table->unsignedBigInteger('maquina_impressao_id')->nullable()->after('data_prevista_entrega');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            if (Schema::hasColumn('ordens_servico', 'maquina_impressao_id')) {
                $table->dropColumn('maquina_impressao_id');
            }
            if (Schema::hasColumn('ordens_servico', 'data_prevista_entrega')) {
                $table->dropColumn('data_prevista_entrega');
            }
        });
    }
};


