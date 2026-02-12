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
        Schema::table('metas_vendas', function (Blueprint $table) {
            // Campos de gamificação
            $table->integer('pontos_meta')->default(0)->after('valor_meta')->comment('Pontos ao bater a meta');
            $table->decimal('percentual_proximo_alerta', 5, 2)->nullable()->after('pontos_meta')->comment('Percentual para alertar que está próximo (ex: 80)');
            $table->json('premiacao')->nullable()->after('percentual_proximo_alerta')->comment('Informações sobre premiação (bônus, brinde, folga, etc)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('metas_vendas', function (Blueprint $table) {
            $table->dropColumn(['pontos_meta', 'percentual_proximo_alerta', 'premiacao']);
        });
    }
};
