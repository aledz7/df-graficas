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
            if (!Schema::hasColumn('ordens_servico', 'tipo_origem')) {
                $table->string('tipo_origem')->nullable()->after('observacoes_cliente_para_nota');
            }
            if (!Schema::hasColumn('ordens_servico', 'dados_consumo_material')) {
                $table->json('dados_consumo_material')->nullable()->after('tipo_origem');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->dropColumn(['tipo_origem', 'dados_consumo_material']);
        });
    }
};
