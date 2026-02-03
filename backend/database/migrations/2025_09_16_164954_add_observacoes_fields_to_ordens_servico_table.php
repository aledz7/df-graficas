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
            if (!Schema::hasColumn('ordens_servico', 'observacoes_gerais_os')) {
                $table->text('observacoes_gerais_os')->nullable()->after('observacoes');
            }
            if (!Schema::hasColumn('ordens_servico', 'observacoes_cliente_para_nota')) {
                $table->text('observacoes_cliente_para_nota')->nullable()->after('observacoes_gerais_os');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropColumn(['observacoes_gerais_os', 'observacoes_cliente_para_nota']);
        });
    }
};
